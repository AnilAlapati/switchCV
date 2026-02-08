"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function FloatingGeometrics() {
    const shapes = useMemo(() => {
        const START_SEED = 456;
        const seededRandom = (currentSeed: number) => {
            const nextSeed = (currentSeed * 16807) % 2147483647;
            return [nextSeed, (nextSeed - 1) / 2147483646] as const;
        };

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
                position: [
                    (r1 - 0.5) * 40,
                    (r2 - 0.5) * 20,
                    -10 - r3 * 15,
                ] as [number, number, number],
                rotation: r4 * Math.PI,
                scale: 0.3 + r5 * 0.7,
                speed: 0.2 + r6 * 0.5,
                type: ["box", "octahedron", "icosahedron", "torus"][
                    Math.floor(r7 * 4)
                ] as "box" | "octahedron" | "icosahedron" | "torus",
            });
        }
        return result;
    }, []);

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
    type: "box" | "octahedron" | "icosahedron" | "torus";
    index: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            const t = state.clock.elapsedTime;
            meshRef.current.rotation.x = t * speed;
            meshRef.current.rotation.y = t * speed * 0.7;
            meshRef.current.position.y = position[1] + Math.sin(t * speed + index) * 1;
            meshRef.current.position.x =
                position[0] + Math.sin(t * speed * 0.5 + index) * 0.5;
        }
    });

    return (
        <mesh ref={meshRef} position={position} scale={scale}>
            {type === "octahedron" && <octahedronGeometry args={[1, 0]} />}
            {type === "icosahedron" && <icosahedronGeometry args={[1, 0]} />}
            {type === "torus" && <torusGeometry args={[1, 0.3, 8, 16]} />}
            {type === "box" && <boxGeometry args={[1, 1, 1]} />}
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
