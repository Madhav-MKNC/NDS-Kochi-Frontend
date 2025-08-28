"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface User {
  email: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  doRequest: <T = any>(
    url: string,
    options?: RequestInit
  ) => Promise<{ data?: T; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within ProtectedRoute");
  }
  return context;
};

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const clearTokenAndRedirect = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      toast.error("Session expired");
      router.push("/login");
      
      // Focus management for accessibility
      setTimeout(() => {
        const firstInput = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    }
  };

  const doRequest = async <T = any>(
    url: string, 
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string }> => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      
      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        clearTokenAndRedirect();
        return { error: "Unauthorized" };
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Request failed with status ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        return { error: errorMessage };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : "Network error occurred" 
      };
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("access_token");
      
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await doRequest<User>("/api/me");
        
        if (response.error) {
          clearTokenAndRedirect();
          return;
        }

        if (response.data) {
          setUser(response.data);
        }
      } catch (error) {
        clearTokenAndRedirect();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, doRequest }}>
      {children}
    </AuthContext.Provider>
  );
}