'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { DenScene } from './DenScene';

export function Dashboard({ user }: { user: User }) {
  // ... (Keep all the existing database fetch logic here: profile, duo, invites, etc.) ...
  // (I'm omitting the DB logic for brevity, keep exactly what you have in your current file)

  const [profile, setProfile] = useState<any>(null);
  const [duo, setDuo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDuoMenu, setShowDuoMenu] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [myInvite, setMyInvite] = useState<any>(null);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);

  // ... (Keep your fetchData, generateInvite, acceptRequest, etc. here) ...

  if (loading) return <div className="flex items-center justify-center h-full text-amber font-serif italic text-2xl">Loading Twopia...</div>;

  // Determine Door State
  const duoStatus = duo ? (duo.player_a === user.id || duo.player_b === user.id ? 'online' : 'offline') : 'solo';

  const handleDoorInteract = () => {
    // If solo, open the Duo Menu
    if (duoStatus === 'solo') setShowDuoMenu(true);
    // If online, (Sprint 3.1) We will teleport them here
    if (duoStatus === 'online') alert('Going to Partner Lobby...');
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      
      {/* 3D Background */}
      <DenScene duoStatus={duoStatus} onDoorInteract={handleDoorInteract} />

      {/* HUD Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-8 pointer-events-none">
        
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto">
            <h1 className="text-4xl text-cream font-serif italic drop-shadow-lg">
              {profile?.gamer_name || 'Traveler'}
            </h1>
            <p className="text-cyan text-xs tracking-widest uppercase mt-1 shadow-black drop-shadow-md">Solo Lobby</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="pointer-events-auto text-xs text-muted hover:text-cream underline">
            Sign Out
          </button>
        </div>

        {/* THE DUO PANEL (Now appears when you click the Door, or when there's an incoming request) */}
        {(showDuoMenu || incomingRequest) && (
          <div className="pointer-events-auto mb-8 w-96 bg-night/90 backdrop-blur-xl border border-amber/20 rounded-xl p-6 shadow-2xl mx-auto">
            <h2 className="text-xl mb-4 text-amber font-serif italic text-center">Duo Status</h2>
            {errorMsg && <p className="text-red-500 text-xs text-center mb-2">{errorMsg}</p>}

            {duo ? (
              <div className="text-center">
                <p className="text-amber mb-2 uppercase tracking-widest text-xs">Paired</p>
                <p className="text-muted text-xs mb-6">Your partner is {duoStatus === 'online' ? 'online' : 'offline'}.</p>
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
                  .../join/?code={myInvite.code}
                </div>
                <button onClick={cancelInvite} className="text-xs text-muted hover:text-red-500 underline">Cancel</button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 w-full">
                <button onClick={generateInvite} className="w-full py-3 border border-cyan text-cyan text-xs uppercase tracking-widest hover:bg-cyan/10">Generate Invite Link</button>
                <div className="flex gap-2">
                  <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ENTER CODE" maxLength={6} className="w-full bg-black/40 border border-cyan/30 text-cyan text-center tracking-widest p-2 rounded outline-none text-xs" />
                  <button onClick={claimCode} className="px-4 border border-cyan text-cyan hover:bg-cyan/10 uppercase text-xs">Join</button>
                </div>
              </div>
            )}
            
            {/* Close button for the menu */}
            <button onClick={() => setShowDuoMenu(false)} className="w-full mt-4 text-[10px] text-muted uppercase hover:text-cream">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
