import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
// Cho phép truyền vào nhiều role (VD: @Roles('ADMIN', 'STAFF'))
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);