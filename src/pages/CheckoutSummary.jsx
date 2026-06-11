import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '@/lib/CartContext';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/lib/AuthContext';
import { ChevronLeft, Loader2, AlertCircle, CheckCircle, Minus, Plus, Trash2 } from 'lucide-react';
import BundleItemDetail from '@/components/checkout/BundleItemDetail';

function QtyControl({ item, updateQty, removeItem }) {
  return (
    <div className="flex items-center gap-1 mt-1.5">
      <button
        onClick={() => updateQty(item.key, item.qty - 1)}
        className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-rain-cloud/50 hover:border-wet-earth hover:text-wet-earth transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="font-inter text-sm text-rain-cloud w-5 text-center">{item.qty}</span>
      <button
        onClick={() => updateQty(item.key, item.qty + 1)}
        className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-rain-cloud/50 hover:border-forest-canopy hover:text-forest-canopy transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
      <button
        onClick={() => removeItem(item.key)}
        className="ml-1 w-6 h-6 rounded-full flex items-center justify-center text-rain-cloud/30 hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function CheckoutSummary() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, updateQty, removeItem } = useCart();
  const { initiatePayment, loading: payLoading, error: payError, setError } = useRazorpay();
  const { isAuthenticated } = useAuth();

  const comboItems = useMemo(() => items.filter(i => i.type === 'combo'), [items]);
  const standaloneItems = useMemo(() => items.filter(i => i.type !== 'combo'), [items]);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Delivery address form
  const [address, setAddress] = useState({
    name: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    pincode: '',
  });

  // Validate form
  const isFormValid = address.name && address.phone && address.email && address.street && address.city && address.pincode;

  const handleAddressChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleProceedToPayment = async () => {
    if (!isAuthenticated) {
      navigate('/login?next=/checkout');
      return;
    }

    if (!isFormValid) {
      alert('We could not map your delivery route yet. Please complete all address details to continue.');
      return;
    }

    setError(null);
    setOrderSuccess(false);

    await initiatePayment({
      amountPaise: Math.round(totalPrice * 100),
      items,
      customer: {
        name: address.name,
        email: address.email,
        phone: address.phone,
      },
      onSuccess: () => {
        setOrderSuccess(true);
        clearCart();
      },
      onFailure: () => {},
      onDismiss: () => {},
    });
  };

  // Empty cart
  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="min-h-screen bg-rain-mist px-6 py-12 flex items-center justify-center pb-24">
        <div className="text-center max-w-sm">
          <p className="font-cormorant text-2xl text-rain-cloud/60 mb-4">Your harvest bag is empty</p>
          <Link
            to="/shop"
            className="inline-block py-3 px-6 bg-wet-earth text-white font-inter text-sm rounded-full"
          >
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  // Order success
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-rain-mist px-6 py-12 flex items-center justify-center pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white rounded-2xl p-8 shadow-sm max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-forest-canopy/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-forest-canopy" />
          </div>
          <h2 className="font-cormorant text-2xl text-rain-cloud mb-2">Your Harvest Is Confirmed</h2>
          <p className="font-inter text-sm text-rain-cloud/60 mb-1">
            Thank you for choosing consciously. Your order is now confirmed.
          </p>
          <p className="font-inter text-xs text-rain-cloud/40 mb-6">
            Delivery will arrive within 3-5 business days to {address.city}.
          </p>
          <Link
            to="/shop"
            className="inline-block py-3 px-6 bg-forest-canopy text-white font-inter text-sm rounded-full"
          >
            Continue Shopping
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {/* Header */}
      <div className="px-6 py-6 bg-white border-b border-border/20 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-rain-cloud/60 font-inter text-sm mb-4 inline-flex"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-cormorant text-3xl text-rain-cloud font-medium">Order Summary</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form */}
          <div className="md:col-span-2 space-y-6">
            {/* Items review */}
            <div className="bg-white rounded-2xl p-6 border border-border/20">
              <h2 className="font-cormorant text-xl text-rain-cloud font-light mb-4">Your Items</h2>
              <div className="space-y-3">
                 {/* Combo items — with expandable product details */}
                 {comboItems.map(item => (
                   <div key={item.key} className="rounded-xl border border-warm-turmeric/30 bg-warm-turmeric/5 overflow-hidden">
                     <div className="flex items-start gap-3 p-3">
                       <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-temple-stone/20">
                         {item.hero_image && (
                           <img src={item.hero_image} alt={item.title} className="w-full h-full object-cover" />
                         )}
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 flex-wrap">
                           <p className="font-cormorant text-base text-rain-cloud font-medium">{item.title}</p>
                           <span className="font-inter text-[10px] px-2 py-0.5 bg-warm-turmeric/20 text-wet-earth rounded-full">Bundle</span>
                         </div>
                         <div className="flex items-baseline gap-1.5 mt-2">
                           <span className="font-cormorant text-base text-rain-cloud font-medium">₹{item.price * item.qty}</span>
                           {item.original_price > item.price && (
                             <span className="font-inter text-xs text-rain-cloud/40 line-through">₹{item.original_price * item.qty}</span>
                           )}
                         </div>
                         {/* Expandable product details */}
                         <BundleItemDetail item={item} product_details={item.product_details || item.products || []} />
                         <QtyControl item={item} updateQty={updateQty} removeItem={removeItem} />
                       </div>
                     </div>
                   </div>
                 ))}

                 {/* Standalone items */}
                 {standaloneItems.map((item) => (
                   <div key={item.key} className="flex items-start gap-3 pb-3 border-b border-border/10 last:border-0 last:pb-0">
                     <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-temple-stone/20">
                       {item.hero_image && (
                         <img src={item.hero_image} alt={item.title} className="w-full h-full object-cover" />
                       )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="font-cormorant text-base text-rain-cloud font-medium">{item.title}</p>
                       {item.variant && <p className="font-inter text-xs text-rain-cloud/40">{item.variant}</p>}
                       <p className="font-inter text-sm text-rain-cloud/60 mt-0.5">
                         ₹{item.price} each
                         {item.qty > 1 && <span className="ml-1 text-rain-cloud font-medium">= ₹{item.price * item.qty}</span>}
                       </p>
                       <QtyControl item={item} updateQty={updateQty} removeItem={removeItem} />
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* Delivery address form */}
            <div className="bg-white rounded-2xl p-6 border border-border/20">
              <h2 className="font-cormorant text-xl text-rain-cloud font-light mb-4">Delivery Address</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={address.name}
                    onChange={(e) => handleAddressChange('name', e.target.value)}
                    className="px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={address.phone}
                    onChange={(e) => handleAddressChange('phone', e.target.value)}
                    className="px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy"
                  />
                </div>

                <input
                  type="email"
                  placeholder="Email Address *"
                  value={address.email}
                  onChange={(e) => handleAddressChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy"
                />

                <input
                  type="text"
                  placeholder="Street Address *"
                  value={address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy"
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="City *"
                    value={address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    className="px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy"
                  />
                  <input
                    type="text"
                    placeholder="Pincode *"
                    value={address.pincode}
                    onChange={(e) => handleAddressChange('pincode', e.target.value)}
                    className="px-4 py-3 border border-border rounded-xl font-inter text-sm focus:outline-none focus:border-forest-canopy"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Order summary sidebar */}
          <div className="bg-white rounded-2xl p-6 border border-border/20 h-fit sticky top-28">
            <h3 className="font-cormorant text-lg text-rain-cloud font-light mb-4">Order Total</h3>

            {(() => {
              const bundleSavings = comboItems.reduce((s, i) =>
                s + ((i.original_price || i.price) - i.price) * i.qty, 0);
              return (
                <div className="space-y-3 mb-6 pb-6 border-b border-border/20">
                  <div className="flex items-center justify-between">
                    <span className="font-inter text-sm text-rain-cloud/60">Subtotal</span>
                    <span className="font-cormorant text-sm text-rain-cloud">₹{totalPrice}</span>
                  </div>
                  {bundleSavings > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="font-inter text-sm text-forest-canopy">Bundle savings</span>
                      <span className="font-inter text-sm text-forest-canopy">−₹{bundleSavings}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-inter text-sm text-rain-cloud/60">Delivery</span>
                    <span className="font-inter text-sm text-forest-canopy">FREE</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between mb-6">
              <span className="font-cormorant text-lg text-rain-cloud">Total</span>
              <span className="font-cormorant text-2xl text-rain-cloud font-medium">₹{totalPrice}</span>
            </div>

            {payError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl mb-4">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="font-inter text-xs text-red-600 leading-snug">
                  {payError || 'We could not complete this payment attempt. Please try once more.'}
                </p>
              </div>
            )}

            <button
              onClick={handleProceedToPayment}
              disabled={(!isFormValid && isAuthenticated) || payLoading}
              className="w-full py-3.5 bg-wet-earth text-white font-inter text-sm rounded-full hover:bg-wet-earth/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {payLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Securing your order…
                </>
              ) : isAuthenticated ? 'Proceed to Payment' : 'Login to Continue'}
            </button>

            <p className="font-inter text-[10px] text-center text-rain-cloud/30 mt-3">
              Secure payment via Razorpay
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
