import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Staff auth keys
const TOKEN_KEY = "hms_token";
const USER_KEY = "hms_user";

// Guest auth keys
const GUEST_TOKEN_KEY = "guest_token";
const GUEST_USER_KEY = "guest_user";

// Request interceptor to add JWT token
// Checks for both staff and guest tokens
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      // First check for staff token, then guest token
      const staffToken = localStorage.getItem(TOKEN_KEY);
      const guestToken = localStorage.getItem(GUEST_TOKEN_KEY);
      const token = staffToken || guestToken;

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ code: string; message: string }>) => {
    if (error.response?.status === 401) {
      // Clear tokens and redirect to login on unauthorized
      if (typeof window !== "undefined") {
        // Clear both staff and guest tokens
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(GUEST_TOKEN_KEY);
        localStorage.removeItem(GUEST_USER_KEY);

        // Only redirect if not already on login/register pages
        const path = window.location.pathname;
        if (!path.includes("/login") && !path.includes("/register")) {
          // Redirect to appropriate login page based on current path
          if (path.startsWith("/guest")) {
            window.location.href = "/login";
          } else {
            window.location.href = "/staff/login";
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// API error type
export interface ApiError {
  code: string;
  message: string;
}

// Helper to extract error message from API response
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    return apiError?.message || error.message || "An unexpected error occurred";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

// === Cleaner API Methods ===
import { type Room, type RoomStatus } from "./validators";

/**
 * Get rooms for cleaner dashboard
 * Defaults to showing dirty rooms if no status filter is provided
 */
export async function getCleanerRooms(
  status?: RoomStatus,
  roomType?: string
): Promise<Room[]> {
  const params: Record<string, string> = {};
  if (status) {
    params.status = status;
  }
  if (roomType) {
    params.room_type = roomType;
  }
  const response = await apiClient.get<Room[]>("/cleaner/rooms", { params });
  return response.data;
}

/**
 * Update room status (cleaner endpoint)
 * Cleaners can transition rooms: Dirty → Cleaning → Available
 */
export async function updateRoomStatus(
  roomId: string,
  status: RoomStatus
): Promise<Room> {
  const response = await apiClient.patch<Room>(`/cleaner/rooms/${roomId}/status`, {
    status,
  });
  return response.data;
}