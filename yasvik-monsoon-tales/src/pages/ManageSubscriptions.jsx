import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useState } from 'react';
import { ChevronLeft, Pause, Play, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ManageSubscriptions() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [pauseDays, setPauseDays] = useState(30);

  // Get current user
  useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const me = await appClient.auth.me();
      setUser(me);
      return me;
    },
  });

  // Get user's subscriptions
  const { data: userSubscriptions = [], isLoading } = useQuery({
    queryKey: ['user-subscriptions', user?.email],
    queryFn: () => {
      if (!user?.email) return [];
      return appClient.entities.UserSubscription.filter({ user_email: user.email }, '-created_date', 10);
    },
    enabled: !!user?.email,
  });

  // Get subscription plans data
  const { data: allSubscriptions = {} } = useQuery({
    queryKey: ['subscription-details', userSubscriptions.map(s => s.subscription_id)],
    queryFn: async () => {
      const result = {};
      for (const sub of userSubscriptions) {
        try {
          const plan = await appClient.entities.Subscription.get(sub.subscription_id);
          result[sub.subscription_id] = plan;
        } catch (e) {
          console.error('Failed to fetch subscription:', e);
        }
      }
      return result;
    },
    enabled: userSubscriptions.length > 0,
  });

  const pauseMutation = useMutation({
    mutationFn: async (id) => {
      const pauseDate = new Date();
      pauseDate.setDate(pauseDate.getDate() + pauseDays);
      return appClient.entities.UserSubscription.update(id, {
        status: 'paused',
        paused_until: pauseDate.toISOString().split('T')[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      setEditingId(null);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id) => appClient.entities.UserSubscription.update(id, {
      status: 'active',
      paused_until: null,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => appClient.entities.UserSubscription.update(id, { status: 'cancelled' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] }),
  });

  const modifyDeliveryMutation = useMutation({
    mutationFn: (id, newDate) => appClient.entities.UserSubscription.update(id, {
      next_delivery_date: newDate,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      setEditingId(null);
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-rain-mist flex items-center justify-center pb-24">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rain-cloud/40 mx-auto mb-3" />
          <p className="font-inter text-sm text-rain-cloud/50">Loading your subscriptions...</p>
        </div>
      </div>
    );
  }

  const activeCount = userSubscriptions.filter(s => s.status === 'active').length;
  const pausedCount = userSubscriptions.filter(s => s.status === 'paused').length;

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {/* Header */}
      <div className="px-6 py-8 bg-white border-b border-border/20">
        <div className="max-w-2xl mx-auto">
          <Link to="/" className="flex items-center gap-1 text-rain-cloud/60 font-inter text-sm mb-4 inline-flex">
            <ChevronLeft className="w-4 h-4" />
            Home
          </Link>
          <h1 className="font-cormorant text-3xl text-rain-cloud font-medium mb-2">My Subscriptions</h1>
          <p className="font-inter text-sm text-rain-cloud/60">View, pause, and manage your monthly plans.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white rounded-xl p-4 border border-border/20">
            <p className="font-inter text-[10px] text-rain-cloud/50 mb-1">Active Plans</p>
            <p className="font-cormorant text-3xl text-rain-cloud font-medium">{activeCount}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-border/20">
            <p className="font-inter text-[10px] text-rain-cloud/50 mb-1">Paused</p>
            <p className="font-cormorant text-3xl text-rain-cloud font-medium">{pausedCount}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-rain-cloud/40 mx-auto mb-2" />
            <p className="font-inter text-sm text-rain-cloud/50">Loading subscriptions...</p>
          </div>
        ) : userSubscriptions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-border/20">
            <AlertCircle className="w-12 h-12 text-rain-cloud/20 mx-auto mb-3" />
            <h3 className="font-cormorant text-lg text-rain-cloud font-light mb-2">No Active Subscriptions</h3>
            <p className="font-inter text-sm text-rain-cloud/60 mb-4">
              Subscribe to a monthly plan to get regular deliveries of your favorite products.
            </p>
            <Link
              to="/subscriptions"
              className="inline-block px-6 py-2.5 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90"
            >
              View Plans
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {userSubscriptions.map((sub, i) => {
              const plan = allSubscriptions[sub.subscription_id];
              const isPaused = sub.status === 'paused';
              const nextDelivery = sub.next_delivery_date ? new Date(sub.next_delivery_date) : null;
              const pausedUntil = sub.paused_until ? new Date(sub.paused_until) : null;

              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-2xl p-5 border transition-all ${
                    isPaused
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-border/20'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-cormorant text-xl text-rain-cloud font-light">{plan?.title || 'Plan'}</h3>
                      <p className="font-inter text-xs text-rain-cloud/50 mt-0.5">
                        {sub.billing_cycle.charAt(0).toUpperCase() + sub.billing_cycle.slice(1)} Plan
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-cormorant text-lg text-rain-cloud">₹{plan?.price}/mo</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-[9px] font-inter font-medium mt-1 ${
                        isPaused
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-forest-canopy/10 text-forest-canopy'
                      }`}>
                        {sub.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Delivery info */}
                  <div className="bg-white/60 rounded-lg p-3 mb-4 text-xs space-y-2">
                    {nextDelivery && (
                      <div>
                        <p className="text-rain-cloud/50">Next Delivery</p>
                        <p className="font-inter text-rain-cloud">
                          {nextDelivery.toLocaleDateString('en-IN', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    )}
                    {sub.last_delivery_date && (
                      <div>
                        <p className="text-rain-cloud/50">Last Delivery</p>
                        <p className="font-inter text-rain-cloud">
                          {new Date(sub.last_delivery_date).toLocaleDateString('en-IN', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    )}
                    {isPaused && pausedUntil && (
                      <div className="bg-amber-100/50 rounded p-2">
                        <p className="text-amber-700 font-medium">
                          Paused until {pausedUntil.toLocaleDateString('en-IN', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Products */}
                  {plan?.product_ids && (
                    <div className="mb-4 pb-4 border-b border-border/20">
                      <p className="font-inter text-[10px] text-rain-cloud/50 mb-2">Includes {plan.product_ids.length} products</p>
                    </div>
                  )}

                  {/* Edit pause form */}
                  {editingId === sub.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-rain-mist rounded-lg p-4 mb-4"
                    >
                      <p className="font-inter text-xs text-rain-cloud/60 mb-3">Pause for how many days?</p>
                      <div className="flex gap-2 mb-3">
                        {[7, 14, 30, 60].map(days => (
                          <button
                            key={days}
                            onClick={() => setPauseDays(days)}
                            className={`px-3 py-1.5 rounded-full font-inter text-xs transition-all ${
                              pauseDays === days
                                ? 'bg-wet-earth text-white'
                                : 'bg-white border border-border text-rain-cloud/60'
                            }`}
                          >
                            {days}d
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => pauseMutation.mutate(sub.id)}
                          disabled={pauseMutation.isPending}
                          className="flex-1 py-2 bg-wet-earth text-white font-inter text-xs rounded-lg hover:bg-wet-earth/90 disabled:opacity-60 flex items-center justify-center gap-1"
                        >
                          {pauseMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
                          Confirm
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 py-2 border border-border text-rain-cloud font-inter text-xs rounded-lg hover:bg-rain-mist"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {isPaused ? (
                      <button
                        onClick={() => resumeMutation.mutate(sub.id)}
                        disabled={resumeMutation.isPending}
                        className="flex-1 py-2.5 rounded-lg border border-forest-canopy/30 text-forest-canopy font-inter text-xs hover:bg-forest-canopy/5 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                      >
                        {resumeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingId(sub.id)}
                        disabled={editingId !== null}
                        className="flex-1 py-2.5 rounded-lg border border-amber-200 text-amber-700 font-inter text-xs hover:bg-amber-50 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        Pause
                      </button>
                    )}

                    <button
                      onClick={() => setEditingId(`modify-${sub.id}`)}
                      disabled={editingId !== null}
                      className="flex-1 py-2.5 rounded-lg border border-border/20 text-rain-cloud/60 font-inter text-xs hover:bg-rain-mist transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Modify
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('Cancel this subscription? You can resubscribe anytime.')) {
                          cancelMutation.mutate(sub.id);
                        }
                      }}
                      disabled={cancelMutation.isPending}
                      className="w-10 h-10 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-all disabled:opacity-60 flex items-center justify-center"
                    >
                      {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}