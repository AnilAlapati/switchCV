"use client";
import { useRef } from "react";
import * as drei from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Stage } from "@/hooks/useAnimationSequence";

interface HeroRevealProps {
  stage: Stage;
  role?: "recruiter" | "jobseeker" | null;
  onRevealComplete?: () => void;
}

export function HeroReveal({ stage, role: _role, onRevealComplete: _onRevealComplete }: HeroRevealProps) {
  const groupRef = useRef<THREE.Group>(null);
  const opacity = stage === "reveal" ? 1 : 0;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.2;
      groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 5]}>
      {/* Sparkles around hero */}
      <drei.Sparkles
        count={50}
        scale={20}
        size={2}
        speed={0.2}
        opacity={0.1}
      />

      {/* Decorative rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[8, 0.02, 16, 100]} />
        <meshBasicMaterial color="black" transparent opacity={0.1 * opacity} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0.2, 0]}>
        <torusGeometry args={[9, 0.01, 16, 100]} />
        <meshBasicMaterial color="black" transparent opacity={0.05 * opacity} />
      </mesh>

      {/* Hero card - HTML for rich content */}
      <drei.Html center transform style={{ opacity }}>
        <div className="flex flex-col items-center gap-12 text-center select-none pointer-events-none">
          <h1 className="text-[12rem] font-serif font-black leading-[0.8] tracking-tighter text-black uppercase">
            Define
            <br />
            Yourself
          </h1>
        </div>
      </drei.Html>
    </group>
  );
}

export function ScrollIndicator({ progress }: { progress: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.position.y = -8 + Math.sin(t * 2) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <group scale={1 - progress}>
        <drei.Html
          center
          transform
          style={{ opacity: 1 - progress }}
          className="pointer-events-none select-none"
        >
          <div className="w-1 h-32 bg-black opacity-20" />
        </drei.Html>
      </group>
    </group>
  );
}
