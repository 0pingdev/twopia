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

  useEffect(() => {
    async function loadData() {
      try {
        setErrorMsg('');
        
        // 1. Fetch Profile
        const { data: p, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (pError) throw pError;
        setProfile(p);

        // 2. Fetch Duo (using .limit(1) instead of maybeSingle to prevent 406 errors)
        const { data: dArray, error: dError } = await supabase
          .from('duos')
          .select('*')
          .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
          .limit(1);
        
        if (dError) throw dError;

        const currentDuo = dArray && dArray.length > 0 ? dArray[0] : null;
        setDuo(currentDuo);

        // 3. If Duo exists and is pending, fetch the invite code!
        if (currentDuo && currentDuo.status === 'pending') {
          const { data: invite, error: iError } = await supabase
            .from('invitations')
            .select('code')
            .eq('duo_id', currentDuo.id)
            .maybeSingle();
          
          if (invite) {
            setInviteCode(invite.code);
          }
        }
      } catch (err: any) {
        console.error(err);
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
    
    const { data: newDuo, error } = await supabase
      .from('duos')
      .insert({ player_a: user.id })
      .select()
      .single();
      
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (newDuo) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error: inviteError } = await supabase
        .from('invitations')
        .insert({ code, duo_id: newDuo.id });
      
      if (inviteError) {
        setErrorMsg(inviteError.message);
        setLoading(false);
        return;
      }

      setInviteCode(code);
      setDuo(newDuo);
      setLoading(false);
    }
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
        <div className="border border-amber/30 p-8 rounded bg-night/80">
          <h2 className="text-xl mb-4 text-amber">You are alone in Twopia.</h2>
          <p className="text-sm text-muted mb-6">Create an invite link to bring your partner into your world.</p>
          <button onClick={createDuo} className="px-6 py-3 border border-amber text-amber text-xs uppercase tracking-widest hover:bg-amber/10 transition-colors">
            Generate Invite Code
          </button>
        </div>
      ) : duo.status === 'pending' ? (
        <div className="border border-cyan/30 p-8 rounded bg-night/80">
          <h2 className="text-xl mb-4 text-cyan">Waiting for your partner...</h2>
          <p className="text-sm text-muted mb-6">Send them this link:</p>
          {inviteCode ? (
            <div className="text-lg font-mono tracking-widest text-cream bg-black/50 p-4 rounded mb-4 select-all">
              https://0pingdev.github.io/twopia/join/?code={inviteCode}
            </div>
          ) : (
            <div className="text-sm text-red-500 mb-4">Could not load invite code.</div>
          )}
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
