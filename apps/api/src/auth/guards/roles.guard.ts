import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ROLE_RANK } from '../../common/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

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
