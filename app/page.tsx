'use client';

import dynamic from 'next/dynamic';
import { Landing } from '@/components/Landing';
import { DevOverlay } from '@/components/DevOverlay';

const Scene = dynamic(() => import('@/components/Scene').then((m) => m.Scene), {
  ssr: false,
});

export default function Home() {
  return (
    <main>
      <Scene />
      <Landing />
      <DevOverlay />
    </main>
  );
}
