import { SetMetadata } from '@nestjs/common';
import { Role } from '../../common/enums';

export const ROLES_KEY = 'roles';

/** 標註端點所需的最低角色，搭配 RolesGuard 使用。 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
