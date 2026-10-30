import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { FileText, Loader2 } from 'lucide-react';

/**
 * Public short link for WhatsApp: /invoice/:orderRef
 * Resolves to the uploaded invoice PDF without exposing storage paths in chat.
 */
export default function PublicInvoice() {
  const { orderRef } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Opening your invoice…');

  useEffect(() => {
    let cancelled = false;

    async function openInvoice() {
      const ref = String(orderRef || '').trim();
      if (!ref) {
        setStatus('error');
        setMessage('Invoice link is incomplete.');
        return;
      }

      try {
        const { data } = await appClient.functions.invoke('getPublicInvoice', {
          orderNumber: ref,
        });
        if (cancelled) return;

        const url = data?.invoice_url;
        if (data?.success && url) {
          setStatus('redirecting');
          setMessage('Opening your invoice…');
          window.location.replace(url);
          return;
        }

        setStatus('error');
        setMessage(data?.error || 'Invoice is not available yet. Please ask the store to resend it.');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err?.message || 'Could not open this invoice.');
      }
    }

    openInvoice();
    return () => {
      cancelled = true;
    };
  }, [orderRef]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-16 bg-[var(--theme-bg,#FAF7EF)]">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white border border-[var(--theme-border,#E8E1D5)]">
          {status === 'error' ? (
            <FileText className="h-6 w-6 text-amber-700" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-[#1F3D2B]" />
          )}
        </div>
        <h1 className="font-cormorant text-3xl text-[#1F3D2B]">Yasvik invoice</h1>
        <p className="mt-3 font-inter text-sm leading-6 text-[#1F3D2B]/70">{message}</p>
        {orderRef ? (
          <p className="mt-2 font-inter text-xs text-[#1F3D2B]/45">Ref: {orderRef}</p>
        ) : null}
        {status === 'error' ? (
          <div className="mt-8 flex flex-col gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full bg-[#1F3D2B] px-5 py-3 font-inter text-sm font-semibold text-white"
            >
              Go to yasvik.com
            </Link>
            <a
              href="https://wa.me/917842938998"
              className="inline-flex items-center justify-center rounded-full border border-[#1F3D2B]/20 px-5 py-3 font-inter text-sm font-medium text-[#1F3D2B]"
            >
              WhatsApp Yasvik
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
