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
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col bg-background selection:bg-brand-lime selection:text-foreground">
      <BackgroundDots />
      <FloatingAccents />

      <div className="flex-1 max-w-7xl mx-auto w-full px-8 flex flex-col lg:flex-row items-center relative z-10 pt-20 pb-24 h-full">
        
        {/* Left Content */}
        <div className="w-full lg:w-1/2 flex flex-col items-start justify-center gap-8 lg:pr-12 mt-12 lg:mt-0 relative z-20">
          
          <div className="text-[11px] font-black tracking-[0.2em] text-muted uppercase">
            DON'T JUST BUY A MEMBERSHIP. BUILD A HABIT.
          </div>

          <h1 className="text-6xl lg:text-7xl xl:text-[80px] font-black leading-[0.95] tracking-tight text-foreground">
            Track your<br/>
            fitness across<br/>
            the Network.
          </h1>

          <p className="text-base font-medium text-muted max-w-sm leading-relaxed mt-2">
            A down-to-earth fitness pass focused on flexibility, consistency, and authenticity.
          </p>

          <div className="flex items-center gap-4 mt-4">
            <Link 
              href="/auth/signup" 
              className="bg-brand-coral hover:bg-[#ff5252] text-white px-8 py-4 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95 shadow-[0_4px_14px_rgba(255,107,107,0.4)]"
            >
              Join the Network
            </Link>
            
            <Link 
              href="/partners" 
              className="px-8 py-4 rounded-full border-2 border-foreground/10 text-sm font-bold text-foreground hover:border-foreground/30 transition-all flex items-center gap-2 bg-surface/50 backdrop-blur-sm"
            >
              <Store size={18} /> Find a gym
            </Link>
          </div>
          
          {/* Scroll arrow hint */}
          <div className="mt-16 flex justify-center w-8 h-12 rounded-full border-2 border-foreground/10 items-center animate-bounce cursor-default">
            <div className="w-1 h-3 bg-foreground/20 rounded-full" />
          </div>
        </div>

        {/* Right Graphic Area */}
        <div className="w-full lg:w-1/2 h-[600px] lg:h-[800px] relative mt-12 lg:mt-0">
          
          {/* Subtle large backdrop arch/shape behind the 3D element */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[90%] bg-white rounded-t-full rounded-b-3xl soft-shadow-lg opacity-80" />

          {/* 3D Canvas */}
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
          
          {/* Floating UI Elements over 3D (Mimicking reference chat bubbles) */}
          <div className="absolute top-[25%] left-[10%] z-20 bg-surface/90 backdrop-blur-md px-4 py-3 rounded-2xl soft-shadow-lg flex items-center gap-3 animate-bounce" style={{ animationDuration: "4s" }}>
            <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center">
              <UserCircle size={18} className="text-brand-green" />
            </div>
            <div className="text-xs font-bold text-foreground">Coach, I'll beat my PR today</div>
          </div>

          <div className="absolute top-[40%] right-[5%] z-20 bg-surface-dark px-4 py-3 rounded-2xl soft-shadow-lg flex items-center gap-3 animate-bounce" style={{ animationDuration: "5s", animationDelay: "1s" }}>
            <div className="w-8 h-8 rounded-full bg-brand-lime flex items-center justify-center">
              <span className="text-[10px] font-black text-black">Z</span>
            </div>
            <div className="text-xs font-bold text-white">420 Credits Received <button className="ml-2 bg-black text-white px-2 py-1 rounded text-[10px]">Accept</button></div>
          </div>
          
          {/* Score Card Mimic */}
          <div className="absolute bottom-[15%] right-[15%] z-20 bg-surface/90 backdrop-blur-md p-5 rounded-3xl soft-shadow-lg animate-bounce" style={{ animationDuration: "6s", animationDelay: "0.5s" }}>
            <div className="text-4xl font-black text-foreground mb-1">678</div>
            <div className="text-xs font-bold text-muted mb-4">Your monthly visits</div>
            
            {/* Mini Bar Chart Mock */}
            <div className="flex items-end gap-1.5 h-12">
              <div className="w-4 bg-brand-coral/40 h-[40%] rounded-sm" />
              <div className="w-4 bg-brand-green h-[80%] rounded-sm" />
              <div className="w-4 bg-blue-500/80 h-[60%] rounded-sm" />
              <div className="w-4 bg-brand-lime h-[100%] rounded-sm" />
            </div>
          </div>

          {/* BPM/Heart rate Mimic */}
          <div className="absolute bottom-[20%] left-[20%] z-20 flex items-center gap-2">
            <div className="text-3xl font-black text-foreground">96</div>
            <div>
              <div className="text-[10px] font-bold text-brand-coral">♥ BPM</div>
              <div className="text-[10px] font-medium text-muted">2 mins ago</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
