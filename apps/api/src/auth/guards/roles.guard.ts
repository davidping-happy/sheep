import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

// 角色階層（數字越大權限越高）。與 @churchsheep/shared 的 ROLE_RANK 對齊，
// 於此以 Prisma Role 為鍵，避免跨套件列舉型別耦合。
const ROLE_RANK: Record<Role, number> = {
  [Role.MEMBER]: 0,
  [Role.GROUP_LEADER]: 1,
  [Role.STAFF]: 2,
  [Role.ADMIN]: 3,
};

/**
 * 階層式 RBAC 守衛（§四.9 最小權限）。
 * @Roles(Role.STAFF) 代表「至少 STAFF」；ADMIN 自動涵蓋。
 * 注意：資源層級的所有權檢查（如小組長只能改自己小組）
 * 需在各 service 內另行判斷，此守衛只做角色門檻。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: AuthUser = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('未通過身份驗證');

    const minRequired = Math.min(...required.map((r) => ROLE_RANK[r]));
    if (ROLE_RANK[user.role] < minRequired) {
      throw new ForbiddenException('權限不足');
    }
    return true;
  }
}
