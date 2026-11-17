'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Basic Toon Avatar built from primitives
export function Avatar({ color, isMe, positionRef, cameraRef }: { color: string, isMe: boolean, positionRef: React.MutableRefObject<THREE.Vector3>, cameraRef: React.MutableRefObject<any> }) {
  const group = useRef<THREE.Group>(null);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});

  // Handle Keyboard Input for local player
  useEffect(() => {
    if (!isMe) return;
    const down = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: true }));
    const up = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: false }));
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [isMe]);

  useFrame((state, delta) => {
    if (!group.current) return;

    if (isMe) {
      // 1. Calculate movement direction relative to Camera
      const speed = 4 * delta;
      const forward = new THREE.Vector3();
      cameraRef.current.getWorldDirection(forward);
      forward.y = 0; // Flatten to ground
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const moveDir = new THREE.Vector3();
      if (keys['KeyW'] || keys['ArrowUp']) moveDir.add(forward);
      if (keys['KeyS'] || keys['ArrowDown']) moveDir.sub(forward);
      if (keys['KeyD'] || keys['ArrowRight']) moveDir.add(right);
      if (keys['KeyA'] || keys['ArrowLeft']) moveDir.sub(right);

      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        
        // 2. Move the Ref
        positionRef.current.addScaledVector(moveDir, speed);

        // 3. Rotate Avatar to face movement direction
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        // Smooth rotation
        let diff = targetAngle - group.current.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        group.current.rotation.y += diff * 10 * delta;
      }
    }

    // 4. Boundary Check (Glitch Proofing - stay inside the hexagon)
    const maxRadius = 5.2;
    const dist = Math.sqrt(positionRef.current.x ** 2 + positionRef.current.z ** 2);
    if (dist > maxRadius) {
      const angle = Math.atan2(positionRef.current.z, positionRef.current.x);
      positionRef.current.x = Math.cos(angle) * maxRadius;
      positionRef.current.z = Math.sin(angle) * maxRadius;
    }

    // 5. Apply to actual mesh
    group.current.position.copy(positionRef.current);
  });

  return (
    <group ref={group}>
      {/* Body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.6, 16, 32]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.8} />
      </mesh>
      {/* Aura Glow */}
      <pointLight position={[0, 1, 0]} intensity={2} color={color} distance={3} />
    </group>
  );
}
