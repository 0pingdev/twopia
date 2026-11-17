'use client';

import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Avatar } from './Avatar';
import { DuoDoor } from './DuoDoor';

function CameraRig({ target, cameraRef }: { target: React.MutableRefObject<THREE.Vector3>, cameraRef: React.MutableRefObject<any> }) {
  const { camera } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [angle, setAngle] = useState(Math.PI / 4);
  const [pitch, setPitch] = useState(0.5);

  useEffect(() => {
    cameraRef.current = camera;
    const handleDown = () => setIsDragging(true);
    const handleUp = () => setIsDragging(false);
    const handleMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setAngle((a) => a - e.movementX * 0.005);
      setPitch((p) => Math.max(0.1, Math.min(1.2, p - e.movementY * 0.005)));
    };

    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('mousemove', handleMove);
    };
  }, [isDragging, camera, cameraRef]);

  useFrame(() => {
    const radius = 7;
    const targetPos = new THREE.Vector3(
      target.current.x + Math.sin(angle) * Math.cos(pitch) * radius,
      target.current.y + Math.sin(pitch) * radius + 1.5,
      target.current.z + Math.cos(angle) * Math.cos(pitch) * radius
    );
    
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(target.current.x, target.current.y + 1, target.current.z);
  });

  return null;
}

// Inner component to handle 60fps interpolation of the partner
function PartnerSync({ targetPos, currentPos, isVisible }: { targetPos: React.MutableRefObject<THREE.Vector3>, currentPos: React.MutableRefObject<THREE.Vector3>, isVisible: boolean }) {
  useFrame(() => {
    if (isVisible) {
      // Smoothly glide the avatar to the network position
      currentPos.current.lerp(targetPos.current, 0.15);
    }
  });
  return null;
}

export function DenScene({ 
  duoStatus, 
  onDoorInteract, 
  playerColor,
  onPositionUpdate,
  partnerPosRef,
  partnerOnline,
  onPlayerMove,
  isNetworkActive,
  onIdleChange
}: { 
  duoStatus: string, 
  onDoorInteract: () => void, 
  playerColor: string,
  onPositionUpdate: (dist: number) => void,
  partnerPosRef: React.MutableRefObject<THREE.Vector3>,
  partnerOnline: boolean,
  onPlayerMove: (x: number, y: number, z: number) => void,
  isNetworkActive: boolean,
  onIdleChange: (idle: boolean) => void
}) {
  const myPos = useRef(new THREE.Vector3(0, 0, 2));
  const cameraRef = useRef<any>(null);
  const lastNetSend = useRef(0);

  useFrame((state) => {
    const doorPos = new THREE.Vector3(0, 0, -4);
    onPositionUpdate(myPos.current.distanceTo(doorPos));
    
    if (isNetworkActive) {
      const now = state.clock.getElapsedTime();
      if (now - lastNetSend.current > 0.033) { 
        onPlayerMove(myPos.current.x, myPos.current.y, myPos.current.z);
        lastNetSend.current = now;
      }
    }
  });

  return (
    <div className="absolute inset-0 z-0">
      {/* dpr=[1, 1.5] caps the pixel ratio to stop Retina displays from melting the GPU */}
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 3, 8], fov: 50 }}>
        <color attach="background" args={['#05060a']} />
        <fog attach="fog" args={['#05060a', 5, 25]} />
        
        <ambientLight intensity={1.5} color="#4fd1ff" />
        <directionalLight position={[5, 10, 5]} intensity={2} color="#ffb070" />

        {/* Reduced stars from 2000 to 500 */}
        <Stars radius={50} depth={20} count={500} factor={4} saturation={0} fade speed={1} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <cylinderGeometry args={[6, 6, 0.2, 6]} />
          <meshStandardMaterial color="#0e0a1e" roughness={0.7} metalness={0.3} />
        </mesh>

        <DuoDoor status={duoStatus} onInteract={onDoorInteract} />

        <Avatar color={playerColor} isMe={true} positionRef={myPos} cameraRef={cameraRef} onIdleChange={onIdleChange} />
        
        {partnerOnline && (
          <>
            <Avatar color="#4fd1ff" isMe={false} positionRef={partnerPosRef} cameraRef={cameraRef} />
            <PartnerSync targetPos={partnerPosRef} currentPos={partnerPosRef} isVisible={true} />
          </>
        )}

        <CameraRig target={myPos} cameraRef={cameraRef} />
      </Canvas>
    </div>
  );
}
