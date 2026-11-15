'use client';

import dynamic from 'next/dynamic';
import { Landing } from '@/components/Landing';
import { Dashboard } from '@/components/Dashboard';
import { DevOverlay } from '@/components/DevOverlay';
import { useAuth } from '@/lib/useAuth';

const Scene = dynamic(() => import('@/components/Scene').then((m) => m.Scene), {
  ssr: false,
});

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <main>
      <Scene />
      {!loading && !user && <Landing />}
      {!loading && user && <Dashboard user={user} />}
      <DevOverlay />
    </main>
  );
}
