import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { Camera, ChevronLeft, Heart, LogOut, Package } from 'lucide-react';
import OrderHistory from '@/components/profile/OrderHistory';
import AddressManager from '@/components/profile/AddressManager';

export default function Profile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const me = await appClient.auth.me();
        setUser(me);
      } catch {
        navigate('/login?next=/profile', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    await appClient.auth.logout();
    navigate('/');
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const { file_url: avatarUrl } = await appClient.integrations.Core.UploadFile({
        file,
        folder: 'customers',
      });
      await appClient.auth.updateMe({ avatar_url: avatarUrl });
      setUser((prev) => ({ ...prev, avatar_url: avatarUrl }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-cream pb-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-paddy border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.full_name || user.display_name || user.email?.split('@')[0] || 'Yasvik member';
  const avatarUrl = user.avatar_url || user.profile_image_url || '';

  return (
    <div className="min-h-screen bg-warm-cream pb-24 text-deep-forest">
      <div className="sticky top-0 z-20 border-b border-soft-border bg-warm-cream/95 px-4 py-5 backdrop-blur-md md:px-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-1 font-inter text-sm text-deep-forest/55"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="font-cormorant text-3xl font-semibold text-deep-forest">My account</h1>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl border border-soft-border bg-white p-6 text-center shadow-[0_8px_24px_rgba(31,61,43,0.05)]"
        >
          <div className="relative mx-auto mb-4 h-24 w-24">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-soft-border bg-warm-cream">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-cormorant text-3xl font-semibold text-deep-forest/70">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-soft-border bg-white text-neon-paddy shadow-sm transition-colors hover:bg-warm-cream disabled:opacity-50"
              aria-label="Upload profile photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">{displayName}</h2>
          <p className="mt-1 font-inter text-sm text-deep-forest/55">{user.email}</p>
          {user.phone || user.phone_number ? (
            <p className="mt-1 font-inter text-sm text-deep-forest/45">{user.phone || user.phone_number}</p>
          ) : null}
        </motion.div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <Link
            to="/wishlist"
            className="flex items-center gap-3 rounded-2xl border border-soft-border bg-white px-4 py-3.5 transition-colors hover:border-neon-paddy/30"
          >
            <Heart className="h-5 w-5 text-neon-paddy" />
            <span className="font-inter text-sm font-semibold text-deep-forest">Wishlist</span>
          </Link>
          <Link
            to="/shop"
            className="flex items-center gap-3 rounded-2xl border border-soft-border bg-white px-4 py-3.5 transition-colors hover:border-neon-paddy/30"
          >
            <Package className="h-5 w-5 text-neon-paddy" />
            <span className="font-inter text-sm font-semibold text-deep-forest">Shop again</span>
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <AddressManager user={user} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <h3 className="mb-5 font-cormorant text-2xl font-semibold text-deep-forest">Order history</h3>
          <OrderHistory userEmail={user.email} userId={user.id} />
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 py-3 font-inter text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </motion.button>
      </div>
    </div>
  );
}
