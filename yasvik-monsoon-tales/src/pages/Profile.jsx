import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { ChevronLeft, LogOut, Heart, Compass, UtensilsCrossed, Mail } from 'lucide-react';
import OrderHistory from '@/components/profile/OrderHistory';
import AddressManager from '@/components/profile/AddressManager';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const me = await appClient.auth.me();
        setUser(me);
      } catch (err) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-rain-mist flex items-center justify-center pb-24">
        <div className="w-8 h-8 border-2 border-temple-stone border-t-wet-earth rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;



  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {/* Header */}
      <div className="px-6 py-6 bg-white border-b border-border/20 sticky top-0 z-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-rain-cloud/60 font-inter text-sm mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="font-cormorant text-3xl text-rain-cloud font-medium">My Profile</h1>
      </div>

      <div className="px-6 py-8 max-w-2xl mx-auto">
        {/* User info card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 mb-8 border border-border/20 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-temple-stone/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-cormorant text-rain-cloud font-light">
              {user.full_name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="font-cormorant text-2xl text-rain-cloud font-light">{user.full_name}</h2>
          <p className="font-inter text-sm text-rain-cloud/50 mt-1">{user.email}</p>
        </motion.div>

        {/* Address Manager */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AddressManager userEmail={user.email} />
        </motion.div>

        {/* Order History */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h3 className="font-cormorant text-xl text-rain-cloud font-light mb-6">Order History</h3>
          <OrderHistory userEmail={user.email} />
        </motion.div>

        {/* Navigation Hub */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h3 className="font-cormorant text-xl text-rain-cloud font-light mb-6">Explore Yasvik</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Shop', path: '/shop', icon: UtensilsCrossed },
              { label: 'Our Roots', path: '/our-roots', icon: Compass },
              { label: 'Wishlist', path: '/wishlist', icon: Heart },
              { label: 'Contact', path: '/contact', icon: Mail },
            ].map(({ label, path, icon: Icon }, i) => (
              <motion.div
                key={path}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.42 + i * 0.03 }}
              >
                <Link
                  to={path}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white border border-border/20 hover:border-wet-earth/40 hover:shadow-md transition-all"
                >
                  <Icon className="w-5 h-5 text-rain-cloud/60" />
                  <span className="font-inter text-xs text-rain-cloud/70 text-center">{label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Logout */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-inter text-sm rounded-full hover:bg-red-100 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </motion.button>
      </div>
    </div>
  );
}
