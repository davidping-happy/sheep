import {
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
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';

/**
 * 身份驗證 (§四.3)：
 *  - 密碼以 bcrypt 雜湊
 *  - 簽發短效期 access token + refresh token
 *  - refresh token 以雜湊存 DB，可撤銷（登出/輪替）
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    await this.ensureDb();
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email 已被註冊');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        displayName: dto.displayName,
        isMinor: dto.isMinor ?? false,
        guardianName: dto.guardianName,
        guardianPhone: dto.guardianPhone,
        consentAt: new Date(),
      },
    });
    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto, ip?: string) {
    await this.ensureDb();
    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
    } catch (err) {
      this.logger.error(
        `login DB error: ${err instanceof Error ? err.message : err}`,
      );
      throw new ServiceUnavailableException(
        '資料庫暫時無法連線，請稍後再試（請到 Render 確認 Postgres／DATABASE_URL）',
      );
    }
    // 帳號枚舉防護：不論帳號是否存在都做一次雜湊比對成本 (§四.7)
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

  private async ensureDb() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      try {
        await this.prisma.$connect();
        await this.prisma.$queryRaw`SELECT 1`;
      } catch (err) {
        this.logger.error(
          `DB unavailable: ${err instanceof Error ? err.message : err}`,
        );
        throw new ServiceUnavailableException(
          '資料庫暫時無法連線，請稍後再試（請到 Render 確認 Postgres／DATABASE_URL）',
        );
      }
    }
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
  ) {
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
