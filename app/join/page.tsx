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

    async function requestJoin() {
      // 1. Check if code is valid
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('creator_id, claimed_by')
        .eq('code', code!.toUpperCase())
        .single();

      if (inviteError || !invite) {
        setError('Invalid or expired invite code.');
        return;
      }
      
      if (invite.claimed_by === user!.id) {
        setStatus('You have already requested to join. Waiting for them to accept.');
        setTimeout(() => router.push('/'), 2500);
        return;
      }
      
      if (invite.claimed_by) {
        setError('This invite has already been claimed by someone else.');
        return;
      }

      // 2. Claim the invite
      const { error: claimError } = await supabase
        .from('invites')
        .update({ claimed_by: user!.id })
        .eq('code', code!.toUpperCase());

      if (claimError) {
        setError(`Error: ${claimError.message}`);
        return;
      }

      setStatus('Request sent! Your partner must log in and accept it.');
      setTimeout(() => router.push('/'), 2500); // <--- THIS FIXES THE REDIRECT
    }

    requestJoin();
  }, [user, loading, code, router]);

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center text-center px-6 bg-night/90 backdrop-blur-md">
      <h1 className="text-4xl mb-4 text-amber" style={{ fontFamily: 'var(--font-serif)' }}>Twopia</h1>
      {error ? <p className="text-red-500 mb-6">{error}</p> : <p className="text-xl text-cream mb-6">{status}</p>}
      <button onClick={() => router.push('/')} className="px-6 py-2 border border-muted text-muted hover:text-cream uppercase tracking-widest text-xs">Go to Lobby</button>
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
