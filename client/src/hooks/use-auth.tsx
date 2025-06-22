import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { User, LoginData, InsertUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ user: User; token: string }, Error, LoginData>;
  signupMutation: UseMutationResult<{ user: User; token: string }, Error, InsertUser>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user profile using httpOnly cookies
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["auth", "me"],
    staleTime: 0,
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: 'include', // Include httpOnly cookies
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return null;
          }
          throw new Error("Failed to fetch user profile");
        }

        const data = await response.json();
        return data.user;
      } catch (error) {
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      // Store token in localStorage as fallback for browser compatibility
      localStorage.setItem("auth_token", data.token);
      queryClient.setQueryData(["auth", "me"], data.user);
      
      // Clear all cached data to ensure fresh user-specific data  
      queryClient.clear();
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Signup failed");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      // Store token in localStorage as fallback for browser compatibility
      localStorage.setItem("auth_token", data.token);
      queryClient.setQueryData(["auth", "me"], data.user);
      toast({
        title: "Account created",
        description: "Welcome to CleanFlow!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Clear localStorage first to prevent auto-login
      localStorage.removeItem("auth_token");
      
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: 'include',
      });
    },
    onSuccess: () => {
      // Ensure localStorage is cleared
      localStorage.removeItem("auth_token");
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
      
      // Force page reload to clear all state
      window.location.href = '/auth';
      window.location.reload();
    },
    onError: () => {
      // Clear everything even on error
      localStorage.removeItem("auth_token");
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
      window.location.href = '/auth';
      window.location.reload();
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        signupMutation,
        logoutMutation,
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