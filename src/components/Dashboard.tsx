'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export function Dashboard({ user }: { user: User }) {
  const [profile, setProfile] = useState<any>(null);
  const [duo, setDuo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // New state for the Join feature
  const [inputCode, setInputCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setErrorMsg('');
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        setProfile(p);

        const { data: dArray } = await supabase
          .from('duos')
          .select('*')
          .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
          .limit(1);
        
        const currentDuo = dArray && dArray.length > 0 ? dArray[0] : null;
        setDuo(currentDuo);

        if (currentDuo && currentDuo.status === 'pending') {
          const { data: invite } = await supabase.from('invitations').select('code').eq('duo_id', currentDuo.id).maybeSingle();
          if (invite) setInviteCode(invite.code);
        }
      } catch (err: any) {
        setErrorMsg('Failed to load data. Please refresh.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user.id]);

  const createDuo = async () => {
    setErrorMsg('');
    setLoading(true);
    const { data: newDuo, error } = await supabase.from('duos').insert({ player_a: user.id }).select().single();
    if (error) { setErrorMsg(error.message); setLoading(false); return; }

    if (newDuo) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await supabase.from('invitations').insert({ code, duo_id: newDuo.id });
      setInviteCode(code);
      setDuo(newDuo);
      setLoading(false);
    }
  };

    const joinDuoWithCode = async () => {
    if (!inputCode.trim()) return;
    setIsJoining(true);
    setErrorMsg('');

    const { data: invite, error: inviteError } = await supabase
      .from('invitations')
      .select('duo_id')
      .eq('code', inputCode.trim().toUpperCase())
      .single();

    if (inviteError || !invite) {
      setErrorMsg('Invalid invite code.');
      setIsJoining(false);
      return;
    }

    // ADDED .select() to verify the update actually happened
    const { data: updatedDuo, error: joinError } = await supabase
      .from('duos')
      .update({ player_b: user.id, status: 'active' })
      .eq('id', invite.duo_id)
      .select();

    if (joinError) {
      setErrorMsg(`Database error: ${joinError.message}`);
      setIsJoining(false);
      return;
    }

    if (!updatedDuo || updatedDuo.length === 0) {
      setErrorMsg('Could not join. The Duo is already full.');
      setIsJoining(false);
      return;
    }

    await supabase.from('invitations').delete().eq('code', inputCode.trim().toUpperCase());
    
    // HARD RELOAD to ensure the dashboard fetches the new active Duo
    window.location.reload(); 
  };

  const signOut = () => supabase.auth.signOut();

  if (loading) return <div className="fixed inset-0 flex items-center justify-center text-amber">Loading Twopia...</div>;

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-4xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
        Welcome, {profile?.gamer_name || 'Traveler'}
      </h1>
      <p className="text-muted mb-8">{user.email}</p>

      {errorMsg && <p className="text-red-500 mb-4">{errorMsg}</p>}

      {!duo ? (
        <div className="flex flex-col md:flex-row gap-6">
          {/* CREATE DUO */}
          <div className="border border-amber/30 p-8 rounded bg-night/80 w-80">
            <h2 className="text-xl mb-4 text-amber">Create a Duo</h2>
            <p className="text-sm text-muted mb-6 h-10">Generate a code to send to your partner.</p>
            <button onClick={createDuo} className="w-full px-6 py-3 border border-amber text-amber text-xs uppercase tracking-widest hover:bg-amber/10 transition-colors">
              Generate Code
            </button>
          </div>

          {/* JOIN DUO */}
          <div className="border border-cyan/30 p-8 rounded bg-night/80 w-80">
            <h2 className="text-xl mb-4 text-cyan">Join a Duo</h2>
            <p className="text-sm text-muted mb-6 h-10">Enter the code your partner sent you.</p>
            <input 
              type="text" 
              placeholder="CODE" 
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full bg-black/50 border border-cyan/30 text-cream text-center tracking-widest text-lg p-3 rounded mb-4 outline-none focus:border-cyan"
            />
            <button 
              onClick={joinDuoWithCode} 
              disabled={isJoining || inputCode.length < 6}
              className="w-full px-6 py-3 border border-cyan text-cyan text-xs uppercase tracking-widest hover:bg-cyan/10 transition-colors disabled:opacity-50"
            >
              {isJoining ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>
      ) : duo.status === 'pending' ? (
        <div className="border border-cyan/30 p-8 rounded bg-night/80">
          <h2 className="text-xl mb-4 text-cyan">Waiting for your partner...</h2>
          <p className="text-sm text-muted mb-6">Send them this link (or the code):</p>
          <div className="text-lg font-mono tracking-widest text-cream bg-black/50 p-4 rounded mb-4 select-all">
            https://0pingdev.github.io/twopia/join/?code={inviteCode}
          </div>
          <div className="text-3xl font-mono tracking-widest text-amber">
            {inviteCode}
          </div>
        </div>
      ) : (
        <div className="border border-amber/30 p-8 rounded bg-night/80">
          <h2 className="text-xl mb-4 text-amber">Your Duo is connected!</h2>
          <p className="text-sm text-muted mb-6">The Den is ready. (Sprint 3 kicks in here).</p>
        </div>
      )}

      <button onClick={signOut} className="mt-12 text-xs text-muted hover:text-cream underline transition-colors">
        Sign Out
      </button>
    </div>
  );
}
