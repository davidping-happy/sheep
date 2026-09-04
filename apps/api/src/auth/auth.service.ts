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
import { SmsService } from './sms.service';

/**
 * 身份驗證：
 *  - 帳號＝顯示名稱（繁中／英／數字），不必 Email
 *  - 註冊：帳號／手機／密碼（至少 6 字元）
 *  - 忘記帳號／密碼：僅以註冊手機簡訊通知
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
    private readonly sms: SmsService,
  ) {}

  async register(dto: RegisterDto) {
    await this.ensureDb();
    await this.schemaSync.ensureSchema();
    try {
      const account = dto.account.trim();
      const phone = this.sms.normalizeTwPhone(dto.phone);
      if (!phone) {
        throw new BadRequestException('請輸入有效手機號碼（例：0912345678）');
      }
      if (!dto.password || dto.password.length < 6) {
        throw new BadRequestException('密碼至少 6 字元');
      }

      const nameTaken = await this.prisma.user.findFirst({
        where: { displayName: { equals: account, mode: 'insensitive' } },
      });
      if (nameTaken) throw new ConflictException('此帳號已被使用');

      const phoneTaken = await this.prisma.user.findFirst({
        where: { phone: { in: this.phoneVariants(phone) } },
      });
      if (phoneTaken) throw new ConflictException('此手機號碼已被註冊');

      const user = await this.prisma.user.create({
        data: {
          email: null,
          phone,
          passwordHash: await bcrypt.hash(dto.password, 12),
          displayName: account,
          isMinor: dto.isMinor ?? false,
          guardianName: dto.guardianName,
          guardianPhone: dto.guardianPhone,
          consentAt: new Date(),
        },
      });
      return await this.issueTokens(
        user.id,
        user.displayName,
        user.role,
      );
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
      return await this.issueTokens(user.id, user.displayName, user.role);
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
      record.user.displayName,
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

  /** 忘記密碼：以手機寄送驗證碼（簡訊） */
  async forgotPassword(dto: ForgotPasswordDto) {
    await this.ensureDb();
    await this.schemaSync.ensureSchema();

    const phone = this.sms.normalizeTwPhone(dto.phone);
    const generic = {
      ok: true as const,
      smsSent: false,
      message:
        '若此手機已註冊，驗證碼將以簡訊寄出（約 15 分鐘有效）。未收到請稍後再試或聯絡牧區同工。',
    };
    if (!phone) return generic;

    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        phone: { in: this.phoneVariants(phone) },
      },
    });
    if (!user) return generic;

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
    const smsSent = await this.sms.sendPasswordResetCode(
      user.phone!,
      code,
      brand,
    );

    if (!smsSent) {
      this.logger.warn(
        `password reset code for ${user.phone}: ${code}（簡訊未送出；請設 TWILIO_*）`,
      );
    }

    const debug =
      process.env.PASSWORD_RESET_RETURN_CODE === '1' ||
      process.env.PASSWORD_RESET_RETURN_CODE === 'true';

    return {
      ok: true as const,
      smsSent,
      message: smsSent
        ? '驗證碼已以簡訊寄出，約 15 分鐘內有效。'
        : '驗證碼已產生，但簡訊尚未設定完成（需 TWILIO）。請聯絡牧區同工，或稍後再試。',
      ...(debug ? { debugCode: code } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.ensureDb();
    await this.schemaSync.ensureSchema();

    const phone = this.sms.normalizeTwPhone(dto.phone);
    if (!phone) {
      throw new UnauthorizedException('驗證碼無效或已過期');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        phone: { in: this.phoneVariants(phone) },
      },
    });
    if (!user) {
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

  /** 忘記帳號：以手機簡訊通知登入帳號（顯示名稱） */
  async hintAccount(dto: HintAccountDto) {
    await this.ensureDb();
    await this.schemaSync.ensureSchema();

    const phone = this.sms.normalizeTwPhone(dto.phone);
    if (!phone) {
      throw new BadRequestException('請輸入有效手機號碼');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        phone: { in: this.phoneVariants(phone) },
      },
      select: { displayName: true, phone: true },
    });

    if (!user?.phone) {
      return {
        ok: true as const,
        found: false as const,
        smsSent: false,
        message: '找不到符合的手機號碼。請確認註冊時留下的號碼，或聯絡牧區同工。',
      };
    }

    const brand = this.brandName();
    const smsSent = await this.sms.sendAccountHint(
      user.phone,
      user.displayName,
      brand,
    );

    return {
      ok: true as const,
      found: true as const,
      accountHint: this.maskAccount(user.displayName),
      smsSent,
      message: smsSent
        ? `已簡訊通知您的登入帳號（提示：${this.maskAccount(user.displayName)}）。`
        : `找到帳號提示：${this.maskAccount(user.displayName)}。簡訊尚未設定時，請聯絡牧區同工確認。`,
    };
  }

  private brandName(): string {
    return (
      this.config.get<string>('app.brandName') ||
      process.env.BRAND_NAME ||
      '牧區 App'
    );
  }

  /** 帳號優先：顯示名稱；相容舊資料 Email／手機 */
  private async findUserByAccount(account: string) {
    const byName = await this.prisma.user.findFirst({
      where: { displayName: { equals: account, mode: 'insensitive' } },
    });
    if (byName) return byName;

    if (account.includes('@')) {
      return this.prisma.user.findFirst({
        where: {
          email: { equals: account.toLowerCase(), mode: 'insensitive' },
        },
      });
    }

    const phone = this.sms.normalizeTwPhone(account);
    if (!phone) return null;
    return this.prisma.user.findFirst({
      where: { phone: { in: this.phoneVariants(phone) } },
    });
  }

  private phoneVariants(e164: string): string[] {
    const set = new Set<string>([e164]);
    if (e164.startsWith('+886')) {
      set.add(`0${e164.slice(4)}`);
      set.add(e164.slice(1));
    }
    return [...set];
  }

  private maskAccount(name: string): string {
    if (name.length <= 2) return `${name[0] ?? '*'}*`;
    return `${name.slice(0, 1)}***${name.slice(-1)}`;
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

  private async issueTokens(
    userId: string,
    accountLabel: string,
    role: string,
  ) {
    const secret = this.config.get<string>('jwt.accessSecret');
    if (!secret) {
      this.logger.error('JWT_ACCESS_SECRET 未設定');
      throw new ServiceUnavailableException(
        '伺服器驗證金鑰未設定（JWT_ACCESS_SECRET），請到 Render Environment 檢查',
      );
    }
    // JWT 仍用 email 欄位承載帳號標籤（相容既有守衛）
    const payload = { sub: userId, email: accountLabel, role };
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
