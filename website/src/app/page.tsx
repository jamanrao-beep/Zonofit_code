"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Float, MeshDistortMaterial, Sphere, Box } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { ArrowRight, BarChart3, Users, Building2, Activity } from "lucide-react";
import Link from "next/link";

// 3D Dumbbell Component
function Fitness3D() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
      groupRef.current.rotation.y += 0.01;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  return (
    <group ref={groupRef} scale={1.2} rotation={[0.5, 0, 0]}>
      {/* Handle */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 2, 32]} />
        <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Left Weights */}
      <mesh position={[-1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.7, 0.7, 0.4, 32]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Right Weights */}
      <mesh position={[1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.7, 0.7, 0.4, 32]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      
      {/* Accent Rings */}
      <mesh position={[-1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.72, 0.72, 0.05, 32]} />
        <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.72, 0.72, 0.05, 32]} />
        <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-100/60 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-200/40 blur-[120px] pointer-events-none" />

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col lg:flex-row items-center relative z-10 pt-12 pb-24">
        
        {/* Left Content */}
        <div className="w-full lg:w-1/2 flex flex-col items-start justify-center gap-8 lg:pr-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/5 glass">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-gray-600">Welcome to ZonoFit</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tighter text-black">
            Fitness access,<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
              without limits.
            </span>
          </h1>

          <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
            ZonoFit is a flexible, credit-powered fitness access network. Why commit to one gym when you can experience them all? Purchase credits, discover premium gyms, and build consistency on your terms.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-4">
            <Link href="/auth/login" className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(16,185,129,0.3)] flex items-center gap-2">
              Get Started <ArrowRight size={20} />
            </Link>
          </div>

          {/* Quick Stats Bento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 w-full">
            {[
              { icon: Users, label: "Active Members", value: "10k+" },
              { icon: Building2, label: "Partner Gyms", value: "100+" },
              { icon: Activity, label: "Daily Check-ins", value: "4.2k" },
              { icon: BarChart3, label: "Success Rate", value: "99%" },
            ].map((stat, i) => (
              <div key={i} className="glass p-4 rounded-2xl flex flex-col gap-2 border border-black/5">
                <stat.icon size={20} className="text-primary" />
                <div className="text-2xl font-bold text-black">{stat.value}</div>
                <div className="text-xs font-medium text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 3D Canvas */}
        <div className="w-full lg:w-1/2 h-[500px] lg:h-[700px] mt-12 lg:mt-0 relative">
          <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} color="#10B981" />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#ffffff" />
            <Fitness3D />
            <Environment preset="city" />
          </Canvas>
          
          {/* Floating UI Elements over 3D */}
          <div className="absolute top-[20%] right-[10%] glass p-4 rounded-2xl animate-bounce" style={{ animationDuration: "3s" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Activity size={20} className="text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-black">Credits Value</div>
                <div className="text-xs font-semibold text-primary">1 Credit = ₹10</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
