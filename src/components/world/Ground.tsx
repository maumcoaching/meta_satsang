import React, { useMemo } from 'react';
import * as THREE from 'three';
import { sound } from '../audio/SoundEffects';

export const Ground: React.FC = () => {
  // 디딤돌 (돌길) 좌표 생성
  const steppingStones = useMemo(() => {
    const stones: [number, number, number, number][] = [];
    for (let i = 0; i < 12; i++) {
      const z = 3.6 + i * 1.1;
      const x = Math.sin(i * 0.7) * 0.35;
      const scale = 0.7 + (i % 3) * 0.12;
      const rot = (i * 0.4) % Math.PI;
      stones.push([x, z, scale, rot]);
    }
    return stones;
  }, []);

  // 소나무(Pine Tree) 위치 목록
  const pineTrees = useMemo(() => {
    return [
      { x: -9, z: -5, scale: 1.2 },
      { x: -12, z: 2, scale: 1.0 },
      { x: -8, z: 8, scale: 1.1 },
      { x: 9, z: -6, scale: 1.3 },
      { x: 17.2, z: 3, scale: 1.1 },
      { x: 8, z: 10, scale: 1.15 },
      { x: -5, z: -11, scale: 1.25 },
      { x: 6, z: -12, scale: 1.1 },
    ];
  }, []);

  // 연꽃잎 위치
  const lotusPads = useMemo(() => {
    return [
      { x: 0, z: 0, r: 0.45 },
      { x: 0.6, z: 0.4, r: 0.35 },
      { x: -0.7, z: -0.3, r: 0.4 },
      { x: 0.3, z: -0.7, r: 0.38 },
      { x: -0.5, z: 0.6, r: 0.32 },
    ];
  }, []);

  return (
    <group>
      {/* 1. 드넓은 잔디 지형 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#556b43" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* 2. 대청마루 앞마당 다져진 흙/마사토 마당 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1]} receiveShadow>
        <circleGeometry args={[11, 32]} />
        <meshStandardMaterial color="#8c7e6c" roughness={0.95} />
      </mesh>

      {/* 3. 디딤돌 (화강암 돌길) */}
      {steppingStones.map(([x, z, scale, rot], i) => (
        <mesh
          key={i}
          position={[x, 0.04, z]}
          rotation={[-Math.PI / 2, 0, rot]}
          scale={[scale, scale * 0.85, 1]}
          receiveShadow
          castShadow
        >
          <cylinderGeometry args={[0.42, 0.46, 0.08, 12]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.9} />
        </mesh>
      ))}

      {/* 4. 고요한 연못 (Lotus Pond) */}
      <group
        position={[-7, 0, 4]}
        onClick={(e) => {
          e.stopPropagation();
          sound.playSingingBowl();
        }}
      >
        {/* 연못 수면 (빛을 반사하는 맑은 청록빛 물) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <circleGeometry args={[3.2, 32]} />
          <meshStandardMaterial
            color="#2a6f78"
            roughness={0.15}
            metalness={0.4}
            transparent
            opacity={0.88}
          />
        </mesh>

        {/* 연못 테두리 자연석 바위들 */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const rx = Math.cos(rad) * 3.25;
          const rz = Math.sin(rad) * 3.25;
          return (
            <mesh
              key={i}
              position={[rx, 0.15, rz]}
              rotation={[0.2, rad, 0.1]}
              castShadow
              receiveShadow
            >
              <dodecahedronGeometry args={[0.55 + (i % 3) * 0.1]} />
              <meshStandardMaterial color="#64748b" roughness={0.9} />
            </mesh>
          );
        })}

        {/* 둥둥 떠있는 둥근 연잎 (Lotus Leaves) */}
        {lotusPads.map((pad, idx) => (
          <group key={idx} position={[pad.x * 2.2, 0.05, pad.z * 2.2]}>
            <mesh rotation={[-Math.PI / 2, 0, idx * 0.8]}>
              <ringGeometry args={[0.04, pad.r, 20]} />
              <meshStandardMaterial color="#2d6a4f" roughness={0.7} side={THREE.DoubleSide} />
            </mesh>
            {/* 연꽃 (Lotus Blossom) */}
            {idx % 2 === 0 && (
              <group position={[0, 0.08, 0]}>
                {[0, 60, 120, 180, 240, 300].map((angle, petalIdx) => (
                  <mesh
                    key={petalIdx}
                    rotation={[0.3, (angle * Math.PI) / 180, 0]}
                    position={[0, 0.04, 0]}
                  >
                    <coneGeometry args={[0.08, 0.22, 6]} />
                    <meshStandardMaterial color="#f472b6" roughness={0.5} />
                  </mesh>
                ))}
                {/* 연꽃 심지 */}
                <mesh position={[0, 0.07, 0]}>
                  <sphereGeometry args={[0.05, 8, 8]} />
                  <meshStandardMaterial color="#fef08a" />
                </mesh>
              </group>
            )}
          </group>
        ))}
      </group>

      {/* 5. 고풍스러운 소나무들 (Pine Trees) */}
      {pineTrees.map((tree, idx) => (
        <group key={idx} position={[tree.x, 0, tree.z]} scale={[tree.scale, tree.scale, tree.scale]}>
          {/* 구불구불한 소나무 줄기 */}
          <mesh position={[0, 1.8, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.42, 3.6, 12]} />
            <meshStandardMaterial color="#543d2b" roughness={0.95} />
          </mesh>
          {/* 곁가지 굴곡 */}
          <mesh position={[0.4, 2.8, 0.2]} rotation={[0.4, 0, -0.6]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 1.6, 10]} />
            <meshStandardMaterial color="#543d2b" roughness={0.95} />
          </mesh>
          {/* 소나무 솔잎 층 1 */}
          <mesh position={[0, 3.2, 0]} castShadow>
            <coneGeometry args={[2.0, 1.1, 8]} />
            <meshStandardMaterial color="#1f4426" roughness={0.85} />
          </mesh>
          {/* 소나무 솔잎 층 2 */}
          <mesh position={[0.4, 3.9, 0.2]} castShadow>
            <coneGeometry args={[1.6, 0.9, 8]} />
            <meshStandardMaterial color="#2d5a34" roughness={0.85} />
          </mesh>
          {/* 소나무 솔잎 층 3 (꼭대기) */}
          <mesh position={[0.1, 4.5, 0]} castShadow>
            <coneGeometry args={[1.1, 0.8, 8]} />
            <meshStandardMaterial color="#3b7a47" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
