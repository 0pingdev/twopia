'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { usePointerLockSync } from '@/state/pointer-lock';

function Embers() {
  const ref = useRef<THREE.Points>(null);
  const count = 800;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = Math.random() * 20;
    positions[i * 3 + 2] = -Math.random() * 40;
  }
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (ref.current) {
        const arr = ref.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
          arr[i * 3 + 1] += 0.01;
          if (arr[i * 3 + 1] > 20) arr[i * 3 + 1] = 0;
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#ffb070"
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function Scene() {
  const ref = useRef<HTMLCanvasElement>(null);
  usePointerLockSync(ref.current ?? null);

  useEffect(() => {
    // Re-sync once the ref is definitely mounted.
    usePointerLockSync(ref.current ?? null);
  }, []);

  return (
    <Canvas
      ref={ref}
      camera={{ position: [0, 1.7, 6], fov: 65 }}
      style={{ position: 'fixed', inset: 0 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#05060a']} />
      <fogExp2 attach="fog" args={['#05060a', 0.05]} />
      <ambientLight intensity={0.4} color="#2a3a60" />
      <directionalLight position={[-10, 20, 5]} intensity={0.6} color="#9ab4ff" />
      <pointLight position={[0, 4, -6]} intensity={20} color="#ff8a3d" distance={25} />
      <Embers />
    </Canvas>
  );
}
