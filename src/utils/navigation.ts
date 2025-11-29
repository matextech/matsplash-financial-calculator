/**
 * Get the login path with secret path
 */
export function getLoginPath(): string {
  const secretPath = import.meta.env?.VITE_LOGIN_SECRET_PATH || 'matsplash-fin-2jg1wCHqcMOEhlBr';
  return `/login/${secretPath}`;
}

