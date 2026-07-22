import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../../common/enums';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

/** 取出經 JWT 驗證後掛在 request 上的使用者。 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | AuthUser[keyof AuthUser] => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    return data ? user?.[data] : user;
  },
);
