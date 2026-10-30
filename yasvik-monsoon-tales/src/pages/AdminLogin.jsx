import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { Loader2 } from 'lucide-react';
import AuthLayout, { AuthField, AuthInput, AuthNotice } from '@/components/AuthLayout';
import GoogleIcon from '@/components/GoogleIcon';
import YasvikButton from '@/components/brand/YasvikButton';
import { isGoogleAuthEnabled } from '@/lib/googleAuth';
import { applyAdminPwaHead } from '@/lib/pwaUtils';
import { adminLandingPath, isAdminRole } from '@/lib/adminAccess';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const googleEnabled = isGoogleAuthEnabled();

  useEffect(() => applyAdminPwaHead(), []);

  const handleCashierSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await appClient.auth.loginViaEmailPassword(email.trim(), password);
      const me = await appClient.auth.me();
      if (!isAdminRole(me?.role) || me?.is_active === false) {
        await appClient.auth.logout();
        throw new Error('Your account is not authorized for admin access');
      }
      if (me.role === 'admin' || me.role === 'manager') {
        await appClient.auth.logout();
        throw new Error('Administrators and managers must sign in with Google');
      }
      navigate(adminLandingPath(me.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Staff login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await appClient.auth.loginWithProvider('google', '/admin');
    } catch (err) {
      setError(err.message || 'Could not start Google sign-in');
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Admin access"
      title="Yasvik console"
      subtitle="Administrators and managers sign in with Google each day. Cashiers use staff credentials."
    >
      {googleEnabled ? (
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="yasvik-btn-outline mb-6 flex w-full items-center justify-center gap-2 disabled:opacity-60"
        >
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-5 w-5" />}
          Continue with Google
        </button>
      ) : (
        <div className="mb-6">
          <AuthNotice tone="error">
            Google sign-in is required for administrators and managers, but it is not enabled on this deployment.
          </AuthNotice>
        </div>
      )}

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--theme-border)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-deep-forest/40">
            Cashier credentials only
          </span>
        </div>
      </div>

      {error ? <div className="mb-4"><AuthNotice tone="error">{error}</AuthNotice></div> : null}

      <form onSubmit={handleCashierSubmit} className="space-y-4">
        <AuthField id="email" label="Cashier email">
          <AuthInput
            id="email"
            type="email"
            autoComplete="username"
            placeholder="cashier@yasvik.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </AuthField>

        <AuthField id="password" label="Password">
          <AuthInput
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Cashier password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </AuthField>

        <YasvikButton type="submit" className="w-full disabled:opacity-60" disabled={loading || googleLoading}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </span>
          ) : (
            'Enter as cashier'
          )}
        </YasvikButton>
      </form>
    </AuthLayout>
  );
}
