"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
    Float,
    Html,
    RoundedBox,
    Sparkles,
    MeshDistortMaterial,
    MeshWobbleMaterial,
    Trail,
} from "@react-three/drei";
import * as THREE from "three";

interface RoleSelectionProps {
    onSelect: (role: "recruiter" | "jobseeker") => void;
}

export function RoleSelection({ onSelect }: RoleSelectionProps) {
    const groupRef = useRef<THREE.Group>(null);

    // Animate the whole scene
    useFrame((state) => {
        if (groupRef.current) {
            // Very subtle scene breathing
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.02;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Floating geometric background elements */}
            <FloatingGeometrics />

            {/* Particle field */}
            <Sparkles
                count={200}
                scale={30}
                size={2}
                speed={0.3}
                opacity={0.4}
                color="#3B82F6"
            />
            <Sparkles
                count={100}
                scale={25}
                size={3}
                speed={0.5}
                opacity={0.3}
                color="#8B5CF6"
            />

            {/* Title - using Html for better text rendering */}
            <Html center position={[0, 6, 0]}>
                <div className="text-center select-none pointer-events-none">
                    <h1 className="text-6xl font-serif font-bold text-white mb-4 tracking-tight animate-pulse">
                        Choose Your Path
                    </h1>
                    <p className="text-xl text-gray-400">
                        Experience the future of hiring
                    </p>
                </div>
            </Html>

            {/* Animated Role Cards */}
            <RoleCard3D
                position={[-5, -0.5, 0]}
                role="jobseeker"
                title="I'm a Jobseeker"
                subtitle="Find your dream role"
                color="#8B5CF6"
                onSelect={onSelect}
                orbitDirection={1}
            />

            <RoleCard3D
                position={[5, -0.5, 0]}
                role="recruiter"
                title="I'm a Recruiter"
                subtitle="Discover top talent"
                color="#3B82F6"
                onSelect={onSelect}
                orbitDirection={-1}
            />

            {/* Center energy orb */}
            <CenterOrb />
        </group>
    );
}

// Floating geometric shapes in background
function FloatingGeometrics() {
    const shapes = useMemo(
        () => {
            const START_SEED = 456;
            const seededRandom = (currentSeed: number) => {
                const nextSeed = (currentSeed * 16807) % 2147483647;
                return [nextSeed, (nextSeed - 1) / 2147483646] as const;
            };

            // Generate sequence of seeds first to avoid reassignment in loop
            const result = [];
            let current = START_SEED;
            for (let i = 0; i < 15; i++) {
                const [s1, r1] = seededRandom(current);
                const [s2, r2] = seededRandom(s1);
                const [s3, r3] = seededRandom(s2);
                const [s4, r4] = seededRandom(s3);
                const [s5, r5] = seededRandom(s4);
                const [s6, r6] = seededRandom(s5);
                const [s7, r7] = seededRandom(s6);
                current = s7;
                result.push({
                    position: [(r1 - 0.5) * 40, (r2 - 0.5) * 20, -10 - r3 * 15] as [number, number, number],
                    rotation: r4 * Math.PI,
                    scale: 0.3 + r5 * 0.7,
                    speed: 0.2 + r6 * 0.5,
                    type: ["box", "octahedron", "icosahedron", "torus"][Math.floor(r7 * 4)],
                });
            }
            return result;
        },
        []
    );

    return (
        <group>
            {shapes.map((shape, i) => (
                <FloatingShape key={i} {...shape} index={i} />
            ))}
        </group>
    );
}

function FloatingShape({
    position,
    scale,
    speed,
    type,
    index,
}: {
    position: [number, number, number];
    rotation: number;
    scale: number;
    speed: number;
    type: string;
    index: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            const t = state.clock.elapsedTime;
            meshRef.current.rotation.x = t * speed;
            meshRef.current.rotation.y = t * speed * 0.7;
            meshRef.current.position.y =
                position[1] + Math.sin(t * speed + index) * 1;
            meshRef.current.position.x =
                position[0] + Math.sin(t * speed * 0.5 + index) * 0.5;
        }
    });

    const geometry = useMemo(() => {
        switch (type) {
            case "octahedron":
                return <octahedronGeometry args={[1, 0]} />;
            case "icosahedron":
                return <icosahedronGeometry args={[1, 0]} />;
            case "torus":
                return <torusGeometry args={[1, 0.3, 8, 16]} />;
            default:
                return <boxGeometry args={[1, 1, 1]} />;
        }
    }, [type]);

    return (
        <mesh ref={meshRef} position={position} scale={scale}>
            {geometry}
            <meshStandardMaterial
                color="#1a1a2e"
                emissive="#3B82F6"
                emissiveIntensity={0.1}
                wireframe
                transparent
                opacity={0.3}
            />
        </mesh>
    );
}

// Center pulsing energy orb
function CenterOrb() {
    const meshRef = useRef<THREE.Mesh>(null);
    const lightRef = useRef<THREE.PointLight>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (meshRef.current) {
            meshRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
            meshRef.current.rotation.y = t * 0.5;
            meshRef.current.rotation.x = t * 0.3;
        }
        if (lightRef.current) {
            lightRef.current.intensity = 1 + Math.sin(t * 3) * 0.5;
        }
    });

    return (
        <group position={[0, -0.5, -3]}>
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[1.5, 2]} />
                <MeshDistortMaterial
                    color="#0a0a1a"
                    emissive="#3B82F6"
                    emissiveIntensity={0.5}
                    distort={0.3}
                    speed={2}
                    transparent
                    opacity={0.8}
                />
            </mesh>
            <pointLight
                ref={lightRef}
                color="#3B82F6"
                intensity={1}
                distance={15}
            />
            <Sparkles
                count={30}
                scale={4}
                size={2}
                speed={0.5}
                opacity={0.6}
                color="#60A5FA"
            />
        </group>
    );
}

interface RoleCard3DProps {
    position: [number, number, number];
    role: "recruiter" | "jobseeker";
    title: string;
    subtitle: string;
    color: string;
    orbitDirection: number;
    onSelect: (role: "recruiter" | "jobseeker") => void;
}

function RoleCard3D({
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

    // Orbiting icons around the card
    const orbitingIcons = useMemo(
        () => {
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
                    scale: 0.2 + r2 * 0.2, // Use r2 again for scale to save seeds
                });
            }
            return result;
        },
        []
    );

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        if (groupRef.current) {
            // Continuous floating motion
            groupRef.current.position.y =
                position[1] + Math.sin(t * 0.8 + position[0]) * 0.3;
            groupRef.current.position.z =
                position[2] + Math.sin(t * 0.6) * 0.2;
        }

        if (cardRef.current) {
            // Card rotation - more pronounced when hovered
            const rotationIntensity = hovered ? 0.1 : 0.03;
            cardRef.current.rotation.y =
                Math.sin(t * 0.5 + position[0]) * rotationIntensity;
            cardRef.current.rotation.x =
                Math.cos(t * 0.3) * rotationIntensity * 0.5;

            // Scale on hover
            const targetScale = hovered ? 1.1 : 1;
            cardRef.current.scale.lerp(
                new THREE.Vector3(targetScale, targetScale, targetScale),
                0.1
            );
        }

        if (iconRef.current) {
            // Floating icon rotation
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
                {/* Orbiting mini shapes */}
                {orbitingIcons.map((orbit, i) => (
                    <OrbitingShape
                        key={i}
                        {...orbit}
                        color={color}
                        direction={orbitDirection}
                    />
                ))}

                {/* Main card */}
                <group ref={cardRef}>
                    {/* Card glow ring */}
                    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.5]}>
                        <ringGeometry args={[3.5, 4, 32]} />
                        <meshBasicMaterial
                            color={color}
                            transparent
                            opacity={hovered ? 0.3 : 0.1}
                            side={THREE.DoubleSide}
                        />
                    </mesh>

                    {/* Card body */}
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

                    {/* Card border effect */}
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

                    {/* 3D Icon - actual rotating 3D object */}
                    <group position={[0, 1.5, 0.5]}>
                        <Trail
                            width={1}
                            length={6}
                            color={color}
                            attenuation={(t) => t * t}
                        >
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

                    {/* Sparkles around icon */}
                    <Sparkles
                        count={20}
                        scale={3}
                        size={1}
                        position={[0, 1.5, 0.5]}
                        speed={0.5}
                        opacity={hovered ? 0.8 : 0.4}
                        color={color}
                    />

                    {/* Card content */}
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

                    {/* Hover spotlight */}
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

// Orbiting shapes around cards
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
