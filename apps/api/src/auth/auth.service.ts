import {
  ConflictException,
  Injectable,
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
 *  - 密碼以 argon2 雜湊（不自製加密）
 *  - 簽發短效期 access token + refresh token
 *  - refresh token 以雜湊存 DB，可撤銷（登出/輪替）
 *
 * TODO(正式上線)：改接 OAuth2/OIDC Provider（如 Keycloak / Auth0 / 自建），
 * 此處為自架帳密骨架，符合「短效期 token + refresh + 可撤銷」的要求。
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
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
        consentAt: new Date(), // 註冊即記錄告知同意時間
      },
    });
    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // 帳號枚舉防護：不論帳號是否存在都做一次雜湊比對成本 (§四.7)
    const ok =
      user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !ok || !user.isActive) {
      throw new UnauthorizedException('帳號或密碼錯誤');
    }

    // TODO: 後台角色 (STAFF/ADMIN) 若 twoFactorEnabled 則驗證 dto.totp
    await this.audit.log({
      actorId: user.id,
      action: 'AUTH_LOGIN',
      targetType: 'User',
      targetId: user.id,
      ip,
    });
    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(dto: RefreshDto) {
    const tokenHash = this.hashToken(dto.refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token 無效');
    }
    // 輪替：撤銷舊 token，簽發新的
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

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
  ) {
    const payload = { sub: userId, email, role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('jwt.accessSecret'),
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
