import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';

export const Environment: React.FC = () => {
  const particlesRef = useRef<THREE.Points>(null);

  // 허공에 부유하는 은은한 꽃잎/빛가루 파티클
  const count = 70;
  const { positions, randomSpeeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 1] = 0.5 + Math.random() * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 36;

      speeds[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
      speeds[i * 3 + 1] = -0.15 - Math.random() * 0.2; // 서서히 하강
      speeds[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }

    return { positions: pos, randomSpeeds: speeds };
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    if (particlesRef.current) {
      const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      for (let i = 0; i < count; i++) {
        array[i * 3 + 0] += Math.sin(time + i) * 0.015;
        array[i * 3 + 1] += randomSpeeds[i * 3 + 1] * delta;
        array[i * 3 + 2] += Math.cos(time + i) * 0.015;

        // 바닥에 닿으면 다시 하늘로 재배치
        if (array[i * 3 + 1] < 0.1) {
          array[i * 3 + 1] = 7.5;
          array[i * 3 + 0] = (Math.random() - 0.5) * 36;
          array[i * 3 + 2] = (Math.random() - 0.5) * 36;
        }
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <>
      {/* 1. 산사의 신비롭고 고요한 산안개 (Atmospheric Fog) */}
      <fog attach="fog" args={['#dce5ed', 12, 60]} />

      {/* 2. 맑은 하늘 (Sky) */}
      <Sky
        sunPosition={[35, 25, 45]}
        turbidity={7}
        rayleigh={1.2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />

      {/* 3. 햇살 조명 (따뜻한 오후 햇빛 & 부드러운 그림자) */}
      <directionalLight
        position={[25, 30, 20]}
        intensity={1.8}
        color="#fff4e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.5}
        shadow-camera-far={70}
        shadow-bias={-0.0005}
      />

      {/* 4. 하늘과 땅의 반사광 (Hemisphere Light) */}
      <hemisphereLight args={['#e0f2fe', '#524335', 0.85]} />

      {/* 5. 은은한 전체 환경광 */}
      <ambientLight intensity={0.55} color="#ffffff" />

      {/* 6. 공중에 나부끼는 꽃잎/빛가루 */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          color="#fbcfe8"
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </points>
    </>
  );
};
