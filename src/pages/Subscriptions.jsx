import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Zap } from 'lucide-react';
import { useState } from 'react';

export default function Subscriptions() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Get current user
  useQuery({
    queryKey: ['subscriptions-user'],
    queryFn: async () => {
      const me = await appClient.auth.me();
      setUser(me);
      return me;
    },
  });

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => appClient.entities.Subscription.filter({ is_published: true }, 'price', 20),
  });

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {/* Hero */}
      <div className="px-6 py-12 text-center max-w-2xl mx-auto">
        <h1 className="font-cormorant text-4xl text-rain-cloud font-medium mb-3">Monthly Essentials</h1>
        <p className="font-inter text-sm text-rain-cloud/60">
          Curated combos delivered monthly. Never run out of heritage staples.
        </p>
      </div>

      {/* Subscription cards */}
      <div className="px-5 space-y-5 max-w-lg mx-auto pb-8">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl h-48 animate-pulse" />
          ))
        ) : subscriptions.length === 0 ? (
          <p className="text-center font-inter text-sm text-rain-cloud/40 py-12">No plans available yet.</p>
        ) : (
          subscriptions.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl overflow-hidden border-2 transition-all ${
                sub.is_featured ? 'border-warm-turmeric bg-warm-turmeric/5' : 'border-border bg-white'
              }`}
            >
              {sub.hero_image && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={sub.hero_image} alt={sub.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-5">
                {sub.is_featured && (
                  <div className="flex items-center gap-1.5 mb-3 text-warm-turmeric">
                    <Zap className="w-4 h-4" />
                    <span className="font-inter text-[10px] font-medium uppercase tracking-wider">Most Popular</span>
                  </div>
                )}

                <h3 className="font-cormorant text-2xl text-rain-cloud font-light mb-1">{sub.title}</h3>
                <p className="font-inter text-xs text-rain-cloud/50 mb-3">{sub.description}</p>

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="font-cormorant text-3xl text-rain-cloud font-medium">₹{sub.price}</span>
                  <span className="font-inter text-xs text-rain-cloud/50">/{sub.billing_cycle}</span>
                </div>

                {/* Highlights */}
                {sub.highlights?.length > 0 && (
                  <div className="space-y-2 mb-5">
                    {sub.highlights.map((h, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-forest-canopy flex-shrink-0" />
                        <span className="font-inter text-xs text-rain-cloud/60">{h}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => user ? navigate(`/subscribe/${sub.id}`) : appClient.auth.redirectToLogin(`/subscribe/${sub.id}`)}
                  className="w-full py-3 rounded-full font-inter text-sm transition-all"
                  style={{
                    backgroundColor: sub.is_featured ? '#D1A14B' : '#6E5846',
                    color: 'white',
                  }}
                >
                  Subscribe Now
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}