/**
 * Auth0 Configuration
 * Centralized Auth0 settings and initialization
 */

export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || 'your-tenant.auth0.com',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || 'your_client_id',
  redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE || `https://${import.meta.env.VITE_AUTH0_DOMAIN}/api/v2/`,
};

/**
 * Auth error messages for user display
 */
export const auth0ErrorMessages: Record<string, string> = {
  'invalid_grant': 'Invalid email or password. Please try again.',
  'invalid_body': 'Invalid request format. Please check your input.',
  'user_exists': 'This email is already registered. Please log in instead.',
  'access_denied': 'Access denied. Please check your permissions.',
  'too_many_requests': 'Too many login attempts. Please try again later.',
  'network_error': 'Network error. Please check your connection and try again.',
  'unknown_error': 'An unexpected error occurred. Please try again.'
};

/**
 * Get user-friendly error message
 */
export const getAuth0ErrorMessage = (errorCode: string): string => {
  return auth0ErrorMessages[errorCode] || auth0ErrorMessages['unknown_error'];
};

/**
 * Check if Auth0 is properly configured
 */
export const isAuth0Configured = (): boolean => {
  return !!(
    import.meta.env.VITE_AUTH0_DOMAIN &&
    import.meta.env.VITE_AUTH0_CLIENT_ID &&
    import.meta.env.VITE_AUTH0_DOMAIN !== 'your-tenant.auth0.com' &&
    import.meta.env.VITE_AUTH0_CLIENT_ID !== 'your_client_id'
  );
};
