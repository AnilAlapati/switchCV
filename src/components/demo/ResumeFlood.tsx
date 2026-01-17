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

export function ResumeFlood({ stage, role, onFloodComplete }: ResumeFloodProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [floodProgress, setFloodProgress] = useState(0);
    const [hasTriggeredComplete, setHasTriggeredComplete] = useState(false);

    // Generate resume data
    const resumes = useMemo<ResumeData[]>(() => {
        const data: ResumeData[] = [];
        const heroIndex = Math.floor(Math.random() * RESUME_COUNT);

        for (let i = 0; i < RESUME_COUNT; i++) {
            // Random starting position (outside viewport)
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 20;
            const startX = Math.cos(angle) * distance;
            const startY = Math.sin(angle) * distance;
            const startZ = -10 + Math.random() * 20;

            // Target position (in a sphere around center)
            const targetAngle = Math.random() * Math.PI * 2;
            const targetPhi = Math.random() * Math.PI;
            const targetRadius = 3 + Math.random() * 8;
            const targetX = Math.cos(targetAngle) * Math.sin(targetPhi) * targetRadius;
            const targetY = (Math.random() - 0.5) * 10;
            const targetZ = Math.sin(targetAngle) * Math.sin(targetPhi) * targetRadius - 5;

            data.push({
                id: i,
                position: new THREE.Vector3(startX, startY, startZ),
                rotation: new THREE.Euler(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                ),
                targetPosition: new THREE.Vector3(targetX, targetY, targetZ),
                velocity: new THREE.Vector3(),
                scale: 0.3 + Math.random() * 0.3,
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
    const [position] = useState(() => data.position.clone());
    const [rotation] = useState(() => data.rotation.clone());

    useFrame((state, delta) => {
        if (!ref.current) return;

        const time = state.clock.elapsedTime;
        const delayOffset = index * 0.002;

        if (stage === "flood") {
            // Animate from start to target position
            const progress = Math.min(1, Math.max(0, (time - delayOffset) * 0.5));
            const eased = easeOutExpo(progress);

            position.lerpVectors(data.position, data.targetPosition, eased);

            // Gentle rotation
            rotation.x += delta * 0.1;
            rotation.y += delta * 0.15;
        } else if (stage === "search" || stage === "discovery") {
            // Orbit around center
            const orbitSpeed = 0.1 + index * 0.0001;
            const orbitRadius = data.targetPosition.length();
            const orbitAngle = time * orbitSpeed + index * 0.1;

            position.x = Math.cos(orbitAngle) * orbitRadius * (data.isHero ? 0.3 : 1);
            position.z = Math.sin(orbitAngle) * orbitRadius * 0.5 - 5;
            position.y += Math.sin(time + index) * delta * 0.1;

            // Slow down rotation
            rotation.x += delta * 0.02;
            rotation.y += delta * 0.03;

            // If discovery stage and this is hero, move to center
            if (stage === "discovery" && data.isHero) {
                position.lerp(new THREE.Vector3(0, 0, 2), delta * 2);
                ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, 2, delta * 2));
            }
        }

        // Apply transforms
        ref.current.position.copy(position);
        ref.current.rotation.copy(rotation);

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
            position={position}
            rotation={rotation}
            scale={data.scale}
        />
    );
}

function easeOutExpo(x: number): number {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}
