'use client';

import * as THREE from 'three';
import { Text } from '@react-three/drei';

// Statuses: 'solo' | 'partner_offline' | 'knockable' | 'knocking' | 'incoming_knock' | 'visiting'
export function DuoDoor({ status, onInteract }: { status: string, onInteract: () => void }) {
  
  let color = '#1c1028';
  let textLabel = '';

  switch(status) {
    case 'solo':
      color = '#ffb070';
      textLabel = 'Find a Duo';
      break;
    case 'partner_offline':
      color = '#1c1028';
      textLabel = 'Partner Offline';
      break;
    case 'knockable':
      color = '#4fd1ff';
      textLabel = 'Knock on Door';
      break;
    case 'knocking':
      color = '#eab308'; // Yellow
      textLabel = 'Knocking...';
      break;
    case 'incoming_knock':
      color = '#ff7a1a'; // Hot Amber
      textLabel = 'Open Door!';
      break;
    case 'visiting':
      color = '#f43f5e'; // Red
      textLabel = 'Leave Lobby';
      break;
  }

  const isClickable = status !== 'partner_offline' && status !== 'knocking';

  return (
    <group position={[0, 0, -4]} onClick={(e) => { if(isClickable) { e.stopPropagation(); onInteract(); } }}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2, 3, 0.2]} />
        <meshStandardMaterial color="#0a0815" />
      </mesh>
      <mesh position={[0, 1.5, 0.11]}>
        <planeGeometry args={[1.8, 2.8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={status === 'partner_offline' ? 0.1 : 1.5} toneMapped={false} />
      </mesh>
      <Text position={[0, 3.2, 0]} fontSize={0.3} color={color} anchorX="center" anchorY="middle">
        {textLabel}
      </Text>
      <pointLight position={[0, 1.5, 0.5]} intensity={status === 'partner_offline' ? 0 : 3} color={color} distance={5} />
    </group>
  );
}
