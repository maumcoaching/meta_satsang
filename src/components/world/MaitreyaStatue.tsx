import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sound } from '../audio/SoundEffects';

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const MaitreyaStatue: React.FC<Props> = ({
  position = [0, 0, 0],
  rotation = [0, 1.85, 0], // 서원동산 진입로(연못 디딤돌 방향)를 향해 온화하게 바라보도록 설정
}) => {
  const haloLightRef = useRef<THREE.PointLight>(null);

  // 1. 실제 사진에서 정밀 추출한 고화질 금동미륵보살반가사유상 실물 텍스처
  const statueTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/statue/statue_cutout.png');
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // 2. 화강암 석조 좌대 재질
  const graniteMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.88,
        metalness: 0.05,
      }),
    []
  );

  // 3. 황금빛 일산(갓등) 폴대 & 캐노피 재질
  const goldMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#eab308',
        roughness: 0.35,
        metalness: 0.75,
      }),
    []
  );

  // 4. 하단 청동 좌대 링 재질
  const bronzeBaseMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2a332f',
        roughness: 0.6,
        metalness: 0.3,
      }),
    []
  );

  // 5. 머리 위 황금빛 일산(캐노피) 곡선 파이프 (Smooth Arch Curve)
  const archPoints = useMemo(() => {
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-0.72, 0.5, 0.3),  // 석좌대 옆 지지점
      new THREE.Vector3(-0.75, 2.4, 0.2),  // 위로 솟구침
      new THREE.Vector3(-0.35, 3.1, 0.1),  // 곡선 굴곡
      new THREE.Vector3(0.0, 2.95, 0.05)   // 머리 위 캐노피 중심
    );
    return curve.getPoints(32);
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (haloLightRef.current) {
      // 은은한 사유의 빛 숨결 파동
      haloLightRef.current.intensity = 0.95 + Math.sin(time * 2.2) * 0.15;
    }
  });

  const pedestalTopY = 1.09;
  const statueHeight = 1.95;
  const statueWidth = 1.08;

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
          2. 청동 연화 원형 좌대 발판 (Bronze Plinth Base)
         ======================================================== */}
      <mesh position={[0, pedestalTopY + 0.06, 0]} receiveShadow castShadow material={bronzeBaseMaterial}>
        <cylinderGeometry args={[0.48, 0.54, 0.12, 32]} />
      </mesh>

      {/* ========================================================
          3. 사진 속 아름다운 실물 금동미륵보살반가사유상 (Photo Standee)
         ======================================================== */}
      {/* 정면 고화질 반가사유상 */}
      <mesh position={[0, pedestalTopY + statueHeight / 2 + 0.05, 0.02]} castShadow>
        <planeGeometry args={[statueWidth, statueHeight]} />
        <meshStandardMaterial
          map={statueTexture}
          transparent
          alphaTest={0.05}
          side={THREE.DoubleSide}
          roughness={0.45}
          metalness={0.25}
        />
      </mesh>

      {/* 3D 깊이감을 위한 은은한 입체 교차 레이어 (30도 사선 보조 평면) */}
      <mesh
        position={[0, pedestalTopY + statueHeight / 2 + 0.05, 0]}
        rotation={[0, 0.45, 0]}
      >
        <planeGeometry args={[statueWidth * 0.95, statueHeight]} />
        <meshStandardMaterial
          map={statueTexture}
          transparent
          alphaTest={0.08}
          side={THREE.DoubleSide}
          roughness={0.5}
          metalness={0.2}
          opacity={0.88}
        />
      </mesh>

      {/* ========================================================
          4. 사진 속 황금빛 일산(갓등) 폴대 & 캐노피 (Canopy Halo)
         ======================================================== */}
      {/* 바닥 좌대 옆에서 솟아올라 머리 위로 우아하게 휜 황금 파이프 */}
      <mesh material={goldMaterial}>
        <tubeGeometry args={[new THREE.CatmullRomCurve3(archPoints), 32, 0.022, 10, false]} />
      </mesh>

      {/* 머리 위에 떠 있는 둥근 우산형 황금 갓(일산 / 캐노피) */}
      <group position={[0.0, 2.95, 0.05]}>
        {/* 상단 둥근 갓 */}
        <mesh position={[0, 0.02, 0]} material={goldMaterial} castShadow>
          <cylinderGeometry args={[0.44, 0.46, 0.04, 32]} />
        </mesh>
        {/* 하단 황금 반사판 */}
        <mesh position={[0, -0.005, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.01, 32]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
        {/* 반가사유상을 위에서 따뜻하게 비추는 온화한 광배 조명 */}
        <pointLight
          ref={haloLightRef}
          position={[0, -0.15, 0]}
          color="#fde047"
          intensity={0.95}
          distance={5.0}
          decay={2}
        />
      </group>

      {/* ========================================================
          5. 사진 속 측면 작은 노란색 다도/소품 선반 & 램프 (Side Stand)
         ======================================================== */}
      <group position={[-1.15, 0, 0.4]} rotation={[0, 0.4, 0]}>
        {/* 작은 2단 노란색 원목 선반 */}
        <mesh position={[0, 0.32, 0]} castShadow material={goldMaterial}>
          <boxGeometry args={[0.38, 0.64, 0.32]} />
        </mesh>
        {/* 선반 위 투명 유리 랜턴 */}
        <group position={[0, 0.72, 0]}>
          <mesh>
            <cylinderGeometry args={[0.08, 0.09, 0.16, 12]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.4} roughness={0.1} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
          <pointLight position={[0, 0.05, 0]} color="#f59e0b" intensity={0.4} distance={2.5} decay={2} />
        </group>
      </group>
    </group>
  );
};
