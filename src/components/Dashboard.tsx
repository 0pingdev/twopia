'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { DenScene } from './DenScene';

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
    else {
      setShowDuoMenu(false);
      fetchData();
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

  // --- Interaction ---
  const duoStatus = duo ? 'online' : 'solo'; // Placeholder until we add presence sync to the Door

  const handleDoorInteract = () => {
    if (duoStatus === 'solo') {
      setShowDuoMenu(true);
    } else if (duoStatus === 'online') {
      alert('Partner Visit logic coming in Sprint 3.1!');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-amber font-serif italic text-2xl">Loading Twopia...</div>;

  return (
    <div className="relative w-full h-full overflow-hidden">
      
      {/* 3D Background */}
      <DenScene duoStatus={duoStatus} onDoorInteract={handleDoorInteract} />

      {/* HUD Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-8 pointer-events-none">
        
        {/* Top Header */}
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto">
            <h1 className="text-4xl text-cream font-serif italic drop-shadow-lg">
              {profile?.gamer_name || 'Traveler'}
            </h1>
            <p className="text-cyan text-xs tracking-widest uppercase mt-1 shadow-black drop-shadow-md">
              {duo ? 'Shared Lobby' : 'Solo Lobby'}
            </p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="pointer-events-auto text-xs text-muted hover:text-cream underline transition-colors">
            Sign Out
          </button>
        </div>

        {/* Duo Panel (Shows up when you click the door or have an incoming request) */}
        {(showDuoMenu || incomingRequest) && (
          <div className="pointer-events-auto mb-8 w-96 bg-night/90 backdrop-blur-xl border border-amber/20 rounded-xl p-6 shadow-2xl mx-auto relative">
            <h2 className="text-xl mb-4 text-amber font-serif italic text-center">Duo Status</h2>
            {errorMsg && <p className="text-red-500 text-xs text-center mb-2">{errorMsg}</p>}

            {duo ? (
              <div className="text-center">
                <p className="text-amber mb-2 uppercase tracking-widest text-xs">Paired</p>
                <p className="text-muted text-xs mb-4">You are connected!</p>
                <button onClick={() => setShowDuoMenu(false)} className="w-full py-2 border border-amber text-amber uppercase tracking-widest text-xs hover:bg-amber/10 transition">
                  Close
                </button>
              </div>
            ) : incomingRequest ? (
              <div className="text-center">
                <p className="text-cyan mb-2 font-serif text-lg">{incomingRequest.claimerName}</p>
                <p className="text-muted text-xs mb-6">wants to join your Duo.</p>
                <div className="flex gap-3">
                  <button onClick={acceptRequest} className="flex-1 py-2 border border-amber text-amber hover:bg-amber/10 text-xs uppercase">Accept</button>
                  <button onClick={rejectRequest} className="flex-1 py-2 border border-red-500/50 text-red-500 hover:bg-red-500/10 text-xs uppercase">Reject</button>
                </div>
              </div>
            ) : myInvite ? (
              <div className="text-center w-full">
                <p className="text-muted text-xs mb-4">Send this link:</p>
                <div className="text-xs font-mono text-cream bg-black/50 p-3 rounded mb-4 break-all select-all">
                  https://0pingdev.github.io/twopia/join/?code={myInvite.code}
                </div>
                <button onClick={cancelInvite} className="text-xs text-muted hover:text-red-500 underline">Cancel</button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 w-full">
                <button onClick={generateInvite} className="w-full py-3 border border-cyan text-cyan text-xs uppercase tracking-widest hover:bg-cyan/10">Generate Invite Link</button>
                
                <div className="flex items-center gap-2 my-1">
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
            
            {/* Absolute close button for convenience */}
            {!duo && (
              <button onClick={() => setShowDuoMenu(false)} className="absolute top-4 right-4 text-muted hover:text-cream">✕</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
