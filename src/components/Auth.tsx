"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, MailCheck, Undo, Key } from "lucide-react";

interface AuthProps {
  onSuccessfulLogin?: () => void;
}

export default function Auth({ onSuccessfulLogin }: AuthProps) {
  const [view, setView] = useState<"login" | "otp">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    otp: "",
    general: ""
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ email: "", password: "", otp: "", general: "" });

    // Validate inputs
    let hasErrors = false;
    const newErrors = { email: "", password: "", otp: "", general: "" };

    if (!email) {
      newErrors.email = "Email is required";
      hasErrors = true;
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
      hasErrors = true;
    }

    if (!password) {
      newErrors.password = "Password is required";
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch("/login-init", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setView("otp");
        toast.success(data.msg || "OTP sent to your email");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrors({ ...newErrors, general: errorData.message || "Login failed. Please try again." });
      }
    } catch (error) {
      setErrors({ ...newErrors, general: "Network error. Please check your connection." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ email: "", password: "", otp: "", general: "" });

    if (!otp || otp.length !== 6) {
      setErrors({ email: "", password: "", otp: "Please enter a valid 6-digit code", general: "" });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: otp,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store access token
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("token_type", data.token_type || "bearer");
        localStorage.setItem("token_expiry", Date.now() + (24 * 60 * 60 * 1000)); // 24 hours from now

        // Fetch user profile
        try {
          await fetch("/me", {
            headers: {
              "Authorization": `${data.token_type || "bearer"} ${data.access_token}`,
            },
          });
        } catch (error) {
          console.warn("Failed to fetch user profile:", error);
        }

        toast.success("Successfully logged in!");
        
        if (onSuccessfulLogin) {
          onSuccessfulLogin();
        }

        // Redirect to dashboard
        window.location.href = "/dashboard";
      } else {
        if (response.status === 401) {
          setErrors({ email: "", password: "", otp: "Invalid or expired OTP", general: "" });
        } else {
          const errorData = await response.json().catch(() => ({}));
          setErrors({ email: "", password: "", otp: "", general: errorData.message || "Verification failed. Please try again." });
        }
      }
    } catch (error) {
      setErrors({ email: "", password: "", otp: "", general: "Network error. Please check your connection." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    setOtp(numericValue);
    setErrors({ ...errors, otp: "" });
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const numericValue = pastedText.replace(/\D/g, "").slice(0, 6);
    setOtp(numericValue);
  };

  const goBackToLogin = () => {
    setView("login");
    setOtp("");
    setErrors({ email: "", password: "", otp: "", general: "" });
  };

  if (view === "otp") {
    return (
      <div className="w-full max-w-md mx-auto bg-card rounded-lg shadow-sm border p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
            Enter Verification Code
          </h1>
          <p className="text-muted-foreground">
            We sent a 6-digit code to {email}
          </p>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleOtpSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-sm font-medium">
              Verification Code
            </Label>
            <Input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => handleOtpChange(e.target.value)}
              onPaste={handleOtpPaste}
              placeholder="000000"
              className="text-center text-2xl tracking-widest"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="Enter 6-digit verification code"
              disabled={isLoading}
              autoComplete="one-time-code"
            />
            {errors.otp && (
              <p className="text-sm text-destructive">{errors.otp}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              <>
                <MailCheck className="w-4 h-4 mr-2" />
                Verify Code
              </>
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={goBackToLogin}
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center"
              disabled={isLoading}
            >
              <Undo className="w-3 h-3 mr-1" />
              Change email
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-card rounded-lg shadow-sm border p-8">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
          Welcome Back
        </h1>
        <p className="text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleLoginSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors({ ...errors, email: "" });
            }}
            placeholder="Enter your email"
            disabled={isLoading}
            autoComplete="email"
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors({ ...errors, password: "" });
            }}
            placeholder="Enter your password"
            disabled={isLoading}
            autoComplete="current-password"
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {errors.password}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full mt-6"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Signing In...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4 mr-2" />
              Continue
            </>
          )}
        </Button>
      </form>
    </div>
  );
}