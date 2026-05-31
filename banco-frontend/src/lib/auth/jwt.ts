/**
 * JWT Authentication Manager - BancoDDD Enterprise
 * 
 * Handles JWT token management including:
 * - Access token storage and retrieval
 * - Refresh token rotation
 * - Token expiration handling
 * - Secure token encryption
 */

const ACCESS_TOKEN_KEY = "banco_access_token";
const REFRESH_TOKEN_KEY = "banco_refresh_token";
const TOKEN_EXPIRY_KEY = "banco_token_expiry";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface DecodedToken {
  sub: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

/**
 * Simple encryption for token storage (AES-256 simulation)
 * In production, use proper encryption library
 */
function encrypt(text: string): string {
  try {
    // Base64 encoding for demo - use proper encryption in production
    return btoa(text);
  } catch {
    return text;
  }
}

function decrypt(text: string): string {
  try {
    // Base64 decoding for demo - use proper decryption in production
    return atob(text);
  } catch {
    return text;
  }
}

/**
 * Get access token from storage
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    const encrypted = sessionStorage.getItem(ACCESS_TOKEN_KEY) || 
                      localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!encrypted) return null;
    
    const token = decrypt(encrypted);
    
    // Check if token is expired
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      clearTokens();
      return null;
    }
    
    return token;
  } catch {
    return null;
  }
}

/**
 * Get refresh token from storage
 */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    const encrypted = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!encrypted) return null;
    
    return decrypt(encrypted);
  } catch {
    return null;
  }
}

/**
 * Set tokens in storage
 */
export function setTokens(tokens: TokenPair, rememberMe = false): void {
  if (typeof window === "undefined") return;
  
  try {
    const encryptedAccess = encrypt(tokens.accessToken);
    const encryptedRefresh = encrypt(tokens.refreshToken);
    
    // Store access token
    if (rememberMe) {
      localStorage.setItem(ACCESS_TOKEN_KEY, encryptedAccess);
    } else {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, encryptedAccess);
    }
    
    // Always store refresh token in localStorage
    localStorage.setItem(REFRESH_TOKEN_KEY, encryptedRefresh);
    
    // Store expiry time
    const expiryTime = Date.now() + (tokens.expiresIn * 1000);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  } catch (error) {
    console.error("Error storing tokens:", error);
  }
}

/**
 * Clear all tokens from storage
 */
export function clearTokens(): void {
  if (typeof window === "undefined") return;
  
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Decode JWT token (without verification)
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Get time until token expiration (in seconds)
 */
export function getTokenTimeToExpiry(token: string): number {
  const decoded = decodeToken(token);
  if (!decoded) return 0;
  
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, decoded.exp - now);
}

/**
 * Check if token needs refresh (expires in less than 5 minutes)
 */
export function shouldRefreshToken(token: string): boolean {
  const timeToExpiry = getTokenTimeToExpiry(token);
  return timeToExpiry < 300; // 5 minutes
}

/**
 * Get user info from token
 */
export function getUserFromToken(token: string): { id: string; email: string; roles: string[] } | null {
  const decoded = decodeToken(token);
  if (!decoded) return null;
  
  return {
    id: decoded.sub,
    email: decoded.email,
    roles: decoded.roles,
  };
}

/**
 * Initialize token refresh timer
 */
export function initializeTokenRefresh(
  refreshCallback: () => Promise<void>,
  checkInterval = 60000 // Check every minute
): () => void {
  let refreshTimer: NodeJS.Timeout;

  const checkAndRefresh = async () => {
    const token = getAccessToken();
    if (token && shouldRefreshToken(token)) {
      try {
        await refreshCallback();
      } catch (error) {
        console.error("Token refresh failed:", error);
        clearTokens();
        window.location.href = "/login";
      }
    }
  };

  // Initial check
  checkAndRefresh();

  // Set up interval
  refreshTimer = setInterval(checkAndRefresh, checkInterval);

  // Return cleanup function
  return () => clearInterval(refreshTimer);
}
