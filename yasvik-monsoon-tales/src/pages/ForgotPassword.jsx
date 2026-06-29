import React, { useState } from "react";
import { Link } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout, { AuthField, AuthInput } from "@/components/AuthLayout";
import YasvikButton from "@/components/brand/YasvikButton";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await appClient.auth.resetPasswordRequest(email);
    } catch {
      // Always show success regardless
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout
      eyebrow="Account help"
      title="Reset your password"
      subtitle="We will email you a secure link to choose a new password."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-forest-canopy hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="text-center font-inter text-sm leading-6 text-deep-forest/70">
          If an account exists with that email, you&apos;ll receive a password reset link shortly.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField id="email" label="Email address">
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
          <YasvikButton type="submit" className="w-full disabled:opacity-60" disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </span>
            ) : (
              "Send reset link"
            )}
          </YasvikButton>
        </form>
      )}
    </AuthLayout>
  );
}
