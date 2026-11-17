'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { DenScene } from './DenScene';
import { DuoNetwork } from '@/lib/net';
import * as THREE from 'three';

const COLORS = ['#ffb070', '#4fd1ff', '#a855f7', '#10b981', '#f43f5e'];

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

  const [doorStatus, setDoorStatus] = useState('solo');
  const [isVisiting, setIsVisiting] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [isPlayerIdle, setIsPlayerIdle] = useState(false); // <--- AFK State
  
  const netRef = useRef<DuoNetwork | null>(null);
  const partnerPosRef = useRef(new THREE.Vector3(0, 0, 2));
  const lastSentPos = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    fetchData();
  }, [user.id]);

  useEffect(() => {
    if (!duo) return;
    const partnerId = duo.player_a === user.id ? duo.player_b : duo.player_a;

    const net = new DuoNetwork(user.id, partnerId, {
      onKnock: () => setDoorStatus('incoming_knock'),
      onKnockAccepted: () => {
        setIsVisiting(true);
        setPartnerOnline(true);
        setDoorStatus('visiting');
      },
      onKnockRejected: () => setDoorStatus('knockable'),
      onPeerMove: (x, y, z) => {
        partnerPosRef.current.set(x, y, z); // The lerp is now handled inside DenScene
      },
      onPeerLeave: () => {
        setPartnerOnline(false);
        setIsVisiting(false);
        setDoorStatus('knockable');
      },
      onKicked: () => {
        // I was visiting, but the host kicked me out
        setIsVisiting(false);
        setPartnerOnline(false);
        setDoorStatus('knockable');
      }
    });

    netRef.current = net;
    setDoorStatus('knockable');
    return () => net.disconnect();
  }, [duo, user.id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(p);

    if (p?.duo_id) {
      const { data: d } = await supabase.from('duos').select('*').eq('id', p.duo_id).single();
      setDuo(d);
    } else {
      setDuo(null);
      setDoorStatus('solo');
      const { data: i } = await supabase.from('invites').select('*').eq('creator_id', user.id).maybeSingle();
      if (i) {
        if (i.claimed_by) {
          const { data: claimer } = await supabase.from('profiles').select('gamer_name').eq('id', i.claimed_by).single();
          setIncomingRequest({ ...i, claimerName: claimer?.gamer_name || 'Someone' });
        } else {
          setMyInvite(i);
        }
      }
    }
    setLoading(false);
  };

  const handleDoorInteract = () => {
    if (doorStatus === 'solo') setShowDuoMenu(true);
    else if (doorStatus === 'knockable') {
      netRef.current?.sendKnock();
      setDoorStatus('knocking');
    }
    else if (doorStatus === 'incoming_knock') {
      netRef.current?.acceptKnock();
      setDoorStatus('hosting'); 
      setPartnerOnline(true);
    }
    else if (doorStatus === 'visiting') {
      netRef.current?.leave();
      setIsVisiting(false);
      setPartnerOnline(false);
      setDoorStatus('knockable');
    }
    else if (doorStatus === 'hosting') {
      netRef.current?.kick();
      setPartnerOnline(false);
      setDoorStatus('knockable');
    }
  };

  const handlePlayerMove = (x: number, y: number, z: number) => {
    if (!netRef.current || isPlayerIdle) return; // <--- Stop sending if AFK
    
    const dist = Math.abs(x - lastSentPos.current.x) + Math.abs(y - lastSentPos.current.y) + Math.abs(z - lastSentPos.current.z);
    if (dist > 0.05) {
      netRef.current.sendMove(x, y, z);
      lastSentPos.current = { x, y, z };
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-amber font-serif italic text-2xl">Loading Twopia...</div>;

  const displayDoorStatus = isVisiting ? 'visiting' : (partnerOnline ? 'hosting' : doorStatus);
  const isNetworkActive = isVisiting || partnerOnline;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <DenScene 
        duoStatus={displayDoorStatus} 
        onDoorInteract={handleDoorInteract} 
        playerColor={playerColor} 
        onPositionUpdate={(dist) => setIsNearDoor(dist < 2.5)}
        partnerPosRef={partnerPosRef}
        partnerOnline={partnerOnline}
        onPlayerMove={handlePlayerMove}
        isNetworkActive={isNetworkActive}
        onIdleChange={(idle) => setIsPlayerIdle(idle)} // <--- Pass AFK state
      />

      {/* HUD code remains exactly the same, no changes needed here! */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-8 pointer-events-none">
        
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto">
            <h1 className="text-4xl text-cream font-serif italic drop-shadow-lg">
              {profile?.gamer_name || 'Traveler'}
            </h1>
            <p className="text-cyan text-xs tracking-widest uppercase mt-1 shadow-black drop-shadow-md">
              {isVisiting ? "Partner's Lobby" : "Solo Lobby"}
            </p>
          </div>
          
          <div className="pointer-events-auto flex flex-col items-end gap-4">
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-muted hover:text-cream underline transition-colors">
              Sign Out
            </button>
            <div className="flex gap-2 bg-night/50 p-2 rounded-lg border border-amber/20 backdrop-blur-md">
              {COLORS.map(c => (
                <button key={c} onClick={() => setPlayerColor(c)} className={`w-6 h-6 rounded-full transition-transform ${playerColor === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>

        {isNearDoor && !showDuoMenu && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-auto">
            {displayDoorStatus === 'solo' && (
              <button onClick={handleDoorInteract} className="px-8 py-4 bg-amber text-night font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(255,176,112,0.5)]">Find a Duo</button>
            )}
            {displayDoorStatus === 'knockable' && (
              <button onClick={handleDoorInteract} className="px-8 py-4 bg-cyan text-night font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(79,209,255,0.5)]">Knock on Partner's Door</button>
            )}
            {displayDoorStatus === 'knocking' && (
              <button disabled className="px-8 py-4 bg-yellow-600 text-night font-bold uppercase tracking-widest rounded">Knocking...</button>
            )}
            {displayDoorStatus === 'incoming_knock' && (
              <div className="flex gap-4">
                <button onClick={handleDoorInteract} className="px-8 py-4 bg-amber text-night font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(255,176,112,0.5)]">Open Door</button>
                <button onClick={() => { netRef.current?.rejectKnock(); setDoorStatus('knockable'); }} className="px-8 py-4 bg-red-600 text-night font-bold uppercase tracking-widest rounded">Reject</button>
              </div>
            )}
            {displayDoorStatus === 'visiting' && (
              <button onClick={handleDoorInteract} className="px-8 py-4 bg-red-600 text-white font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(244,63,94,0.5)]">Leave Partner's Lobby</button>
            )}
            {displayDoorStatus === 'hosting' && (
              <button onClick={handleDoorInteract} className="px-8 py-4 bg-red-600 text-white font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(244,63,94,0.5)]">Kick Visitor</button>
            )}
          </div>
        )}

        {showDuoMenu && (
          <div className="pointer-events-auto mb-8 w-96 bg-night/90 backdrop-blur-xl border border-amber/20 rounded-xl p-6 shadow-2xl mx-auto relative">
            <h2 className="text-xl mb-4 text-amber font-serif italic text-center">Duo Status</h2>
            <button onClick={() => setShowDuoMenu(false)} className="w-full py-2 border border-amber text-amber uppercase tracking-widest text-xs hover:bg-amber/10 transition mt-4">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
