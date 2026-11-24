import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { sound } from '../audio/SoundEffects';
import { sharedControls } from '../player/usePlayerControls';
import { IncenseSmoke } from './IncenseSmoke';

const INCENSE_BURN_DURATION = 180; // 3분 (180초)
const LIGHTING_ANIM_DURATION = 2.8; // 촛불에 불 붙여 향로에 꽂는 애니메이션 시간 (2.8초)

export const TempleDeck: React.FC = () => {
  const bellRef = useRef<THREE.Group>(null);
  const lanternLightRef = useRef<THREE.PointLight>(null);

  // 헌향(향 피우기) 상태 및 애니메이션 레퍼런스
  const [isNearAltar, setIsNearAltar] = useState(false);
  const [incenseStage, setIncenseStage] = useState<'idle' | 'lighting' | 'burning'>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(INCENSE_BURN_DURATION);

  const nearAltarRef = useRef(false);
  const incenseStageRef = useRef<'idle' | 'lighting' | 'burning'>('idle');
  const incenseElapsedRef = useRef(0);
  const lastReportedSecRef = useRef(INCENSE_BURN_DURATION);

  const activeStickGroupRef = useRef<THREE.Group>(null);
  const stickMeshRef = useRef<THREE.Mesh>(null);
  const stickFlameRef = useRef<THREE.Group>(null);
  const smokeWrapperRef = useRef<THREE.Group>(null);

  // 헌향 버튼 클릭 핸들러
  const handleOfferIncense = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sound.playSingingBowl();

    // 캐릭터가 불단을 향해 정성스럽게 합장 인사하도록 유도 (2.6초간)
    sharedControls.bow = true;
    sharedControls.meditate = false;
    window.setTimeout(() => {
      sharedControls.bow = false;
    }, 2600);

    incenseElapsedRef.current = 0;
    incenseStageRef.current = 'lighting';
    setIncenseStage('lighting');
    lastReportedSecRef.current = INCENSE_BURN_DURATION;
    setRemainingSeconds(INCENSE_BURN_DURATION);
  };

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. 처마 끝 풍경(종)의 미세한 자연 흔들림
    if (bellRef.current) {
      bellRef.current.rotation.z = Math.sin(time * 1.5) * 0.04;
      bellRef.current.rotation.x = Math.cos(time * 1.2) * 0.03;
    }

    // 2. 석등 불빛 깜빡임
    if (lanternLightRef.current) {
      lanternLightRef.current.intensity = 1.4 + Math.sin(time * 6) * 0.15 + Math.cos(time * 13) * 0.1;
    }

    // 3. 불단(향로: x=0, z=-5.4) 근처 접근 감지 (반경 3.8m 이내일 때 '헌향' 버튼 표시)
    const distToAltar = Math.hypot(sharedControls.playerX - 0, sharedControls.playerZ - (-4.8));
    const isNear = distToAltar <= 3.8;
    if (isNear !== nearAltarRef.current) {
      nearAltarRef.current = isNear;
      setIsNearAltar(isNear);
    }

    // 4. 헌향 애니메이션 (불 붙이기 -> 향로에 꽂기 -> 3분간 타오르기)
    if (incenseStageRef.current === 'lighting') {
      incenseElapsedRef.current += delta;
      const t = incenseElapsedRef.current;

      if (activeStickGroupRef.current && stickMeshRef.current && stickFlameRef.current) {
        stickMeshRef.current.scale.set(1, 1, 1);
        stickMeshRef.current.position.set(0, 0.11, 0);

        if (t < 0.85) {
          // [단계 A] 0.0~0.85초: 좌측 향통(-0.42, 1.08, 0.25)에서 우측 촛불(0.95, 1.28, 0.2)로 향을 가져감
          const p = THREE.MathUtils.smoothstep(t / 0.85, 0, 1);
          activeStickGroupRef.current.position.set(
            THREE.MathUtils.lerp(-0.42, 0.95, p),
            THREE.MathUtils.lerp(1.08, 1.28, p),
            THREE.MathUtils.lerp(0.25, 0.20, p)
          );
          // 향 끝이 우측 촛불(x=1.1, y=1.41, z=0.18)에 닿도록 비스듬히 기울임
          activeStickGroupRef.current.rotation.set(0, 0, THREE.MathUtils.lerp(0, -0.78, p));
          stickFlameRef.current.visible = false;
        } else if (t < 1.75) {
          // [단계 B] 0.85~1.75초: 촛불에서 향 끝에 불꽃이 타오르며 점화됨
          activeStickGroupRef.current.position.set(0.95, 1.28, 0.20);
          activeStickGroupRef.current.rotation.set(0, 0, -0.78);
          stickFlameRef.current.visible = true;
          const flicker = 0.9 + Math.sin(time * 28) * 0.25;
          stickFlameRef.current.scale.set(flicker, flicker * 1.2, flicker);
        } else if (t < 2.35) {
          // [단계 C] 1.75~2.35초: 불 붙은 향을 들어 올려 향로 정중앙 위(0, 1.24, 0.2)로 옮기며 수직으로 세움
          const p = THREE.MathUtils.smoothstep((t - 1.75) / 0.6, 0, 1);
          activeStickGroupRef.current.position.set(
            THREE.MathUtils.lerp(0.95, 0, p),
            THREE.MathUtils.lerp(1.28, 1.24, p) + Math.sin(p * Math.PI) * 0.08,
            THREE.MathUtils.lerp(0.20, 0.20, p)
          );
          activeStickGroupRef.current.rotation.set(0, 0, THREE.MathUtils.lerp(-0.78, 0, p));
          stickFlameRef.current.visible = true;
          const fadeFlame = 1.0 - p * 0.4;
          stickFlameRef.current.scale.set(fadeFlame, fadeFlame, fadeFlame);
        } else if (t < LIGHTING_ANIM_DURATION) {
          // [단계 D] 2.35~2.8초: 향로 재(향재) 속으로 정성스럽게 수직으로 꽂음
          const p = THREE.MathUtils.smoothstep((t - 2.35) / (LIGHTING_ANIM_DURATION - 2.35), 0, 1);
          activeStickGroupRef.current.position.set(0, THREE.MathUtils.lerp(1.24, 1.02, p), 0.20);
          activeStickGroupRef.current.rotation.set(0, 0, 0);
          stickFlameRef.current.visible = p < 0.7;
        } else {
          // 꽂기 완료 -> 3분(180초) 연소 단계로 전환
          activeStickGroupRef.current.position.set(0, 1.02, 0.20);
          activeStickGroupRef.current.rotation.set(0, 0, 0);
          stickFlameRef.current.visible = false;
          incenseElapsedRef.current = 0;
          incenseStageRef.current = 'burning';
          setIncenseStage('burning');
        }
      }
    } else if (incenseStageRef.current === 'burning') {
      incenseElapsedRef.current += delta;
      const burnTime = incenseElapsedRef.current;

      if (burnTime >= INCENSE_BURN_DURATION) {
        // 3분(180초) 경과 시 향이 다 타고 종료됨
        incenseStageRef.current = 'idle';
        setIncenseStage('idle');
      } else {
        // 3분 동안 향이 서서히 짧아지며 불씨와 연기도 함께 내려감
        const burnProgress = burnTime / INCENSE_BURN_DURATION; // 0.0 ~ 1.0
        const remainRatio = 1.0 - burnProgress * 0.82; // 1.0 -> 0.18

        if (stickMeshRef.current) {
          stickMeshRef.current.scale.set(1, remainRatio, 1);
          stickMeshRef.current.position.set(0, 0.11 * remainRatio, 0);
        }
        if (smokeWrapperRef.current) {
          // IncenseSmoke 기본 불씨 높이(y=0.22)를 현재 줄어든 향 끝 위치(0.22 * remainRatio)에 맞춤
          smokeWrapperRef.current.position.set(0, -0.22 * (1.0 - remainRatio), 0);
        }

        const remSec = Math.max(0, Math.ceil(INCENSE_BURN_DURATION - burnTime));
        if (remSec !== lastReportedSecRef.current) {
          lastReportedSecRef.current = remSec;
          setRemainingSeconds(remSec);
        }
      }
    }
  });

  // =========================================================================
  // 30장 좌복 (6열 x 5행) 좌표 생성
  // 중앙 통로(어도: 폭 3m)를 기준으로 좌우 3열씩, 절(배례)하기에 넉넉한 1.8m 행간 간격
  // =========================================================================
  const cushions = useMemo(() => {
    const list: { x: number; z: number; color: string; id: number }[] = [];
    const colX = [-4.6, -3.1, -1.6, 1.6, 3.1, 4.6]; // 6열
    const rowZ = [3.8, 2.0, 0.2, -1.6, -3.4];        // 5행 (절하기 넉넉한 1.8m 간격)
    const colors = ['#7f1d1d', '#1e293b', '#854d0e', '#7f1d1d', '#1e293b', '#854d0e'];

    let count = 0;
    for (let r = 0; r < rowZ.length; r++) {
      for (let c = 0; c < colX.length; c++) {
        list.push({
          x: colX[c],
          z: rowZ[r],
          color: colors[(r + c) % colors.length],
          id: count++,
        });
      }
    }
    return list;
  }, []);

  // 전통 목재 및 석조 재질 캐싱
  const woodPillarMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#6a381f', roughness: 0.8 }),
    []
  );
  const wallWoodMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#4a2511', roughness: 0.85 }),
    []
  );
  const hanjiMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#fefce8', roughness: 0.5, transparent: true, opacity: 0.92 }),
    []
  );
  const stoneBaseMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#857c74', roughness: 0.95 }),
    []
  );
  const roofTileMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#27303f', roughness: 0.65 }),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* ===================================================================
          1. 대형 화강암 기단 (석조 바닥 받침대: 폭 14.4m x 깊이 14.0m)
         =================================================================== */}
      <mesh position={[0, 0.22, -0.3]} receiveShadow castShadow material={stoneBaseMaterial}>
        <boxGeometry args={[14.4, 0.44, 14.0]} />
      </mesh>

      {/* 앞마당에서 법당으로 오르는 2단 돌계단 (전면 입구) */}
      <mesh position={[0, 0.15, 6.9]} receiveShadow castShadow material={stoneBaseMaterial}>
        <boxGeometry args={[4.8, 0.3, 1.4]} />
      </mesh>

      {/* ===================================================================
          2. 대청마루 (원목 마루 바닥: 폭 13.6m x 깊이 13.2m, 높이 0.45m)
         =================================================================== */}
      <mesh position={[0, 0.45, -0.3]} receiveShadow>
        <boxGeometry args={[13.6, 0.06, 13.2]} />
        <meshStandardMaterial color="#54311c" roughness={0.7} />
      </mesh>

      {/* 마루 널판 줄눈 라인들 */}
      {[-5, -3.5, -2, -0.5, 1, 2.5, 4].map((z) => (
        <mesh key={z} position={[0, 0.485, z]} receiveShadow>
          <boxGeometry args={[13.5, 0.005, 0.02]} />
          <meshBasicMaterial color="#351d10" />
        </mesh>
      ))}

      {/* ===================================================================
          3. 기둥들 (한옥 전통 배흘림 둥근 기둥 12개)
         =================================================================== */}
      {[
        // 좌측 벽 라인
        [-6.5, -6.5], [-6.5, -2.2], [-6.5, 2.2], [-6.5, 6.2],
        // 우측 벽 라인
        [6.5, -6.5], [6.5, -2.2], [6.5, 2.2], [6.5, 6.2],
        // 전면 및 후면 중앙 기둥
        [-2.2, -6.5], [2.2, -6.5], [-2.2, 6.2], [2.2, 6.2],
      ].map(([x, z], idx) => (
        <group key={idx} position={[x, 0.45, z]}>
          {/* 주초 (기둥 받침돌) */}
          <mesh position={[0, 0.08, 0]} castShadow material={stoneBaseMaterial}>
            <cylinderGeometry args={[0.32, 0.38, 0.16, 16]} />
          </mesh>
          {/* 원목 기둥 */}
          <mesh position={[0, 1.8, 0]} castShadow material={woodPillarMaterial}>
            <cylinderGeometry args={[0.22, 0.25, 3.4, 16]} />
          </mesh>
          {/* 단청 공포 장식 */}
          <mesh position={[0, 3.55, 0]} castShadow>
            <boxGeometry args={[0.65, 0.22, 0.65]} />
            <meshStandardMaterial color="#0f766e" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* ===================================================================
          4. 뒷쪽 벽 (North Wall: z = -6.65, 닫힌 전통 목재 및 창호 벽체)
         =================================================================== */}
      <group position={[0, 0.45, -6.6]}>
        {/* 하단 목재 머름벽 */}
        <mesh position={[0, 0.6, 0]} receiveShadow material={wallWoodMaterial}>
          <boxGeometry args={[13.2, 1.2, 0.15]} />
        </mesh>
        {/* 상단 벽체 (창호살 격자벽) */}
        <mesh position={[0, 2.3, 0]} receiveShadow material={hanjiMaterial}>
          <boxGeometry args={[13.2, 2.2, 0.08]} />
        </mesh>
        {/* 격자 목재 프레임 */}
        {[-4.4, -2.2, 0, 2.2, 4.4].map((x) => (
          <mesh key={x} position={[x, 2.3, 0.05]} material={wallWoodMaterial}>
            <boxGeometry args={[0.1, 2.2, 0.05]} />
          </mesh>
        ))}
      </group>

      {/* ===================================================================
          5. 좌측 및 우측 벽면 (Side Walls: x = -6.6 및 x = +6.6, 닫힌 벽체)
         =================================================================== */}
      {/* 좌측 벽 (x = -6.6) */}
      <group position={[-6.6, 0.45, -0.2]}>
        <mesh position={[0, 0.6, 0]} receiveShadow material={wallWoodMaterial}>
          <boxGeometry args={[0.15, 1.2, 12.8]} />
        </mesh>
        <mesh position={[0, 2.3, 0]} receiveShadow material={hanjiMaterial}>
          <boxGeometry args={[0.08, 2.2, 12.8]} />
        </mesh>
        {[-4.2, -2.1, 0, 2.1, 4.2].map((z) => (
          <mesh key={z} position={[0.05, 2.3, z]} material={wallWoodMaterial}>
            <boxGeometry args={[0.05, 2.2, 0.1]} />
          </mesh>
        ))}
      </group>

      {/* 우측 벽 (x = +6.6) */}
      <group position={[6.6, 0.45, -0.2]}>
        <mesh position={[0, 0.6, 0]} receiveShadow material={wallWoodMaterial}>
          <boxGeometry args={[0.15, 1.2, 12.8]} />
        </mesh>
        <mesh position={[0, 2.3, 0]} receiveShadow material={hanjiMaterial}>
          <boxGeometry args={[0.08, 2.2, 12.8]} />
        </mesh>
        {[-4.2, -2.1, 0, 2.1, 4.2].map((z) => (
          <mesh key={z} position={[-0.05, 2.3, z]} material={wallWoodMaterial}>
            <boxGeometry args={[0.05, 2.2, 0.1]} />
          </mesh>
        ))}
      </group>

      {/* ===================================================================
          6. 앞쪽 벽 및 문 (Front / South Facade: z = 6.2)
             - 좌우 양쪽은 닫힌 창호벽
             - 중앙 2칸(폭 3.6m)은 방문객을 맞이하도록 활짝 열린 전통 분합문
         =================================================================== */}
      <group position={[0, 0.45, 6.2]}>
        {/* 문지방 (하단 목재 턱) */}
        <mesh position={[0, 0.06, 0]} material={wallWoodMaterial}>
          <boxGeometry args={[13.2, 0.12, 0.22]} />
        </mesh>
        {/* 문 상단 인방 및 서까래 보 */}
        <mesh position={[0, 3.4, 0]} material={wallWoodMaterial}>
          <boxGeometry args={[13.2, 0.22, 0.25]} />
        </mesh>

        {/* 좌측 고정 창호벽 (x: -6.5 ~ -2.2) */}
        <group position={[-4.4, 0, 0]}>
          <mesh position={[0, 0.6, 0]} material={wallWoodMaterial}>
            <boxGeometry args={[4.2, 1.2, 0.12]} />
          </mesh>
          <mesh position={[0, 2.2, 0]} material={hanjiMaterial}>
            <boxGeometry args={[4.2, 2.0, 0.06]} />
          </mesh>
          {[-1.4, 0, 1.4].map((x) => (
            <mesh key={x} position={[x, 2.2, 0.04]} material={wallWoodMaterial}>
              <boxGeometry args={[0.08, 2.0, 0.04]} />
            </mesh>
          ))}
        </group>

        {/* 우측 고정 창호벽 (x: 2.2 ~ 6.5) */}
        <group position={[4.4, 0, 0]}>
          <mesh position={[0, 0.6, 0]} material={wallWoodMaterial}>
            <boxGeometry args={[4.2, 1.2, 0.12]} />
          </mesh>
          <mesh position={[0, 2.2, 0]} material={hanjiMaterial}>
            <boxGeometry args={[4.2, 2.0, 0.06]} />
          </mesh>
          {[-1.4, 0, 1.4].map((x) => (
            <mesh key={x} position={[x, 2.2, 0.04]} material={wallWoodMaterial}>
              <boxGeometry args={[0.08, 2.0, 0.04]} />
            </mesh>
          ))}
        </group>

        {/* 중앙 열린 전통 분합문 (양옆으로 활짝 접혀 열린 문짝 표현) */}
        {/* 좌측 열린 문짝 (안쪽으로 살짝 회전되어 접힘) */}
        <group position={[-1.9, 1.6, -0.4]} rotation={[0, -Math.PI / 3, 0]}>
          <mesh material={wallWoodMaterial}>
            <boxGeometry args={[1.0, 2.8, 0.06]} />
          </mesh>
          <mesh position={[0, 0.4, 0.04]} material={hanjiMaterial}>
            <planeGeometry args={[0.82, 1.8]} />
          </mesh>
        </group>
        {/* 우측 열린 문짝 (안쪽으로 살짝 회전되어 접힘) */}
        <group position={[1.9, 1.6, -0.4]} rotation={[0, Math.PI / 3, 0]}>
          <mesh material={wallWoodMaterial}>
            <boxGeometry args={[1.0, 2.8, 0.06]} />
          </mesh>
          <mesh position={[0, 0.4, -0.04]} material={hanjiMaterial}>
            <planeGeometry args={[0.82, 1.8]} />
          </mesh>
        </group>

        {/* 법당 정면 상단 전통 목재 현판 (삿상선원 / 삿상명상 법당) */}
        <group position={[0, 3.65, 0.2]}>
          <mesh castShadow>
            <boxGeometry args={[2.2, 0.55, 0.08]} />
            <meshStandardMaterial color="#1c1917" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.045]}>
            <planeGeometry args={[2.0, 0.45]} />
            <meshBasicMaterial color="#3f2e18" />
          </mesh>
          {/* 현판 금박 테두리 */}
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[2.1, 0.48, 0.01]} />
            <meshBasicMaterial color="#ca8a04" />
          </mesh>
        </group>
      </group>

      {/* ===================================================================
          7. 좌복 30장 (6열 x 5행 - 절/오체투지 공간이 확보된 정돈된 배치)
         =================================================================== */}
      {cushions.map((c) => (
        <group
          key={c.id}
          position={[c.x, 0.48, c.z]}
          onClick={(e) => {
            e.stopPropagation();
            sound.playMoktak();
          }}
        >
          {/* 하단 사각 누빔 받침 매트 (폭 0.76m x 깊이 0.76m) */}
          <mesh position={[0, 0.025, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.76, 0.05, 0.76]} />
            <meshStandardMaterial color={c.color} roughness={0.88} />
          </mesh>
          {/* 상단 둥근 명상 좌복 */}
          <mesh position={[0, 0.07, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.26, 0.28, 0.05, 20]} />
            <meshStandardMaterial color={c.color} roughness={0.92} />
          </mesh>
          {/* 좌복 테두리 금빛 누빔 스티치 라인 */}
          <mesh position={[0, 0.052, 0]}>
            <boxGeometry args={[0.72, 0.002, 0.72]} />
            <meshBasicMaterial color="#d97706" />
          </mesh>
        </group>
      ))}

      {/* ===================================================================
          8. 법당 중앙 안쪽 불단 (수미단) & 인터랙티브 헌향(향 피우기) 시스템
         =================================================================== */}
      <group position={[0, 0.45, -5.6]}>
        {/* 장엄한 3단 목조 수미단 (불단 대좌) */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[5.2, 0.84, 1.4]} />
          <meshStandardMaterial color="#3b1706" roughness={0.7} />
        </mesh>
        {/* 상단 덮개 몰딩 */}
        <mesh position={[0, 0.87, 0]} castShadow receiveShadow>
          <boxGeometry args={[5.5, 0.08, 1.55]} />
          <meshStandardMaterial color="#4a220a" roughness={0.6} />
        </mesh>

        {/* 좌측 원목 선향통 (불 붙이기 전의 향들이 꽂혀 있는 향통) */}
        <group position={[-0.42, 0.91, 0.25]}>
          <mesh position={[0, 0.06, 0]} castShadow>
            <cylinderGeometry args={[0.042, 0.046, 0.12, 14]} />
            <meshStandardMaterial color="#5c2d16" roughness={0.7} />
          </mesh>
          {[-0.012, 0, 0.012].map((ox, i) => (
            <mesh key={i} position={[ox, 0.14, (i - 1) * 0.008]} rotation={[0, 0, ox * 2.5]}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.16, 6]} />
              <meshBasicMaterial color="#991b1b" />
            </mesh>
          ))}
        </group>

        {/* 중앙 황동 향로 (평소에는 향이 없으며, '헌향' 시 향이 꽂혀 3분간 타오름) */}
        <group
          position={[0, 0.99, 0.20]}
          onClick={(e) => {
            if (incenseStage === 'idle') {
              handleOfferIncense(e);
            } else {
              e.stopPropagation();
              sound.playSingingBowl();
            }
          }}
        >
          {/* 놋쇠 향로 몸통 */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.17, 0.13, 0.16, 24]} />
            <meshStandardMaterial color="#eab308" metalness={0.78} roughness={0.25} />
          </mesh>
          {/* 향로 안쪽 고운 백회색 향재(재) */}
          <mesh position={[0, 0.072, 0]} receiveShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.02, 20]} />
            <meshStandardMaterial color="#d6d3d1" roughness={0.95} />
          </mesh>
        </group>

        {/* 헌향 진행 중(불 붙이기 -> 향로에 꽂기 -> 3분간 연소)인 향 스틱 & 불꽃 & 연기 */}
        <group
          ref={activeStickGroupRef}
          position={[0, 1.02, 0.20]}
          visible={incenseStage !== 'idle'}
        >
          {/* 타들어가는 선향 막대 (3분 동안 서서히 짧아짐) */}
          <mesh ref={stickMeshRef} position={[0, 0.11, 0]}>
            <cylinderGeometry args={[0.0055, 0.0055, 0.22, 8]} />
            <meshBasicMaterial color="#b91c1c" />
          </mesh>

          {/* 촛불에서 점화될 때 향 끝에서 타오르는 불꽃 (lighting 단계에서만 표시) */}
          <group ref={stickFlameRef} position={[0, 0.225, 0]} visible={false}>
            <mesh>
              <sphereGeometry args={[0.024, 10, 10]} />
              <meshBasicMaterial color="#f59e0b" />
            </mesh>
            <mesh position={[0, 0.01, 0]}>
              <sphereGeometry args={[0.013, 8, 8]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
            <pointLight color="#ff9500" intensity={1.1} distance={1.8} decay={2} />
          </group>

          {/* 향로에 꽂힌 뒤 3분 동안 피어오르는 붉은 불씨와 향 연기 (burning 단계에서만 표시) */}
          {incenseStage === 'burning' && (
            <group ref={smokeWrapperRef}>
              <IncenseSmoke />
            </group>
          )}
        </group>

        {/* 불단 가까이에 다가왔을 때 나타나는 '헌향' 인터랙션 버튼 */}
        {isNearAltar && (
          <Html position={[0, 1.62, 0.35]} center>
            <div style={{ pointerEvents: 'auto' }}>
              {incenseStage === 'idle' && (
                <button
                  onClick={handleOfferIncense}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 24,
                    background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
                    color: '#fef3c7',
                    border: '1.5px solid #f59e0b',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 12px rgba(245, 158, 11, 0.35)',
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "'Noto Serif KR', serif",
                    letterSpacing: 1.5,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>🕯️</span>
                  <span>헌향</span>
                </button>
              )}

              {incenseStage === 'lighting' && (
                <div
                  style={{
                    padding: '7px 16px',
                    borderRadius: 20,
                    backgroundColor: 'rgba(28, 25, 23, 0.85)',
                    color: '#fde68a',
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                  }}
                >
                  🔥 촛불에 향을 사르어 올리는 중...
                </div>
              )}

              {incenseStage === 'burning' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 14px',
                    borderRadius: 20,
                    backgroundColor: 'rgba(28, 25, 23, 0.78)',
                    backdropFilter: 'blur(4px)',
                    color: '#fef3c7',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                  }}
                >
                  <span>
                    🕯️ 향이 타오르는 중 ({Math.floor(remainingSeconds / 60)}:
                    {String(remainingSeconds % 60).padStart(2, '0')})
                  </span>
                  <button
                    onClick={handleOfferIncense}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      backgroundColor: '#78350f',
                      color: '#fde68a',
                      border: '1px solid #d97706',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    다시 헌향
                  </button>
                </div>
              )}
            </div>
          </Html>
        )}

        {/* 좌우 놋쇠 촛대 및 촛불 (우측 촛불 위치 [1.1, 1.41, 0.18]에서 향에 불을 붙임) */}
        {[-1.1, 1.1].map((cx, idx) => (
          <group key={idx} position={[cx, 0.91, 0.18]}>
            {/* 황동 촛대 */}
            <mesh position={[0, 0.15, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.1, 0.3, 14]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* 초 */}
            <mesh position={[0, 0.38, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.18, 10]} />
              <meshBasicMaterial color="#fef3c7" />
            </mesh>
            {/* 촛불 불꽃 */}
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.026, 8, 8]} />
              <meshBasicMaterial color="#f59e0b" />
            </mesh>
            <pointLight position={[0, 0.52, 0]} color="#f59e0b" intensity={0.6} distance={3.5} decay={2} />
          </group>
        ))}

        {/* 좌우 청동 다기/싱잉볼 */}
        <mesh position={[-0.72, 0.96, 0.25]} castShadow>
          <cylinderGeometry args={[0.1, 0.06, 0.1, 14]} />
          <meshStandardMaterial color="#d97706" metalness={0.75} roughness={0.3} />
        </mesh>
        <mesh position={[0.72, 0.96, 0.25]} castShadow>
          <cylinderGeometry args={[0.1, 0.06, 0.1, 14]} />
          <meshStandardMaterial color="#d97706" metalness={0.75} roughness={0.3} />
        </mesh>
      </group>

      {/* ===================================================================
          9. 한옥 기와 지붕 (웅장한 팔작지붕: 폭 15.6m x 깊이 15.2m)
         =================================================================== */}
      <group position={[0, 4.2, -0.3]}>
        {/* 대들보 및 처마 장식 보 */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[14.2, 0.35, 13.8]} />
          <meshStandardMaterial color="#881337" roughness={0.7} />
        </mesh>

        {/* 기와 지붕 본체 (사방으로 완만하게 뻗어 처마 곡선을 이루는 팔작지붕 형태) */}
        <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow material={roofTileMaterial}>
          <coneGeometry args={[11.5, 2.4, 4]} />
        </mesh>

        {/* 주 용마루 (지붕 꼭대기 능선 기와) */}
        <mesh position={[0, 2.45, 0]} castShadow material={roofTileMaterial}>
          <boxGeometry args={[11.8, 0.35, 0.55]} />
        </mesh>

        {/* 내부 아늑한 온백색 등롱 조명 (법당 내부를 따스하게 비춤) */}
        {[-3.0, 3.0].map((lx) =>
          [-2.0, 2.0].map((lz) => (
            <group key={`${lx}-${lz}`} position={[lx, -0.5, lz]}>
              <mesh>
                <cylinderGeometry args={[0.18, 0.22, 0.35, 12]} />
                <meshBasicMaterial color="#fef08a" />
              </mesh>
              <pointLight color="#fde047" intensity={0.8} distance={7.5} decay={2} />
            </group>
          ))
        )}
      </group>

      {/* ===================================================================
          10. 처마 끝 청동 풍경 (바람에 흔들리며 클릭 시 맑은 소리)
         =================================================================== */}
      <group
        ref={bellRef}
        position={[7.0, 3.8, 6.4]}
        onClick={(e) => {
          e.stopPropagation();
          sound.playSingingBowl();
        }}
      >
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.4, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.15, 0.22, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.09, 0.22, 0.01]} />
          <meshStandardMaterial color="#b45309" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* ===================================================================
          11. 법당 입구 옆 고즈넉한 석등 (Stone Lantern)
         =================================================================== */}
      <group position={[3.2, 0, 7.8]}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow material={stoneBaseMaterial}>
          <boxGeometry args={[0.8, 0.4, 0.8]} />
        </mesh>
        <mesh position={[0, 0.75, 0]} castShadow material={stoneBaseMaterial}>
          <cylinderGeometry args={[0.18, 0.2, 0.7, 12]} />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow material={stoneBaseMaterial}>
          <cylinderGeometry args={[0.35, 0.35, 0.5, 8, 1, true]} />
        </mesh>
        <mesh position={[0, 1.75, 0]} castShadow material={stoneBaseMaterial}>
          <coneGeometry args={[0.65, 0.35, 8]} />
        </mesh>
        <pointLight
          ref={lanternLightRef}
          position={[0, 1.35, 0]}
          color="#ffb703"
          intensity={1.4}
          distance={7}
          decay={2}
        />
        <mesh position={[0, 1.35, 0]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial color="#ffa200" />
        </mesh>
      </group>
    </group>
  );
};
