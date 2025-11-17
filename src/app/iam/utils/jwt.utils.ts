import { UserType } from '../model/user-type.vo';

export function decodeJwtPayload(token: string): any | undefined {
  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return undefined;
    }
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const globalScope: any = globalThis as any;
    const binary = typeof globalScope?.atob === 'function'
      ? globalScope.atob(base64)
      : globalScope?.Buffer
        ? globalScope.Buffer.from(base64, 'base64').toString('binary')
        : '';
    if (!binary) {
      return undefined;
    }
    const jsonPayload = decodeURIComponent(
      Array.prototype.map
        .call(binary, (char: string) => `%${('00' + char.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.warn('Unable to decode token payload', error);
    return undefined;
  }
}

export function extractRoleClaim(payload: any): string | undefined {
  if (!payload) return undefined;
  if (Array.isArray(payload.roles) && payload.roles.length > 0) {
    return payload.roles[0];
  }
  if (typeof payload.role === 'string') {
    return payload.role;
  }
  return undefined;
}

export function mapRoleNameToUserType(role?: string): UserType | undefined {
  switch (role) {
    case 'ROLE_WORKER':
      return UserType.TYPE_WORKER;
    case 'ROLE_CLIENT':
      return UserType.TYPE_CLIENT;
    default:
      return undefined;
  }
}
