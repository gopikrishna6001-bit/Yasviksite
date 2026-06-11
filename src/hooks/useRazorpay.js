import { useState, useCallback } from 'react';
import { appClient } from '@/api/appClient';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useRazorpay() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initiatePayment = useCallback(async ({
    amountPaise,
    items = [],
    customer = {},
    onSuccess,
    onFailure,
    onDismiss,
  }) => {
    setError(null);
    setLoading(true);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      const msg = 'Failed to load Razorpay. Check your internet connection.';
      setError(msg);
      setLoading(false);
      onFailure?.(new Error(msg));
      return;
    }

    // 1. Create order on backend
    let orderData;
    try {
      const createRes = await appClient.functions.invoke('razorpayCreateOrder', {
        amount: amountPaise,
        currency: 'INR',
        items,
      });
      orderData = createRes.data;
    } catch (err) {
      const msg = err.message || 'Failed to create order. Please try again.';
      setError(msg);
      setLoading(false);
      onFailure?.(err);
      return;
    }

    if (!orderData?.order_id) {
      const msg = orderData?.error || 'Could not create order. Please try again.';
      setError(msg);
      setLoading(false);
      onFailure?.(new Error(msg));
      return;
    }

    setLoading(false);

    // 2. Open Razorpay modal
    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.order_id,
      name: 'Yasvik',
      description: 'Heritage Foods from Real Farms',
      image: '/yasvik-logo.png',
      prefill: {
        name: customer.name || '',
        email: customer.email || '',
        contact: customer.phone || '',
      },
      theme: { color: '#6E5846' },
      handler: async (response) => {
        // 3. Verify payment on backend
        setLoading(true);
        try {
          const verifyRes = await appClient.functions.invoke('razorpayVerifyPayment', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            db_order_id: orderData.db_order_id,
          });
          setLoading(false);

          if (verifyRes.data?.success) {
            onSuccess?.({ ...response, db_order_id: orderData.db_order_id });
          } else {
            const msg = 'Payment verification failed. Contact support if amount was debited.';
            setError(msg);
            onFailure?.(new Error(msg));
          }
        } catch (err) {
          setLoading(false);
          const msg = err.message || 'Payment verification failed. Contact support if amount was debited.';
          setError(msg);
          onFailure?.(err);
        }
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          onDismiss?.();
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => {
      setLoading(false);
      const msg = response.error?.description || 'Payment failed.';
      setError(msg);
      onFailure?.(new Error(msg));
    });
    rzp.open();
  }, []);

  return { initiatePayment, loading, error, setError };
}