'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export function Dashboard({ user }: { user: User }) {
  const [profile, setProfile] = useState<any>(null);
  const [duo, setDuo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Invite states
  const [myInvite, setMyInvite] = useState<any>(null); // If I created one
  const [incomingRequest, setIncomingRequest] = useState<any>(null); // If someone claimed my invite

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    
    // 1. Fetch Profile
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);

    // 2. Fetch Duo (If paired)
    if (p?.duo_id) {
      const { data: d } = await supabase.from('duos').select('*').eq('id', p.duo_id).single();
      setDuo(d);
      setMyInvite(null);
      setIncomingRequest(null);
    } else {
      // 3. Check for my outgoing invites
      const { data: i } = await supabase
        .from('invites')
        .select('*')
        .eq('creator_id', user.id)
        .maybeSingle();
      
      if (i) {
        if (i.claimed_by) {
          // Someone clicked my link! Fetch their name.
          const { data: claimer } = await supabase.from('profiles').select('gamer_name').eq('id', i.claimed_by).single();
          setIncomingRequest({ ...i, claimerName: claimer?.gamer_name || 'Someone' });
          setMyInvite(null);
        } else {
          setMyInvite(i);
          setIncomingRequest(null);
        }
      } else {
        // 4. Do I have an invite I claimed from someone else?
        const { data: claimed } = await supabase
          .from('invites')
          .select('*')
          .eq('claimed_by', user.id)
          .maybeSingle();
        // We'll handle "Waiting for them to accept" UI later, for now just show it
        setMyInvite(null);
        setIncomingRequest(null);
      }
    }
    setLoading(false);
  };

  const generateInvite = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await supabase.from('invites').insert({ code, creator_id: user.id });
    fetchData();
  };

  const acceptRequest = async () => {
    setErrorMsg('');
    const { error } = await supabase.rpc('accept_invite', { invite_code: incomingRequest.code });
    if (error) {
      setErrorMsg(error.message);
    } else {
      fetchData(); // Reload to show connected state
    }
  };

  const rejectRequest = async () => {
    await supabase.from('invites').update({ claimed_by: null }).eq('code', incomingRequest.code);
    fetchData();
  };

  const cancelInvite = async () => {
    await supabase.from('invites').delete().eq('code', myInvite.code);
    fetchData();
  };

  const signOut = () => supabase.auth.signOut();

  if (loading) return <div className="fixed inset-0 flex items-center justify-center text-amber">Loading Twopia...</div>;

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-4xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
        Welcome, {profile?.gamer_name || 'Traveler'}
      </h1>

      {errorMsg && <p className="text-red-500 mb-4">{errorMsg}</p>}

      {duo ? (
        /* STATE 3: PAIRED */
        <div className="border border-amber/30 p-8 rounded bg-night/80">
          <h2 className="text-xl mb-4 text-amber">Your Duo is connected!</h2>
          <p className="text-sm text-muted mb-6">The Den is ready. (Sprint 2.X kicks in here).</p>
        </div>
      ) : incomingRequest ? (
        /* STATE 2: INCOMING HANDSHAKE */
        <div className="border border-cyan/30 p-8 rounded bg-night/80">
          <h2 className="text-xl mb-4 text-cyan">{incomingRequest.claimerName} wants to join you!</h2>
          <div className="flex gap-4 justify-center mt-6">
            <button onClick={acceptRequest} className="px-6 py-3 border border-amber text-amber hover:bg-amber/10 uppercase tracking-widest text-xs">Accept</button>
            <button onClick={rejectRequest} className="px-6 py-3 border border-red-500 text-red-500 hover:bg-red-500/10 uppercase tracking-widest text-xs">Reject</button>
          </div>
        </div>
      ) : myInvite ? (
        /* STATE 1B: WAITING FOR PARTNER */
        <div className="border border-amber/30 p-8 rounded bg-night/80">
          <h2 className="text-xl mb-4 text-amber">Waiting for your partner...</h2>
          <p className="text-sm text-muted mb-6">Send them this link:</p>
          <div className="text-lg font-mono tracking-widest text-cream bg-black/50 p-4 rounded mb-4 select-all">
            https://0pingdev.github.io/twopia/join/?code={myInvite.code}
          </div>
          <button onClick={cancelInvite} className="text-xs text-muted hover:text-red-500 underline">Cancel Invite</button>
        </div>
      ) : (
        /* STATE 1A: SOLO */
        <div className="border border-amber/30 p-8 rounded bg-night/80">
          <h2 className="text-xl mb-4 text-amber">You are alone in Twopia.</h2>
          <p className="text-sm text-muted mb-6">Enter your own personal Mini-Den, or invite a partner.</p>
          <div className="flex gap-4 justify-center mt-6">
            <button onClick={generateInvite} className="px-6 py-3 border border-cyan text-cyan hover:bg-cyan/10 uppercase tracking-widest text-xs">Invite Partner</button>
            <button className="px-6 py-3 border border-amber text-amber hover:bg-amber/10 uppercase tracking-widest text-xs opacity-50 cursor-not-allowed">Enter Mini-Den (Sprint 2.X)</button>
          </div>
        </div>
      )}

      <button onClick={signOut} className="mt-12 text-xs text-muted hover:text-cream underline">Sign Out</button>
    </div>
  );
}
