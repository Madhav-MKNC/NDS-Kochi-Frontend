"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import { authApi, type LoginInitRequest, type VerifyOtpRequest, ApiServiceError } from "@/lib/api";

interface AuthProps {
  onSuccessfulLogin: () => void;
}

type AuthStep = "login" | "otp";

export default function Auth({ onSuccessfulLogin }: AuthProps) {
  const [step, setStep] = useState<AuthStep>("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  // Login form state
  const [loginData, setLoginData] = useState<LoginInitRequest>({
    username: "",
    password: "",
  });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // OTP form state
  const [otpData, setOtpData] = useState<VerifyOtpRequest>({
    email: "",
    code: "",
  });
  const [otpErrors, setOtpErrors] = useState<Record<string, string>>({});

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

  const validateOtpForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!otpData.code.trim()) {
      errors.code = "OTP code is required";
    } else if (!/^\d{6}$/.test(otpData.code)) {
      errors.code = "OTP must be 6 digits";
    }

    setOtpErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateLoginForm()) return;

    setLoading(true);
    try {
      const response = await authApi.loginInit(loginData);

      if (response.msg === "OTP sent") {
        setEmail(loginData.username);
        setOtpData({ email: loginData.username, code: "" });
        setStep("otp");
        toast.success("OTP sent to your email address");
      }
    } catch (error) {
      if (error instanceof ApiServiceError) {
        if (error.status === 400) {
          toast.error("Invalid email or password");
        } else if (error.status === 401) {
          toast.error("Invalid credentials. Please check your email and password.");
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

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateOtpForm()) return;

    setLoading(true);
    try {
      const response = await authApi.verifyOtp(otpData);

      if (response.access_token) {
        toast.success("Login successful!");
        onSuccessfulLogin();
      }
    } catch (error) {
      if (error instanceof ApiServiceError) {
        if (error.status === 400) {
          toast.error("Invalid or expired OTP. Please try again.");
        } else if (error.status === 401) {
          toast.error("Invalid OTP code. Please check and try again.");
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

  const handleBackToLogin = () => {
    setStep("login");
    setOtpData({ email: "", code: "" });
    setOtpErrors({});
  };

  const handleResendOtp = async () => {
    if (!email) return;

    setLoading(true);
    try {
      await authApi.loginInit({ username: email, password: loginData.password });
      toast.success("OTP resent to your email address");
    } catch (error) {
      if (error instanceof ApiServiceError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to resend OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <Card className="w-full max-w-md mx-auto bg-card border-border shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-heading text-foreground">Verify OTP</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter the 6-digit code sent to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-foreground">OTP Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otpData.code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpData({ ...otpData, code: value });
                  if (otpErrors.code) setOtpErrors({ ...otpErrors, code: "" });
                }}
                className={`text-center text-lg tracking-widest ${otpErrors.code ? "border-destructive" : ""}`}
                maxLength={6}
                disabled={loading}
                autoComplete="one-time-code"
              />
              {otpErrors.code && (
                <p className="text-sm text-destructive">{otpErrors.code}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Login"
              )}
            </Button>
          </form>

          <div className="flex flex-col gap-2 text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleResendOtp}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              Didn't receive the code? Resend OTP
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleBackToLogin}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-card border-border shadow-lg">
      <CardHeader className="text-center space-y-3">
        <div className="mx-auto w-18 h-18 bg-primary/10 rounded-full flex items-center justify-center">
          <img src="/logo.jpg" alt="Logo" className="h-full w-full rounded-md object-contain" />
        </div>
        <CardTitle className="text-2xl font-heading text-foreground">Sat Saheb 🙏</CardTitle>
        <CardDescription className="text-muted-foreground">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={loginData.username}
                onChange={(e) => {
                  setLoginData({ ...loginData, username: e.target.value });
                  if (loginErrors.username) setLoginErrors({ ...loginErrors, username: "" });
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

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) => {
                  setLoginData({ ...loginData, password: e.target.value });
                  if (loginErrors.password) setLoginErrors({ ...loginErrors, password: "" });
                }}
                className={`pl-10 ${loginErrors.password ? "border-destructive" : ""}`}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            {loginErrors.password && (
              <p className="text-sm text-destructive">{loginErrors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending OTP...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>

        {/* <div className="text-center">
          <p className="text-sm text-muted-foreground">
            We'll send you an OTP to verify your identity
          </p>
        </div> */}
      </CardContent>
    </Card>
  );
}