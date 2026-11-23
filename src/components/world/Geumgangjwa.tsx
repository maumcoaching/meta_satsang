import React, { useMemo } from 'react';
import * as THREE from 'three';
import { sound } from '../audio/SoundEffects';

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const Geumgangjwa: React.FC<Props> = ({
  position = [-24, 0, -1.5], // 서원동산 북쪽 경계
  rotation = [0, 0, 0],       // 남쪽(서원동산 중심)을 향해 웅장하게 서도록 배치
}) => {
  // 1. 금강경 전문과 금색 원형 경구가 선명히 새겨진 고화질 실물 바위 텍스처
  const geumgangTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/geumgangjwa/geumgang_cutout.png');
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // 2. 단단한 화강암 기단석 재질
  const graniteMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8b95a5',
        roughness: 0.9,
        metalness: 0.05,
      }),
    []
  );

  // 3. 앞쪽 기도대 노란색 원목 재질
  const altarWoodMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#eab308',
        roughness: 0.4,
        metalness: 0.2,
      }),
    []
  );

  // 4. 사람 키(1.75m)의 4배에 달하는 장엄한 규격: 높이 7.0m, 가로 11.2m
  const rockHeight = 7.0;
  const rockWidth = 11.2;
  const basePlinthHeight = 0.55;

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
          1. 하단 2단 콘크리트 및 화강암 기단석 (Plinth Foundation)
         ======================================================== */}
      {/* 최하단 기초 바닥석 */}
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow material={graniteMaterial}>
        <boxGeometry args={[12.2, 0.3, 3.8]} />
      </mesh>
      {/* 상단 묵직한 화강암 장대석 */}
      <mesh position={[0, basePlinthHeight - 0.12, 0]} receiveShadow castShadow material={graniteMaterial}>
        <boxGeometry args={[11.4, 0.24, 3.0]} />
      </mesh>

      {/* ========================================================
          2. 거대한 금강경 바위 비석 - 금강좌 본체 (사람 키의 4배 높이)
         ======================================================== */}
      {/* 바위 뒤편 3D 입체 볼륨감용 둥근 자연 암석 바디 */}
      <mesh position={[0, basePlinthHeight + rockHeight / 2 - 0.2, -0.45]} castShadow receiveShadow>
        <boxGeometry args={[rockWidth * 0.92, rockHeight * 0.88, 0.9]} />
        <meshStandardMaterial color="#2d3339" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* 정면 금강경 전문 및 원형 금색 경구 면 (무왜곡 맑은 렌더링) */}
      <mesh position={[0, basePlinthHeight + rockHeight / 2, 0.05]}>
        <planeGeometry args={[rockWidth, rockHeight]} />
        <meshBasicMaterial
          map={geumgangTexture}
          transparent
          alphaTest={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ========================================================
          3. 사진 속 전면 참배 촛대/향대 원목 기도대 (Front Altar)
         ======================================================== */}
      <group position={[0, basePlinthHeight, 1.3]}>
        {/* 기도대 노란색 원목 몸체 */}
        <mesh position={[0, 0.45, 0]} castShadow material={altarWoodMaterial}>
          <boxGeometry args={[4.2, 0.9, 0.65]} />
        </mesh>
        {/* 기도대 지붕 */}
        <mesh position={[0, 0.98, 0]} castShadow material={altarWoodMaterial}>
          <boxGeometry args={[4.5, 0.12, 0.85]} />
        </mesh>
        {/* 전면 유리창 케이스 */}
        <mesh position={[0, 0.52, 0.33]}>
          <planeGeometry args={[3.8, 0.65]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.35} roughness={0.1} />
        </mesh>
        {/* 촛불 줄지어 켜진 온화한 램프들 */}
        {[-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((cx, idx) => (
          <group key={idx} position={[cx, 0.45, 0.1]}>
            <mesh>
              <cylinderGeometry args={[0.04, 0.04, 0.16, 8]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <sphereGeometry args={[0.02, 6, 6]} />
              <meshBasicMaterial color="#f59e0b" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};
