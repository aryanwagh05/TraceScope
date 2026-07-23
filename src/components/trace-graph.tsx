"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, PerspectiveCamera, Text } from "@react-three/drei";
import type { Group } from "three";
import type { Span } from "@/lib/types";

const spanColors: Record<Span["type"], string> = {
  input: "#60707a",
  system: "#45535b",
  retrieval: "#286f9f",
  rerank: "#3e7f99",
  model: "#287a58",
  tool: "#b56b18",
  validation: "#825f31",
  eval: "#5a6f7a",
  output: "#151a1e",
};

function TraceScene({ spans }: { spans: Span[] }) {
  const groupRef = useRef<Group>(null);
  const points = useMemo(
    () =>
      spans.map((_, index) => {
        const x = index * 1.65 - ((spans.length - 1) * 1.65) / 2;
        const y = index % 2 === 0 ? 0.2 : -0.25;
        const z = Math.sin(index * 0.7) * 0.35;
        return [x, y, z] as [number, number, number];
      }),
    [spans],
  );

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 4, 5]} intensity={1.4} />
      {points.length > 1 ? (
        <Line points={points} color="#90a8b5" lineWidth={2.5} transparent opacity={0.75} />
      ) : null}
      {spans.map((span, index) => (
        <group key={span.id} position={points[index]}>
          <mesh>
            <sphereGeometry args={[0.22, 32, 32]} />
            <meshStandardMaterial
              color={spanColors[span.type]}
              roughness={0.42}
              metalness={0.18}
            />
          </mesh>
          <Text
            position={[0, -0.46, 0]}
            color="#151a1e"
            fontSize={0.13}
            maxWidth={1.25}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
          >
            {span.name}
          </Text>
        </group>
      ))}
    </group>
  );
}

export function TraceGraph({ spans }: { spans: Span[] }) {
  return (
    <div className="h-[360px] w-full overflow-hidden border-y border-border bg-[#eef2f3]">
      <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 1.2, 6.3]} fov={48} />
        <TraceScene spans={spans} />
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={1.1} maxPolarAngle={1.85} />
      </Canvas>
    </div>
  );
}
