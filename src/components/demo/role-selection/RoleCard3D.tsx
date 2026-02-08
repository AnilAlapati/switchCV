"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
    Float,
    Html,
    RoundedBox,
    Sparkles,
    MeshWobbleMaterial,
    Trail,
} from "@react-three/drei";
import * as THREE from "three";

interface RoleCard3DProps {
    position: [number, number, number];
    role: "recruiter" | "jobseeker";
    title: string;
    subtitle: string;
    color: string;
    orbitDirection: number;
    onSelect: (role: "recruiter" | "jobseeker") => void;
}

export function RoleCard3D({
    position,
    role,
    title,
    subtitle,
    color,
    orbitDirection,
    onSelect,
}: RoleCard3DProps) {
    const groupRef = useRef<THREE.Group>(null);
    const cardRef = useRef<THREE.Group>(null);
    const iconRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = React.useState(false);

    const orbitingIcons = useMemo(() => {
        const START_SEED = 789;
        const seededRandom = (currentSeed: number) => {
            const nextSeed = (currentSeed * 16807) % 2147483647;
            return [nextSeed, (nextSeed - 1) / 2147483646] as const;
        };

        const result = [];
        let current = START_SEED;
        for (let i = 0; i < 6; i++) {
            const [s1, r1] = seededRandom(current);
            const [s2, r2] = seededRandom(s1);
            current = s2;
            result.push({
                angle: (i / 6) * Math.PI * 2,
                radius: 3.5,
                speed: 0.5 + r1 * 0.3,
                yOffset: (r2 - 0.5) * 2,
                scale: 0.2 + r2 * 0.2,
            });
        }
        return result;
    }, []);

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        if (groupRef.current) {
            groupRef.current.position.y =
                position[1] + Math.sin(t * 0.8 + position[0]) * 0.3;
            groupRef.current.position.z = position[2] + Math.sin(t * 0.6) * 0.2;
        }

        if (cardRef.current) {
            const rotationIntensity = hovered ? 0.1 : 0.03;
            cardRef.current.rotation.y =
                Math.sin(t * 0.5 + position[0]) * rotationIntensity;
            cardRef.current.rotation.x = Math.cos(t * 0.3) * rotationIntensity * 0.5;

            const targetScale = hovered ? 1.1 : 1;
            cardRef.current.scale.lerp(
                new THREE.Vector3(targetScale, targetScale, targetScale),
                0.1
            );
        }

        if (iconRef.current) {
            iconRef.current.rotation.y = t * 0.5 * orbitDirection;
            iconRef.current.rotation.x = Math.sin(t) * 0.2;
            iconRef.current.position.y = Math.sin(t * 2) * 0.1;
        }
    });

    const handleClick = () => {
        onSelect(role);
    };

    return (
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
            <group ref={groupRef} position={position}>
                {orbitingIcons.map((orbit, i) => (
                    <OrbitingShape
                        key={i}
                        {...orbit}
                        color={color}
                        direction={orbitDirection}
                    />
                ))}

                <group ref={cardRef}>
                    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.5]}>
                        <ringGeometry args={[3.5, 4, 32]} />
                        <meshBasicMaterial
                            color={color}
                            transparent
                            opacity={hovered ? 0.3 : 0.1}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    <RoundedBox
                        args={[5.5, 7, 0.4]}
                        radius={0.4}
                        smoothness={4}
                        onClick={handleClick}
                        onPointerOver={() => setHovered(true)}
                        onPointerOut={() => setHovered(false)}
                    >
                        <meshStandardMaterial
                            color={hovered ? "#1a1a3e" : "#0a0a1a"}
                            metalness={0.3}
                            roughness={0.7}
                        />
                    </RoundedBox>

                    <RoundedBox
                        args={[5.7, 7.2, 0.3]}
                        radius={0.45}
                        smoothness={4}
                        position={[0, 0, -0.1]}
                    >
                        <meshStandardMaterial
                            color={color}
                            emissive={color}
                            emissiveIntensity={hovered ? 0.6 : 0.2}
                            transparent
                            opacity={0.5}
                        />
                    </RoundedBox>

                    <group position={[0, 1.5, 0.5]}>
                        <Trail width={1} length={6} color={color} attenuation={(t) => t * t}>
                            <mesh ref={iconRef}>
                                {role === "recruiter" ? (
                                    <boxGeometry args={[1.2, 1.5, 0.1]} />
                                ) : (
                                    <torusGeometry args={[0.6, 0.2, 16, 32]} />
                                )}
                                <MeshWobbleMaterial
                                    color="#ffffff"
                                    emissive={color}
                                    emissiveIntensity={0.3}
                                    factor={0.2}
                                    speed={2}
                                />
                            </mesh>
                        </Trail>
                    </group>

                    <Sparkles
                        count={20}
                        scale={3}
                        size={1}
                        position={[0, 1.5, 0.5]}
                        speed={0.5}
                        opacity={hovered ? 0.8 : 0.4}
                        color={color}
                    />

                    <Html
                        center
                        transform
                        position={[0, -1.2, 0.3]}
                        style={{ pointerEvents: hovered ? "auto" : "none" }}
                    >
                        <div className="w-[180px] text-center select-none">
                            <h3 className="text-xl font-serif font-bold text-white mb-2">
                                {title}
                            </h3>
                            <p className="text-sm text-gray-400 mb-5">{subtitle}</p>
                            <button
                                onClick={handleClick}
                                className={`w-full py-3 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${hovered
                                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50 scale-105"
                                        : "bg-white/10 text-white/80 border border-white/20"
                                    }`}
                            >
                                {hovered ? "✨ Enter Experience" : "Begin Experience →"}
                            </button>
                        </div>
                    </Html>

                    {hovered && (
                        <spotLight
                            position={[0, 5, 5]}
                            angle={0.4}
                            penumbra={0.5}
                            intensity={2}
                            color={color}
                        />
                    )}
                </group>
            </group>
        </Float>
    );
}

function OrbitingShape({
    angle,
    radius,
    speed,
    yOffset,
    scale,
    color,
    direction,
}: {
    angle: number;
    radius: number;
    speed: number;
    yOffset: number;
    scale: number;
    color: string;
    direction: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (meshRef.current) {
            const currentAngle = angle + t * speed * direction;
            meshRef.current.position.x = Math.cos(currentAngle) * radius;
            meshRef.current.position.z = Math.sin(currentAngle) * radius * 0.5;
            meshRef.current.position.y = yOffset + Math.sin(t + angle) * 0.3;
            meshRef.current.rotation.x = t * 2;
            meshRef.current.rotation.y = t * 1.5;
        }
    });

    return (
        <mesh ref={meshRef} scale={scale}>
            <octahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
                transparent
                opacity={0.7}
            />
        </mesh>
    );
}
