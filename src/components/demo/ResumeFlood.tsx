"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import * as THREE from "three";
import { Stage } from "@/hooks/useAnimationSequence";

interface ResumeFloodProps {
  stage: Stage;
  role: "recruiter" | "jobseeker" | null;
  onFloodComplete: () => void;
}

const RESUME_COUNT = 500;

interface ResumeData {
  id: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  targetPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
  isHero: boolean;
}

export function ResumeFlood({ stage, onFloodComplete }: ResumeFloodProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hasTriggeredComplete, setHasTriggeredComplete] = useState(false);

  // Generate resume data
  const resumes = useMemo<ResumeData[]>(() => {
    const START_SEED = 123;
    const seededRandom = (currentSeed: number) => {
      const nextSeed = (currentSeed * 16807) % 2147483647;
      return [nextSeed, (nextSeed - 1) / 2147483646] as const;
    };

    const data: ResumeData[] = [];
    let current = START_SEED;

    // Determine hero index deterministically
    const [sHero, rHero] = seededRandom(current);
    current = sHero;
    const heroIndex = Math.floor(rHero * RESUME_COUNT);

    for (let i = 0; i < RESUME_COUNT; i++) {
      const [s1, r1] = seededRandom(current);
      const [s2, r2] = seededRandom(s1);
      const [s3, r3] = seededRandom(s2);
      const [s4, r4] = seededRandom(s3);
      const [s5, r5] = seededRandom(s4);
      const [s6, r6] = seededRandom(s5);
      const [s7, r7] = seededRandom(s6);
      const [s8, r8] = seededRandom(s7);
      const [s9, r9] = seededRandom(s8);
      const [s10, r10] = seededRandom(s9);
      const [s11, r11] = seededRandom(s10);
      const [s12] = seededRandom(s11);
      current = s12;

      const angle = r1 * Math.PI * 2;
      const distance = 30 + r2 * 20;
      const startX = Math.cos(angle) * distance;
      const startY = Math.sin(angle) * distance;
      const startZ = -10 + r3 * 20;

      const targetAngle = r4 * Math.PI * 2;
      const targetPhi = r5 * Math.PI;
      const targetRadius = 3 + r6 * 8;
      const targetX =
        Math.cos(targetAngle) * Math.sin(targetPhi) * targetRadius;
      const targetY = (r7 - 0.5) * 10;
      const targetZ =
        Math.sin(targetAngle) * Math.sin(targetPhi) * targetRadius - 5;

      data.push({
        id: i,
        position: new THREE.Vector3(startX, startY, startZ),
        rotation: new THREE.Euler(r8 * Math.PI, r9 * Math.PI, r10 * Math.PI),
        targetPosition: new THREE.Vector3(targetX, targetY, targetZ),
        velocity: new THREE.Vector3(),
        scale: 0.3 + r11 * 0.3,
        isHero: i === heroIndex,
      });
    }
    return data;
  }, []);

  // Trigger flood complete after animation
  useEffect(() => {
    if (stage === "flood" && !hasTriggeredComplete) {
      const timer = setTimeout(() => {
        onFloodComplete();
        setHasTriggeredComplete(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [stage, onFloodComplete, hasTriggeredComplete]);

  return (
    <group ref={groupRef}>
      <Instances limit={RESUME_COUNT}>
        <planeGeometry args={[1.5, 2]} />
        <meshStandardMaterial
          color="#FFFFF8"
          side={THREE.DoubleSide}
          metalness={0.1}
          roughness={0.8}
        />
        {resumes.map((resume, i) => (
          <ResumeInstance
            key={resume.id}
            data={resume}
            index={i}
            stage={stage}
          />
        ))}
      </Instances>
    </group>
  );
}

interface ResumeInstanceProps {
  data: ResumeData;
  index: number;
  stage: Stage;
}

function ResumeInstance({ data, index, stage }: ResumeInstanceProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const positionRef = useRef(data.position.clone());
  const rotationRef = useRef(data.rotation.clone());

  useFrame((state, delta) => {
    if (!ref.current) return;

    const time = state.clock.elapsedTime;
    const delayOffset = index * 0.002;

    if (stage === "flood") {
      // Animate from start to target position
      const progress = Math.min(1, Math.max(0, (time - delayOffset) * 0.5));
      const eased = easeOutExpo(progress);

      positionRef.current.lerpVectors(
        data.position,
        data.targetPosition,
        eased,
      );

      // Gentle rotation
      rotationRef.current.x += delta * 0.1;
      rotationRef.current.y += delta * 0.15;
    } else if (stage === "search" || stage === "discovery") {
      // Orbit around center
      const orbitSpeed = 0.1 + index * 0.0001;
      const orbitRadius = data.targetPosition.length();
      const orbitAngle = time * orbitSpeed + index * 0.1;

      positionRef.current.x =
        Math.cos(orbitAngle) * orbitRadius * (data.isHero ? 0.3 : 1);
      positionRef.current.z = Math.sin(orbitAngle) * orbitRadius * 0.5 - 5;
      positionRef.current.y += Math.sin(time + index) * delta * 0.1;

      // Slow down rotation
      rotationRef.current.x += delta * 0.02;
      rotationRef.current.y += delta * 0.03;

      // If discovery stage and this is hero, move to center
      if (stage === "discovery" && data.isHero) {
        positionRef.current.lerp(new THREE.Vector3(0, 0, 2), delta * 2);
        ref.current.scale.setScalar(
          THREE.MathUtils.lerp(ref.current.scale.x, 2, delta * 2),
        );
      }
    }

    // Apply transforms
    ref.current.position.copy(positionRef.current);
    ref.current.rotation.set(
      rotationRef.current.x,
      rotationRef.current.y,
      rotationRef.current.z,
    );

    // Fade out non-hero cards in discovery stage
    if (stage === "discovery" && !data.isHero) {
      const material = ref.current.material as THREE.MeshStandardMaterial;
      if (material.opacity !== undefined) {
        material.transparent = true;
        material.opacity = THREE.MathUtils.lerp(material.opacity, 0.1, delta);
      }
    }
  });

  // Don't render hero card here - it's handled by HeroReveal
  if (data.isHero && (stage === "discovery" || stage === "reveal")) {
    return null;
  }

  return (
    <Instance
      ref={ref}
      position={data.position}
      rotation={data.rotation}
      scale={data.scale}
    />
  );
}

function easeOutExpo(x: number): number {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}
