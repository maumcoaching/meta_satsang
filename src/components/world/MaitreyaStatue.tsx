import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { sound } from '../audio/SoundEffects';

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const MaitreyaStatue: React.FC<Props> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0], // 북쪽 금강좌(-Z)를 등지고 남쪽(+Z) 정면을 바라보도록 배치
}) => {
  // 1. 사용자 제공 정밀 3D 반가사유상 모델(maitreya.glb) 로드
  const { scene } = useGLTF('/models/maitreya.glb');

  // GLB 내부 메쉬 지오메트리 추출 (원본 버텍스는 Y축이 위쪽[0~912.7mm], +Z축이 정면)
  const statueGeometry = useMemo(() => {
    let found: THREE.BufferGeometry | null = null;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !found) {
        found = (child as THREE.Mesh).geometry;
      }
    });
    return found;
  }, [scene]);

  // 2. 실제 사진 속 청동 반가사유상의 밝고 은은한 청동 파티나(Bright Bronze Patina) 재질
  // 이목구비와 미소, 옷주름 음영이 그늘에서도 환하고 또렷하게 드러나도록 밝기 및 반사도 최적화
  const bronzeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#82968a',
        roughness: 0.45,
        metalness: 0.22,
        emissive: '#252e29',
        emissiveIntensity: 0.28,
      }),
    []
  );

  // 3. 화강암 석조 좌대 재질
  const graniteMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.88,
        metalness: 0.05,
      }),
    []
  );

  // 4. 황금빛 일산(갓등) 폴대 & 캐노피 재질
  const goldMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#eab308',
        roughness: 0.35,
        metalness: 0.75,
      }),
    []
  );

  // 5. 등 뒤에서 솟아올라 머리 위를 덮는 황금빛 일산(캐노피) 곡선 파이프 (사진과 동일하게 등 뒤 배치)
  const archPoints = useMemo(() => {
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0.08, 0.3, -0.82),  // 석좌대 뒷면 지지점
      new THREE.Vector3(0.06, 2.3, -0.84),  // 등 뒤를 따라 수직 상승
      new THREE.Vector3(0.03, 3.18, -0.45), // 머리 뒤에서 앞으로 부드럽게 굴곡
      new THREE.Vector3(0.0, 3.04, 0.06)    // 반가사유상 보관(삼산관) 바로 위 캐노피 중심
    );
    return curve.getPoints(36);
  }, []);

  const pedestalTopY = 1.09;
  // 원본 높이 912.67mm * 0.00192 = 약 1.75m (석좌대 1.09m 위 총 높이 약 2.84m)
  const statueScale = 0.00192;

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        sound.playSingingBowl();
      }}
    >
      {/* ========================================================
          1. 사각 화강암 석조 좌대 (Granite Pedestal)
         ======================================================== */}
      {/* 하단 받침돌 */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow material={graniteMaterial}>
        <boxGeometry args={[1.7, 0.16, 1.7]} />
      </mesh>
      {/* 주 석좌대 몸통 */}
      <mesh position={[0, 0.58, 0]} receiveShadow castShadow material={graniteMaterial}>
        <boxGeometry args={[1.5, 0.84, 1.5]} />
      </mesh>
      {/* 상단 덮개돌 (음각 몰딩) */}
      <mesh position={[0, 1.04, 0]} receiveShadow castShadow material={graniteMaterial}>
        <boxGeometry args={[1.62, 0.1, 1.62]} />
      </mesh>

      {/* ========================================================
          2. 정밀 3D 금동미륵보살반가사유상 (maitreya.glb)
             - 금강좌(-Z)를 등지고 남쪽(+Z)을 향해 고요히 사유하는 자태
         ======================================================== */}
      {statueGeometry && (
        <mesh
          geometry={statueGeometry}
          material={bronzeMaterial}
          position={[0.02, pedestalTopY, -0.04]}
          scale={[statueScale, statueScale, statueScale]}
          castShadow
          receiveShadow
        />
      )}

      {/* ========================================================
          3. 사진 속 황금빛 일산(갓등) 폴대 & 캐노피 (등 뒤에서 머리 위로)
         ======================================================== */}
      <mesh material={goldMaterial} castShadow>
        <tubeGeometry args={[new THREE.CatmullRomCurve3(archPoints), 36, 0.022, 12, false]} />
      </mesh>

      {/* 머리 위에 떠 있는 둥근 우산형 황금 갓(일산 / 캐노피) */}
      <group position={[0.0, 3.04, 0.06]}>
        <mesh position={[0, 0.02, 0]} material={goldMaterial} castShadow>
          <cylinderGeometry args={[0.44, 0.46, 0.04, 32]} />
        </mesh>
        <mesh position={[0, -0.005, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.01, 32]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>

      {/* ========================================================
          4. 사진 속 측면 작은 노란색 다도/소품 선반 & 유리 호롱등
         ======================================================== */}
      <group position={[-1.12, 0, 0.25]} rotation={[0, 0.15, 0]}>
        <mesh position={[0, 0.32, 0]} castShadow material={goldMaterial}>
          <boxGeometry args={[0.38, 0.64, 0.32]} />
        </mesh>
        <group position={[0, 0.72, 0]}>
          <mesh>
            <cylinderGeometry args={[0.08, 0.09, 0.16, 12]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.4} roughness={0.1} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#d97706" />
          </mesh>
        </group>
      </group>
    </group>
  );
};

useGLTF.preload('/models/maitreya.glb');
