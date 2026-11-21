import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { sharedControls } from './usePlayerControls';
import { sound } from '../audio/SoundEffects';

export const Character: React.FC = () => {
  const group = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const { camera, gl } = useThree();

  // 물리 및 위치 상태
  const position = useRef(new THREE.Vector3(0, 0, 5));
  const velocityY = useRef(0);
  const isGrounded = useRef(true);
  const currentRotation = useRef(0);
  const stepTimer = useRef(0);

  // 카메라 궤도(오빗) 각도
  const camAngleX = useRef(0); // 수평 회전
  const camAngleY = useRef(0.25); // 수직 회전 (라디안)
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });

  // 마우스/터치 드래그로 카메라 시점 회전
  useEffect(() => {
    const dom = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      // UI 버튼 클릭 시 카메라 회전 방지
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

    // 조이스틱 입력 결합
    if (Math.abs(sharedControls.joystickX) > 0.05 || Math.abs(sharedControls.joystickY) > 0.05) {
      moveX += sharedControls.joystickX;
      moveZ -= sharedControls.joystickY;
    }

    const inputLength = Math.hypot(moveX, moveZ);
    const isMoving = inputLength > 0.1 && !sharedControls.meditate && !sharedControls.bow;

    // 2. 이동 및 카메라 기준 방향 변환
    if (isMoving) {
      // 카메라 수평 각도를 기준으로 진행 방향 보정
      const moveAngle = Math.atan2(moveX, moveZ) + camAngleX.current;
      const speed = 4.2;

      position.current.x += Math.sin(moveAngle) * speed * delta;
      position.current.z += Math.cos(moveAngle) * speed * delta;

      // 부드러운 캐릭터 회전
      const targetRotation = moveAngle;
      // 각도 최단 경로 보간
      let diff = targetRotation - currentRotation.current;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      currentRotation.current += diff * Math.min(1, delta * 15);
      group.current.rotation.y = currentRotation.current;

      // 발소리 재생 주기
      stepTimer.current += delta;
      if (stepTimer.current > 0.33) {
        sound.playStep();
        stepTimer.current = 0;
      }
    }

    // 3. 점프 및 중력
    if (sharedControls.jump && isGrounded.current && !sharedControls.meditate) {
      velocityY.current = 5.2;
      isGrounded.current = false;
    }

    if (!isGrounded.current) {
      velocityY.current -= 15 * delta;
      position.current.y += velocityY.current * delta;

      if (position.current.y <= 0) {
        position.current.y = 0;
        velocityY.current = 0;
        isGrounded.current = true;
      }
    }

    group.current.position.copy(position.current);

    // 4. 애니메이션 (걷기 / 좌선 / 합장 / 숨쉬기)
    const time = state.clock.getElapsedTime();

    if (bodyRef.current) {
      if (sharedControls.meditate) {
        // 좌선(명상) 자세: 바닥에 가부좌로 낮게 앉음
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, -0.3, delta * 8);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, delta * 8);
      } else if (sharedControls.bow) {
        // 합장 배례(절): 상체를 앞으로 숙임
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, -0.15, delta * 8);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.45, delta * 8);
      } else if (isMoving) {
        // 걷는 중 바운스
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, Math.abs(Math.sin(time * 12)) * 0.08, delta * 15);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.08, delta * 10);
      } else {
        // 기본 대기(호흡 애니메이션)
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, Math.sin(time * 2.5) * 0.02, delta * 5);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, delta * 8);
      }
    }

    // 팔/다리 스윙 및 합장 포즈
    if (leftArmRef.current && rightArmRef.current) {
      if (sharedControls.meditate || sharedControls.bow) {
        // 두 손 모아 가슴 앞에 합장 (Hapjang)
        leftArmRef.current.rotation.set(0.7, 0.4, 0.3);
        rightArmRef.current.rotation.set(0.7, -0.4, -0.3);
      } else if (isMoving) {
        // 걸을 때 팔 흔들기
        const armSwing = Math.sin(time * 12) * 0.6;
        leftArmRef.current.rotation.set(armSwing, 0, 0.15);
        rightArmRef.current.rotation.set(-armSwing, 0, -0.15);
      } else {
        // 평상시 자연스럽게 내림
        leftArmRef.current.rotation.set(Math.sin(time * 2) * 0.04, 0, 0.12);
        rightArmRef.current.rotation.set(-Math.sin(time * 2) * 0.04, 0, -0.12);
      }
    }

    if (leftLegRef.current && rightLegRef.current) {
      if (sharedControls.meditate) {
        // 가부좌 다리
        leftLegRef.current.rotation.set(1.1, 0.5, 0.2);
        rightLegRef.current.rotation.set(1.1, -0.5, -0.2);
      } else if (isMoving) {
        const legSwing = Math.sin(time * 12) * 0.7;
        leftLegRef.current.rotation.set(-legSwing, 0, 0);
        rightLegRef.current.rotation.set(legSwing, 0, 0);
      } else {
        leftLegRef.current.rotation.set(0, 0, 0);
        rightLegRef.current.rotation.set(0, 0, 0);
      }
    }

    // 5. 3인칭 추적 카메라 (Lerp 부드러운 추종)
    const camDistance = 4.8;
    const targetCamX = position.current.x - Math.sin(camAngleX.current) * Math.cos(camAngleY.current) * camDistance;
    const targetCamY = position.current.y + Math.sin(camAngleY.current) * camDistance + 1.2;
    const targetCamZ = position.current.z - Math.cos(camAngleX.current) * Math.cos(camAngleY.current) * camDistance;

    camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), delta * 6);
    camera.lookAt(position.current.x, position.current.y + 0.9, position.current.z);
  });

  return (
    <group ref={group}>
      {/* 바닥 그림자 원판 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#000000" opacity={0.25} transparent depthWrite={false} />
      </mesh>

      {/* 명상 중 은은한 오라 링 */}
      {sharedControls.meditate && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.6, 0.85, 32]} />
          <meshBasicMaterial color="#ffeaa7" opacity={0.4} transparent side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 캐릭터 본체 */}
      <group ref={bodyRef} position={[0, 0.7, 0]}>
        {/* 머리 */}
        <mesh position={[0, 0.38, 0]} castShadow>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.7} />
        </mesh>

        {/* 삿갓 (대나무/짚 원뿔형 모자) */}
        <group position={[0, 0.52, 0]}>
          <mesh castShadow>
            <coneGeometry args={[0.48, 0.22, 24]} />
            <meshStandardMaterial color="#d4a373" roughness={0.8} />
          </mesh>
          {/* 삿갓 테두리 끈 */}
          <mesh position={[0, -0.09, 0]}>
            <cylinderGeometry args={[0.46, 0.46, 0.02, 24]} />
            <meshStandardMaterial color="#8c532b" roughness={0.9} />
          </mesh>
        </group>

        {/* 눈 (잔잔한 표정) */}
        <mesh position={[-0.07, 0.4, 0.19]} rotation={[0, -0.15, 0]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color="#2d3748" />
        </mesh>
        <mesh position={[0.07, 0.4, 0.19]} rotation={[0, 0.15, 0]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color="#2d3748" />
        </mesh>

        {/* 승복 몸통 (도포 / 가사) */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.32, 0.58, 20]} />
          <meshStandardMaterial color="#d5d0c8" roughness={0.85} />
        </mesh>

        {/* 붉은 가사 띠 (어깨에 걸친 비단 천) */}
        <mesh position={[0, 0.03, 0.02]} rotation={[0, 0, -0.45]}>
          <torusGeometry args={[0.24, 0.045, 12, 24, Math.PI * 1.3]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.8} />
        </mesh>

        {/* 단주 / 염주 (목에 걸린 둥근 구슬) */}
        <mesh position={[0, 0.18, 0.14]} rotation={[0.4, 0, 0]}>
          <torusGeometry args={[0.12, 0.02, 12, 20]} />
          <meshStandardMaterial color="#78350f" roughness={0.6} />
        </mesh>

        {/* 왼팔 */}
        <group ref={leftArmRef} position={[-0.24, 0.18, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.065, 0.28, 12]} />
            <meshStandardMaterial color="#d5d0c8" roughness={0.85} />
          </mesh>
          {/* 손 */}
          <mesh position={[0, -0.28, 0]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.7} />
          </mesh>
        </group>

        {/* 오른팔 */}
        <group ref={rightArmRef} position={[0.24, 0.18, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.065, 0.28, 12]} />
            <meshStandardMaterial color="#d5d0c8" roughness={0.85} />
          </mesh>
          {/* 손 */}
          <mesh position={[0, -0.28, 0]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.7} />
          </mesh>
        </group>

        {/* 왼다리 */}
        <group ref={leftLegRef} position={[-0.11, -0.32, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.07, 0.3, 12]} />
            <meshStandardMaterial color="#a8a29e" roughness={0.9} />
          </mesh>
          {/* 버선 / 고무신 */}
          <mesh position={[0, -0.3, 0.04]} castShadow>
            <boxGeometry args={[0.1, 0.06, 0.18]} />
            <meshStandardMaterial color="#ffffff" roughness={0.8} />
          </mesh>
        </group>

        {/* 오른다리 */}
        <group ref={rightLegRef} position={[0.11, -0.32, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.07, 0.3, 12]} />
            <meshStandardMaterial color="#a8a29e" roughness={0.9} />
          </mesh>
          {/* 버선 / 고무신 */}
          <mesh position={[0, -0.3, 0.04]} castShadow>
            <boxGeometry args={[0.1, 0.06, 0.18]} />
            <meshStandardMaterial color="#ffffff" roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
