import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 標註無需登入即可存取的端點（例如登入、公開文章列表）。 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
