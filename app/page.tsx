'use client';

import dynamic from 'next/dynamic';
import { Landing } from '@/components/Landing';
import { Dashboard } from '@/components/Dashboard';
import { DevOverlay } from '@/components/DevOverlay';
import { useAuth } from '@/lib/useAuth';

// Lazy load the 3D scene to avoid SSR issues
const DenScene = dynamic(() => import('@/components/DenScene').then((m) => m.DenScene), {
  ssr: false,
});

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* The 3D World */}
      <DenScene />

      {/* The UI Overlays */}
      <div className="relative z-10 w-full h-full pointer-events-none">
        {!loading && !user && <Landing />}
        {!loading && user && <Dashboard user={user} />}
        <DevOverlay />
      </div>
    </main>
  );
}
