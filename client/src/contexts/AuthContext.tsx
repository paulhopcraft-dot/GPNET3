import { createContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export type UserRole = "admin" | "employer" | "clinician" | "insurer";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  subrole: string | null;
  companyId: string | null;
  insurerId: string | null;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "gpnet_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const navigate = useNavigate();

  // Initialize auth from localStorage on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  async function initializeAuth() {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Validate token by calling /api/auth/me
      const response = await fetch("/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setState({
          user: result.data.user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        // Token invalid or expired
        localStorage.removeItem(TOKEN_KEY);
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: response.status === 401 ? "Session expired. Please login again." : null,
        });
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      localStorage.removeItem(TOKEN_KEY);
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: "Failed to restore session",
      });
    }
  }

  async function login(email: string, password: string) {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const { user, accessToken } = result.data;

        // Store token in localStorage
        localStorage.setItem(TOKEN_KEY, accessToken);

        setState({
          user,
          token: accessToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Navigate to dashboard
        navigate("/");
      } else {
        // Login failed
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.message || "Invalid email or password",
        }));
      }
    } catch (error) {
      console.error("Login error:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "Network error. Please check your connection and try again.",
      }));
    }
  }

  async function logout() {
    const token = state.token;

    try {
      // Call logout endpoint if token exists
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with local logout even if API call fails
    }

    // Clear local state and storage
    localStorage.removeItem(TOKEN_KEY);
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    // Navigate to login
    navigate("/login");
  }

  function clearError() {
    setState(prev => ({ ...prev, error: null }));
  }

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Helper function to get token for API calls
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Helper function to clear auth on 401 responses
export function handleUnauthorized(navigate: ReturnType<typeof useNavigate>) {
  localStorage.removeItem(TOKEN_KEY);
  navigate("/login");
}
