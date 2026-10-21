/**
 * Utilidades para la validación y decodificación de tokens JWT en el cliente.
 */

export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Si la fecha actual supera el timestamp de exp (exp está en segundos, Date.now() en ms)
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

export const getTokenRemainingSeconds = (token: string | null): number => {
  if (!token) return 0;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return 0;
    const remaining = Math.floor((payload.exp * 1000 - Date.now()) / 1000);
    return Math.max(0, remaining);
  } catch {
    return 0;
  }
};
