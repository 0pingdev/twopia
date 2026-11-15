'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

function JoinForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
  const { user, loading } = useAuth();
  
  const [status, setStatus] = useState('Connecting...');
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setStatus('Please sign in to join your Duo.');
      return;
    }
    if (!code) {
      setError('No invite code found in the link.');
      return;
    }

    async function joinDuo() {
      // 1. Find the invitation
      const { data: invite, error: inviteError } = await supabase
        .from('invitations')
        .select('duo_id')
        .eq('code', code!.toUpperCase())
        .single();

      if (inviteError || !invite) {
        setError('Invalid or expired invite code.');
        return;
      }

      // 2. Update the duo with Player B
      const { error: joinError } = await supabase
        .from('duos')
        .update({ player_b: user!.id, status: 'active' })
        .eq('id', invite.duo_id)
        .is('player_b', null); // Ensure we don't overwrite an existing player

      if (joinError) {
        setError('Could not join. The Duo might already be full.');
        return;
      }

      // 3. Clean up the invite
      await supabase.from('invitations').delete().eq('code', code!.toUpperCase());
      
      setStatus('Success! Your Duo is connected.');
      setTimeout(() => router.push('/'), 2000);
    }

    joinDuo();
  }, [user, loading, code, router]);

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center text-center px-6 bg-night/90 backdrop-blur-md">
      <h1 className="text-4xl mb-4 text-amber" style={{ fontFamily: 'var(--font-serif)' }}>
        Twopia
      </h1>
      {error ? (
        <p className="text-red-500 mb-6">{error}</p>
      ) : (
        <p className="text-xl text-cream mb-6">{status}</p>
      )}
      <button onClick={() => router.push('/')} className="px-6 py-2 border border-muted text-muted hover:text-cream uppercase tracking-widest text-xs">
        Go to Home
      </button>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center text-amber">Loading...</div>}>
      <JoinForm />
    </Suspense>
  );
}
