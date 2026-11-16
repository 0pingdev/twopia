'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

function Embers() {
  const ref = useRef<THREE.Points>(null);
  const count = 150;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      const arr = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += delta * 0.4;
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
      <pointsMaterial size={0.06} color="#ffb070" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

export function DenScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 3, 8], fov: 50 }} gl={{ antialias: true }}>
        <color attach="background" args={['#05060a']} />
        <fog attach="fog" args={['#05060a', 5, 25]} />
        
        {/* Reliable, strong lighting */}
        <ambientLight intensity={1.5} color="#4fd1ff" />
        <directionalLight position={[5, 10, 5]} intensity={2} color="#ffb070" />
        <pointLight position={[0, 2, 0]} intensity={5} color="#ff7a1a" distance={10} />

        <Stars radius={50} depth={20} count={2000} factor={4} saturation={0} fade speed={1} />

        {/* The Lobby Floor (A hexagonal platform) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <cylinderGeometry args={[6, 6, 0.2, 6]} />
          <meshStandardMaterial color="#0e0a1e" roughness={0.7} metalness={0.3} />
        </mesh>

        {/* The Centerpiece (The Thread Core) */}
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial color="#ff7a1a" emissive="#ff7a1a" emissiveIntensity={3} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 1.5, 0]} intensity={8} color="#ff7a1a" distance={6} />

        {/* Some pillars for depth */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * 5.5, 2, Math.sin(angle) * 5.5]}>
              <boxGeometry args={[0.4, 4, 0.4]} />
              <meshStandardMaterial color="#1c1028" roughness={0.8} />
            </mesh>
          );
        })}

        <Embers />

        {/* OrbitControls lets the user drag to look around without locking the mouse */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 2.2} 
          autoRotate 
          autoRotateSpeed={0.5} 
        />
      </Canvas>
    </div>
  );
}
