import React, { useMemo } from 'react';
import * as THREE from 'three';

interface Props {
  position?: [number, number, number];
  radius?: number;
}

export const CircleDeck: React.FC<Props> = ({
  position = [-24, 0, 12],
  radius = 14,
}) => {
  const [centerX, centerY, centerZ] = position;
  const deckHeight = 0.18;

  // 1. 연못에서 원형 데크 입구로 이어지는 부드러운 디딤돌 돌길
  const pathStones = useMemo(() => {
    const stones: [number, number, number][] = [];
    const count = 9;
    // 연못 가장자리(-9.5, 4.5)부터 데크 진입로(-14.5, 9.5)까지
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = THREE.MathUtils.lerp(-9.8, -14.2, t) + Math.sin(t * Math.PI) * 0.4;
      const z = THREE.MathUtils.lerp(4.8, 9.8, t);
      stones.push([x, 0.04, z]);
    }
    return stones;
  }, []);

  // 2. 데크 둘레를 따라 은은하게 밝히는 낮은 원목 정원등 (8개)
  const lanterns = useMemo(() => {
    const list: [number, number][] = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const lx = Math.cos(angle) * (radius - 0.6);
      const lz = Math.sin(angle) * (radius - 0.6);
      list.push([lx, lz]);
    }
    return list;
  }, [radius]);

  // 3. 원형 데크 바닥의 나무 널판 디테일 링 (동심원 줄눈)
  const ringSteps = [3, 6, 9, 12, 13.8];

  return (
    <group position={[centerX, centerY, centerZ]}>
      {/* 1. 메인 원형 밝은 원목 데크 상판 */}
      <mesh position={[0, deckHeight / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[radius, radius + 0.15, deckHeight, 64]} />
        <meshStandardMaterial
          color="#dfc5a4" // 따뜻하고 화사한 밝은 자작나무/오크 원목 톤
          roughness={0.65}
          metalness={0.05}
        />
      </mesh>

      {/* 2. 데크 외곽 테두리 마감 턱 (짙은 원목 코핑) */}
      <mesh position={[0, deckHeight + 0.01, 0]} receiveShadow>
        <ringGeometry args={[radius - 0.35, radius, 64]} />
        <meshStandardMaterial color="#b38a60" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* 3. 데크 바닥의 동심원 널판 이음새 라인 (고급스러운 원목 마루 질감) */}
      {ringSteps.map((r, idx) => (
        <mesh key={idx} rotation={[-Math.PI / 2, 0, 0]} position={[0, deckHeight + 0.005, 0]}>
          <ringGeometry args={[r - 0.02, r + 0.02, 64]} />
          <meshBasicMaterial color="#bfa17c" />
        </mesh>
      ))}

      {/* 4. 방사형 널판 구분선 (16방위 원목 줄눈) */}
      {Array.from({ length: 16 }).map((_, i) => {
        const rad = (i / 16) * Math.PI * 2;
        return (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, rad]}
            position={[0, deckHeight + 0.006, 0]}
          >
            <planeGeometry args={[0.03, radius * 2 - 0.8]} />
            <meshBasicMaterial color="#bfa17c" />
          </mesh>
        );
      })}

      {/* 5. 데크 가장자리의 아늑한 낮은 원목 등롱 */}
      {lanterns.map(([lx, lz], i) => (
        <group key={i} position={[lx, deckHeight, lz]}>
          {/* 나무 받침 */}
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.22, 0.24, 12]} />
            <meshStandardMaterial color="#8a5e38" roughness={0.8} />
          </mesh>
          {/* 한지 갓 & 온화한 호롱불빛 */}
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.2, 12]} />
            <meshBasicMaterial color="#fef3c7" />
          </mesh>
          {/* 갓 지붕 */}
          <mesh position={[0, 0.46, 0]} castShadow>
            <coneGeometry args={[0.26, 0.14, 12]} />
            <meshStandardMaterial color="#6a4425" roughness={0.8} />
          </mesh>
          {/* 은은한 앰비언트 포인트 광원 (4개만 배치하여 성능 최적화) */}
          {i % 2 === 0 && (
            <pointLight
              position={[0, 0.35, 0]}
              color="#fde047"
              intensity={0.4}
              distance={4.5}
              decay={2}
            />
          )}
        </group>
      ))}

      {/* 6. 연못에서 데크로 이어지는 자연스러운 돌길 */}
      <group position={[-centerX, -centerY, -centerZ]}>
        {pathStones.map(([sx, sy, sz], idx) => (
          <mesh
            key={idx}
            position={[sx, sy, sz]}
            rotation={[-Math.PI / 2, 0, idx * 0.4]}
            receiveShadow
            castShadow
          >
            <cylinderGeometry args={[0.42, 0.48, 0.08, 12]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
