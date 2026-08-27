import { SetMetadata } from '@nestjs/common';

/**
 * Marca endpoints que pueden quedar expuestos sin API key.
 * Se usa principalmente para health checks locales o internos.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
