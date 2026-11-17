'use client';

import { Landing } from '@/components/Landing';
import { Dashboard } from '@/components/Dashboard';
import { DevOverlay } from '@/components/DevOverlay';
import { useAuth } from '@/lib/useAuth';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <main className="relative w-full h-screen overflow-hidden bg-night">
      {/* The UI Overlays */}
      <div className="relative z-10 w-full h-full">
        {!loading && !user && <Landing />}
        {!loading && user && <Dashboard user={user} />}
        <DevOverlay />
      </div>
    </main>
  );
}
