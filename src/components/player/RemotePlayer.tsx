import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RemotePlayer as RemotePlayerType } from '../multiplayer/MultiplayerService';

interface Props {
  player: RemotePlayerType;
}

export const RemotePlayer: React.FC<Props> = ({ player }) => {
  const group = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const BASE_BODY_Y = 0.66;
  const currentPos = useRef(new THREE.Vector3(player.x, player.y, player.z));
  const currentRot = useRef(player.rot);

  useFrame((state, delta) => {
    if (!group.current) return;

    // 1. 위치 및 회전 부드러운 네트워크 보간 (Lerp)
    currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, player.targetX, delta * 12);
    currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, player.targetY, delta * 12);
    currentPos.current.z = THREE.MathUtils.lerp(currentPos.current.z, player.targetZ, delta * 12);

    let diff = player.targetRot - currentRot.current;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    currentRot.current += diff * Math.min(1, delta * 15);

    group.current.position.copy(currentPos.current);
    group.current.rotation.y = currentRot.current;

    // 2. 애니메이션 (좌선 / 합장 / 걷기 / 대기)
    const time = state.clock.getElapsedTime();

    if (bodyRef.current) {
      if (player.meditate) {
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, 0.32, delta * 8);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, delta * 8);
      } else if (player.bow) {
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, BASE_BODY_Y - 0.05, delta * 8);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.42, delta * 8);
      } else if (player.isMoving) {
        const walkBounce = Math.abs(Math.sin(time * 12)) * 0.04;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, BASE_BODY_Y + walkBounce, delta * 15);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.06, delta * 10);
      } else {
        const breathe = Math.sin(time * 2.5) * 0.015;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, BASE_BODY_Y + breathe, delta * 5);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, delta * 8);
      }
    }

    // 팔 애니메이션 (걷기, 합장 손모음, 좌선)
    if (leftArmRef.current && rightArmRef.current) {
      if (player.bow) {
        // 합장: 양팔을 앞으로 내밀고 손을 가슴 앞으로 모음
        leftArmRef.current.position.set(
          THREE.MathUtils.lerp(leftArmRef.current.position.x, -0.10, delta * 15),
          THREE.MathUtils.lerp(leftArmRef.current.position.y, 0.16, delta * 15),
          THREE.MathUtils.lerp(leftArmRef.current.position.z, 0.20, delta * 15)
        );
        rightArmRef.current.position.set(
          THREE.MathUtils.lerp(rightArmRef.current.position.x, 0.10, delta * 15),
          THREE.MathUtils.lerp(rightArmRef.current.position.y, 0.16, delta * 15),
          THREE.MathUtils.lerp(rightArmRef.current.position.z, 0.20, delta * 15)
        );
        leftArmRef.current.rotation.set(1.15, 0.45, -0.65);
        rightArmRef.current.rotation.set(1.15, -0.45, 0.65);
      } else if (player.meditate) {
        // 좌선: 단전에 두 손을 모음
        leftArmRef.current.position.set(
          THREE.MathUtils.lerp(leftArmRef.current.position.x, -0.09, delta * 12),
          THREE.MathUtils.lerp(leftArmRef.current.position.y, 0.04, delta * 12),
          THREE.MathUtils.lerp(leftArmRef.current.position.z, 0.16, delta * 12)
        );
        rightArmRef.current.position.set(
          THREE.MathUtils.lerp(rightArmRef.current.position.x, 0.09, delta * 12),
          THREE.MathUtils.lerp(rightArmRef.current.position.y, 0.04, delta * 12),
          THREE.MathUtils.lerp(rightArmRef.current.position.z, 0.16, delta * 12)
        );
        leftArmRef.current.rotation.set(0.65, 0.4, 0.2);
        rightArmRef.current.rotation.set(0.65, -0.4, -0.2);
      } else if (player.isMoving) {
        // 걷기: 양팔을 옆에서 앞뒤로 시원하게 스윙
        leftArmRef.current.position.set(
          THREE.MathUtils.lerp(leftArmRef.current.position.x, -0.27, delta * 15),
          THREE.MathUtils.lerp(leftArmRef.current.position.y, 0.18, delta * 15),
          THREE.MathUtils.lerp(leftArmRef.current.position.z, 0, delta * 15)
        );
        rightArmRef.current.position.set(
          THREE.MathUtils.lerp(rightArmRef.current.position.x, 0.27, delta * 15),
          THREE.MathUtils.lerp(rightArmRef.current.position.y, 0.18, delta * 15),
          THREE.MathUtils.lerp(rightArmRef.current.position.z, 0, delta * 15)
        );
        const armSwing = Math.sin(time * 12) * 0.55;
        leftArmRef.current.rotation.set(armSwing, 0, 0.12);
        rightArmRef.current.rotation.set(-armSwing, 0, -0.12);
      } else {
        // 기본 대기: 옆에 자연스럽게 내리고 호흡에 반응
        leftArmRef.current.position.set(
          THREE.MathUtils.lerp(leftArmRef.current.position.x, -0.27, delta * 10),
          THREE.MathUtils.lerp(leftArmRef.current.position.y, 0.18, delta * 10),
          THREE.MathUtils.lerp(leftArmRef.current.position.z, 0, delta * 10)
        );
        rightArmRef.current.position.set(
          THREE.MathUtils.lerp(rightArmRef.current.position.x, 0.27, delta * 10),
          THREE.MathUtils.lerp(rightArmRef.current.position.y, 0.18, delta * 10),
          THREE.MathUtils.lerp(rightArmRef.current.position.z, 0, delta * 10)
        );
        leftArmRef.current.rotation.set(Math.sin(time * 2) * 0.04, 0, 0.12);
        rightArmRef.current.rotation.set(-Math.sin(time * 2) * 0.04, 0, -0.12);
      }
    }

    // 다리 애니메이션
    if (leftLegRef.current && rightLegRef.current) {
      if (player.meditate) {
        leftLegRef.current.position.set(-0.11, -0.22, 0);
        rightLegRef.current.position.set(0.11, -0.22, 0);
        leftLegRef.current.rotation.set(1.2, 0.5, 0.2);
        rightLegRef.current.rotation.set(1.2, -0.5, -0.2);
      } else if (player.isMoving) {
        const walkPhase = time * 12;
        const legSwing = Math.sin(walkPhase) * 0.65;
        const leftLift = Math.max(0, -Math.sin(walkPhase)) * 0.06;
        const rightLift = Math.max(0, Math.sin(walkPhase)) * 0.06;

        leftLegRef.current.position.set(-0.11, -0.25 + leftLift, 0);
        leftLegRef.current.rotation.set(-legSwing, 0, 0);

        rightLegRef.current.position.set(0.11, -0.25 + rightLift, 0);
        rightLegRef.current.rotation.set(legSwing, 0, 0);
      } else {
        leftLegRef.current.position.set(-0.11, -0.25, 0);
        rightLegRef.current.position.set(0.11, -0.25, 0);
        leftLegRef.current.rotation.set(0, 0, 0);
        rightLegRef.current.rotation.set(0, 0, 0);
      }
    }
  });

  return (
    <group ref={group}>
      {/* 머리 위 닉네임 명찰 배지 (모바일 최적화: 25% 초소형 컴팩트) */}
      <Html position={[0, 1.25, 0]} center distanceFactor={26}>
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            color: '#f8fafc',
            padding: '1px 5px',
            borderRadius: 6,
            fontSize: 9,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            lineHeight: 1.2,
          }}
        >
          <span style={{ fontSize: 8 }}>🪷</span>
          <span>{player.nickname}</span>
        </div>
      </Html>

      {/* 발밑 그림자 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.38, 24]} />
        <meshBasicMaterial color="#000000" opacity={0.3} transparent depthWrite={false} />
      </mesh>

      {/* 명상 중 오라 링 */}
      {player.meditate && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.55, 0.8, 32]} />
          <meshBasicMaterial color="#ffeaa7" opacity={0.4} transparent side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 캐릭터 본체 (모자 없는 동글동글한 동자승 머리) */}
      <group ref={bodyRef} position={[0, BASE_BODY_Y, 0]}>
        {/* 1. 동글동글한 민머리 */}
        <mesh position={[0, 0.38, 0]} castShadow>
          <sphereGeometry args={[0.24, 32, 32]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.7} />
        </mesh>

        {/* 2. 귀여운 양쪽 귀 */}
        <mesh position={[-0.23, 0.38, 0]} rotation={[0, 0, -0.2]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.7} />
        </mesh>
        <mesh position={[0.23, 0.38, 0]} rotation={[0, 0, 0.2]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.7} />
        </mesh>

        {/* 3. 눈 (온화하고 차분한 눈) */}
        <mesh position={[-0.07, 0.4, 0.21]} rotation={[0, -0.15, 0]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color="#2d3748" />
        </mesh>
        <mesh position={[0.07, 0.4, 0.21]} rotation={[0, 0.15, 0]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color="#2d3748" />
        </mesh>

        {/* 4. 연분홍 볼터치 */}
        <mesh position={[-0.13, 0.34, 0.19]}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshBasicMaterial color="#fda4af" transparent opacity={0.65} />
        </mesh>
        <mesh position={[0.13, 0.34, 0.19]}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshBasicMaterial color="#fda4af" transparent opacity={0.65} />
        </mesh>

        {/* 5. 승복 몸통 (도포 / 가사) */}
        <mesh position={[0, 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.32, 0.52, 20]} />
          <meshStandardMaterial color="#d5d0c8" roughness={0.85} />
        </mesh>

        {/* 6. 붉은 가사 띠 */}
        <mesh position={[0, 0.04, 0.02]} rotation={[0, 0, -0.45]}>
          <torusGeometry args={[0.24, 0.045, 12, 24, Math.PI * 1.3]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.8} />
        </mesh>

        {/* 7. 단주 / 염주 */}
        <mesh position={[0, 0.18, 0.14]} rotation={[0.4, 0, 0]}>
          <torusGeometry args={[0.12, 0.02, 12, 20]} />
          <meshStandardMaterial color="#78350f" roughness={0.6} />
        </mesh>

        {/* 8. 왼팔 (가사 소매와 뚜렷한 손) */}
        <group ref={leftArmRef} position={[-0.27, 0.18, 0]}>
          <mesh position={[0, -0.13, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.08, 0.26, 12]} />
            <meshStandardMaterial color="#c5beba" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.26, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.025, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.31, 0.01]} castShadow>
            <boxGeometry args={[0.07, 0.085, 0.04]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.7} />
          </mesh>
        </group>

        {/* 9. 오른팔 (가사 소매와 뚜렷한 손) */}
        <group ref={rightArmRef} position={[0.27, 0.18, 0]}>
          <mesh position={[0, -0.13, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.08, 0.26, 12]} />
            <meshStandardMaterial color="#c5beba" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.26, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.025, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.31, 0.01]} castShadow>
            <boxGeometry args={[0.07, 0.085, 0.04]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.7} />
          </mesh>
        </group>

        {/* 10. 합장 시 가슴 앞에 마주 모아진 두 손 (Hapjang Prayer Palms) */}
        {player.bow && (
          <group position={[0, 0.18, 0.24]} rotation={[0.25, 0, 0]}>
            <mesh position={[-0.016, 0, 0]} rotation={[0, 0, 0.08]}>
              <boxGeometry args={[0.024, 0.11, 0.065]} />
              <meshStandardMaterial color="#fed7aa" roughness={0.7} />
            </mesh>
            <mesh position={[0.016, 0, 0]} rotation={[0, 0, -0.08]}>
              <boxGeometry args={[0.024, 0.11, 0.065]} />
              <meshStandardMaterial color="#fed7aa" roughness={0.7} />
            </mesh>
          </group>
        )}

        {/* 10. 왼다리 & 고무신 */}
        <group ref={leftLegRef} position={[-0.11, -0.25, 0]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.07, 0.30, 12]} />
            <meshStandardMaterial color="#a8a29e" roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.36, 0.03]} castShadow>
            <boxGeometry args={[0.11, 0.08, 0.20]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.34, 0.13]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
        </group>

        {/* 11. 오른다리 & 고무신 */}
        <group ref={rightLegRef} position={[0.11, -0.25, 0]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.07, 0.30, 12]} />
            <meshStandardMaterial color="#a8a29e" roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.36, 0.03]} castShadow>
            <boxGeometry args={[0.11, 0.08, 0.20]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.34, 0.13]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
