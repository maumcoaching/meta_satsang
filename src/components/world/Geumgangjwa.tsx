import React, { useMemo } from 'react';
import * as THREE from 'three';
import { sound } from '../audio/SoundEffects';

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const Geumgangjwa: React.FC<Props> = ({
  position = [-24, 0.18, 3.5], // 서원동산 안쪽 (북쪽에 넉넉한 순례 보행로 확보)
  rotation = [0, 0, 0],         // 남쪽(서원동산 중심)을 향해 웅장하게 서도록 배치
}) => {
  // 1. 전면: 금강경 전문과 금색 원형 경구가 새겨진 고화질 실물 바위 텍스처
  const frontTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/geumgangjwa/geumgang_cutout.png');
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // 2. 후면: 화엄경 사구게(대방광불화엄경, 일체유심조, 응관법계성) 황금 서체 텍스처
  const backTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/geumgangjwa/geumgang_back_cutout.png');
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // 3. 단단한 화강암 기단석 재질
  const graniteMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8b95a5',
        roughness: 0.9,
        metalness: 0.05,
      }),
    []
  );

  // 4. 측면 묵직한 자연 암석 바디 재질 (사진 2의 둥글고 두터운 암벽 질감)
  const rockBodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2e353c',
        roughness: 0.96,
        metalness: 0.04,
      }),
    []
  );

  // 5. 참배 촛대 기도대 노란색 원목 재질
  const altarWoodMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#eab308',
        roughness: 0.45,
        metalness: 0.15,
      }),
    []
  );

  // 규격: 사람 키(1.75m)의 4배 높이 7.0m, 가로 폭 11.2m, 두께 1.5m
  const rockHeight = 7.0;
  const rockWidth = 11.2;
  const rockDepth = 1.5;
  const basePlinthHeight = 0.52;

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
          1. 하단 2단 화강암 장대석 기단 (Plinth Foundation)
         ======================================================== */}
      {/* 최하단 기초 바닥석 */}
      <mesh position={[0, 0.14, 0]} receiveShadow castShadow material={graniteMaterial}>
        <boxGeometry args={[12.2, 0.28, 3.8]} />
      </mesh>
      {/* 상단 묵직한 화강암 받침석 */}
      <mesh position={[0, basePlinthHeight - 0.12, 0]} receiveShadow castShadow material={graniteMaterial}>
        <boxGeometry args={[11.5, 0.24, 3.2]} />
      </mesh>

      {/* ========================================================
          2. 거대한 금강좌 암석 본체 (3D 두께와 측면 암벽 질감)
         ======================================================== */}
      {/* 사진 2의 두텁고 둥근 암석 옆모습 체적 */}
      <mesh position={[0, basePlinthHeight + rockHeight / 2 - 0.2, 0]} castShadow receiveShadow material={rockBodyMaterial}>
        <boxGeometry args={[rockWidth * 0.91, rockHeight * 0.88, rockDepth - 0.08]} />
      </mesh>
      {/* 좌우 자연스러운 둥근 암벽 어깨 곡면 */}
      <mesh position={[-rockWidth * 0.43, basePlinthHeight + rockHeight * 0.4, 0]} rotation={[0, 0, 0.15]} castShadow material={rockBodyMaterial}>
        <cylinderGeometry args={[0.7, 0.9, rockHeight * 0.7, 16]} />
      </mesh>
      <mesh position={[rockWidth * 0.43, basePlinthHeight + rockHeight * 0.4, 0]} rotation={[0, 0, -0.15]} castShadow material={rockBodyMaterial}>
        <cylinderGeometry args={[0.7, 0.9, rockHeight * 0.7, 16]} />
      </mesh>

      {/* ========================================================
          3. 정면: 금강경 전문 및 황금 원형 경구 (남쪽을 바라봄)
         ======================================================== */}
      <mesh position={[0, basePlinthHeight + rockHeight / 2, rockDepth / 2 + 0.02]}>
        <planeGeometry args={[rockWidth, rockHeight]} />
        <meshBasicMaterial
          map={frontTexture}
          transparent
          alphaTest={0.08}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* ========================================================
          4. 후면: 화엄경 사구게(응관법계성 일체유심조) 황금 서체 (북쪽을 바라봄)
         ======================================================== */}
      <mesh position={[0, basePlinthHeight + rockHeight / 2, -rockDepth / 2 - 0.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[rockWidth, rockHeight]} />
        <meshBasicMaterial
          map={backTexture}
          transparent
          alphaTest={0.08}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* ========================================================
          5. 전면: 참배 촛대/향대 원목 기도대 (Altar)
         ======================================================== */}
      <group position={[0, basePlinthHeight, rockDepth / 2 + 0.9]}>
        {/* 기도대 노란색 원목 몸체 */}
        <mesh position={[0, 0.42, 0]} castShadow material={altarWoodMaterial}>
          <boxGeometry args={[4.2, 0.84, 0.65]} />
        </mesh>
        {/* 기도대 지붕 */}
        <mesh position={[0, 0.92, 0]} castShadow material={altarWoodMaterial}>
          <boxGeometry args={[4.5, 0.12, 0.85]} />
        </mesh>
        {/* 전면 투명 유리창 케이스 */}
        <mesh position={[0, 0.48, 0.33]}>
          <planeGeometry args={[3.8, 0.65]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.35} roughness={0.1} />
        </mesh>
        {/* 촛불 램프들 */}
        {[-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((cx, idx) => (
          <group key={idx} position={[cx, 0.42, 0.1]}>
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

      {/* ========================================================
          6. 후면: 뒤편 참배객을 위한 노란색 촛대 기도대 (사진 1 참조)
         ======================================================== */}
      <group position={[0, basePlinthHeight, -rockDepth / 2 - 0.85]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.38, 0]} castShadow material={altarWoodMaterial}>
          <boxGeometry args={[3.6, 0.76, 0.55]} />
        </mesh>
        <mesh position={[0, 0.84, 0]} castShadow material={altarWoodMaterial}>
          <boxGeometry args={[3.9, 0.1, 0.75]} />
        </mesh>
        {[-1.2, -0.6, 0, 0.6, 1.2].map((cx, idx) => (
          <group key={idx} position={[cx, 0.38, 0.08]}>
            <mesh>
              <cylinderGeometry args={[0.035, 0.035, 0.14, 8]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
            <mesh position={[0, 0.09, 0]}>
              <sphereGeometry args={[0.018, 6, 6]} />
              <meshBasicMaterial color="#f59e0b" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};
