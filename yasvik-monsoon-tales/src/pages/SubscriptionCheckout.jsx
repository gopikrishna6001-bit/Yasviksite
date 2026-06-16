import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { ChevronLeft, Loader2, Check } from 'lucide-react';

export default function SubscriptionCheckout() {
  const { id: subscriptionId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [agreed, setAgreed] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Get current user
  useQuery({
    queryKey: ['checkout-user'],
    queryFn: async () => {
      const me = await appClient.auth.me();
      setUser(me);
      return me;
    },
  });

  // Fetch subscription details
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription-checkout', subscriptionId],
    queryFn: () => appClient.entities.Subscription.get(subscriptionId),
    enabled: !!subscriptionId,
  });

  // Create subscription mutation
  const createSubMutation = useMutation({
    mutationFn: async () => {
      const res = await appClient.functions.invoke('razorpayCreateSubscription', {
        subscription_id: subscriptionId,
        billing_cycle: billingCycle,
        customer_name: user?.full_name || '',
        customer_email: user?.email || '',
        customer_phone: '',
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.order_id) {
        // Open Razorpay checkout
        initializeRazorpay(data);
      }
    },
    onError: (error) => {
      alert('Failed to create subscription: ' + error.message);
    },
  });

  const initializeRazorpay = (orderData) => {
    if (!window.Razorpay) {
      alert('Razorpay SDK not loaded');
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      order_id: orderData.order_id,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Yasvik Monthly Essentials',
      description: subscription.title,
      prefill: {
        name: user?.full_name || '',
        email: user?.email || '',
      },
      handler: async (response) => {
        // Verify payment
        try {
          const verifyRes = await appClient.functions.invoke('razorpayVerifyPayment', {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            user_subscription_id: orderData.user_subscription_id,
            subscription_id: subscriptionId,
          });

          setPaymentStatus('success');
          setTimeout(() => {
            navigate('/manage-subscriptions');
          }, 2000);
        } catch (err) {
          alert('Payment verification failed: ' + err.message);
        }
      },
      modal: {
        ondismiss: () => {
          setPaymentStatus(null);
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-rain-mist flex items-center justify-center pb-24">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-rain-cloud/40 mx-auto mb-3" />
          <p className="font-inter text-sm text-rain-cloud/50">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-rain-mist px-6 py-12 flex items-center justify-center">
        <div className="text-center">
          <p className="font-inter text-sm text-rain-cloud/60 mb-4">Subscription not found</p>
          <Link to="/subscriptions" className="text-wet-earth font-inter text-sm">
            Back to plans
          </Link>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-rain-mist flex items-center justify-center pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-forest-canopy/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-forest-canopy" />
          </div>
          <h2 className="font-cormorant text-2xl text-rain-cloud mb-2">Subscription Active!</h2>
          <p className="font-inter text-sm text-rain-cloud/60 mb-4">
            Your monthly essentials plan is now active. You'll receive your first delivery soon.
          </p>
          <p className="font-inter text-xs text-rain-cloud/50">Redirecting to your subscriptions...</p>
        </motion.div>
      </div>
    );
  }

  const priceWithCycle = {
    monthly: subscription.price,
    quarterly: subscription.price * 3,
    annual: subscription.price * 12,
  };

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {/* Header */}
      <div className="px-6 py-6 bg-white border-b border-border/20">
        <div className="max-w-2xl mx-auto">
          <Link to="/subscriptions" className="flex items-center gap-1 text-rain-cloud/60 font-inter text-sm mb-4 inline-flex">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="font-cormorant text-3xl text-rain-cloud font-medium">Complete Your Subscription</h1>
        </div>
      </div>

      {/* Checkout form */}
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Order summary */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-border/20">
            <h2 className="font-cormorant text-xl text-rain-cloud font-light mb-6">Order Summary</h2>

            {/* Plan details */}
            <div className="mb-6 pb-6 border-b border-border/20">
              <h3 className="font-cormorant text-lg text-rain-cloud font-light mb-2">{subscription.title}</h3>
              <p className="font-inter text-sm text-rain-cloud/60 mb-4">{subscription.description}</p>

              {subscription.highlights?.length > 0 && (
                <ul className="space-y-2">
                  {subscription.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 font-inter text-xs text-rain-cloud/60">
                      <span className="w-1 h-1 rounded-full bg-forest-canopy" />
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Billing cycle selection */}
            <div className="mb-6">
              <p className="font-inter text-sm text-rain-cloud/60 mb-3">Billing Cycle</p>
              <div className="space-y-2">
                {['monthly', 'quarterly', 'annual'].map(cycle => (
                  <label key={cycle} className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-rain-mist transition-colors" style={{
                    borderColor: billingCycle === cycle ? '#6E5846' : undefined,
                    backgroundColor: billingCycle === cycle ? '#EEF4EA' : undefined,
                  }}>
                    <input
                      type="radio"
                      name="billing_cycle"
                      value={cycle}
                      checked={billingCycle === cycle}
                      onChange={(e) => setBillingCycle(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-inter text-sm text-rain-cloud font-medium capitalize">{cycle}</p>
                      <p className="font-inter text-xs text-rain-cloud/50">
                        ₹{priceWithCycle[cycle]}{cycle === 'monthly' ? '/month' : `/${cycle === 'quarterly' ? '3 months' : 'year'}`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* User info */}
            <div className="mb-6">
              <p className="font-inter text-sm text-rain-cloud/60 mb-3">Delivery To</p>
              <div className="p-4 bg-rain-mist rounded-xl">
                <p className="font-inter text-sm text-rain-cloud font-medium">{user?.full_name}</p>
                <p className="font-inter text-xs text-rain-cloud/60 mt-1">{user?.email}</p>
              </div>
            </div>

            {/* Terms & conditions */}
            <label className="flex items-start gap-3 mb-6">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 mt-1"
              />
              <span className="font-inter text-xs text-rain-cloud/60">
                I agree to auto-recurring charges for this subscription. I can pause or cancel anytime from My Subscriptions.
              </span>
            </label>
          </div>

          {/* Price breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-border/20 h-fit">
            <h3 className="font-cormorant text-lg text-rain-cloud font-light mb-4">Price Breakdown</h3>
            <div className="space-y-3 mb-6 pb-6 border-b border-border/20">
              <div className="flex items-center justify-between">
                <span className="font-inter text-sm text-rain-cloud/60">Plan Price</span>
                <span className="font-cormorant text-sm text-rain-cloud">₹{priceWithCycle[billingCycle]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-inter text-sm text-rain-cloud/60">Billing</span>
                <span className="font-inter text-xs text-rain-cloud/50 capitalize">{billingCycle}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <span className="font-cormorant text-lg text-rain-cloud">Total</span>
              <span className="font-cormorant text-2xl text-rain-cloud font-medium">₹{priceWithCycle[billingCycle]}</span>
            </div>

            <button
              onClick={() => createSubMutation.mutate()}
              disabled={!agreed || createSubMutation.isPending}
              className="w-full py-3 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createSubMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </button>

            <p className="font-inter text-[10px] text-rain-cloud/40 text-center mt-4">
              Secure payment via Razorpay
            </p>
          </div>
        </div>
      </div>

      {/* Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}