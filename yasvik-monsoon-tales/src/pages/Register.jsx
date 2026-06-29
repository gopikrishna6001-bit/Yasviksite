import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout, { AuthField, AuthInput, AuthNotice } from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import YasvikButton from "@/components/brand/YasvikButton";
import { isGoogleAuthEnabled } from "@/lib/googleAuth";
import { toast } from "@/components/ui/use-toast";

export default function Register() {
  const location = useLocation();
  const next = new URLSearchParams(location.search).get("next") || "/";
  const googleEnabled = isGoogleAuthEnabled();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await appClient.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await appClient.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        appClient.auth.setToken(result.access_token);
      }
      window.location.href = next;
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await appClient.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await appClient.auth.loginWithProvider("google", next);
    } catch (err) {
      setError(err.message || "Could not start Google sign-in");
      setGoogleLoading(false);
    }
  };

  if (showOtp) {
    return (
      <AuthLayout
        eyebrow="Almost there"
        title="Verify your email"
        subtitle={`We sent a 6-digit code to ${email}`}
      >
        {error ? <div className="mb-4"><AuthNotice tone="error">{error}</AuthNotice></div> : null}
        <div className="mb-6 flex justify-center">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <YasvikButton
          className="w-full disabled:opacity-60"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </span>
          ) : (
            "Verify and continue"
          )}
        </YasvikButton>
        <p className="mt-4 text-center font-inter text-sm text-deep-forest/55">
          Didn&apos;t receive the code?{" "}
          <button type="button" onClick={handleResend} className="font-semibold text-forest-canopy hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Join Yasvik"
      title="Create your account"
      subtitle="Save your profile, wishlist, and orders — from the store and from your phone."
      footer={
        <>
          Already have an account?{" "}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-forest-canopy hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {googleEnabled ? (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="yasvik-btn-outline mb-6 flex w-full items-center justify-center gap-2 disabled:opacity-60"
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-5 w-5" />}
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--theme-border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-deep-forest/40">
                or use email
              </span>
            </div>
          </div>
        </>
      ) : (
        <AuthNotice className="mb-5">
          Google sign-up needs to be enabled in site settings. Create your account with email instead.
        </AuthNotice>
      )}

      {error ? <div className="mb-4"><AuthNotice tone="error">{error}</AuthNotice></div> : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField id="email" label="Email">
          <AuthInput
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </AuthField>
        <AuthField id="password" label="Password">
          <AuthInput
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </AuthField>
        <AuthField id="confirm" label="Confirm password">
          <AuthInput
            id="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </AuthField>
        <YasvikButton type="submit" className="w-full disabled:opacity-60" disabled={loading || googleLoading}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </YasvikButton>
      </form>
    </AuthLayout>
  );
}
