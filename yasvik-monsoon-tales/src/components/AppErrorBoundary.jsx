import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[yasvik] App crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    // Use plain <a> — this boundary sits outside <Router>, so <Link> would
    // crash the fallback and leave a blank white screen.
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-cream px-6 py-12 text-deep-forest">
        <div className="max-w-md text-center">
          <h1 className="font-cormorant text-3xl font-semibold">Something went wrong</h1>
          <p className="mt-3 font-inter text-sm text-deep-forest/70">
            The page did not load correctly. Try refreshing — if it keeps happening, contact us on WhatsApp.
          </p>
          {this.state.error?.message ? (
            <pre className="mt-4 max-h-28 overflow-auto rounded-lg bg-black/5 p-3 text-left font-mono text-[11px] text-deep-forest/80 whitespace-pre-wrap">
              {String(this.state.error.message)}
            </pre>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-deep-forest px-5 py-2.5 font-inter text-sm font-semibold text-white"
            >
              Refresh page
            </button>
            <a
              href="/shop"
              className="rounded-full border border-soft-border px-5 py-2.5 font-inter text-sm font-semibold text-deep-forest"
            >
              Go to shop
            </a>
          </div>
        </div>
      </div>
    );
  }
}
