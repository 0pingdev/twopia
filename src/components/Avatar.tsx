'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Avatar({ color, isMe, positionRef, cameraRef, onIdleChange }: { color: string, isMe: boolean, positionRef: React.MutableRefObject<THREE.Vector3>, cameraRef: React.MutableRefObject<any>, onIdleChange?: (idle: boolean) => void }) {
  const group = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const lastMoveTime = useRef(Date.now());
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    if (!isMe) return;
    const down = (e: KeyboardEvent) => {
      setKeys((k) => ({ ...k, [e.code]: true }));
      lastMoveTime.current = Date.now();
      if (isIdle) { setIsIdle(false); onIdleChange?.(false); }
    };
    const up = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: false }));
    
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [isMe, isIdle, onIdleChange]);

   useFrame((state, delta) => {
    if (!group.current) return;

    // 1. Check for AFK
    if (isMe && Date.now() - lastMoveTime.current > 2000 && !isIdle) {
      setIsIdle(true);
      onIdleChange?.(true);
    }

    // 2. Movement Logic (Only for me)
    if (isMe && !isIdle) {
      const speed = 4 * delta;
      const forward = new THREE.Vector3();
      cameraRef.current.getWorldDirection(forward);
      forward.y = 0;
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
        positionRef.current.addScaledVector(moveDir, speed);

        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetAngle - group.current.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        group.current.rotation.y += diff * 10 * delta;
      }
    }

    // 3. Boundary Check
    const maxRadius = 5.2;
    const dist = Math.sqrt(positionRef.current.x ** 2 + positionRef.current.z ** 2);
    if (dist > maxRadius) {
      const angle = Math.atan2(positionRef.current.z, positionRef.current.x);
      positionRef.current.x = Math.cos(angle) * maxRadius;
      positionRef.current.z = Math.sin(angle) * maxRadius;
    }

    // 4. Apply Position (LERP for smooth network movement)
    if (isMe) {
      group.current.position.copy(positionRef.current);
    } else {
      // If it's the partner, glide to their position
      group.current.position.lerp(positionRef.current, 0.15);
    }
    
    // 5. Idle Breathing
    if (lightRef.current) {
      if (isIdle) {
        lightRef.current.intensity = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
      } else {
        lightRef.current.intensity = 2;
      }
    }
  });
  
  return (
    <group ref={group}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.6, 16, 32]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.3, 0]} castShadow>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.8} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 1, 0]} intensity={2} color={color} distance={3} />
    </group>
  );
}
