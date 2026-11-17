'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { DenScene } from './DenScene';
import { DuoNetwork } from '@/lib/net';

const COLORS = ['#ffb070', '#4fd1ff', '#a855f7', '#10b981', '#f43f5e'];
type DoorStatus = 'solo' | 'partner_offline' | 'knockable' | 'knocking' | 'incoming_knock' | 'visiting';

export function Dashboard({ user }: { user: User }) {
  const [profile, setProfile] = useState<any>(null);
  const [duo, setDuo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [showDuoMenu, setShowDuoMenu] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [myInvite, setMyInvite] = useState<any>(null);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [playerColor, setPlayerColor] = useState(COLORS[0]);
  const [isNearDoor, setIsNearDoor] = useState(false);

  // Sprint 3.0 Networking State
  const [doorStatus, setDoorStatus] = useState<DoorStatus>('solo');
  const netRef = useRef<DuoNetwork | null>(null);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  // Setup Network when duo is established
  useEffect(() => {
    if (!duo) return;
    
    const partnerId = duo.player_a === user.id ? duo.player_b : duo.player_a;

    const net = new DuoNetwork(user.id, partnerId, {
      onKnock: (fromId) => setDoorStatus('incoming_knock'),
      onKnockAccepted: (hostId) => setDoorStatus('visiting'),
      onKnockRejected: () => setDoorStatus('knockable'),
      onPeerMove: (x, y, z) => {}, // Handled in DenScene later
      onPeerLeave: () => setDoorStatus('knockable')
    });

    netRef.current = net;
    setDoorStatus('knockable'); // Assume partner is online for now

    return () => {
      net.disconnect();
    };
  }, [duo, user.id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);

    if (p?.duo_id) {
      const { data: d } = await supabase.from('duos').select('*').eq('id', p.duo_id).single();
      setDuo(d);
      setMyInvite(null);
      setIncomingRequest(null);
    } else {
      setDuo(null);
      setDoorStatus('solo');
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
    const { data: invite } = await supabase.from('invites').select('*').eq('code', joinCode.toUpperCase()).single();
    if (!invite) { setErrorMsg('Invalid code.'); return; }
    if (invite.claimed_by) { setErrorMsg('Code already claimed.'); return; }
    await supabase.from('invites').update({ claimed_by: user.id }).eq('code', joinCode.toUpperCase());
    setJoinCode('');
    fetchData();
  };

  const handleDoorInteract = () => {
    if (doorStatus === 'solo') {
      setShowDuoMenu(true);
    } 
    else if (doorStatus === 'knockable') {
      netRef.current?.sendKnock();
      setDoorStatus('knocking');
    }
    else if (doorStatus === 'incoming_knock') {
      netRef.current?.acceptKnock();
      setDoorStatus('visiting');
    }
    else if (doorStatus === 'visiting') {
      netRef.current?.leave();
      setDoorStatus('knockable');
    }
  };

  const handlePositionUpdate = (dist: number) => {
    setIsNearDoor(dist < 2.5);
  };

  if (loading) return <div className="flex items-center justify-center h-full text-amber font-serif italic text-2xl">Loading Twopia...</div>;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <DenScene 
        duoStatus={doorStatus} 
        onDoorInteract={handleDoorInteract} 
        playerColor={playerColor} 
        onPositionUpdate={handlePositionUpdate}
      />

      <div className="absolute inset-0 z-10 flex flex-col justify-between p-8 pointer-events-none">
        
        {/* Top Header */}
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto">
            <h1 className="text-4xl text-cream font-serif italic drop-shadow-lg">
              {profile?.gamer_name || 'Traveler'}
            </h1>
            <p className="text-cyan text-xs tracking-widest uppercase mt-1 shadow-black drop-shadow-md">
              Solo Lobby
            </p>
          </div>
          
          <div className="pointer-events-auto flex flex-col items-end gap-4">
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-muted hover:text-cream underline transition-colors">
              Sign Out
            </button>
            
            {/* Color Picker */}
            <div className="flex gap-2 bg-night/50 p-2 rounded-lg border border-amber/20 backdrop-blur-md">
              {COLORS.map(c => (
                <button 
                  key={c} 
                  onClick={() => setPlayerColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${playerColor === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* PROXIMITY BUTTON (Fallback for clicking the door) */}
        {isNearDoor && !showDuoMenu && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-auto">
            {doorStatus === 'solo' && (
              <button onClick={handleDoorInteract} className="px-8 py-4 bg-amber text-night font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(255,176,112,0.5)]">
                Find a Duo
              </button>
            )}
            {doorStatus === 'knockable' && (
              <button onClick={handleDoorInteract} className="px-8 py-4 bg-cyan text-night font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(79,209,255,0.5)]">
                Knock on Partner's Door
              </button>
            )}
            {doorStatus === 'knocking' && (
              <button disabled className="px-8 py-4 bg-yellow-600 text-night font-bold uppercase tracking-widest rounded">
                Knocking...
              </button>
            )}
            {doorStatus === 'incoming_knock' && (
              <div className="flex gap-4">
                <button onClick={handleDoorInteract} className="px-8 py-4 bg-amber text-night font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(255,176,112,0.5)]">
                  Open Door
                </button>
                <button onClick={() => { netRef.current?.rejectKnock(); setDoorStatus('knockable'); }} className="px-8 py-4 bg-red-600 text-night font-bold uppercase tracking-widest rounded">
                  Reject
                </button>
              </div>
            )}
            {doorStatus === 'visiting' && (
              <button onClick={handleDoorInteract} className="px-8 py-4 bg-red-600 text-white font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(244,63,94,0.5)]">
                Leave Partner's Lobby
              </button>
            )}
          </div>
        )}

        {/* THE PAIRING MENU OVERLAY */}
        {showDuoMenu && (
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
                  <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ENTER CODE" maxLength={6} className="w-full bg-black/40 border border-cyan/30 text-cyan text-center tracking-widest p-2 rounded outline-none text-xs" />
                  <button onClick={claimCode} className="px-4 border border-cyan text-cyan hover:bg-cyan/10 uppercase text-xs">Join</button>
                </div>
              </div>
            )}
            
            {!duo && (
              <button onClick={() => setShowDuoMenu(false)} className="absolute top-4 right-4 text-muted hover:text-cream">✕</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
