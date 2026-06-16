import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import GoogleIcon from '@/components/GoogleIcon';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const expectedUsername = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
  const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || '';
  const googleEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';

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

  return (
    <AuthLayout
      icon={Lock}
      title="Admin Login"
      subtitle="Restricted access for administrators"
    >
      {googleEnabled && (
        <>
          <Button
            variant="outline"
            className="w-full h-12 text-sm font-medium mb-6"
            onClick={() => appClient.auth.loginWithProvider('google', '/admin')}
            type="button"
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Continue with Google (Admin)
          </Button>
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">or</span>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Admin Username</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Admin Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            'Enter Admin Console'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
