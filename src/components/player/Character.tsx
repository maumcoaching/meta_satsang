import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { sharedControls } from './usePlayerControls';
import { sound } from '../audio/SoundEffects';
import { multiplayer } from '../multiplayer/MultiplayerService';

// 지형 및 건축물 높이 감지 함수
function getGroundHeight(x: number, z: number): number {
  if (Math.abs(x) <= 4.0 && Math.abs(z) <= 3.0) {
    return 0.45;
  }
  if (Math.abs(x) <= 4.2 && Math.abs(z) <= 3.2) {
    return 0.40;
  }
  if (Math.abs(x) <= 0.6 && z >= 3.4 && z <= 16.0) {
    return 0.05;
  }
  return 0.0;
}

export const Character: React.FC = () => {
  const group = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const { camera, gl } = useThree();

  const BASE_BODY_Y = 0.66;

  // 물리 및 위치 상태
  const position = useRef(new THREE.Vector3(0, 0, 5));
  const velocityY = useRef(0);
  const isGrounded = useRef(true);
  const currentRotation = useRef(0);
  const stepTimer = useRef(0);

  // 카메라 궤도(오빗) 각도
  const camAngleX = useRef(0);
  const camAngleY = useRef(0.25);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });

  // 마우스/터치 드래그로 카메라 시점 회전
  useEffect(() => {
    const dom = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      isDragging.current = true;
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      prevMouse.current = { x: e.clientX, y: e.clientY };

      camAngleX.current -= dx * 0.005;
      camAngleY.current = Math.max(0.05, Math.min(1.2, camAngleY.current + dy * 0.005));
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl]);

  useFrame((state, delta) => {
    if (!group.current) return;

    // 1. 입력 수집 (키보드 + 모바일 조이스틱)
    let moveX = 0;
    let moveZ = 0;

    if (sharedControls.forward) moveZ -= 1;
    if (sharedControls.backward) moveZ += 1;
    if (sharedControls.left) moveX -= 1;
    if (sharedControls.right) moveX += 1;

    if (Math.abs(sharedControls.joystickX) > 0.05 || Math.abs(sharedControls.joystickY) > 0.05) {
      moveX += sharedControls.joystickX;
      moveZ -= sharedControls.joystickY;
    }

    const inputLength = Math.hypot(moveX, moveZ);
    const isMoving = inputLength > 0.1 && !sharedControls.meditate && !sharedControls.bow;

    // 2. 이동 및 카메라 기준 방향 변환
    if (isMoving) {
      const moveAngle = Math.atan2(moveX, moveZ) + camAngleX.current;
      const speed = 4.2;

      position.current.x += Math.sin(moveAngle) * speed * delta;
      position.current.z += Math.cos(moveAngle) * speed * delta;

      const targetRotation = moveAngle;
      let diff = targetRotation - currentRotation.current;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      currentRotation.current += diff * Math.min(1, delta * 15);
      group.current.rotation.y = currentRotation.current;

      stepTimer.current += delta;
      if (stepTimer.current > 0.32) {
        sound.playStep();
        stepTimer.current = 0;
      }
    }

    // 3. 지형 높이 판정 및 점프/중력 처리
    const currentGroundY = getGroundHeight(position.current.x, position.current.z);

    if (sharedControls.jump && isGrounded.current && !sharedControls.meditate) {
      velocityY.current = 5.2;
      isGrounded.current = false;
    }

    if (!isGrounded.current) {
      velocityY.current -= 16 * delta;
      position.current.y += velocityY.current * delta;

      if (position.current.y <= currentGroundY) {
        position.current.y = currentGroundY;
        velocityY.current = 0;
        isGrounded.current = true;
      }
    } else {
      position.current.y = THREE.MathUtils.lerp(position.current.y, currentGroundY, Math.min(1, delta * 15));
    }

    group.current.position.copy(position.current);

    // 4. 애니메이션 (발걸음, 좌선, 합장, 호흡)
    const time = state.clock.getElapsedTime();

    if (bodyRef.current) {
      if (sharedControls.meditate) {
        const sitTargetY = 0.32;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, sitTargetY, delta * 8);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, delta * 8);
      } else if (sharedControls.bow) {
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, BASE_BODY_Y - 0.05, delta * 8);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.42, delta * 8);
      } else if (isMoving) {
        const walkBounce = Math.abs(Math.sin(time * 12)) * 0.04;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, BASE_BODY_Y + walkBounce, delta * 15);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.06, delta * 10);
      } else {
        const breathe = Math.sin(time * 2.5) * 0.015;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, BASE_BODY_Y + breathe, delta * 5);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, delta * 8);
      }
    }

    // 팔 애니메이션
    if (leftArmRef.current && rightArmRef.current) {
      if (sharedControls.meditate || sharedControls.bow) {
        leftArmRef.current.rotation.set(0.7, 0.4, 0.3);
        rightArmRef.current.rotation.set(0.7, -0.4, -0.3);
      } else if (isMoving) {
        const armSwing = Math.sin(time * 12) * 0.55;
        leftArmRef.current.rotation.set(armSwing, 0, 0.12);
        rightArmRef.current.rotation.set(-armSwing, 0, -0.12);
      } else {
        leftArmRef.current.rotation.set(Math.sin(time * 2) * 0.04, 0, 0.12);
        rightArmRef.current.rotation.set(-Math.sin(time * 2) * 0.04, 0, -0.12);
      }
    }

    // 다리 걷기 애니메이션
    if (leftLegRef.current && rightLegRef.current) {
      if (sharedControls.meditate) {
        leftLegRef.current.position.set(-0.11, -0.22, 0);
        rightLegRef.current.position.set(0.11, -0.22, 0);
        leftLegRef.current.rotation.set(1.2, 0.5, 0.2);
        rightLegRef.current.rotation.set(1.2, -0.5, -0.2);
      } else if (isMoving) {
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

    // 5. 3인칭 추적 카메라
    const camDistance = 4.8;
    const targetCamX = position.current.x - Math.sin(camAngleX.current) * Math.cos(camAngleY.current) * camDistance;
    const targetCamY = position.current.y + Math.sin(camAngleY.current) * camDistance + 1.2;
    const targetCamZ = position.current.z - Math.cos(camAngleX.current) * Math.cos(camAngleY.current) * camDistance;

    camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), delta * 6);
    camera.lookAt(position.current.x, position.current.y + 0.85, position.current.z);

    // 6. 멀티플레이어 위치 및 상태 실시간 브로드캐스트
    multiplayer.broadcastState({
      x: position.current.x,
      y: position.current.y,
      z: position.current.z,
      rot: currentRotation.current,
      meditate: !!sharedControls.meditate,
      bow: !!sharedControls.bow,
      isMoving,
    });
  });

  return (
    <group ref={group}>
      {/* 머리 위 내 닉네임 명찰 */}
      <Html position={[0, 1.48, 0]} center distanceFactor={14}>
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            color: '#f8fafc',
            padding: '3px 10px',
            borderRadius: 14,
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 10 }}>🪷</span>
          <span>{multiplayer.getNickname()}</span>
          <span style={{ fontSize: 10, color: '#93c5fd' }}>(나)</span>
        </div>
      </Html>

      {/* 발밑 바닥 그림자 원판 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.38, 24]} />
        <meshBasicMaterial color="#000000" opacity={0.3} transparent depthWrite={false} />
      </mesh>

      {/* 명상 중 은은한 오라 링 */}
      {sharedControls.meditate && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.55, 0.8, 32]} />
          <meshBasicMaterial color="#ffeaa7" opacity={0.4} transparent side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 캐릭터 본체 (모자 없이 동글동글한 동자승 머리) */}
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

        {/* 3. 눈 (온화하고 차분한 표정) */}
        <mesh position={[-0.07, 0.4, 0.21]} rotation={[0, -0.15, 0]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color="#2d3748" />
        </mesh>
        <mesh position={[0.07, 0.4, 0.21]} rotation={[0, 0.15, 0]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color="#2d3748" />
        </mesh>

        {/* 4. 귀여운 연분홍 볼터치 */}
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

        {/* 8. 왼팔 */}
        <group ref={leftArmRef} position={[-0.24, 0.18, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.065, 0.28, 12]} />
            <meshStandardMaterial color="#d5d0c8" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.28, 0]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.7} />
          </mesh>
        </group>

        {/* 9. 오른팔 */}
        <group ref={rightArmRef} position={[0.24, 0.18, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.065, 0.28, 12]} />
            <meshStandardMaterial color="#d5d0c8" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.28, 0]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.7} />
          </mesh>
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
