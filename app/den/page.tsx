'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Box, Plane, Sphere, Environment } from '@react-three/drei';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { useAuth } from '@/lib/useAuth';

function Player() {
  const { camera } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});
  const velocity = useRef(new THREE.Vector3());
  const direction = new THREE.Vector3();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keys.current[e.code] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false;
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    const speed = 6;
    direction.z = Number(keys.current['KeyW'] || keys.current['ArrowUp']) - Number(keys.current['KeyS'] || keys.current['ArrowDown']);
    direction.x = Number(keys.current['KeyD'] || keys.current['ArrowRight']) - Number(keys.current['KeyA'] || keys.current['ArrowLeft']);
    direction.normalize();

    if (direction.z !== 0 || direction.x !== 0) {
      velocity.current.z -= direction.z * speed * delta;
      velocity.current.x -= direction.x * speed * delta;
    }

    velocity.current.multiplyScalar(0.85);

    const front = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    front.y = 0; front.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();

    camera.position.addScaledVector(front, velocity.current.z);
    camera.position.addScaledVector(right, velocity.current.x);

    camera.position.x = Math.max(-9, Math.min(9, camera.position.x));
    camera.position.z = Math.max(-9, Math.min(9, camera.position.z));
    camera.position.y = 1.7;
  });

  return null;
}

function Embers() {
  const ref = useRef<THREE.Points>(null);
  const count = 300;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      const arr = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += delta * 0.5;
        if (arr[i * 3 + 1] > 8) arr[i * 3 + 1] = 0;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffb070" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

export default function MiniDen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isLocked, setIsLocked] = useState(false);

  if (loading) return <div className="fixed inset-0 bg-night flex items-center justify-center text-amber">Entering Mini-Den...</div>;
  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="fixed inset-0 bg-night">
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
        
        {/* Top Bar (Visible when unlocked) */}
        {!isLocked && (
          <div className="flex justify-between items-start pointer-events-auto">
            <button 
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-black/50 backdrop-blur border border-amber/30 text-amber uppercase tracking-widest text-xs hover:bg-amber/20 transition"
            >
              Leave Mini-Den
            </button>
            <div className="text-right">
              <h2 className="text-cream font-serif italic text-2xl">Your Mini-Den</h2>
              <p className="text-muted text-xs uppercase tracking-widest mt-1">Solo Space</p>
            </div>
          </div>
        )}

        {/* Center Prompt (Visible when unlocked) */}
        {!isLocked && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-black/60 p-8 rounded-lg border border-amber/20 backdrop-blur-md pointer-events-auto cursor-pointer" onClick={() => document.querySelector('canvas')?.requestPointerLock()}>
            <p className="text-amber uppercase tracking-widest text-sm mb-2">Click to look around</p>
            <p className="text-muted text-xs">Press ESC at any time to free your cursor</p>
          </div>
        )}
      </div>

      {/* 3D Canvas - Added className to force full width/height */}
      <Canvas className="absolute inset-0 w-full h-full" camera={{ position: [0, 1.7, 5], fov: 70 }}>
        <color attach="background" args={['#05060a']} />
        <fog attach="fog" args={['#05060a', 4, 18]} />
        
        {/* Environment Map & Brighter Lights */}
        <Environment preset="night" />
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 4, 0]} intensity={150} color="#ffb070" distance={20} />
        <pointLight position={[-8, 3, -8]} intensity={80} color="#4fd1ff" distance={15} />

        <Plane args={[20, 20]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#1c1028" roughness={0.4} metalness={0.6} />
        </Plane>
        
        <Box args={[20, 8, 0.5]} position={[0, 4, -10]}>
          <meshStandardMaterial color="#0a0815" roughness={0.8} />
        </Box>
        <Box args={[0.5, 8, 20]} position={[-10, 4, 0]}>
          <meshStandardMaterial color="#0a0815" roughness={0.8} />
        </Box>
        <Box args={[0.5, 8, 20]} position={[10, 4, 0]}>
          <meshStandardMaterial color="#0a0815" roughness={0.8} />
        </Box>

        {/* Centerpiece */}
        <Sphere args={[0.8, 32, 32]} position={[0, 2, 0]}>
          <meshStandardMaterial color="#ff7a1a" emissive="#ff7a1a" emissiveIntensity={2} toneMapped={false} />
        </Sphere>

        <Embers />
        
        {/* Listen for Lock/Unlock to show/hide UI */}
        <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />
        <Player />
      </Canvas>
    </div>
  );
}
