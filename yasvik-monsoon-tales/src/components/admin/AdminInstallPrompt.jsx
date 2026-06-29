import { useState } from 'react';
import { Smartphone, X, Share } from 'lucide-react';
import {
  dismissAdminInstall,
  isAdminInstallDismissed,
  isIosDevice,
  isStandaloneDisplay,
} from '@/lib/pwaUtils';

export default function AdminInstallPrompt() {
  const [hidden, setHidden] = useState(
    () => isStandaloneDisplay() || isAdminInstallDismissed()
  );
  const [showHelp, setShowHelp] = useState(false);

  if (hidden) return null;

  const ios = isIosDevice();

  const handleDismiss = () => {
    dismissAdminInstall();
    setHidden(true);
  };

  return (
    <div className="lg:hidden border-b border-warm-turmeric/25 bg-rain-cloud text-white px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-white/10 p-2">
          <Smartphone className="w-4 h-4 text-warm-turmeric" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-inter text-sm font-medium">Install Yasvik Admin on your phone</p>
          <p className="font-inter text-[11px] text-white/55 mt-0.5 leading-relaxed">
            Opens counter &amp; admin like an app — not the shop homepage.
          </p>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="mt-2 font-inter text-xs font-semibold text-warm-turmeric"
          >
            {showHelp ? 'Hide steps' : 'How to add'}
          </button>
          {showHelp ? (
            <ol className="mt-2 space-y-1.5 font-inter text-[11px] text-white/70 list-decimal list-inside">
              {ios ? (
                <>
                  <li className="flex items-start gap-1">
                    <Share className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    Tap Share in Safari (while on this admin page)
                  </li>
                  <li>Choose <strong>Add to Home Screen</strong></li>
                  <li>Confirm the name says <strong>Yasvik Admin</strong> (not yasvik.com) → Add</li>
                </>
              ) : (
                <>
                  <li>Open browser menu (⋮)</li>
                  <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></li>
                  <li>Confirm — it will open at Counter POS</li>
                </>
              )}
              <li className="text-white/45">Remove the old Yasvik shop icon if it opens the homepage</li>
            </ol>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-white/40 hover:text-white/70"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
