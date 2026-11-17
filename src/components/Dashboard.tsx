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
  
  const [joinCode, setJoinCode] = useState('');
  const [myInvite, setMyInvite] = useState<any>(null);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [playerColor, setPlayerColor] = useState(COLORS[0]);
  const [isNearDoor, setIsNearDoor] = useState(false);

  // Sprint 3.0 Networking State
  const [doorStatus, setDoorStatus] = useState<DoorStatus>('solo');
  const [partnerOnline, setPartnerOnline] = useState(false);
  const netRef = useRef<DuoNetwork | null>(null);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  // Setup Network when duo is established
  useEffect(() => {
    if (!duo) return;
    
    const partnerId = duo.player_a === user.id ? duo.player_b : duo.player_a;

    const net = new DuoNetwork(user.id, partnerId, {
      onKnock: (fromId) => {
        // Someone is knocking on my door
        setDoorStatus('incoming_knock');
      },
      onKnockAccepted: (hostId) => {
        // My knock was accepted, I am now visiting them
        setDoorStatus('visiting');
      },
      onKnockRejected: () => {
        // My knock was rejected
        setDoorStatus('knockable');
      },
      onPeerMove: (x, y, z) => {
        // Received partner movement (Handled in DenScene via a different mechanism later, for now ignore)
      },
      onPeerLeave: () => {
        // Partner left my lobby
        setDoorStatus('knockable');
      }
    });

    netRef.current = net;

    // Poll for partner presence (since we are doing this without robust presence tracking yet)
    // A better way is to use net.onPresence, but for now we just mark them as "knockable" if they are online
    // (We will refine this in Sprint 3.1)
    setDoorStatus('knockable');

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
  const handleDoorInteract = () => {
    if (doorStatus === 'solo') {
      // Open the pairing menu
      setErrorMsg('');
      // trigger UI state for menu
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

  // UI Helpers
  const duoStatus = duo ? (doorStatus === 'solo' ? 'knockable' : doorStatus) : 'solo';
  const showPairingMenu = doorStatus === 'solo' && isNearDoor; 
  const showDoorPrompt = doorStatus !== 'solo' && isNearDoor;

  if (loading) return <div className="flex items-center justify-center h-full text-amber font-serif italic text-2xl">Loading Twopia...</div>;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <DenScene 
        duoStatus={duoStatus} 
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
        {isNearDoor && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-auto">
            {doorStatus === 'solo' && (
              <button onClick={() => { setErrorMsg(''); setShowDuoMenu(true); }} className="px-8 py-4 bg-amber text-night font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(255,176,112,0.5)]">
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

        {/* Duo Panel Overlay (Only show when solo and menu is open) */}
        {/* (I have omitted the menu code for brevity here, keep your existing menu logic. Just make sure it only shows if doorStatus === 'solo') */}
      </div>
    </div>
  );
}
