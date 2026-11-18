'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Avatar } from './Avatar';

useGLTF.preload('/models/treehouse.glb');

function GardenEnvironment() {
  const { scene } = useGLTF('/models/treehouse.glb');
  // Cloning prevents multiple renders from mutating the original
  return <primitive object={scene} position={[0, 0, 0]} scale={1} />;
}

function CameraController({ target }: { target: React.MutableRefObject<THREE.Vector3> }) {
  const { camera } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const angle = useRef(Math.PI / 4);
  const pitch = useRef(0.4);

  useEffect(() => {
    const handleDown = () => setIsDragging(true);
    const handleUp = () => setIsDragging(false);
    const handleMove = (e: MouseEvent) => {
      if (!isDragging) return;
      angle.current -= e.movementX * 0.005;
      pitch.current = Math.max(0.1, Math.min(1.2, pitch.current - e.movementY * 0.005));
    };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('mousemove', handleMove);
    };
  }, [isDragging]);

  useFrame(() => {
    const radius = 7;
    const targetPos = new THREE.Vector3(
      target.current.x + Math.sin(angle.current) * Math.cos(pitch.current) * radius,
      target.current.y + Math.sin(pitch.current) * radius + 1.5,
      target.current.z + Math.cos(angle.current) * Math.cos(pitch.current) * radius
    );
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(target.current.x, target.current.y + 1, target.current.z);
  });

  return null;
}

function GameLoop({ myPos, isNetworkActive, onPlayerMove, onPositionUpdate }: any) {
  const lastNetSend = useRef(0);
  useFrame((state) => {
    const doorPos = new THREE.Vector3(0, 0, -5);
    onPositionUpdate(myPos.current.distanceTo(doorPos));
    
    if (isNetworkActive) {
      const now = state.clock.getElapsedTime();
      if (now - lastNetSend.current > 0.033) { 
        onPlayerMove(myPos.current.x, myPos.current.y, myPos.current.z);
        lastNetSend.current = now;
      }
    }
  });
  return null;
}

function CameraBinder({ cameraRef }: { cameraRef: React.MutableRefObject<any> }) {
  const { camera } = useThree();
  useEffect(() => { cameraRef.current = camera; }, [camera, cameraRef]);
  return null;
}

export function DenScene({ 
  duoStatus, onDoorInteract, playerColor, onPositionUpdate,
  partnerPosRef, partnerOnline, onPlayerMove, isNetworkActive, onIdleChange, username, joyDir
}: any) {
  const myPos = useRef(new THREE.Vector3(0, 0, 2));
  const cameraRef = useRef<any>(null); 

  return (
    <div className="absolute inset-0 z-0">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 3, 8], fov: 50 }}>
        <color attach="background" args={['#1a1c29']} />
        <fog attach="fog" args={['#1a1c29', 8, 40]} />
        
        <ambientLight intensity={1} color="#a0b0ff" />
        <directionalLight position={[5, 10, 5]} intensity={2} color="#ffb070" castShadow />

        <Suspense fallback={null}>
          <GardenEnvironment />
        </Suspense>

        <Avatar color={playerColor} isMe={true} positionRef={myPos} cameraRef={cameraRef} onIdleChange={onIdleChange} username={username} joyDir={joyDir} />
        {partnerOnline && <Avatar color="#4fd1ff" isMe={false} positionRef={partnerPosRef} cameraRef={cameraRef} username="Partner" />}

        <CameraController target={myPos} />
        <GameLoop myPos={myPos} isNetworkActive={isNetworkActive} onPlayerMove={onPlayerMove} onPositionUpdate={onPositionUpdate} />
        <CameraBinder cameraRef={cameraRef} />
      </Canvas>
    </div>
  );
}
