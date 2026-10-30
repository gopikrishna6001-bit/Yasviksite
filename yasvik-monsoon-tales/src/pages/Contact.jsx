import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import RetailPageShell from '@/components/retail/RetailPageShell';
import RetailPageHeader from '@/components/retail/RetailPageHeader';
import StoreLocationCard from '@/components/retail/StoreLocationCard';
import { retailClasses } from '@/brand/retailTheme';
import { resolveStoreLocationSettings } from '@/lib/storeLocationSettings';
import { appClient } from '@/api/appClient';
import {
  fetchAllAppSettings,
  resolveSettingsMap,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  const store = useMemo(() => resolveStoreLocationSettings(resolveSettingsMap(settings)), [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    await appClient.integrations.Core.SendEmail({
      to: store.email || 'yasvikfoods@gmail.com',
      subject: `Message from ${form.name} via Yasvik`,
      body: `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`,
    });
    setSent(true);
    setSending(false);
  };

  return (
    <RetailPageShell>
      <RetailPageHeader title="Store & Contact" backTo="/" backLabel="Home" />

      <div className={`${retailClasses.container} space-y-8 py-6 md:py-10`}>
        <StoreLocationCard store={store} />

        <section id="message" className="scroll-mt-28">
          <div className={`${retailClasses.card} p-5 md:p-8`}>
            <h2 className="font-cormorant text-xl font-semibold text-deep-forest">Send a message</h2>
            <p className="mt-1 font-inter text-sm text-deep-forest/65">We read every note — usually reply within a day.</p>

            {sent ? (
              <div className="py-10 text-center">
                <p className="font-cormorant text-2xl text-deep-forest">Thank you. We&apos;ll be in touch.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className={retailClasses.label}>Your name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-soft-border bg-warm-cream/50 px-4 py-3 font-inter text-sm text-deep-forest outline-none focus:border-deep-forest/40"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className={retailClasses.label}>Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-soft-border bg-warm-cream/50 px-4 py-3 font-inter text-sm text-deep-forest outline-none focus:border-deep-forest/40"
                    placeholder="you@email.com"
                  />
                </div>
                <div>
                  <label className={retailClasses.label}>Message</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="mt-1.5 w-full resize-none rounded-lg border border-soft-border bg-warm-cream/50 px-4 py-3 font-inter text-sm text-deep-forest outline-none focus:border-deep-forest/40"
                    placeholder="How can we help?"
                  />
                </div>
                <button type="submit" disabled={sending} className={`w-full gap-2 ${retailClasses.btnPrimary}`}>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {sending ? 'Sending…' : 'Send message'}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </RetailPageShell>
  );
}
