"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  authApi,
  type LoginInitRequest,
  ApiServiceError,
  TokenManager
} from "@/lib/api";

interface AuthProps {
  onSuccessfulLogin: (accessToken: string) => void;
}

export default function Auth({ onSuccessfulLogin }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState<LoginInitRequest>({
    username: "",
    password: "",
  });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // Validate email and password fields
  const validateLoginForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!loginData.username.trim()) {
      errors.username = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.username)) {
      errors.username = "Please enter a valid email address";
    }

    if (!loginData.password.trim()) {
      errors.password = "Password is required";
    } else if (loginData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit login form
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateLoginForm()) return;

    setLoading(true);
    try {
      const response = await authApi.loginInit(loginData);

      if (response?.access_token) {
        toast.success("Login successful!");
        TokenManager.setToken(response.access_token); // <-- ✅ Add this
        onSuccessfulLogin(response.access_token);
      } else {
        toast.error("Authentication failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof ApiServiceError) {
        if (error.status === 400 || error.status === 401) {
          toast.error("Invalid email or password.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card border-border shadow-lg">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto w-18 h-18 bg-primary/10 rounded-full flex items-center justify-center">
          <img
            src="/logo.jpg"
            alt="Logo"
            className="h-full w-full rounded-md object-contain"
          />
        </div>
        <CardTitle className="text-2xl font-heading text-foreground">
          Sat Saheb 🙏
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={loginData.username}
                onChange={(e) => {
                  setLoginData({ ...loginData, username: e.target.value });
                  if (loginErrors.username)
                    setLoginErrors({ ...loginErrors, username: "" });
                }}
                className={`pl-10 ${loginErrors.username ? "border-destructive" : ""}`}
                disabled={loading}
                autoComplete="email"
              />
            </div>
            {loginErrors.username && (
              <p className="text-sm text-destructive">{loginErrors.username}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) => {
                  setLoginData({ ...loginData, password: e.target.value });
                  if (loginErrors.password)
                    setLoginErrors({ ...loginErrors, password: "" });
                }}
                className={`pl-10 ${loginErrors.password ? "border-destructive" : ""}`}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            {loginErrors.password && (
              <p className="text-sm text-destructive">
                {loginErrors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
