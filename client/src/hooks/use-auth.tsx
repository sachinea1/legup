import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { User, LoginData, InsertUser, PasswordResetRequest, PasswordReset } from "@shared/schema";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ user: User; token: string }, Error, LoginData>;
  signupMutation: UseMutationResult<{ user: User; token: string }, Error, InsertUser>;
  logoutMutation: UseMutationResult<void, Error, void>;
  passwordResetRequestMutation: UseMutationResult<{ message: string }, Error, PasswordResetRequest>;
  passwordResetMutation: UseMutationResult<{ message: string }, Error, PasswordReset>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user profile
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return null;

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("auth_token");
            return null;
          }
          throw new Error("Failed to fetch user");
        }

        const data = await response.json();
        return data.user;
      } catch (error) {
        localStorage.removeItem("auth_token");
        return null;
      }
    },
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      queryClient.setQueryData(["auth", "me"], data.user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.name}!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Signup failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      queryClient.setQueryData(["auth", "me"], data.user);
      toast({
        title: "Account created",
        description: `Welcome to CleanFlow, ${data.user.name}!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem("auth_token");
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
  });

  // Password reset request mutation
  const passwordResetRequestMutation = useMutation({
    mutationFn: async (data: PasswordResetRequest) => {
      const response = await fetch("/api/auth/password-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Password reset request failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Reset link sent",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Reset request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Password reset mutation
  const passwordResetMutation = useMutation({
    mutationFn: async (data: PasswordReset) => {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Password reset failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password reset successful",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set up axios interceptor for auth token
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      // This ensures all API requests include the auth header
      const originalFetch = window.fetch;
      window.fetch = function(input, init) {
        const headers = new Headers(init?.headers);
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        
        return originalFetch(input, {
          ...init,
          headers,
        });
      };
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        signupMutation,
        logoutMutation,
        passwordResetRequestMutation,
        passwordResetMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}