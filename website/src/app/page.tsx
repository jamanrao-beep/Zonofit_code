"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Float, MeshDistortMaterial, Sphere, Box } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { ArrowRight, BarChart3, Users, Building2, Activity } from "lucide-react";

// 3D Abstract Shape Component
function AbstractShape() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
      <mesh ref={meshRef} scale={1.5}>
        <icosahedronGeometry args={[1, 0]} />
        <meshPhysicalMaterial 
          color="#10B981"
          metalness={0.8}
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.2}
          wireframe={true}
        />
      </mesh>
      
      <Sphere args={[0.7, 64, 64]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          color="#059669"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/40 blur-[120px] pointer-events-none" />

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 flex flex-col lg:flex-row items-center relative z-10 pt-12 pb-24">
        
        {/* Left Content */}
        <div className="w-full lg:w-1/2 flex flex-col items-start justify-center gap-8 lg:pr-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 glass">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-gray-300">ZonoFit Admin v2.0 Live</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tighter">
            Manage your <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-300">
              Fitness Empire
            </span>
          </h1>

          <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
            The ultimate command center for ZonoFit gym partners and network administrators. Track real-time check-ins, manage credit settlements, and scale your revenue.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-4">
            <button className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-2">
              Enter Dashboard <ArrowRight size={20} />
            </button>
            <button className="glass hover:bg-white/5 text-white px-8 py-4 rounded-full font-semibold transition-all flex items-center gap-2">
              View Analytics
            </button>
          </div>

          {/* Quick Stats Bento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 w-full">
            {[
              { icon: Users, label: "Active Users", value: "12.4k" },
              { icon: Building2, label: "Partner Gyms", value: "100+" },
              { icon: Activity, label: "Daily Visits", value: "4.2k" },
              { icon: BarChart3, label: "Success Rate", value: "99.8%" },
            ].map((stat, i) => (
              <div key={i} className="glass p-4 rounded-2xl flex flex-col gap-2">
                <stat.icon size={20} className="text-primary" />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs font-medium text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 3D Canvas */}
        <div className="w-full lg:w-1/2 h-[500px] lg:h-[700px] mt-12 lg:mt-0 relative">
          <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} color="#10B981" />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#ffffff" />
            <AbstractShape />
            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
            <Environment preset="city" />
          </Canvas>
          
          {/* Floating UI Elements over 3D */}
          <div className="absolute top-[20%] right-[10%] glass p-4 rounded-2xl animate-bounce" style={{ animationDuration: "3s" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Activity size={20} className="text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold">New Check-in</div>
                <div className="text-xs text-primary">Just now</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
