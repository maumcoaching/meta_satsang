import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sound } from '../audio/SoundEffects';
import { IncenseSmoke } from './IncenseSmoke';

export const TempleDeck: React.FC = () => {
  const bellRef = useRef<THREE.Group>(null);
  const lanternLightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // 1. 바람에 살랑이는 풍경(종) 흔들림
    if (bellRef.current) {
      bellRef.current.rotation.z = Math.sin(time * 1.5) * 0.04;
      bellRef.current.rotation.x = Math.cos(time * 1.2) * 0.03;
    }

    // 2. 석등 불빛의 따뜻한 깜빡임
    if (lanternLightRef.current) {
      lanternLightRef.current.intensity = 1.6 + Math.sin(time * 6) * 0.2 + Math.cos(time * 14) * 0.1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. 기단 (석조 돌받침대) */}
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[8.4, 0.4, 6.4]} />
        <meshStandardMaterial color="#8c827a" roughness={0.9} />
      </mesh>

      {/* 2. 대청마루 (원목 나무 바닥) */}
      <mesh position={[0, 0.42, 0]} receiveShadow>
        <boxGeometry args={[8.0, 0.06, 6.0]} />
        <meshStandardMaterial color="#6a4a36" roughness={0.7} />
      </mesh>

      {/* 대청마루 원목 널판 이음매 디테일 라인들 */}
      {[-2, -1, 0, 1, 2].map((z) => (
        <mesh key={z} position={[0, 0.455, z]} receiveShadow>
          <boxGeometry args={[7.95, 0.005, 0.02]} />
          <meshBasicMaterial color="#422e22" />
        </mesh>
      ))}

      {/* 3. 기둥들 (한옥 전통 원목 둥근 기둥 6개) */}
      {[
        [-3.6, -2.6],
        [0, -2.6],
        [3.6, -2.6],
        [-3.6, 2.6],
        [0, 2.6],
        [3.6, 2.6],
      ].map(([x, z], idx) => (
        <group key={idx} position={[x, 0.45, z]}>
          {/* 주초 (기둥 받침돌) */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.35, 0.16, 16]} />
            <meshStandardMaterial color="#7a736c" roughness={0.9} />
          </mesh>
          {/* 원목 기둥 */}
          <mesh position={[0, 1.45, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.24, 2.6, 16]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          {/* 단청 상단 공포/장식 */}
          <mesh position={[0, 2.8, 0]} castShadow>
            <boxGeometry args={[0.65, 0.2, 0.65]} />
            <meshStandardMaterial color="#0f766e" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* 4. 대들보 및 처마 프레임 (대공/도리) */}
      <mesh position={[0, 3.25, 0]} castShadow>
        <boxGeometry args={[8.2, 0.25, 6.2]} />
        <meshStandardMaterial color="#991b1b" roughness={0.7} />
      </mesh>

      {/* 5. 한옥 기와 지붕 (우아한 처마 곡선) */}
      <group position={[0, 3.8, 0]}>
        {/* 본 지붕 경사면 */}
        <mesh position={[0, 0.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[5.6, 1.2, 4]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
        {/* 용마루 (지붕 꼭대기 기와 능선) */}
        <mesh position={[0, 1.05, 0]} castShadow>
          <boxGeometry args={[6.2, 0.2, 0.45]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
      </group>

      {/* 6. 풍경(처마에 달린 종) - 클릭하면 맑은 종소리 연주 */}
      <group
        ref={bellRef}
        position={[3.8, 3.1, 2.8]}
        onClick={(e) => {
          e.stopPropagation();
          sound.playSingingBowl();
        }}
      >
        {/* 줄 */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.4, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* 청동 종 */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.14, 0.2, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* 물고기 모양 풍경판 (바람에 흔들리는 얇은 청동 판) */}
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.08, 0.22, 0.01]} />
          <meshStandardMaterial color="#b45309" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* 7. 명상 방석 (좌복 3개) - 클릭하면 목탁 소리와 함께 마음 정돈 */}
      {[-1.6, 0, 1.6].map((x, i) => (
        <group
          key={i}
          position={[x, 0.46, -0.8]}
          onClick={(e) => {
            e.stopPropagation();
            sound.playMoktak();
          }}
        >
          <mesh receiveShadow castShadow>
            <cylinderGeometry args={[0.45, 0.48, 0.08, 20]} />
            <meshStandardMaterial color={i === 1 ? '#991b1b' : '#374151'} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* 8. 향로와 작은 다도 탁자 (Incense burner & table) */}
      <group position={[0, 0.46, 0.8]}>
        {/* 작은 목재 경상/탁자 */}
        <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.9, 0.24, 0.5]} />
          <meshStandardMaterial color="#451a03" roughness={0.6} />
        </mesh>

        {/* 놋쇠 향로 */}
        <group
          position={[0, 0.3, 0]}
          onClick={(e) => {
            e.stopPropagation();
            sound.playSingingBowl();
          }}
        >
          <mesh castShadow>
            <cylinderGeometry args={[0.12, 0.08, 0.12, 16]} />
            <meshStandardMaterial color="#eab308" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* 타오르는 향 심지 */}
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.16, 8]} />
            <meshBasicMaterial color="#b91c1c" />
          </mesh>
          {/* 극사실적 가우시안 향 연기 & 은은한 불씨 */}
          <IncenseSmoke />
        </group>
      </group>

      {/* 9. 석등 (Stone Lantern) - 대청마루 진입로 옆 */}
      <group position={[4.6, 0, 3.6]}>
        {/* 하대석 (받침) */}
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 0.4, 0.8]} />
          <meshStandardMaterial color="#78716c" roughness={0.9} />
        </mesh>
        {/* 간주석 (가운데 기둥) */}
        <mesh position={[0, 0.75, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.2, 0.7, 12]} />
          <meshStandardMaterial color="#78716c" roughness={0.9} />
        </mesh>
        {/* 화사석 (불 켜는 등실) */}
        <mesh position={[0, 1.35, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.5, 8, 1, true]} />
          <meshStandardMaterial color="#57534e" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
        {/* 석등 지붕 (옥개석) */}
        <mesh position={[0, 1.75, 0]} castShadow>
          <coneGeometry args={[0.65, 0.35, 8]} />
          <meshStandardMaterial color="#44403c" roughness={0.9} />
        </mesh>
        {/* 석등 내부 호롱불 광원 */}
        <pointLight
          ref={lanternLightRef}
          position={[0, 1.35, 0]}
          color="#ffb703"
          intensity={1.8}
          distance={8}
          decay={2}
          castShadow
        />
        {/* 은은한 촛불 구체 */}
        <mesh position={[0, 1.35, 0]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial color="#ffa200" />
        </mesh>
      </group>
    </group>
  );
};
