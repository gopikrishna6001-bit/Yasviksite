let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function playTone(ctx, freq, start, duration, volume = 0.25) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Two-tone beep for new online orders (Web Audio API). */
export async function playNewOrderBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') await ctx.resume();
    const t = ctx.currentTime;
    playTone(ctx, 880, t, 0.12);
    playTone(ctx, 1100, t + 0.18, 0.18);
    playTone(ctx, 880, t + 0.42, 0.12);
  } catch {
    // Ignore — autoplay policies may block until user gesture
  }
}
