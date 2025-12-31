import { createContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithCsrf } from "../lib/queryClient";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const navigate = useNavigate();

  // Initialize auth by checking with server (cookie is sent automatically)
  useEffect(() => {
    initializeAuth();
  }, []);

  async function initializeAuth() {
    try {
      // Validate session by calling /api/auth/me
      // httpOnly cookie is sent automatically with credentials: 'include'
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        setState({
          user: result.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        // Not authenticated or session expired
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: response.status === 401 ? null : "Session check failed",
        });
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      setState({
        user: null,
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
        credentials: "include", // Send/receive httpOnly cookies
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const { user } = result.data;

        // Cookie is set automatically by server (httpOnly)
        setState({
          user,
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
    try {
      // Call logout endpoint (cookie sent automatically, requires CSRF token)
      await fetchWithCsrf("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with local logout even if API call fails
    }

    // Clear local state (cookie is cleared by server)
    setState({
      user: null,
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
