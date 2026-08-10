import { SetMetadata } from '@nestjs/common';

export const IS_OPTIONAL_AUTH_KEY = 'optionalAuth';

/** 有 token 則驗證並掛上 user；無／無效 token 仍放行（user 為 undefined）。 */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
