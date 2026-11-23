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
  rotation = [0, 0.35, 0], // 연못과 본당 진입로를 향해 온화하게 바라보도록 각도 설정
}) => {
  const haloLightRef = useRef<THREE.PointLight>(null);

  // 1. 청동 반가사유상 특유의 그윽한 청록빛 고동색 청동(Bronze Patina) 재질
  const bronzeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#34403a', // 깊이감 있는 앤틱 청동 컬러
        roughness: 0.52,
        metalness: 0.48,
      }),
    []
  );

  // 2. 화강암 석조 좌대 재질
  const graniteMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.92,
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

  // 4. 머리 위 황금빛 일산(캐노피) 곡선 파이프 (Smooth Arch Curve)
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
      haloLightRef.current.intensity = 0.85 + Math.sin(time * 2.2) * 0.12;
    }
  });

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
          2. 청동 연화 대좌 및 주름 치락 (Lotus Stool & Drapery)
         ======================================================== */}
      <group position={[0, 1.09, 0]}>
        {/* 원형 연화 좌대 기둥 */}
        <mesh position={[0, 0.28, 0]} castShadow material={bronzeMaterial}>
          <cylinderGeometry args={[0.48, 0.58, 0.52, 24]} />
        </mesh>
        {/* 흘러내리는 옷자락 (치락) 주름 디테일 */}
        {[-0.25, -0.1, 0.05, 0.2].map((x, i) => (
          <mesh
            key={i}
            position={[x, 0.2, 0.44 + (i % 2) * 0.04]}
            rotation={[0.15, 0, (i - 1.5) * 0.1]}
            castShadow
            material={bronzeMaterial}
          >
            <cylinderGeometry args={[0.08, 0.12, 0.42, 10]} />
          </mesh>
        ))}

        {/* ========================================================
            3. 하체 & 반가좌 다리 (Pensive Cross-legged Pose)
           ======================================================== */}
        {/* 왼다리: 좌대 아래로 수직으로 자연스럽게 내림 */}
        <group position={[-0.14, 0.35, 0.25]}>
          <mesh position={[0, -0.18, 0]} rotation={[0.2, 0, 0]} castShadow material={bronzeMaterial}>
            <cylinderGeometry args={[0.11, 0.12, 0.42, 14]} />
          </mesh>
          {/* 왼발 (작은 연화 족좌 위에 닿음) */}
          <mesh position={[0, -0.4, 0.08]} castShadow material={bronzeMaterial}>
            <boxGeometry args={[0.12, 0.09, 0.22]} />
          </mesh>
        </group>

        {/* 오른다리: 왼무릎 위에 수평으로 반가(半跏)로 얹음 */}
        <group position={[0.08, 0.52, 0.15]}>
          {/* 허벅지에서 무릎 (수평으로 꺾임) */}
          <mesh position={[0.12, 0.02, 0.08]} rotation={[0, 0.3, -1.35]} castShadow material={bronzeMaterial}>
            <cylinderGeometry args={[0.12, 0.13, 0.48, 14]} />
          </mesh>
          {/* 오른쪽 정강이 (왼쪽 무릎 위에 얹히는 수평 라인) */}
          <mesh position={[-0.1, 0.15, 0.2]} rotation={[0, -0.2, 1.4]} castShadow material={bronzeMaterial}>
            <cylinderGeometry args={[0.1, 0.11, 0.46, 14]} />
          </mesh>
          {/* 오른쪽 발: 왼무릎 위에 살포시 얹힌 발가락 라인 */}
          <mesh position={[-0.32, 0.18, 0.28]} rotation={[0.3, 0.5, 0]} castShadow material={bronzeMaterial}>
            <boxGeometry args={[0.11, 0.08, 0.2]} />
          </mesh>
        </group>

        {/* ========================================================
            4. 날씬하고 우아한 상체 & 팔 동작 (Torso & Arms)
           ======================================================== */}
        <group position={[0, 0.62, 0]}>
          {/* 늘씬하고 부드러운 허리 곡선의 나체 상체 */}
          <mesh position={[0, 0.35, 0]} castShadow material={bronzeMaterial}>
            <cylinderGeometry args={[0.22, 0.18, 0.65, 20]} />
          </mesh>
          {/* 가슴 목걸이 (영락 장식) */}
          <mesh position={[0, 0.58, 0.12]} rotation={[0.35, 0, 0]} material={bronzeMaterial}>
            <torusGeometry args={[0.13, 0.018, 10, 20]} />
          </mesh>

          {/* 왼팔: 오른발목 위에 자연스럽게 얹은 손 */}
          <group position={[-0.24, 0.52, 0]}>
            <mesh position={[-0.04, -0.22, 0.15]} rotation={[0.5, 0.1, 0.3]} castShadow material={bronzeMaterial}>
              <cylinderGeometry args={[0.065, 0.075, 0.48, 12]} />
            </mesh>
            {/* 왼손 (오른발목을 살포시 쥔 손) */}
            <mesh position={[-0.08, -0.42, 0.28]} rotation={[0.2, 0.4, 0]} castShadow material={bronzeMaterial}>
              <sphereGeometry args={[0.065, 12, 12]} />
            </mesh>
          </group>

          {/* 오른팔: 오른무릎 위에 팔꿈치를 대고 턱/뺨을 괴는 상징적 사유의 팔 */}
          <group position={[0.24, 0.52, 0]}>
            {/* 상완 (어깨에서 무릎 위의 팔꿈치로 비스듬히 내려옴) */}
            <mesh position={[0.04, -0.22, 0.16]} rotation={[0.65, -0.2, -0.4]} castShadow material={bronzeMaterial}>
              <cylinderGeometry args={[0.07, 0.075, 0.46, 12]} />
            </mesh>
            {/* 팔꿈치 관절: 오른무릎 위에 얹힘 */}
            <mesh position={[0.16, -0.4, 0.28]} castShadow material={bronzeMaterial}>
              <sphereGeometry args={[0.07, 12, 12]} />
            </mesh>
            {/* 전완 (팔꿈치에서 볼/턱으로 대각선으로 올라감) */}
            <mesh position={[0.08, -0.15, 0.26]} rotation={[-0.9, 0.3, 0.35]} castShadow material={bronzeMaterial}>
              <cylinderGeometry args={[0.06, 0.07, 0.44, 12]} />
            </mesh>
            {/* 오른손 (뺨/턱에 살짝 대고 있는 두세 손가락 실루엣) */}
            <mesh position={[0.02, 0.08, 0.22]} rotation={[0.2, 0.3, -0.2]} castShadow material={bronzeMaterial}>
              <sphereGeometry args={[0.06, 12, 12]} />
            </mesh>
          </group>

          {/* ========================================================
              5. 두상, 삼산관(관모) & 사유의 미소 (Head & Crown)
             ======================================================== */}
          {/* 살짝 오른쪽 아래를 향해 고요히 숙인 머리 */}
          <group position={[0, 0.82, 0.04]} rotation={[0.08, -0.12, -0.06]}>
            {/* 둥글고 온화한 머리 */}
            <mesh position={[0, 0, 0]} castShadow material={bronzeMaterial}>
              <sphereGeometry args={[0.18, 24, 24]} />
            </mesh>

            {/* 삼산관 (간결하고 우아한 삼엽형 보관) */}
            <group position={[0, 0.16, 0]}>
              {/* 관 띠 */}
              <mesh position={[0, 0, 0]} material={bronzeMaterial}>
                <cylinderGeometry args={[0.185, 0.185, 0.06, 24]} />
              </mesh>
              {/* 가운데 솟은 꽃봉오리 보관 */}
              <mesh position={[0, 0.08, 0.08]} rotation={[0.2, 0, 0]} material={bronzeMaterial}>
                <coneGeometry args={[0.08, 0.16, 12]} />
              </mesh>
              {/* 좌우 삼산관 날개 */}
              <mesh position={[-0.1, 0.06, 0.06]} rotation={[0.1, 0, 0.3]} material={bronzeMaterial}>
                <coneGeometry args={[0.06, 0.12, 10]} />
              </mesh>
              <mesh position={[0.1, 0.06, 0.06]} rotation={[0.1, 0, -0.3]} material={bronzeMaterial}>
                <coneGeometry args={[0.06, 0.12, 10]} />
              </mesh>
            </group>

            {/* 길게 늘어진 부처의 귓불 */}
            <mesh position={[-0.17, -0.04, 0]} rotation={[0, 0, -0.15]} material={bronzeMaterial}>
              <cylinderGeometry args={[0.025, 0.03, 0.14, 8]} />
            </mesh>
            <mesh position={[0.17, -0.04, 0]} rotation={[0, 0, 0.15]} material={bronzeMaterial}>
              <cylinderGeometry args={[0.025, 0.03, 0.14, 8]} />
            </mesh>

            {/* 어깨 위로 드리운 보발 (땋은 머리카락 줄기) */}
            <mesh position={[-0.16, -0.16, -0.04]} rotation={[0.2, 0, 0]} material={bronzeMaterial}>
              <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
            </mesh>
            <mesh position={[0.16, -0.16, -0.04]} rotation={[0.2, 0, 0]} material={bronzeMaterial}>
              <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
            </mesh>

            {/* 지그시 감은 눈과 온화한 입술 미소 음각 */}
            <mesh position={[-0.05, 0.01, 0.16]} rotation={[0.1, -0.1, 0]}>
              <boxGeometry args={[0.04, 0.01, 0.02]} />
              <meshBasicMaterial color="#1a221e" />
            </mesh>
            <mesh position={[0.05, 0.01, 0.16]} rotation={[0.1, 0.1, 0]}>
              <boxGeometry args={[0.04, 0.01, 0.02]} />
              <meshBasicMaterial color="#1a221e" />
            </mesh>
            {/* 입가에 머금은 온화한 미소 */}
            <mesh position={[0, -0.07, 0.16]} rotation={[0.1, 0, 0]}>
              <boxGeometry args={[0.045, 0.01, 0.02]} />
              <meshBasicMaterial color="#1f2824" />
            </mesh>
          </group>
        </group>
      </group>

      {/* ========================================================
          6. 사진 속 황금빛 일산(갓등) 폴대 & 캐노피 (Canopy Halo)
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
        {/* 반가사유상을 위에서 따뜻하게 비추는 호롱/광배 조명 */}
        <pointLight
          ref={haloLightRef}
          position={[0, -0.15, 0]}
          color="#fde047"
          intensity={0.85}
          distance={4.8}
          decay={2}
        />
      </group>

      {/* ========================================================
          7. 사진 속 측면 작은 노란색 다도/소품 선반 & 램프 (Side Stand)
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
