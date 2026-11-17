'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

export function DuoDoor({ status, onInteract }: { status: 'solo' | 'online' | 'offline', onInteract: () => void }) {
  const doorRef = useRef<THREE.Group>(null);
  
  // Colors based on state
  const color = status === 'online' ? '#4fd1ff' : status === 'solo' ? '#ffb070' : '#1c1028';
  const textLabel = status === 'online' ? 'Visit Partner' : status === 'solo' ? 'Find a Duo' : 'Partner Offline';

  // Hover effect
  useFrame((state) => {
    if (!doorRef.current) return;
    const hover = state.raycaster.intersectObject(doorRef.current).length > 0;
    doorRef.current.scale.lerp(new THREE.Vector3(hover ? 1.1 : 1, hover ? 1.1 : 1, 1), 0.1);
  });

  return (
    <group ref={doorRef} position={[0, 0, -4]} onClick={(e) => { e.stopPropagation(); onInteract(); }}>
      {/* Door Frame */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2, 3, 0.2]} />
        <meshStandardMaterial color="#0a0815" />
      </mesh>
      {/* Glowing Portal Surface */}
      <mesh position={[0, 1.5, 0.11]}>
        <planeGeometry args={[1.8, 2.8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={status === 'offline' ? 0.1 : 1.5} toneMapped={false} />
      </mesh>
      {/* Label */}
      <Text position={[0, 3.2, 0]} fontSize={0.3} color={color} anchorX="center" anchorY="middle">
        {textLabel}
      </Text>
      <pointLight position={[0, 1.5, 0.5]} intensity={status === 'offline' ? 0 : 3} color={color} distance={5} />
    </group>
  );
}
