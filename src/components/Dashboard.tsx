'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export function Dashboard({ user }: { user: User }) {
  const [profile, setProfile] = useState<any>(null);
  const [duo, setDuo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    async function loadData() {
      // 1. Fetch Profile
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);

      // 2. Fetch Duo (where I am Player A or Player B)
      const { data: d } = await supabase
        .from('duos')
        .select('*')
        .or(`player_a.eq.${user.id},player_b.eq.${user.id}`)
        .maybeSingle();
      
      setDuo(d);
      setLoading(false);
    }
    loadData();
  }, [user.id]);

  const createDuo = async () => {
    const { data: newDuo, error } = await supabase
      .from('duos')
      .insert({ player_a: user.id })
      .select()
      .single();
      
    if (newDuo) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await supabase.from('invitations').insert({ code, duo_id: newDuo.id });
      setInviteCode(code);
      setDuo(newDuo);
    }
  };

  const signOut = () => supabase.auth.signOut();

  if (loading) return <div className="fixed inset-0 flex items-center justify-center text-amber">Loading Twopia...</div>;

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-4xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
        Welcome, {profile?.gamer_name}
      </h1>
      <p className="text-muted mb-8">{user.email}</p>

      {!duo ? (
        <div className="border border-amber/30 p-8 rounded bg-night/80">
          <h2 className="text-xl mb-4 text-amber">You are alone in Twopia.</h2>
          <p className="text-sm text-muted mb-6">Create an invite link to bring your partner into your world.</p>
          <button onClick={createDuo} className="px-6 py-3 border border-amber text-amber text-xs uppercase tracking-widest hover:bg-amber/10">
            Generate Invite Code
          </button>
        </div>
      ) : duo.status === 'pending' ? (
        <div className="border border-cyan/30 p-8 rounded bg-night/80">
          <h2 className="text-xl mb-4 text-cyan">Waiting for your partner...</h2>
          <p className="text-sm text-muted mb-6">Send them this code:</p>
          <div className="text-3xl font-mono tracking-widest text-cream bg-black/50 p-4 rounded mb-4">
            {inviteCode || 'Loading code...'}
          </div>
        </div>
      ) : (
        <div className="border border-amber/30 p-8 rounded bg-night/80">
          <h2 className="text-xl mb-4 text-amber">Your Duo is connected!</h2>
          <p className="text-sm text-muted mb-6">The Den is ready. (Sprint 3 kicks in here).</p>
        </div>
      )}

      <button onClick={signOut} className="mt-12 text-xs text-muted hover:text-cream underline">
        Sign Out
      </button>
    </div>
  );
}
