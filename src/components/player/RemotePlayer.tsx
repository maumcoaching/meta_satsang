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
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const openEyesRef = useRef<THREE.Group>(null);
  const closedEyesRef = useRef<THREE.Group>(null);

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

    // 팔 및 손바닥 관절 애니메이션 (걷기, 서있기, 합장 손바닥 마주대기, 좌선)
    if (
      leftArmRef.current &&
      rightArmRef.current &&
      leftForearmRef.current &&
      rightForearmRef.current &&
      leftHandRef.current &&
      rightHandRef.current
    ) {
      const k = Math.min(1, delta * 14);
      const lerpRot = (obj: THREE.Group, tx: number, ty: number, tz: number) => {
        obj.rotation.x = THREE.MathUtils.lerp(obj.rotation.x, tx, k);
        obj.rotation.y = THREE.MathUtils.lerp(obj.rotation.y, ty, k);
        obj.rotation.z = THREE.MathUtils.lerp(obj.rotation.z, tz, k);
      };
      const lerpPos = (obj: THREE.Group, tx: number, ty: number, tz: number) => {
        obj.position.x = THREE.MathUtils.lerp(obj.position.x, tx, k);
        obj.position.y = THREE.MathUtils.lerp(obj.position.y, ty, k);
        obj.position.z = THREE.MathUtils.lerp(obj.position.z, tz, k);
      };

      if (player.bow) {
        // 합장(合掌): 양팔을 가슴 앞으로 모아 팔꿈치를 굽히고 두 손바닥이 서로 마주 닿게 함
        lerpPos(leftArmRef.current, -0.20, 0.18, 0.06);
        lerpPos(rightArmRef.current, 0.20, 0.18, 0.06);
        lerpRot(leftArmRef.current, -0.75, 0, 0.28);
        lerpRot(rightArmRef.current, -0.75, 0, -0.28);
        lerpRot(leftForearmRef.current, -1.35, 0, 0.92);
        lerpRot(rightForearmRef.current, -1.35, 0, -0.92);
        lerpRot(leftHandRef.current, -0.255, 0.714, -0.786);
        lerpRot(rightHandRef.current, -0.255, -0.714, 0.786);
      } else if (player.meditate) {
        // 좌선(명상): 아랫배 단전 앞에 두 손을 가지런히 포개어 모음 (선정인)
        lerpPos(leftArmRef.current, -0.21, 0.19, 0.03);
        lerpPos(rightArmRef.current, 0.21, 0.19, 0.03);
        lerpRot(leftArmRef.current, -0.35, 0, -0.05);
        lerpRot(rightArmRef.current, -0.35, 0, 0.05);
        lerpRot(leftForearmRef.current, -0.95, 0, 0.85);
        lerpRot(rightForearmRef.current, -0.95, 0, -0.85);
        lerpRot(leftHandRef.current, 0, 0, -0.4);
        lerpRot(rightHandRef.current, 0, 0, 0.4);
      } else if (player.isMoving) {
        // 걷기: 몸통 바깥쪽으로 팔이 선명하게 보이도록 각도(-0.22 / +0.22)를 유지하며 앞뒤로 흔듦
        const armSwing = Math.sin(time * 12) * 0.55;
        lerpPos(leftArmRef.current, -0.22, 0.19, 0.02);
        lerpPos(rightArmRef.current, 0.22, 0.19, 0.02);
        lerpRot(leftArmRef.current, armSwing - 0.08, 0, -0.22);
        lerpRot(rightArmRef.current, -armSwing - 0.08, 0, 0.22);
        lerpRot(leftForearmRef.current, -0.28, 0, 0.06);
        lerpRot(rightForearmRef.current, -0.28, 0, -0.06);
        lerpRot(leftHandRef.current, 0, 0, 0);
        lerpRot(rightHandRef.current, 0, 0, 0);
      } else {
        // 서있기(대기): 몸통에 묻히지 않고 양옆으로 팔과 손이 또렷이 보이도록 자연스럽게 내림
        const breatheSwing = Math.sin(time * 2) * 0.03;
        lerpPos(leftArmRef.current, -0.22, 0.19, 0.02);
        lerpPos(rightArmRef.current, 0.22, 0.19, 0.02);
        lerpRot(leftArmRef.current, -0.08 + breatheSwing, 0, -0.22);
        lerpRot(rightArmRef.current, -0.08 - breatheSwing, 0, 0.22);
        lerpRot(leftForearmRef.current, -0.18, 0, 0.05);
        lerpRot(rightForearmRef.current, -0.18, 0, -0.05);
        lerpRot(leftHandRef.current, 0, 0, 0);
        lerpRot(rightHandRef.current, 0, 0, 0);
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

    // 귀여운 눈 깜빡임 및 합장/좌선 시 평온한 반달 눈웃음 표정 전환
    if (openEyesRef.current && closedEyesRef.current) {
      const blinkCycle = (time + 1.3) % 3.8;
      const isBlinking = blinkCycle > 3.64;
      const showClosedSmileEyes = !!player.meditate || !!player.bow || isBlinking;
      openEyesRef.current.visible = !showClosedSmileEyes;
      closedEyesRef.current.visible = showClosedSmileEyes;
    }
  });

  return (
    <group ref={group}>
      {/* 머리 위 닉네임 명찰 배지 (모바일 최적화: distanceFactor 3.5로 실제 화면 너비 25% 구현) */}
      <Html position={[0, 1.18, 0]} center distanceFactor={3.5}>
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.68)',
            backdropFilter: 'blur(3px)',
            color: '#f8fafc',
            padding: '2px 6px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            lineHeight: 1.2,
          }}
        >
          {player.nickname}
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

      {/* 캐릭터 본체 (볼살이 통통하고 표정이 살아있는 귀여운 꼬마 동자승) */}
      <group ref={bodyRef} position={[0, BASE_BODY_Y, 0]}>
        {/* 1. 통통하고 귀여운 동자승 두상 (볼 쪽이 살짝 통통한 아기 비율) */}
        <mesh position={[0, 0.38, 0]} scale={[1.05, 0.98, 1.02]} castShadow>
          <sphereGeometry args={[0.245, 32, 32]} />
          <meshStandardMaterial color="#ffe0bd" roughness={0.62} />
        </mesh>

        {/* 2. 동글동글한 양쪽 귀 & 발그레한 귓속 */}
        <group position={[-0.25, 0.365, -0.01]} rotation={[0, 0, -0.18]}>
          <mesh castShadow>
            <sphereGeometry args={[0.048, 14, 14]} />
            <meshStandardMaterial color="#ffe0bd" roughness={0.65} />
          </mesh>
          <mesh position={[-0.012, 0, 0.022]}>
            <sphereGeometry args={[0.025, 10, 10]} />
            <meshBasicMaterial color="#fda4af" transparent opacity={0.6} />
          </mesh>
        </group>
        <group position={[0.25, 0.365, -0.01]} rotation={[0, 0, 0.18]}>
          <mesh castShadow>
            <sphereGeometry args={[0.048, 14, 14]} />
            <meshStandardMaterial color="#ffe0bd" roughness={0.65} />
          </mesh>
          <mesh position={[0.012, 0, 0.022]}>
            <sphereGeometry args={[0.025, 10, 10]} />
            <meshBasicMaterial color="#fda4af" transparent opacity={0.6} />
          </mesh>
        </group>

        {/* 3. 순하고 귀여운 동글 눈썹 */}
        <mesh position={[-0.082, 0.432, 0.228]} rotation={[0, -0.22, 0.12]}>
          <capsuleGeometry args={[0.007, 0.032, 6, 10]} />
          <meshBasicMaterial color="#5c4033" />
        </mesh>
        <mesh position={[0.082, 0.432, 0.228]} rotation={[0, 0.22, -0.12]}>
          <capsuleGeometry args={[0.007, 0.032, 6, 10]} />
          <meshBasicMaterial color="#5c4033" />
        </mesh>

        {/* 4-A. 평소 초롱초롱하게 반짝이는 큰 눈망울 (하이라이트 2개 포함) */}
        <group ref={openEyesRef}>
          <group position={[-0.082, 0.375, 0.232]} rotation={[0, -0.22, 0]}>
            <mesh scale={[1.0, 1.12, 0.55]}>
              <sphereGeometry args={[0.029, 16, 16]} />
              <meshBasicMaterial color="#1e1b18" />
            </mesh>
            <mesh position={[-0.009, 0.011, 0.014]}>
              <sphereGeometry args={[0.0095, 10, 10]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.009, -0.010, 0.014]}>
              <sphereGeometry args={[0.0048, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>

          <group position={[0.082, 0.375, 0.232]} rotation={[0, 0.22, 0]}>
            <mesh scale={[1.0, 1.12, 0.55]}>
              <sphereGeometry args={[0.029, 16, 16]} />
              <meshBasicMaterial color="#1e1b18" />
            </mesh>
            <mesh position={[-0.009, 0.011, 0.014]}>
              <sphereGeometry args={[0.0095, 10, 10]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.009, -0.010, 0.014]}>
              <sphereGeometry args={[0.0048, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        </group>

        {/* 4-B. 눈 깜빡이거나 합장/좌선할 때 방긋 웃는 반달 눈웃음 (⌒ ⌒) */}
        <group ref={closedEyesRef} visible={false}>
          <mesh position={[-0.082, 0.368, 0.236]} rotation={[-0.1, -0.22, 0.05]}>
            <torusGeometry args={[0.024, 0.0055, 10, 20, Math.PI]} />
            <meshBasicMaterial color="#292524" />
          </mesh>
          <mesh position={[0.082, 0.368, 0.236]} rotation={[-0.1, 0.22, -0.05]}>
            <torusGeometry args={[0.024, 0.0055, 10, 20, Math.PI]} />
            <meshBasicMaterial color="#292524" />
          </mesh>
        </group>

        {/* 5. 앙증맞은 아기 코 */}
        <mesh position={[0, 0.352, 0.248]} scale={[1.2, 0.85, 0.7]}>
          <sphereGeometry args={[0.012, 10, 10]} />
          <meshStandardMaterial color="#f5b895" roughness={0.6} />
        </mesh>

        {/* 6. 방긋 웃는 귀여운 아기 미소 입매 (◡) */}
        <mesh position={[0, 0.328, 0.241]} rotation={[0.18, 0, Math.PI]}>
          <torusGeometry args={[0.025, 0.006, 10, 24, Math.PI]} />
          <meshBasicMaterial color="#be123c" />
        </mesh>

        {/* 7. 발그레한 복숭아빛 통통 볼터치 */}
        <mesh position={[-0.135, 0.340, 0.208]} rotation={[0.08, -0.45, 0]} scale={[1.35, 0.85, 0.4]}>
          <sphereGeometry args={[0.032, 14, 14]} />
          <meshBasicMaterial color="#fb7185" transparent opacity={0.55} />
        </mesh>
        <mesh position={[0.135, 0.340, 0.208]} rotation={[0.08, 0.45, 0]} scale={[1.35, 0.85, 0.4]}>
          <sphereGeometry args={[0.032, 14, 14]} />
          <meshBasicMaterial color="#fb7185" transparent opacity={0.55} />
        </mesh>

        {/* 5. 승복 몸통 (도포 / 가사 - 양옆 팔이 또렷하게 드러나도록 단정한 핏) */}
        <mesh position={[0, 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.24, 0.50, 20]} />
          <meshStandardMaterial color="#d5d0c8" roughness={0.85} />
        </mesh>

        {/* 6. 붉은 가사 띠 */}
        <mesh position={[0, 0.04, 0.02]} rotation={[0, 0, -0.45]}>
          <torusGeometry args={[0.20, 0.04, 12, 24, Math.PI * 1.3]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.8} />
        </mesh>

        {/* 7. 단주 / 염주 */}
        <mesh position={[0, 0.18, 0.13]} rotation={[0.4, 0, 0]}>
          <torusGeometry args={[0.11, 0.018, 12, 20]} />
          <meshStandardMaterial color="#78350f" roughness={0.6} />
        </mesh>

        {/* 8. 왼팔 (어깨 -> 상완 -> 팔꿈치 -> 전완/소매 -> 손목/손바닥) */}
        <group ref={leftArmRef} position={[-0.22, 0.19, 0.02]} rotation={[-0.08, 0, -0.22]}>
          <mesh position={[0, 0, 0]} castShadow>
            <sphereGeometry args={[0.056, 12, 12]} />
            <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.085, 0]} castShadow>
            <cylinderGeometry args={[0.054, 0.062, 0.17, 12]} />
            <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
          </mesh>
          <group ref={leftForearmRef} position={[0, -0.17, 0]} rotation={[-0.18, 0, 0.05]}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.056, 10, 10]} />
              <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.08, 0]} castShadow>
              <cylinderGeometry args={[0.058, 0.052, 0.16, 12]} />
              <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.16, 0]}>
              <cylinderGeometry args={[0.054, 0.054, 0.024, 12]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} />
            </mesh>
            <group ref={leftHandRef} position={[0, -0.17, 0]}>
              <mesh position={[0, -0.038, 0]} castShadow>
                <boxGeometry args={[0.026, 0.062, 0.052]} />
                <meshStandardMaterial color="#fed7aa" roughness={0.65} />
              </mesh>
              <mesh position={[0, -0.070, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.026, 0.026, 0.026, 12]} />
                <meshStandardMaterial color="#fed7aa" roughness={0.65} />
              </mesh>
              <mesh position={[0.004, -0.030, 0.028]} rotation={[0.3, 0, 0]}>
                <sphereGeometry args={[0.013, 8, 8]} />
                <meshStandardMaterial color="#fed7aa" roughness={0.65} />
              </mesh>
            </group>
          </group>
        </group>

        {/* 9. 오른팔 (어깨 -> 상완 -> 팔꿈치 -> 전완/소매 -> 손목/손바닥) */}
        <group ref={rightArmRef} position={[0.22, 0.19, 0.02]} rotation={[-0.08, 0, 0.22]}>
          <mesh position={[0, 0, 0]} castShadow>
            <sphereGeometry args={[0.056, 12, 12]} />
            <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.085, 0]} castShadow>
            <cylinderGeometry args={[0.054, 0.062, 0.17, 12]} />
            <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
          </mesh>
          <group ref={rightForearmRef} position={[0, -0.17, 0]} rotation={[-0.18, 0, -0.05]}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.056, 10, 10]} />
              <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.08, 0]} castShadow>
              <cylinderGeometry args={[0.058, 0.052, 0.16, 12]} />
              <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.16, 0]}>
              <cylinderGeometry args={[0.054, 0.054, 0.024, 12]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} />
            </mesh>
            <group ref={rightHandRef} position={[0, -0.17, 0]}>
              <mesh position={[0, -0.038, 0]} castShadow>
                <boxGeometry args={[0.026, 0.062, 0.052]} />
                <meshStandardMaterial color="#fed7aa" roughness={0.65} />
              </mesh>
              <mesh position={[0, -0.070, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.026, 0.026, 0.026, 12]} />
                <meshStandardMaterial color="#fed7aa" roughness={0.65} />
              </mesh>
              <mesh position={[-0.004, -0.030, 0.028]} rotation={[0.3, 0, 0]}>
                <sphereGeometry args={[0.013, 8, 8]} />
                <meshStandardMaterial color="#fed7aa" roughness={0.65} />
              </mesh>
            </group>
          </group>
        </group>

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
