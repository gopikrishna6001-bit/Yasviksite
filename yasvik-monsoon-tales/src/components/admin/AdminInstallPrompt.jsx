import { useState } from 'react';
import { Smartphone, X, Share, ExternalLink } from 'lucide-react';
import {
  dismissAdminInstall,
  isAdminInstallDismissed,
  isIosDevice,
  isStandaloneDisplay,
} from '@/lib/pwaUtils';

const ADMIN_INSTALL_URL = 'https://www.yasvik.com/admin/install.html';

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

  const openInstallPage = () => {
    window.location.href = '/admin/install.html';
  };

  return (
    <div className="border-b border-warm-turmeric/25 bg-rain-cloud px-4 py-3 lg:hidden">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-white/10 p-2">
          <Smartphone className="h-4 w-4 text-warm-turmeric" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-inter text-sm font-medium">Install Yasvik Admin on iPhone</p>
          <p className="mt-0.5 font-inter text-[11px] leading-relaxed text-white/55">
            iPhone cannot edit the home screen URL. You must install from the dedicated Admin install page — not the shop homepage.
          </p>
          <button
            type="button"
            onClick={openInstallPage}
            className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-warm-turmeric px-4 py-2 font-inter text-xs font-bold text-rain-cloud"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Admin install page
          </button>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="mt-2 block font-inter text-xs font-semibold text-warm-turmeric"
          >
            {showHelp ? 'Hide steps' : 'Step-by-step'}
          </button>
          {showHelp ? (
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 font-inter text-[11px] leading-relaxed text-white/70">
              {ios ? (
                <>
                  <li>Tap <strong>Open Admin install page</strong> above (URL ends with <code>/admin/install.html</code>)</li>
                  <li className="flex items-start gap-1">
                    <Share className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    On that page, tap Safari <strong>Share</strong> → <strong>Add to Home Screen</strong>
                  </li>
                  <li>Name it <strong>Yasvik Admin</strong> → Add</li>
                  <li>Open the new icon → log in → Products → Add photos</li>
                </>
              ) : (
                <>
                  <li>Open <strong>{ADMIN_INSTALL_URL}</strong> in the browser</li>
                  <li>Add to Home screen / Install app from that page</li>
                  <li>Opens Admin — not the customer shop</li>
                </>
              )}
              <li className="text-white/45">
                If Share shows <code>yasvik.com/</code> you are on the shop site — go back and use the install page link.
              </li>
            </ol>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-white/40 hover:text-white/70"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
