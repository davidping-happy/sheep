import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
// 純 JS bcrypt（避免 Windows 原生編譯問題）。正式環境亦可改用 argon2。
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { SchemaSyncBootstrap } from '../common/schema-sync.bootstrap';
import {
  ForgotPasswordDto,
  HintAccountDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';

/**
 * 身份驗證 (§四.3)：
 *  - 帳號＝Email（亦可手機登入）＋密碼（至少 6 字元）
 *  - 忘記密碼／帳號：Email 與簡訊雙通道通知
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly schemaSync: SchemaSyncBootstrap,
    private readonly mail: MailService,
    private readonly sms: SmsService,
  ) {}

  async register(dto: RegisterDto) {
    await this.ensureDb();
    await this.schemaSync.ensureSchema();
    try {
      const email = dto.email.trim().toLowerCase();
      const phone = this.sms.normalizeTwPhone(dto.phone);
      if (!phone) {
        throw new BadRequestException('請輸入有效手機號碼（例：0912345678）');
      }

      const exists = await this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      });
      if (exists) throw new ConflictException('此帳號（Email）已被註冊');

      const phoneTaken = await this.prisma.user.findFirst({
        where: { phone: { in: this.phoneVariants(phone) } },
      });
      if (phoneTaken) throw new ConflictException('此手機號碼已被註冊');

      const user = await this.prisma.user.create({
        data: {
          email,
          phone,
          passwordHash: await bcrypt.hash(dto.password, 12),
          displayName: dto.displayName.trim(),
          isMinor: dto.isMinor ?? false,
          guardianName: dto.guardianName,
          guardianPhone: dto.guardianPhone,
          consentAt: new Date(),
        },
      });
      return await this.issueTokens(user.id, user.email, user.role);
    } catch (err) {
      if (
        err instanceof ConflictException ||
        err instanceof BadRequestException ||
        err instanceof ServiceUnavailableException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }
      this.logger.error(
        `register error: ${err instanceof Error ? err.message : err}`,
      );
      const detail =
        err instanceof Error && err.message
          ? err.message.slice(0, 160)
          : '';
      throw new ServiceUnavailableException(
        detail
          ? `註冊失敗：${detail}`
          : '註冊失敗：資料庫可能仍在初始化，請等 1 分鐘後再試一次',
      );
    }
  }

  async login(dto: LoginDto, ip?: string) {
    await this.ensureDb();
    await this.schemaSync.ensureSchema();
    const account = (dto.account || dto.email || '').trim();
    if (!account) {
      throw new BadRequestException('請輸入帳號');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('密碼至少 6 字元');
    }

    let user;
    try {
      user = await this.findUserByAccount(account);
    } catch (err) {
      this.logger.error(
        `login DB error: ${err instanceof Error ? err.message : err}`,
      );
      throw new ServiceUnavailableException(
        '資料庫暫時無法連線，請稍後再試（請到 Render 確認 Postgres／DATABASE_URL）',
      );
    }
    const ok =
      user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !ok || !user.isActive) {
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    try {
      await this.audit.log({
        actorId: user.id,
        action: 'AUTH_LOGIN',
        targetType: 'User',
        targetId: user.id,
        ip,
      });
    } catch (err) {
      this.logger.warn(
        `audit log skipped: ${err instanceof Error ? err.message : err}`,
      );
    }
    try {
      return await this.issueTokens(user.id, user.email, user.role);
    } catch (err) {
      this.logger.error(
        `issueTokens error: ${err instanceof Error ? err.message : err}`,
      );
      if (err instanceof ServiceUnavailableException) throw err;
      throw new ServiceUnavailableException(
        '登入服務暫時異常，請確認資料庫與 JWT 環境變數後重試',
      );
    }
  }

  async refresh(dto: RefreshDto) {
    await this.ensureDb();
    const tokenHash = this.hashToken(dto.refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token 無效');
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(
      record.user.id,
      record.user.email,
      record.user.role,
    );
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * 忘記密碼：產生驗證碼，同時寄 Email 與簡訊。
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    await this.ensureDb();
    await this.schemaSync.ensureSchema();

    const generic = {
      ok: true as const,
      mailSent: false,
      smsSent: false,
      message:
        '若帳號存在，驗證碼將以 Email 與簡訊通知（約 15 分鐘有效）。未收到請檢查垃圾信件，或聯絡牧區同工。',
    };

    const user = await this.findUserByAccount(dto.account.trim());
    if (!user || !user.isActive) return generic;

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60_000);

    await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        codeHash: this.hashToken(code),
        expiresAt,
      },
    });

    const brand = this.brandName();
    const [mailResult, smsSent] = await Promise.all([
      this.mail.sendPasswordResetCode(user.email, code, brand),
      user.phone
        ? this.sms.sendPasswordResetCode(user.phone, code, brand)
        : Promise.resolve(false),
    ]);
    const mailSent = mailResult.ok;

    if (!mailSent && !smsSent) {
      this.logger.warn(
        `password reset code for ${user.email}/${user.phone ?? '-'}: ${code}（Email／簡訊皆未送出）${mailResult.error ? ` — ${mailResult.error}` : ''}`,
      );
    }

    const debug =
      process.env.PASSWORD_RESET_RETURN_CODE === '1' ||
      process.env.PASSWORD_RESET_RETURN_CODE === 'true';

    const channels: string[] = [];
    if (mailSent) channels.push('Email');
    if (smsSent) channels.push('簡訊');

    let message: string;
    if (channels.length) {
      message = `驗證碼已透過「${channels.join('、')}」送出，約 15 分鐘內有效。`;
    } else if (mailResult.error) {
      message = mailResult.error;
    } else {
      message =
        '驗證碼已產生，但寄信／簡訊尚未設定完成。請聯絡牧區同工，或稍後再試。';
    }

    return {
      ok: true as const,
      mailSent,
      smsSent,
      message,
      ...(debug ? { debugCode: code } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.ensureDb();
    await this.schemaSync.ensureSchema();

    const user = await this.findUserByAccount(dto.account.trim());
    if (!user || !user.isActive) {
      throw new UnauthorizedException('驗證碼無效或已過期');
    }

    const codeHash = this.hashToken(dto.code.trim());
    const record = await this.prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        codeHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      throw new UnauthorizedException('驗證碼無效或已過期');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
    });
    await this.prisma.passwordReset.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    try {
      await this.audit.log({
        actorId: user.id,
        action: 'AUTH_PASSWORD_RESET',
        targetType: 'User',
        targetId: user.id,
      });
    } catch {
      /* ignore */
    }

    return { ok: true, message: '密碼已更新，請用新密碼登入' };
  }

  /**
   * 忘記帳號：以手機（或顯示名稱）查詢，並以 Email＋簡訊通知帳號。
   */
  async hintAccount(dto: HintAccountDto) {
    await this.ensureDb();
    await this.schemaSync.ensureSchema();

    const phoneNorm = dto.phone?.trim()
      ? this.sms.normalizeTwPhone(dto.phone.trim())
      : null;
    const name = dto.displayName?.trim() || '';

    if (!phoneNorm && !name) {
      throw new BadRequestException('請輸入手機號碼或顯示名稱');
    }

    let matches: Array<{ email: string; phone: string | null }> = [];

    if (phoneNorm) {
      const u = await this.prisma.user.findFirst({
        where: {
          isActive: true,
          phone: { in: this.phoneVariants(phoneNorm) },
        },
        select: { email: true, phone: true },
      });
      if (u) matches = [u];
    } else {
      matches = await this.prisma.user.findMany({
        where: {
          isActive: true,
          displayName: { equals: name, mode: 'insensitive' },
        },
        select: { email: true, phone: true },
        take: 3,
      });
    }

    if (matches.length === 0) {
      return {
        ok: true as const,
        found: false as const,
        mailSent: false,
        smsSent: false,
        message: '找不到符合資料。請確認手機或顯示名稱，或聯絡牧區同工。',
      };
    }

    if (matches.length > 1) {
      return {
        ok: true as const,
        found: false as const,
        mailSent: false,
        smsSent: false,
        message:
          '有多筆同名會友，無法自動提示。請改用手機號碼查詢，或聯絡牧區同工。',
      };
    }

    const user = matches[0];
    const fullEmail = user.email;
    const emailHint = this.maskEmail(fullEmail);
    const brand = this.brandName();

    const [mailResult, smsSent] = await Promise.all([
      this.mail.sendAccountHint(fullEmail, fullEmail, brand),
      user.phone
        ? this.sms.sendAccountHint(user.phone, fullEmail, brand)
        : Promise.resolve(false),
    ]);
    const mailSent = mailResult.ok;

    const channels: string[] = [];
    if (mailSent) channels.push('Email');
    if (smsSent) channels.push('簡訊');

    return {
      ok: true as const,
      found: true as const,
      emailHint,
      mailSent,
      smsSent,
      message: channels.length
        ? `已透過「${channels.join('、')}」通知您的登入帳號（提示：${emailHint}）。`
        : mailResult.error
          ? `${mailResult.error}（帳號提示：${emailHint}）`
          : `找到帳號提示：${emailHint}。寄信／簡訊尚未設定時，請聯絡牧區同工確認完整帳號。`,
    };
  }

  private brandName(): string {
    return (
      this.config.get<string>('app.brandName') ||
      process.env.BRAND_NAME ||
      '牧區 App'
    );
  }

  private async findUserByAccount(account: string) {
    if (account.includes('@')) {
      return this.prisma.user.findFirst({
        where: { email: { equals: account.toLowerCase(), mode: 'insensitive' } },
      });
    }
    const phone = this.sms.normalizeTwPhone(account);
    if (!phone) return null;
    return this.prisma.user.findFirst({
      where: { phone: { in: this.phoneVariants(phone) } },
    });
  }

  /** 相容舊資料可能存 09… 或 +886… */
  private phoneVariants(e164: string): string[] {
    const set = new Set<string>([e164]);
    if (e164.startsWith('+886')) {
      set.add(`0${e164.slice(4)}`);
      set.add(e164.slice(1));
    }
    return [...set];
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const head = local.slice(0, Math.min(2, local.length));
    return `${head}***@${domain}`;
  }

  private async ensureDb() {
    const ok = await this.prisma.waitForDb(12, 2500);
    if (!ok) {
      this.logger.error('DB unavailable after retries');
      throw new ServiceUnavailableException(
        '資料庫暫時無法連線（Neon 可能正在喚醒）。請等 30 秒再試；若持續失敗，到 Render 確認 DATABASE_URL 是否為 Neon 連線字串。',
      );
    }
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const secret = this.config.get<string>('jwt.accessSecret');
    if (!secret) {
      this.logger.error('JWT_ACCESS_SECRET 未設定');
      throw new ServiceUnavailableException(
        '伺服器驗證金鑰未設定（JWT_ACCESS_SECRET），請到 Render Environment 檢查',
      );
    }
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret,
      expiresIn: this.config.get('jwt.accessTtl'),
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const ttlDays = 30;
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ttlDays * 864e5),
      },
    });

    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
