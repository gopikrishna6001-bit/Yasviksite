import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import PageHeroRenderer from '@/components/PageHeroRenderer';

const STORE_HOURS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Contact() {
  const { data: hero, isLoading: heroLoading } = useQuery({
    queryKey: ['page-hero', 'contact'],
    queryFn: async () => {
      const results = await appClient.entities.PageHero.filter({ page_key: 'contact' }, '-updated_date', 1);
      return results[0];
    },
  });
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    await appClient.integrations.Core.SendEmail({
      to: 'yasvikfoods@gmail.com',
      subject: `Message from ${form.name} via Yasvik`,
      body: `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`,
    });
    setSent(true);
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] pb-24 text-[var(--text-main)] transition-colors duration-300">
      {hero && <PageHeroRenderer hero={hero} isLoading={heroLoading} />}
      <div className="mx-auto mb-8 max-w-3xl px-6 pt-8 text-center">
        <p className="mb-2 font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--theme-accent)]">Reach Out</p>
        <h1 className="mb-3 font-syne text-4xl font-extrabold tracking-[-0.04em] text-[var(--text-main)] md:text-5xl">Contact Yasvik</h1>
        <p className="mx-auto max-w-xl font-inter text-sm leading-7 text-[var(--theme-muted)]">Questions, local orders, store feedback or sourcing suggestions - send it here and we'll read it carefully.</p>
      </div>
      <div className="mx-auto grid max-w-5xl gap-6 px-6 md:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="rounded-[2rem] border border-[var(--theme-border)] bg-[var(--bg-card)] p-5 shadow-[0_22px_70px_rgba(6,53,31,.08)] md:p-8"
        >
          <p className="mb-2 font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--theme-accent)]">Connect With Yasvik</p>
          <h2 className="font-syne text-2xl font-extrabold tracking-[-0.03em] text-[var(--text-main)]">We are always here.</h2>
          <p className="mt-3 font-inter text-sm leading-7 text-[var(--theme-muted)]">We are always here to answer your questions and share our passion for conscious food.</p>

          <div className="mt-6 space-y-3">
            <div className="flex gap-3 rounded-2xl bg-[var(--theme-soft)] p-4">
              <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-[var(--theme-accent)]" />
              <p className="font-inter text-sm font-semibold leading-7 text-[var(--text-main)]">
                Yasvik Store, Bavanipuram Colony Road no4,<br />
                Ashok Nagar, Chanda Nagar, Hyderabad,<br />
                Telangana, 500050, IN
              </p>
            </div>
            <a href="tel:+918801196998" className="flex items-center gap-3 rounded-2xl bg-[var(--theme-soft)] p-4 font-inter text-sm font-semibold text-[var(--text-main)] transition-colors hover:text-[var(--theme-accent)]">
              <Phone className="h-4 w-4 text-[var(--theme-accent)]" /> 088011 96998
            </a>
            <a href="mailto:yasvikfoods@gmail.com" className="flex items-center gap-3 rounded-2xl bg-[var(--theme-soft)] p-4 font-inter text-sm font-semibold text-[var(--text-main)] transition-colors hover:text-[var(--theme-accent)]">
              <Mail className="h-4 w-4 text-[var(--theme-accent)]" /> yasvikfoods@gmail.com
            </a>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--theme-border)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--theme-accent)]" />
              <p className="font-inter text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-muted)]">Operating Hours</p>
            </div>
            <div className="space-y-1">
              {STORE_HOURS.map((day) => (
                <div key={day} className="flex items-center justify-between gap-3 font-inter text-xs text-[var(--theme-muted)]">
                  <span>{day}</span>
                  <span className="font-semibold text-[var(--text-main)]">9:00 AM - 9:00 PM</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="rounded-[2rem] border border-[var(--theme-border)] bg-[var(--bg-card)] p-5 shadow-[0_22px_70px_rgba(6,53,31,.09)] md:p-8"
        >
          {/* Contact details */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--theme-soft)] p-4">
              <Mail className="h-4 w-4 flex-shrink-0 text-[var(--theme-accent)]" />
              <a
                href="mailto:yasvikfoods@gmail.com"
                className="font-inter text-sm font-semibold text-[var(--text-main)] transition-colors hover:text-[var(--theme-accent)]"
              >
                yasvikfoods@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--theme-soft)] p-4">
              <MapPin className="h-4 w-4 flex-shrink-0 text-[var(--theme-accent)]" />
              <span className="font-inter text-sm font-semibold text-[var(--text-main)]">
                Ashok Nagar, Hyderabad
              </span>
            </div>
          </div>

          <div className="my-7 h-px w-full bg-[var(--theme-border)]" />

          {/* Contact form */}
          {sent ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-10 text-center"
            >
              <p className="font-syne text-2xl font-bold text-[var(--text-main)]">
                Thank you. We'll be in touch.
              </p>
              <p className="mt-3 font-inter text-xs text-[var(--theme-muted)]">
                We read every message carefully.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block font-inter text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-muted)]">
                  Your name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--bg-canvas)] px-4 py-3 font-inter text-sm text-[var(--text-main)] outline-none transition-colors placeholder:text-[var(--theme-muted)]/55 focus:border-[var(--action-primary)] focus:ring-2 focus:ring-[var(--ysv-focus-ring)]"
                  placeholder="How should we address you?"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-inter text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-muted)]">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--bg-canvas)] px-4 py-3 font-inter text-sm text-[var(--text-main)] outline-none transition-colors placeholder:text-[var(--theme-muted)]/55 focus:border-[var(--action-primary)] focus:ring-2 focus:ring-[var(--ysv-focus-ring)]"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-inter text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--theme-muted)]">
                  Message
                </label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full resize-none rounded-xl border border-[var(--theme-border)] bg-[var(--bg-canvas)] px-4 py-3 font-inter text-sm text-[var(--text-main)] outline-none transition-colors placeholder:text-[var(--theme-muted)]/55 focus:border-[var(--action-primary)] focus:ring-2 focus:ring-[var(--ysv-focus-ring)]"
                  placeholder="Tell us what's on your mind…"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--action-primary)] py-3.5 font-inter text-sm font-bold text-[var(--action-text)] transition-all hover:brightness-95 active:scale-[0.985] disabled:opacity-50"
              >
                {sending ? 'Sending…' : <><Send className="h-4 w-4" /> Send message</>}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
