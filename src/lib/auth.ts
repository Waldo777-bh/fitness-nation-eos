// Simple shared-credential gate for the Fitness Nation EOS dashboard.
// Internal single-team tool: one username + password, verified server-side,
// then a signed cookie keeps the session. Credentials can be overridden with
// env vars (APP_USER / APP_PASSWORD / AUTH_TOKEN) but fall back to sensible
// defaults so the app works after a plain redeploy.

export const AUTH_COOKIE = 'fn_auth';

export const APP_USER = (process.env.APP_USER || 'brent@fitnessnation.au').trim().toLowerCase();
export const APP_PASSWORD = process.env.APP_PASSWORD || 'admin';

// The value stored in the auth cookie once signed in. Only issued after a
// correct username/password, and compared on every request by the middleware.
export const AUTH_TOKEN = process.env.AUTH_TOKEN || 'fn-eos-authed-9f3a7c2e1b8d4056a1c7e4';

export function credentialsValid(email: string, password: string): boolean {
  return (
    typeof email === 'string' &&
    typeof password === 'string' &&
    email.trim().toLowerCase() === APP_USER &&
    password === APP_PASSWORD
  );
}
