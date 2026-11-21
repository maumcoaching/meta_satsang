import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { sharedControls } from './usePlayerControls';
import { sound } from '../audio/SoundEffects';

// 지형 및 건축물 높이 감지 함수
function getGroundHeight(x: number, z: number): number {
  // 1. 대청마루 본체 (가로 8m x 세로 6m)
  if (Math.abs(x) <= 4.0 && Math.abs(z) <= 3.0) {
    return 0.45;
  }
  // 2. 대청마루 석조 기단 턱
  if (Math.abs(x) <= 4.2 && Math.abs(z) <= 3.2) {
    return 0.40;
  }
  // 3. 디딤돌 길 (살짝 솟아있는 돌)
  if (Math.abs(x) <= 0.6 && z >= 3.4 && z <= 16.0) {
    return 0.05;
  }
  // 기본 잔디 바닥
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

  // 기본 캐릭터 높이 기준점 (발바닥이 지면 y=0에 정확히 닿도록 설정)
  const BASE_BODY_Y = 0.66;

  // 물리 및 위치 상태
  const position = useRef(new THREE.Vector3(0, 0, 5));
  const velocityY = useRef(0);
  const isGrounded = useRef(true);
  const currentRotation = useRef(0);
  const stepTimer = useRef(0);

  // 카메라 궤도(오빗) 각도
  const camAngleX = useRef(0); // 수평 회전
  const camAngleY = useRef(0.25); // 수직 회전
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

    // 조이스틱 입력 결합
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

      // 부드러운 캐릭터 회전
      const targetRotation = moveAngle;
      let diff = targetRotation - currentRotation.current;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      currentRotation.current += diff * Math.min(1, delta * 15);
      group.current.rotation.y = currentRotation.current;

      // 발소리 재생 주기
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

      // 지면에 착지
      if (position.current.y <= currentGroundY) {
        position.current.y = currentGroundY;
        velocityY.current = 0;
        isGrounded.current = true;
      }
    } else {
      // 대청마루나 돌길을 오르내릴 때 자연스러운 높이 적응
      position.current.y = THREE.MathUtils.lerp(position.current.y, currentGroundY, Math.min(1, delta * 15));
    }

    group.current.position.copy(position.current);

    // 4. 애니메이션 (발걸음, 좌선, 합장, 호흡)
    const time = state.clock.getElapsedTime();

    if (bodyRef.current) {
      if (sharedControls.meditate) {
        // 좌선(명상): 바닥에 가부좌로 낮게 안착
        const sitTargetY = 0.32;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, sitTargetY, delta * 8);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, delta * 8);
      } else if (sharedControls.bow) {
        // 합장 배례(절): 상체를 앞으로 정중히 숙임
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, BASE_BODY_Y - 0.05, delta * 8);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.42, delta * 8);
      } else if (isMoving) {
        // 걸을 때 리드미컬한 상하 바운스
        const walkBounce = Math.abs(Math.sin(time * 12)) * 0.04;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, BASE_BODY_Y + walkBounce, delta * 15);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.06, delta * 10);
      } else {
        // 평상시 자연스러운 호흡 숨쉬기
        const breathe = Math.sin(time * 2.5) * 0.015;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, BASE_BODY_Y + breathe, delta * 5);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, delta * 8);
      }
    }

    // 팔 스윙 및 합장 포즈
    if (leftArmRef.current && rightArmRef.current) {
      if (sharedControls.meditate || sharedControls.bow) {
        // 두 손 모아 가슴 앞에 합장 (Hapjang)
        leftArmRef.current.rotation.set(0.7, 0.4, 0.3);
        rightArmRef.current.rotation.set(0.7, -0.4, -0.3);
      } else if (isMoving) {
        // 걸을 때 팔 흔들기
        const armSwing = Math.sin(time * 12) * 0.55;
        leftArmRef.current.rotation.set(armSwing, 0, 0.12);
        rightArmRef.current.rotation.set(-armSwing, 0, -0.12);
      } else {
        leftArmRef.current.rotation.set(Math.sin(time * 2) * 0.04, 0, 0.12);
        rightArmRef.current.rotation.set(-Math.sin(time * 2) * 0.04, 0, -0.12);
      }
    }

    // 다리 걷기 애니메이션 (발로 걷는 모습이 명확히 보이도록 전후 스윙 및 리프트 적용)
    if (leftLegRef.current && rightLegRef.current) {
      if (sharedControls.meditate) {
        // 가부좌 접은 다리
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
        // 정지 상태: 바닥에 단단히 서있기
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
  });

  return (
    <group ref={group}>
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

      {/* 캐릭터 본체 (BASE_BODY_Y 높이에서 머리/몸통/팔다리가 조립됨) */}
      <group ref={bodyRef} position={[0, BASE_BODY_Y, 0]}>
        {/* 1. 머리 */}
        <mesh position={[0, 0.38, 0]} castShadow>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color="#fed7aa" roughness={0.7} />
        </mesh>

        {/* 2. 삿갓 (대나무/짚 원뿔형 모자) */}
        <group position={[0, 0.52, 0]}>
          <mesh castShadow>
            <coneGeometry args={[0.48, 0.22, 24]} />
            <meshStandardMaterial color="#d4a373" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.09, 0]}>
            <cylinderGeometry args={[0.46, 0.46, 0.02, 24]} />
            <meshStandardMaterial color="#8c532b" roughness={0.9} />
          </mesh>
        </group>

        {/* 3. 눈 (잔잔하고 고요한 표정) */}
        <mesh position={[-0.07, 0.4, 0.19]} rotation={[0, -0.15, 0]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color="#2d3748" />
        </mesh>
        <mesh position={[0.07, 0.4, 0.19]} rotation={[0, 0.15, 0]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color="#2d3748" />
        </mesh>

        {/* 4. 승복 몸통 (도포 / 가사 - 다리가 보이도록 적절한 길이로 조정) */}
        <mesh position={[0, 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.32, 0.52, 20]} />
          <meshStandardMaterial color="#d5d0c8" roughness={0.85} />
        </mesh>

        {/* 5. 붉은 가사 띠 */}
        <mesh position={[0, 0.04, 0.02]} rotation={[0, 0, -0.45]}>
          <torusGeometry args={[0.24, 0.045, 12, 24, Math.PI * 1.3]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.8} />
        </mesh>

        {/* 6. 단주 / 염주 */}
        <mesh position={[0, 0.18, 0.14]} rotation={[0.4, 0, 0]}>
          <torusGeometry args={[0.12, 0.02, 12, 20]} />
          <meshStandardMaterial color="#78350f" roughness={0.6} />
        </mesh>

        {/* 7. 왼팔 */}
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

        {/* 8. 오른팔 */}
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

        {/* 9. 왼다리 & 고무신 (발바닥이 바닥에 정확히 닿도록 구성) */}
        <group ref={leftLegRef} position={[-0.11, -0.25, 0]}>
          {/* 바짓단 (회색 승려복 바지) */}
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.07, 0.30, 12]} />
            <meshStandardMaterial color="#a8a29e" roughness={0.9} />
          </mesh>
          {/* 흰색 버선 & 고무신 */}
          <mesh position={[0, -0.36, 0.03]} castShadow>
            <boxGeometry args={[0.11, 0.08, 0.20]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
          {/* 신발 코 앞머리 포인트 */}
          <mesh position={[0, -0.34, 0.13]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
        </group>

        {/* 10. 오른다리 & 고무신 */}
        <group ref={rightLegRef} position={[0.11, -0.25, 0]}>
          {/* 바짓단 */}
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.065, 0.07, 0.30, 12]} />
            <meshStandardMaterial color="#a8a29e" roughness={0.9} />
          </mesh>
          {/* 흰색 버선 & 고무신 */}
          <mesh position={[0, -0.36, 0.03]} castShadow>
            <boxGeometry args={[0.11, 0.08, 0.20]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
          {/* 신발 코 앞머리 포인트 */}
          <mesh position={[0, -0.34, 0.13]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
