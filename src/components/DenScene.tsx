'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Avatar } from './Avatar';
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';


// --- 1. The Environment Kit ---
function Environment() {
  // Load the assets
  const tree = useGLTF(`${base}/models/Tree_RedPlum.gltf`);
  const chair = useGLTF(`${base}/models/Chair.gltf`);
  const crate = useGLTF(`${base}/models/WoodCrate_L.gltf`);
  const basket = useGLTF(`${base}/models/Basket_S.gltf`);

  return (
    <group>
      {/* The Ground (Solid, dark green) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#1a2e1d" roughness={1} />
      </mesh>

      {/* The Walkable Path (Dirt color leading to the Tree) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -3]} receiveShadow>
        <planeGeometry args={[3.5, 12]} />
        <meshStandardMaterial color="#2a1f18" roughness={1} />
      </mesh>

      {/* The Boundary Fence (Invisible walls so we don't fall off) */}
      <mesh position={[0, 2, 10]} visible={false}><boxGeometry args={[20, 4, 1]} /></mesh>
      <mesh position={[0, 2, -10]} visible={false}><boxGeometry args={[20, 4, 1]} /></mesh>
      <mesh position={[-10, 2, 0]} visible={false}><boxGeometry args={[1, 4, 20]} /></mesh>
      <mesh position={[10, 2, 0]} visible={false}><boxGeometry args={[1, 4, 20]} /></mesh>

      {/* --- PLACED ASSETS --- */}
      
      {/* Chair off to the left */}
      <primitive object={chair.scene.clone()} position={[-3, 0, 2]} rotation={[0, Math.PI / 2, 0]} scale={1} />
      
      {/* Crate off to the right */}
      <primitive object={crate.scene.clone()} position={[4, 0, 1]} rotation={[0, Math.PI / 6, 0]} scale={1} />

      {/* Basket next to the crate */}
      <primitive object={basket.scene.clone()} position={[3, 0, 3]} rotation={[0, -Math.PI / 4, 0]} scale={1} />
    </group>
  );
}

// --- 2. The Tree Portal ---
function TreePortal({ status, onInteract }: { status: string, onInteract: () => void }) {
  const tree = useGLTF(`${base}/models/Tree_RedPlum.gltf`);
  const glowRef = useRef<THREE.Mesh>(null);
  
  let color = '#ffb070';
  if (status === 'knockable') color = '#4fd1ff';
  if (status === 'knocking') color = '#eab308';
  if (status === 'incoming_knock') color = '#ff7a1a';
  if (status === 'visiting' || status === 'hosting') color = '#f43f5e';

  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
    }
  });

  return (
    <group position={[0, 0, -7]} onClick={(e) => { e.stopPropagation(); onInteract(); }}>
      {/* The 3D Tree */}
      <primitive object={tree.scene.clone()} scale={1.5} />

      {/* The Glowing Aura around the tree */}
      <mesh ref={glowRef} position={[0, 3, 0]}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} toneMapped={false} transparent opacity={0.3} />
      </mesh>
      
      <pointLight position={[0, 3, 0]} intensity={5} color={color} distance={12} />
    </group>
  );
}

// --- 3. Camera Controller ---
function CameraController({ target }: { target: React.MutableRefObject<THREE.Vector3> }) {
  const { camera } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const angle = useRef(Math.PI / 4);
  const pitch = useRef(0.4);

  useEffect(() => {
    const handleDown = () => setIsDragging(true);
    const handleUp = () => setIsDragging(false);
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      let x = 0, y = 0;
      if (e instanceof MouseEvent) { x = e.movementX; y = e.movementY; }
      else if (e.touches.length > 0) { 
        x = e.touches[0].clientX - (window as any).lastTouchX;
        y = e.touches[0].clientY - (window as any).lastTouchY;
        (window as any).lastTouchX = e.touches[0].clientX;
        (window as any).lastTouchY = e.touches[0].clientY;
      }
      angle.current -= x * 0.005;
      pitch.current = Math.max(0.1, Math.min(1.2, pitch.current - y * 0.005));
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      setIsDragging(true);
      (window as any).lastTouchX = e.touches[0].clientX;
      (window as any).lastTouchY = e.touches[0].clientY;
    };

    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchmove', handleMove);
    
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [isDragging]);

  useFrame(() => {
    const radius = 9;
    const targetPos = new THREE.Vector3(
      target.current.x + Math.sin(angle.current) * Math.cos(pitch.current) * radius,
      target.current.y + Math.sin(pitch.current) * radius + 2,
      target.current.z + Math.cos(angle.current) * Math.cos(pitch.current) * radius
    );
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(target.current.x, target.current.y + 1, target.current.z);
  });

  return null;
}

// --- 4. Network & Game Loop ---
function GameLoop({ myPos, isNetworkActive, onPlayerMove, onPositionUpdate }: any) {
  const lastNetSend = useRef(0);
  useFrame((state) => {
    // The door is at [0, 0, -7]
    const doorPos = new THREE.Vector3(0, 0, -7);
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

// --- 5. Main Export ---
export function DenScene({ 
  duoStatus, onDoorInteract, playerColor, onPositionUpdate,
  partnerPosRef, partnerOnline, onPlayerMove, isNetworkActive, onIdleChange, username, joyDir
}: any) {
  const myPos = useRef(new THREE.Vector3(0, 0, 4));
  const cameraRef = useRef<any>(null); 

  return (
    <div className="absolute inset-0 z-0">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 3, 8], fov: 50 }}>
        <color attach="background" args={['#1a1c29']} />
        <fog attach="fog" args={['#1a1c29', 10, 35]} />
        
        <ambientLight intensity={1.2} color="#a0b0ff" />
        <directionalLight position={[5, 10, 5]} intensity={2} color="#ffb070" castShadow />

        <Suspense fallback={null}>
          <Environment />
          <TreePortal status={duoStatus} onInteract={onDoorInteract} />
          
          <Avatar color={playerColor} isMe={true} positionRef={myPos} cameraRef={cameraRef} onIdleChange={onIdleChange} username={username} joyDir={joyDir} />
          {partnerOnline && <Avatar color="#4fd1ff" isMe={false} positionRef={partnerPosRef} cameraRef={cameraRef} username="Partner" />}
        </Suspense>

        <CameraController target={myPos} />
        <GameLoop myPos={myPos} isNetworkActive={isNetworkActive} onPlayerMove={onPlayerMove} onPositionUpdate={onPositionUpdate} />
        <CameraBinder cameraRef={cameraRef} />
      </Canvas>
    </div>
  );
}
