/**
 * Guest authentication utilities
 *
 * Handles guest registration, login, token storage, and session management.
 */

import { apiClient } from "./api-client";
import type {
  GuestUser,
  GuestAuthResponse,
  GuestRegisterRequest,
  GuestLoginRequest,
} from "./validators";

const GUEST_TOKEN_KEY = "guest_token";
const GUEST_USER_KEY = "guest_user";

// ============================================================================
// Token Storage
// ============================================================================

/**
 * Save guest JWT token to local storage
 */
export function setGuestToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
}

/**
 * Get guest JWT token from local storage
 */
export function getGuestToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(GUEST_TOKEN_KEY);
  }
  return null;
}

/**
 * Remove guest JWT token from local storage
 */
export function removeGuestToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(GUEST_TOKEN_KEY);
  }
}

// ============================================================================
// User Storage
// ============================================================================

/**
 * Save guest user info to local storage
 */
export function setGuestUser(user: GuestUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(GUEST_USER_KEY, JSON.stringify(user));
  }
}

/**
 * Get guest user info from local storage
 */
export function getGuestUser(): GuestUser | null {
  if (typeof window !== "undefined") {
    const userJson = localStorage.getItem(GUEST_USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson) as GuestUser;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Remove guest user info from local storage
 */
export function removeGuestUser(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(GUEST_USER_KEY);
  }
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Check if guest is currently authenticated
 */
export function isGuestAuthenticated(): boolean {
  return getGuestToken() !== null && getGuestUser() !== null;
}

/**
 * Log out guest user (clear all stored data)
 */
export function logoutGuest(): void {
  removeGuestToken();
  removeGuestUser();
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Register a new guest account
 *
 * @param data - Registration data (email, password, full_name)
 * @returns Guest auth response with user info and JWT token
 */
export async function registerGuest(
  data: GuestRegisterRequest
): Promise<GuestAuthResponse> {
  const response = await apiClient.post<GuestAuthResponse>(
    "/auth/register",
    data
  );

  // Store token and user info
  setGuestToken(response.data.token);
  setGuestUser(response.data.user);

  return response.data;
}

/**
 * Login as guest user
 *
 * @param data - Login data (email, password)
 * @returns Guest auth response with user info and JWT token
 */
export async function loginGuest(
  data: GuestLoginRequest
): Promise<GuestAuthResponse> {
  const response = await apiClient.post<GuestAuthResponse>(
    "/auth/guest/login",
    data
  );

  // Store token and user info
  setGuestToken(response.data.token);
  setGuestUser(response.data.user);

  return response.data;
}

/**
 * Get current guest user info from API
 *
 * @returns Guest user info
 */
export async function getCurrentGuest(): Promise<GuestUser> {
  const response = await apiClient.get<GuestUser>("/auth/guest/me");
  return response.data;
}

/**
 * Change current guest password
 * 
 * @param currentPassword - The current password
 * @param newPassword - The new password
 */
export async function changePasswordGuest(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/guest/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}


