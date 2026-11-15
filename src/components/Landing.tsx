'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useMode } from '@/state/mode';
import { useSettings } from '@/lib/settings';

export function Landing() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const setMode = useMode((s) => s.setMode);
  const setShowDev = useSettings((s) => s.set);

  const signIn = async () => {
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/`,
      },
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
    }
    // On success, the browser navigates away — no need to reset busy.
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
      <h1
        className="text-6xl md:text-8xl tracking-tight leading-none mb-4"
        style={{ fontFamily: 'var(--font-serif)', fontWeight: 300 }}
      >
        Twopia
      </h1>
      <p
        className="text-lg md:text-xl mb-12 italic"
        style={{ fontFamily: 'var(--font-serif)', color: '#8a8578' }}
      >
        A world for two.
      </p>

      <button
        onClick={signIn}
        disabled={busy}
        className="px-10 py-4 rounded-sm border transition-all duration-300 uppercase tracking-widest text-xs"
        style={{
          borderColor: 'rgba(255,176,112,0.3)',
          color: '#ffb070',
          background: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,176,112,0.08)';
          e.currentTarget.style.borderColor = '#ffb070';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(255,176,112,0.3)';
        }}
      >
        {busy ? 'Opening…' : 'Continue with Google'}
      </button>

      {err && (
        <p className="mt-6 text-xs" style={{ color: '#ff7a1a' }}>
          {err}
        </p>
      )}

      <button
        onClick={() => setShowDev('showDevOverlay', true)}
        className="absolute bottom-4 right-4 text-[10px] uppercase tracking-widest opacity-30 hover:opacity-100 transition"
        style={{ color: '#8a8578' }}
      >
        dev
      </button>
    </div>
  );
}
