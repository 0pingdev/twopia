'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export function Dashboard({ user }: { user: User }) {
  const [profile, setProfile] = useState<any>(null);
  const [duo, setDuo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Duo Management States
  const [showDuoMenu, setShowDuoMenu] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [myInvite, setMyInvite] = useState<any>(null);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);

    if (p?.duo_id) {
      const { data: d } = await supabase.from('duos').select('*').eq('id', p.duo_id).single();
      setDuo(d);
      setMyInvite(null);
      setIncomingRequest(null);
    } else {
      setDuo(null);
      // Check outgoing invites
      const { data: i } = await supabase.from('invites').select('*').eq('creator_id', user.id).maybeSingle();
      if (i) {
        if (i.claimed_by) {
          const { data: claimer } = await supabase.from('profiles').select('gamer_name').eq('id', i.claimed_by).single();
          setIncomingRequest({ ...i, claimerName: claimer?.gamer_name || 'Someone' });
          setMyInvite(null);
        } else {
          setMyInvite(i);
          setIncomingRequest(null);
        }
      } else {
        setMyInvite(null);
        setIncomingRequest(null);
      }
    }
    setLoading(false);
  };

  // --- Actions ---
  const generateInvite = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await supabase.from('invites').insert({ code, creator_id: user.id });
    fetchData();
  };

  const acceptRequest = async () => {
    setErrorMsg('');
    const { error } = await supabase.rpc('accept_invite', { invite_code: incomingRequest.code });
    if (error) setErrorMsg(error.message);
    else fetchData();
  };

  const rejectRequest = async () => {
    await supabase.from('invites').update({ claimed_by: null }).eq('code', incomingRequest.code);
    fetchData();
  };

  const cancelInvite = async () => {
    await supabase.from('invites').delete().eq('code', myInvite.code);
    fetchData();
  };

  const claimCode = async () => {
    if (!joinCode.trim()) return;
    setErrorMsg('');
    
    // Check if code exists
    const { data: invite } = await supabase.from('invites').select('*').eq('code', joinCode.toUpperCase()).single();
    if (!invite) {
      setErrorMsg('Invalid code.');
      return;
    }
    if (invite.claimed_by) {
      setErrorMsg('This code has already been claimed.');
      return;
    }

    // Claim it
    await supabase.from('invites').update({ claimed_by: user.id }).eq('code', joinCode.toUpperCase());
    setJoinCode('');
    fetchData();
  };

  const signOut = () => supabase.auth.signOut();

  if (loading) return <div className="fixed inset-0 flex items-center justify-center text-amber">Loading Lobby...</div>;

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
      
      {/* LOBBY HEADER */}
      <h1 className="text-5xl mb-2" style={{ fontFamily: 'var(--font-serif)', textShadow: '0 0 20px rgba(255,176,112,0.3)' }}>
        Welcome, {profile?.gamer_name || 'Traveler'}
      </h1>
      <p className="text-muted mb-12 text-sm tracking-widest uppercase">Solo Lobby</p>

      <div className="flex gap-6 max-w-4xl w-full justify-center">
        
        {/* THE MINI-DEN (SPRINT 2.X) */}
        <div className="border border-amber/20 p-8 rounded-lg bg-night/60 backdrop-blur-md w-96 flex flex-col items-center justify-center min-h-[300px]">
          <h2 className="text-xl mb-4 text-amber font-serif italic">Your Mini-Den</h2>
          <p className="text-sm text-muted mb-8">Your personal 3D space. Coming in Sprint 2.X.</p>
          <button onClick={() => router.push('/den')} className="px-8 py-4 border border-amber/50 text-amber uppercase tracking-widest text-xs hover:bg-amber/10 transition" >
            Enter Mini-Den
          </button>
        </div>

        {/* DUO STATUS PANEL */}
        <div className="border border-cyan/20 p-8 rounded-lg bg-night/60 backdrop-blur-md w-96 flex flex-col items-center justify-center min-h-[300px] relative">
          <h2 className="text-xl mb-4 text-cyan font-serif italic">Duo Status</h2>
          
          {errorMsg && <p className="text-red-500 text-xs mb-2">{errorMsg}</p>}

          {duo ? (
            <div className="text-center">
              <p className="text-amber mb-6 uppercase tracking-widest text-xs">Paired</p>
              <button className="px-8 py-4 border border-cyan bg-cyan/10 text-cyan uppercase tracking-widest text-xs shadow-[0_0_15px_rgba(79,209,255,0.3)] hover:bg-cyan/20 transition">
                Enter Shared Den
              </button>
            </div>
          ) : incomingRequest ? (
            <div className="text-center">
              <p className="text-cyan mb-2 font-serif text-lg">{incomingRequest.claimerName}</p>
              <p className="text-muted text-xs mb-6">wants to join your Duo.</p>
              <div className="flex gap-3">
                <button onClick={acceptRequest} className="px-4 py-2 border border-amber text-amber hover:bg-amber/10 text-xs uppercase">Accept</button>
                <button onClick={rejectRequest} className="px-4 py-2 border border-red-500/50 text-red-500 hover:bg-red-500/10 text-xs uppercase">Reject</button>
              </div>
            </div>
          ) : !showDuoMenu ? (
            <button onClick={() => setShowDuoMenu(true)} className="px-8 py-4 border border-cyan/50 text-cyan uppercase tracking-widest text-xs hover:bg-cyan/10 transition">
              Manage Duo
            </button>
          ) : myInvite ? (
            <div className="text-center w-full">
              <p className="text-muted text-xs mb-4">Send this link:</p>
              <div className="text-xs font-mono text-cream bg-black/50 p-3 rounded mb-4 break-all select-all">
                .../join/?code={myInvite.code}
              </div>
              <button onClick={cancelInvite} className="text-xs text-muted hover:text-red-500 underline">Cancel</button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full">
              <button onClick={generateInvite} className="w-full py-3 border border-cyan text-cyan text-xs uppercase tracking-widest hover:bg-cyan/10">Generate Invite Link</button>
              
              <div className="flex items-center gap-2 my-2">
                <div className="h-px bg-cyan/20 flex-1"></div>
                <span className="text-muted text-[10px] uppercase">OR</span>
                <div className="h-px bg-cyan/20 flex-1"></div>
              </div>

              <div className="flex gap-2">
                <input 
                  value={joinCode} 
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())} 
                  placeholder="ENTER CODE" 
                  maxLength={6}
                  className="w-full bg-black/40 border border-cyan/30 text-cyan text-center tracking-widest p-2 rounded outline-none text-xs" 
                />
                <button onClick={claimCode} className="px-4 border border-cyan text-cyan hover:bg-cyan/10 uppercase text-xs">Join</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button onClick={signOut} className="mt-16 text-xs text-muted hover:text-cream underline transition-colors">
        Sign Out
      </button>
    </div>
  );
}
