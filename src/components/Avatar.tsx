'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Text } from '@react-three/drei';
import * as THREE from 'three';
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Update the path to the new smaller file
useGLTF.preload(`${base}/models/agnes-small.glb`);

export function Avatar({ 
  color, isMe, positionRef, cameraRef, onIdleChange, joyDir, username 
}: any) {
  const { scene } = useGLTF(`${base}/models/agnes-small.glb`);
  const clonedScene = useMemo(() => scene.clone(), [scene]);

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

    if (isMe && Date.now() - lastMoveTime.current > 2000 && !isIdle) {
      setIsIdle(true);
      onIdleChange?.(true);
    }

    if (isMe && !isIdle) {
      if (!cameraRef.current) return; 
      const speed = 4 * delta;
      const forward = new THREE.Vector3();
      cameraRef.current.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const moveDir = new THREE.Vector3();

      if (keys['KeyW'] || keys['ArrowUp']) moveDir.add(forward);
      if (keys['KeyS'] || keys['ArrowDown']) moveDir.sub(forward);
      if (keys['KeyD'] || keys['ArrowRight']) moveDir.add(right);
      if (keys['KeyA'] || keys['ArrowLeft']) moveDir.sub(right);

      if (joyDir && (joyDir.x !== 0 || joyDir.y !== 0)) {
        moveDir.add(forward.clone().multiplyScalar(joyDir.y));
        moveDir.add(right.clone().multiplyScalar(joyDir.x));
      }

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

    const maxRadius = 8.5;
    const dist = Math.sqrt(positionRef.current.x ** 2 + positionRef.current.z ** 2);
    if (dist > maxRadius) {
      const angle = Math.atan2(positionRef.current.z, positionRef.current.x);
      positionRef.current.x = Math.cos(angle) * maxRadius;
      positionRef.current.z = Math.sin(angle) * maxRadius;
    }

    if (isMe) {
      group.current.position.copy(positionRef.current);
    } else {
      group.current.position.lerp(positionRef.current, 0.15);
    }
    
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
      <Text position={[0, 2.2, 0]} fontSize={0.2} color={color} anchorX="center" anchorY="middle">
        {username}
      </Text>

      {/* Adjusted scale for the new agnes-small model */}
      <primitive object={clonedScene} position={[0, -0.2, 0]} scale={0.6} /> 

      <pointLight ref={lightRef} position={[0, 1, 0]} intensity={2} color={color} distance={3} />
    </group>
  );
}
