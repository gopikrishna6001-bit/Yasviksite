import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { Loader2 } from 'lucide-react';
import AuthLayout, { AuthField, AuthInput, AuthNotice } from '@/components/AuthLayout';
import GoogleIcon from '@/components/GoogleIcon';
import YasvikButton from '@/components/brand/YasvikButton';
import { isGoogleAuthEnabled } from '@/lib/googleAuth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const expectedUsername = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
  const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || '';
  const googleEnabled = isGoogleAuthEnabled();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (username !== expectedUsername) {
        throw new Error('Invalid admin username');
      }
      if (!expectedPassword || password !== expectedPassword) {
        throw new Error('Invalid admin password');
      }
      if (!adminEmail) {
        throw new Error('Admin email not configured');
      }

      await appClient.auth.loginViaEmailPassword(adminEmail, password);
      const me = await appClient.auth.me();
      if (!['admin', 'staff'].includes(String(me?.role || '').toLowerCase())) {
        await appClient.auth.logout();
        throw new Error('Your account is not authorized for admin access');
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Admin login failed');
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
      subtitle="Restricted access for administrators and staff."
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
            Continue with Google (Admin)
          </button>
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--theme-border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 font-inter text-[11px] font-semibold uppercase tracking-[0.14em] text-deep-forest/40">
                or use admin credentials
              </span>
            </div>
          </div>
        </>
      ) : null}

      {error ? <div className="mb-4"><AuthNotice tone="error">{error}</AuthNotice></div> : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField id="username" label="Admin username">
          <AuthInput
            id="username"
            type="text"
            autoComplete="username"
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </AuthField>

        <AuthField id="password" label="Admin password">
          <AuthInput
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your admin password"
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
            'Enter admin console'
          )}
        </YasvikButton>
      </form>
    </AuthLayout>
  );
}
