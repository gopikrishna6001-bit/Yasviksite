import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { Loader2 } from "lucide-react";
import AuthLayout, { AuthField, AuthInput, AuthNotice } from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import YasvikButton from "@/components/brand/YasvikButton";
import { isGoogleAuthEnabled } from "@/lib/googleAuth";

export default function Login() {
  const location = useLocation();
  const next = new URLSearchParams(location.search).get("next") || "/";
  const googleEnabled = isGoogleAuthEnabled();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await appClient.auth.loginViaEmailPassword(email, password);
      window.location.href = next;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
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

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to Yasvik"
      subtitle="Order consciously sourced staples, track your profile, and pick up where you left off."
      footer={
        <>
          New here?{" "}
          <Link to={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-forest-canopy hover:underline">
            Create an account
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
          Google sign-in needs to be enabled in site settings. Use email and password for now.
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

        <AuthField
          id="password"
          label="Password"
          hint={
            <Link to="/forgot-password" className="font-semibold text-forest-canopy hover:underline">
              Forgot password?
            </Link>
          }
        >
          <AuthInput
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </AuthField>

        <YasvikButton
          type="submit"
          className="w-full disabled:opacity-60"
          disabled={loading || googleLoading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </YasvikButton>
      </form>
    </AuthLayout>
  );
}
