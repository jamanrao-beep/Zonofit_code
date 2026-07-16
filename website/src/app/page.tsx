"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { Store, UserCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// 3D Dumbbell Component (Keeping as central graphic)
function Fitness3D() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      groupRef.current.rotation.y += 0.01;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.15;
    }
  });

  return (
    <group ref={groupRef} scale={1.8} rotation={[0.5, 0, 0]}>
      {/* Handle */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 2, 32]} />
        <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Left Weights */}
      <mesh position={[-1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.7, 0.7, 0.4, 32]} />
        <meshStandardMaterial color="#1C1C1E" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} />
        <meshStandardMaterial color="#1C1C1E" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Right Weights */}
      <mesh position={[1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.7, 0.7, 0.4, 32]} />
        <meshStandardMaterial color="#1C1C1E" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} />
        <meshStandardMaterial color="#1C1C1E" metalness={0.5} roughness={0.4} />
      </mesh>
      
      {/* Accent Rings */}
      <mesh position={[-1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.72, 0.72, 0.05, 32]} />
        <meshStandardMaterial color="#0B6E4F" emissive="#0B6E4F" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.72, 0.72, 0.05, 32]} />
        <meshStandardMaterial color="#0B6E4F" emissive="#0B6E4F" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Background Dots Pattern Component
function BackgroundDots() {
  return (
    <div 
      className="absolute inset-0 z-0 pointer-events-none opacity-20"
      style={{
        backgroundImage: 'radial-gradient(#111111 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    />
  );
}

// Floating Accents
function FloatingAccents() {
  return (
    <>
      <div className="absolute top-[15%] left-[5%] w-3 h-3 rounded-full bg-brand-green/60 blur-[1px] animate-pulse" />
      <div className="absolute top-[30%] right-[12%] w-4 h-4 rounded-full bg-brand-coral/80 blur-[1px]" />
      <div className="absolute bottom-[20%] left-[30%] w-2 h-2 rounded-full bg-brand-lime blur-[0.5px]" />
      <div className="absolute bottom-[10%] right-[25%] w-5 h-5 rounded-full bg-brand-green/40 blur-[2px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[40%] left-[45%] w-1.5 h-1.5 rounded-full bg-foreground/30" />
    </>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col bg-[#E9EEF4] selection:bg-brand-coral selection:text-white">
      
      {/* Restored Background Dots & Accents */}
      <BackgroundDots />
      <FloatingAccents />
      
      {/* Background radial gradient to give it that soft depth like the reference */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, rgba(233,238,244,0) 100%)",
        }}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full px-8 flex flex-col lg:flex-row items-center relative z-10 pt-28 pb-20 h-full">
        
        {/* Left Content */}
        <div className="w-full lg:w-1/2 flex flex-col items-start justify-center gap-6 lg:pr-16 mt-12 lg:mt-0 relative z-20">
          
          <div className="text-[10px] font-black tracking-[0.15em] text-[#0B6E4F] uppercase">
            DON'T JUST BUY A MEMBERSHIP. PUSH YOURSELF.
          </div>

          <h1 className="text-6xl lg:text-7xl xl:text-[84px] font-black leading-[0.95] tracking-tight text-[#111111]">
            Track your<br/>
            fitness across<br/>
            the Network.
          </h1>

          <p className="text-[15px] font-medium text-[#5a5a5a] max-w-sm leading-relaxed mt-2">
            A down-to-earth fitness pass focused on flexibility, consistency, and authenticity.
          </p>

          <div className="flex items-center gap-5 mt-4">
            <Link 
              href="/auth/signup" 
              className="bg-[#E75E40] hover:bg-[#d45236] text-white px-8 py-3.5 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(231,94,64,0.3)]"
            >
              Join the Network
            </Link>
            
            <Link 
              href="/partners" 
              className="px-6 py-3.5 rounded-full border-[1.5px] border-[#111111]/10 text-sm font-bold text-[#111111] hover:bg-black/5 transition-all flex items-center gap-2"
            >
              <Store size={18} /> Find a gym
            </Link>
          </div>
          
          {/* Subtle decorative dots like in the reference */}
          <div className="absolute top-[10%] -left-12 w-2 h-2 rounded-full bg-[#111111]/20" />
          <div className="absolute bottom-[20%] right-10 w-2 h-2 rounded-full bg-[#0B6E4F]" />
          <div className="absolute bottom-[5%] left-10 w-1.5 h-1.5 rounded-full bg-[#E75E40]" />
        </div>

        {/* Right Graphic Area */}
        <div className="w-full lg:w-1/2 h-[500px] lg:h-[700px] relative mt-16 lg:mt-0 flex items-center justify-center">
          
          {/* Subtle large backdrop arch/shape behind the 3D element */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[90%] bg-white rounded-t-full rounded-b-3xl soft-shadow-lg opacity-80" />

          {/* 3D Canvas Restored */}
          <div className="absolute inset-0 z-10">
            {mounted && (
              <Canvas camera={{ position: [0, 0, 7], fov: 50 }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} color="#D9FF5C" />
                <directionalLight position={[-10, -10, -5]} intensity={0.8} color="#ffffff" />
                <Fitness3D />
                <Environment preset="city" />
              </Canvas>
            )}
          </div>
          
          {/* Floating UI Elements over the Image (Interactive/Cool) */}
          
          {/* Chat Bubble 1 */}
          <div className="absolute top-[18%] left-[5%] z-20 bg-white/95 px-4 py-2.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex items-center gap-3 animate-[bounce_4s_infinite_ease-in-out]">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-100 relative">
              <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Moyo" alt="Avatar" fill />
            </div>
            <div className="text-[11px] font-bold text-gray-800">Coach, I'll beat you today</div>
          </div>

          {/* Chat Bubble 2 (Invite) */}
          <div className="absolute top-[38%] right-[-5%] z-20 bg-white/95 px-4 py-2.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3 animate-[bounce_5s_infinite_ease-in-out_1s]">
            <div className="w-6 h-6 rounded-full bg-[#E75E40]/10 flex items-center justify-center relative overflow-hidden">
               <Image src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Avatar" fill />
            </div>
            <div className="text-[11px] font-bold text-gray-800 flex items-center gap-3">
              Moyo tora has sent you an invite
              <button className="bg-black text-white px-3 py-1 rounded-full text-[9px] hover:bg-gray-800 transition-colors">
                Accept
              </button>
            </div>
          </div>
          
          {/* Score Card Mimic */}
          <div className="absolute bottom-[10%] right-[0%] z-20 bg-white/95 p-5 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.1)] animate-[bounce_6s_infinite_ease-in-out_0.5s] border border-white">
            <div className="text-4xl font-black text-gray-900 leading-none">678</div>
            <div className="text-[10px] font-bold text-gray-500 mt-1 mb-4">Your today scores</div>
            
            {/* Mini Bar Chart Mock */}
            <div className="flex items-end gap-1.5 h-10">
              <div className="w-3 bg-pink-400 h-[60%] rounded-sm" />
              <div className="w-3 bg-indigo-900 h-[40%] rounded-sm" />
              <div className="w-3 bg-blue-500 h-[80%] rounded-sm" />
              <div className="w-3 bg-[#E75E40] h-[100%] rounded-sm" />
            </div>
          </div>

          {/* BPM/Heart rate Mimic */}
          <div className="absolute bottom-[15%] left-[10%] z-20 flex items-center gap-2 animate-[pulse_3s_infinite_ease-in-out]">
            <div className="text-4xl font-black text-gray-900">96</div>
            <div className="flex flex-col justify-center">
              <div className="text-[10px] font-bold text-[#E75E40] flex items-center gap-1">
                <span className="animate-pulse">♥</span> BPM
              </div>
              <div className="flex items-end gap-0.5 h-3 mt-0.5">
                <div className="w-0.5 h-full bg-[#E75E40]" />
                <div className="w-0.5 h-1/2 bg-[#E75E40]" />
                <div className="w-0.5 h-3/4 bg-[#E75E40]" />
                <div className="w-0.5 h-1/3 bg-[#E75E40]" />
              </div>
              <div className="text-[9px] font-medium text-gray-500 mt-0.5">2 mins ago</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
