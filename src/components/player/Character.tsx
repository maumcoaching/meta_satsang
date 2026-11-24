import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { sharedControls } from './usePlayerControls';
import { sound } from '../audio/SoundEffects';
import { multiplayer } from '../multiplayer/MultiplayerService';

// 지형 및 건축물 높이 감지 함수
function getGroundHeight(x: number, z: number): number {
  // 1. 대형 확장 법당 내부 및 마루 (폭: x in [-6.8, 6.8], 깊이: z in [-6.8, 6.3], 마루 높이: 0.45m)
  if (Math.abs(x) <= 6.8 && z >= -6.8 && z <= 6.3) {
    // 중앙 불단 (수미단: 폭 5.5m, 깊이 1.5m, 높이 1.32m)
    if (Math.abs(x) <= 2.75 && z <= -4.8) {
      return 1.32;
    }
    return 0.45; // 원목 대청마루 바닥
  }
  // 2. 법당 앞 기단 돌계단 (z in [6.3, 7.6], x in [-2.5, 2.5], 높이: 0.22m)
  if (Math.abs(x) <= 2.5 && z >= 6.3 && z <= 7.6) {
    return 0.22;
  }
  // 3. 디딤돌 돌길 (디딤돌 높이: 0.05)
  if (Math.abs(x) <= 0.8 && z >= 7.6 && z <= 16.0) {
    return 0.05;
  }
  // 4. 서원동산 대형 원형 데크 - 서원동산 (중심: x=-24, z=12, 반경: 14m, 높이: 0.18)
  const distToCircleDeck = Math.hypot(x - (-24), z - 12);
  if (distToCircleDeck <= 14.1) {
    // 서원동산 중앙 화강암 석조 좌대 (중심: x=-24, z=12, 폭 1.7m, 좌대 높이 1.27m)
    if (Math.abs(x - (-24)) <= 0.85 && Math.abs(z - 12) <= 0.85) {
      return 1.27;
    }
    // 서원동산 안쪽 금강좌 기단석 (중심: x=-24, z=3.5, 폭 12.2m, 깊이 3.8m, 기단 높이 0.70m)
    if (Math.abs(x - (-24)) <= 6.1 && z >= 1.6 && z <= 5.4) {
      return 0.70;
    }
    return 0.18; // 금강좌 뒤편 순례 보행로를 포함한 서원동산 원목 데크 바닥
  }
  // 5. 연못에서 원형 데크로 이어지는 연결 디딤돌
  if (x >= -15.0 && x <= -9.0 && z >= 4.0 && z <= 10.5) {
    return 0.05;
  }
  return 0.0;
}

const CUSHION_COLS = [-4.6, -3.1, -1.6, 1.6, 3.1, 4.6];
const CUSHION_ROWS = [3.8, 2.0, 0.2, -1.6, -3.4];
const PROSTRATE_DURATION = 3.65; // 1배(오체투지 큰절) 전체 소요 시간(초)

export const Character: React.FC = () => {
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

  const { camera, gl } = useThree();

  const BASE_BODY_Y = 0.66;

  // 좌복 위 절하기(오체투지 큰절) 상태 관리
  const [isOnCushion, setIsOnCushion] = useState(false);
  const [isProstrating, setIsProstrating] = useState(false);
  const [bowCount, setBowCount] = useState(0);

  const onCushionRef = useRef(false);
  const activeCushionPosRef = useRef<{ x: number; z: number } | null>(null);
  const prostrateTimerRef = useRef(0);

  // 절하기 버튼 클릭 시 1배(오체투지 큰절) 시작
  const handleStartProstrate = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sound.playMoktak();

    sharedControls.meditate = false;
    sharedControls.bow = false;
    sharedControls.prostrate = true;
    prostrateTimerRef.current = 0;
    setIsProstrating(true);
  };

  // 물리 및 위치 상태
  const position = useRef(new THREE.Vector3(0, 0.45, 4.5)); // 법당 안쪽 입구 (좌복 30장과 불단을 마주보고 시작)
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

      // 화면 드래그 방향으로 직관적인 시점 회전
      camAngleX.current += dx * 0.005;
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
    // 이동 입력이 들어오면 절하기 동작을 자연스럽게 중단하고 걸어갈 수 있도록 함
    if (inputLength > 0.15 && sharedControls.prostrate) {
      sharedControls.prostrate = false;
      setIsProstrating(false);
    }
    const isMoving = inputLength > 0.1 && !sharedControls.meditate && !sharedControls.bow && !sharedControls.prostrate;

    // 2. 이동 및 카메라 시점 기준 직관적인 방향 변환
    if (isMoving) {
      const speed = 4.2;
      const inputForward = -moveZ; // W / 조이스틱 위로 = +1

      // 카메라가 바라보는 방향을 기준으로 월드 이동 벡터 계산
      const worldMoveX = Math.cos(camAngleX.current) * moveX - Math.sin(camAngleX.current) * inputForward;
      const worldMoveZ = -Math.sin(camAngleX.current) * moveX - Math.cos(camAngleX.current) * inputForward;

      const norm = Math.hypot(worldMoveX, worldMoveZ);
      const dirX = worldMoveX / norm;
      const dirZ = worldMoveZ / norm;

      position.current.x += dirX * Math.min(inputLength, 1) * speed * delta;
      position.current.z += dirZ * Math.min(inputLength, 1) * speed * delta;

      // 법당 3면 벽체(뒷벽, 양옆벽) 및 전면 출입문 충돌 경계
      if (position.current.z < 6.2 && position.current.z > -6.8 && Math.abs(position.current.x) < 6.8) {
        position.current.z = Math.max(-6.4, position.current.z);
        position.current.x = Math.max(-6.4, Math.min(6.4, position.current.x));
        // 전면 벽: 중앙 열린 문(x: [-1.8, 1.8]) 외에는 전면 벽에 막힘
        if (position.current.z > 6.1 && Math.abs(position.current.x) > 1.8) {
          position.current.z = 6.1;
        }
      } else if (position.current.z >= 6.15 && position.current.z <= 6.35) {
        // 외부에서 들어올 때: 중앙 문(x: [-1.8, 1.8]) 외에는 전면 벽에 막힘
        if (Math.abs(position.current.x) > 1.8) {
          position.current.z = 6.35;
        }
      }

      // 캐릭터가 이동하는 방향을 바라보도록 부드럽게 회전
      const targetRotation = Math.atan2(dirX, dirZ);
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
    sharedControls.playerX = position.current.x;
    sharedControls.playerZ = position.current.z;

    // 3-B. 법당 내 30장 좌복 위에 올라섰는지 감지
    let foundCushion: { x: number; z: number } | null = null;
    if (Math.abs(position.current.x) <= 5.5 && position.current.z >= -4.2 && position.current.z <= 4.6) {
      for (const cx of CUSHION_COLS) {
        for (const cz of CUSHION_ROWS) {
          if (Math.hypot(position.current.x - cx, position.current.z - cz) <= 0.56) {
            foundCushion = { x: cx, z: cz };
            break;
          }
        }
        if (foundCushion) break;
      }
    }
    const nowOnCushion = foundCushion !== null;
    activeCushionPosRef.current = foundCushion;
    if (nowOnCushion !== onCushionRef.current) {
      onCushionRef.current = nowOnCushion;
      setIsOnCushion(nowOnCushion);
    }

    // 절하기 진행 중일 때: 해당 좌복 중앙에 위치를 정렬하고 북쪽 불단(Math.PI)을 바라보도록 회전
    let prostratePhase = -1; // -1이면 절하기 중이 아님
    if (sharedControls.prostrate) {
      prostrateTimerRef.current += delta;
      prostratePhase = prostrateTimerRef.current;

      if (activeCushionPosRef.current) {
        position.current.x = THREE.MathUtils.lerp(position.current.x, activeCushionPosRef.current.x, delta * 8);
        position.current.z = THREE.MathUtils.lerp(position.current.z, activeCushionPosRef.current.z, delta * 8);
        group.current.position.x = position.current.x;
        group.current.position.z = position.current.z;
      }

      // 불단 방향(-Z, 회전값 Math.PI)을 바라보도록 부드럽게 정렬
      let rotDiff = Math.PI - currentRotation.current;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      currentRotation.current += rotDiff * Math.min(1, delta * 10);
      group.current.rotation.y = currentRotation.current;

      if (prostrateTimerRef.current >= PROSTRATE_DURATION) {
        sharedControls.prostrate = false;
        setIsProstrating(false);
        setBowCount((prev) => prev + 1);
        prostratePhase = -1;
      }
    }

    // 4. 애니메이션 (발걸음, 좌선, 합장, 오체투지 큰절, 호흡)
    const time = state.clock.getElapsedTime();

    if (bodyRef.current) {
      if (prostratePhase >= 0) {
        // 오체투지 큰절 5단계 상체 움직임:
        // 0.0~0.55s: 서서 합장 반배
        // 0.55~1.35s: 무릎 꿇고 상체를 깊이 숙여 엎드림
        // 1.35~2.35s: 이마를 바닥 가까이 대고 오체투지 유지
        // 2.35~3.15s: 무릎을 펴며 다시 일어섬
        // 3.15~3.65s: 마무리 합장 반배 후 정자세
        let targetY = BASE_BODY_Y;
        let targetZ = 0;
        let targetRotX = 0.18;

        if (prostratePhase < 0.55) {
          targetY = BASE_BODY_Y - 0.02;
          targetZ = 0;
          targetRotX = 0.22;
        } else if (prostratePhase < 1.35) {
          const p = THREE.MathUtils.smoothstep((prostratePhase - 0.55) / 0.8, 0, 1);
          targetY = THREE.MathUtils.lerp(BASE_BODY_Y - 0.02, 0.24, p);
          targetZ = THREE.MathUtils.lerp(0, -0.10, p);
          targetRotX = THREE.MathUtils.lerp(0.22, 1.35, p);
        } else if (prostratePhase < 2.35) {
          targetY = 0.23;
          targetZ = -0.10;
          targetRotX = 1.38;
        } else if (prostratePhase < 3.15) {
          const p = THREE.MathUtils.smoothstep((prostratePhase - 2.35) / 0.8, 0, 1);
          targetY = THREE.MathUtils.lerp(0.23, BASE_BODY_Y - 0.02, p);
          targetZ = THREE.MathUtils.lerp(-0.10, 0, p);
          targetRotX = THREE.MathUtils.lerp(1.38, 0.22, p);
        } else {
          const p = THREE.MathUtils.smoothstep((prostratePhase - 3.15) / 0.5, 0, 1);
          targetY = THREE.MathUtils.lerp(BASE_BODY_Y - 0.02, BASE_BODY_Y, p);
          targetZ = 0;
          targetRotX = THREE.MathUtils.lerp(0.22, 0, p);
        }

        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, targetY, delta * 14);
        bodyRef.current.position.z = THREE.MathUtils.lerp(bodyRef.current.position.z, targetZ, delta * 14);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, targetRotX, delta * 14);
      } else if (sharedControls.meditate) {
        const sitTargetY = 0.32;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, sitTargetY, delta * 8);
        bodyRef.current.position.z = THREE.MathUtils.lerp(bodyRef.current.position.z, 0, delta * 8);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, delta * 8);
      } else if (sharedControls.bow) {
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, BASE_BODY_Y - 0.05, delta * 8);
        bodyRef.current.position.z = THREE.MathUtils.lerp(bodyRef.current.position.z, 0, delta * 8);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.42, delta * 8);
      } else if (isMoving) {
        const walkBounce = Math.abs(Math.sin(time * 12)) * 0.04;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, BASE_BODY_Y + walkBounce, delta * 15);
        bodyRef.current.position.z = THREE.MathUtils.lerp(bodyRef.current.position.z, 0, delta * 10);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.06, delta * 10);
      } else {
        const breathe = Math.sin(time * 2.5) * 0.015;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, BASE_BODY_Y + breathe, delta * 5);
        bodyRef.current.position.z = THREE.MathUtils.lerp(bodyRef.current.position.z, 0, delta * 10);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, delta * 8);
      }
    }

    // 팔 및 손바닥 관절 애니메이션 (걷기, 서있기, 합장, 오체투지 큰절/접족례, 좌선)
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

      if (prostratePhase >= 0) {
        if (prostratePhase < 0.75 || prostratePhase > 2.95) {
          // 서서 시작/마무리할 때: 가슴 앞 합장
          lerpPos(leftArmRef.current, -0.20, 0.18, 0.06);
          lerpPos(rightArmRef.current, 0.20, 0.18, 0.06);
          lerpRot(leftArmRef.current, -0.75, 0, 0.28);
          lerpRot(rightArmRef.current, -0.75, 0, -0.28);
          lerpRot(leftForearmRef.current, -1.35, 0, 0.92);
          lerpRot(rightForearmRef.current, -1.35, 0, -0.92);
          lerpRot(leftHandRef.current, -0.255, 0.714, -0.786);
          lerpRot(rightHandRef.current, -0.255, -0.714, 0.786);
        } else if (prostratePhase >= 1.55 && prostratePhase <= 2.25) {
          // 엎드린 상태에서 두 손바닥을 하늘로 향하여 받드는 접족례(接足禮)
          lerpPos(leftArmRef.current, -0.20, 0.18, 0.06);
          lerpPos(rightArmRef.current, 0.20, 0.18, 0.06);
          lerpRot(leftArmRef.current, -1.45, 0, -0.08);
          lerpRot(rightArmRef.current, -1.45, 0, 0.08);
          lerpRot(leftForearmRef.current, -0.85, 0, 0.12);
          lerpRot(rightForearmRef.current, -0.85, 0, -0.12);
          lerpRot(leftHandRef.current, -0.35, 0, -1.35);
          lerpRot(rightHandRef.current, -0.35, 0, 1.35);
        } else {
          // 바닥을 짚고 엎드리거나 일어서는 중
          lerpPos(leftArmRef.current, -0.20, 0.18, 0.06);
          lerpPos(rightArmRef.current, 0.20, 0.18, 0.06);
          lerpRot(leftArmRef.current, -1.38, 0, -0.05);
          lerpRot(rightArmRef.current, -1.38, 0, 0.05);
          lerpRot(leftForearmRef.current, -0.45, 0, 0.18);
          lerpRot(rightForearmRef.current, -0.45, 0, -0.18);
          lerpRot(leftHandRef.current, 0.2, 0, 0);
          lerpRot(rightHandRef.current, 0.2, 0, 0);
        }
      } else if (sharedControls.bow) {
        // 합장(合掌): 양팔을 가슴 앞으로 모아 팔꿈치를 굽히고 두 손바닥이 서로 마주 닿게 함
        lerpPos(leftArmRef.current, -0.20, 0.18, 0.06);
        lerpPos(rightArmRef.current, 0.20, 0.18, 0.06);
        lerpRot(leftArmRef.current, -0.75, 0, 0.28);
        lerpRot(rightArmRef.current, -0.75, 0, -0.28);
        lerpRot(leftForearmRef.current, -1.35, 0, 0.92);
        lerpRot(rightForearmRef.current, -1.35, 0, -0.92);
        lerpRot(leftHandRef.current, -0.255, 0.714, -0.786);
        lerpRot(rightHandRef.current, -0.255, -0.714, 0.786);
      } else if (sharedControls.meditate) {
        // 좌선(명상): 아랫배 단전 앞에 두 손을 가지런히 포개어 모음 (선정인)
        lerpPos(leftArmRef.current, -0.21, 0.19, 0.03);
        lerpPos(rightArmRef.current, 0.21, 0.19, 0.03);
        lerpRot(leftArmRef.current, -0.35, 0, -0.05);
        lerpRot(rightArmRef.current, -0.35, 0, 0.05);
        lerpRot(leftForearmRef.current, -0.95, 0, 0.85);
        lerpRot(rightForearmRef.current, -0.95, 0, -0.85);
        lerpRot(leftHandRef.current, 0, 0, -0.4);
        lerpRot(rightHandRef.current, 0, 0, 0.4);
      } else if (isMoving) {
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

    // 다리 걷기 및 무릎 꿇기 애니메이션
    if (leftLegRef.current && rightLegRef.current) {
      if (prostratePhase >= 0) {
        // 무릎을 꿇고 다리를 뒤로 접는 절 동작
        let legBend = 0;
        let legY = -0.25;
        if (prostratePhase >= 0.55 && prostratePhase < 1.35) {
          const p = THREE.MathUtils.smoothstep((prostratePhase - 0.55) / 0.8, 0, 1);
          legBend = THREE.MathUtils.lerp(0, 1.48, p);
          legY = THREE.MathUtils.lerp(-0.25, -0.16, p);
        } else if (prostratePhase >= 1.35 && prostratePhase < 2.35) {
          legBend = 1.48;
          legY = -0.16;
        } else if (prostratePhase >= 2.35 && prostratePhase < 3.15) {
          const p = THREE.MathUtils.smoothstep((prostratePhase - 2.35) / 0.8, 0, 1);
          legBend = THREE.MathUtils.lerp(1.48, 0, p);
          legY = THREE.MathUtils.lerp(-0.16, -0.25, p);
        }
        leftLegRef.current.position.set(-0.11, legY, 0);
        rightLegRef.current.position.set(0.11, legY, 0);
        leftLegRef.current.rotation.set(legBend, 0, 0);
        rightLegRef.current.rotation.set(legBend, 0, 0);
      } else if (sharedControls.meditate) {
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

    // 귀여운 눈 깜빡임 및 합장/좌선/절하기 시 평온한 반달 눈웃음 표정 전환
    if (openEyesRef.current && closedEyesRef.current) {
      const blinkCycle = time % 3.8;
      const isBlinking = blinkCycle > 3.64;
      const showClosedSmileEyes =
        !!sharedControls.meditate || !!sharedControls.bow || !!sharedControls.prostrate || isBlinking;
      openEyesRef.current.visible = !showClosedSmileEyes;
      closedEyesRef.current.visible = showClosedSmileEyes;
    }

    // 5. 3인칭 추적 카메라 (등 뒤에서 앞으로 바라보는 정방향 시점)
    const camDistance = 4.8;
    const targetCamX = position.current.x + Math.sin(camAngleX.current) * Math.cos(camAngleY.current) * camDistance;
    const targetCamY = position.current.y + Math.sin(camAngleY.current) * camDistance + 1.2;
    const targetCamZ = position.current.z + Math.cos(camAngleX.current) * Math.cos(camAngleY.current) * camDistance;

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
      prostrate: !!sharedControls.prostrate,
      isMoving,
    });
  });

  return (
    <group ref={group}>
      {/* 좌복 위에 올라섰을 때 나타나는 '절하기' 버튼 */}
      {isOnCushion && (
        <Html position={[0, 1.52, 0]} center>
          <div style={{ pointerEvents: 'auto' }}>
            <button
              onClick={handleStartProstrate}
              disabled={isProstrating}
              style={{
                padding: '7px 18px',
                borderRadius: 22,
                background: isProstrating
                  ? 'rgba(28, 25, 23, 0.82)'
                  : 'linear-gradient(135deg, #991b1b 0%, #450a0a 100%)',
                color: '#fef3c7',
                border: '1.5px solid #f59e0b',
                boxShadow: '0 4px 14px rgba(0,0,0,0.38), 0 0 10px rgba(245, 158, 11, 0.3)',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'Noto Serif KR', serif",
                letterSpacing: 1,
                cursor: isProstrating ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🙇</span>
              <span>
                {isProstrating
                  ? '배례(절) 올리는 중...'
                  : bowCount > 0
                    ? `절하기 (${bowCount}배)`
                    : '절하기'}
              </span>
            </button>
          </div>
        </Html>
      )}

      {/* 머리 위 내 닉네임 명찰 (모바일 최적화: 기존 distanceFactor 14 -> 3.5로 축소하여 실제 화면 너비 25% 구현) */}
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
          {multiplayer.getNickname()}
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
          {/* 왼쪽 눈동자 */}
          <group position={[-0.082, 0.375, 0.232]} rotation={[0, -0.22, 0]}>
            <mesh scale={[1.0, 1.12, 0.55]}>
              <sphereGeometry args={[0.029, 16, 16]} />
              <meshBasicMaterial color="#1e1b18" />
            </mesh>
            {/* 큰 별빛 하이라이트 */}
            <mesh position={[-0.009, 0.011, 0.014]}>
              <sphereGeometry args={[0.0095, 10, 10]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* 작은 보조 하이라이트 */}
            <mesh position={[0.009, -0.010, 0.014]}>
              <sphereGeometry args={[0.0048, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>

          {/* 오른쪽 눈동자 */}
          <group position={[0.082, 0.375, 0.232]} rotation={[0, 0.22, 0]}>
            <mesh scale={[1.0, 1.12, 0.55]}>
              <sphereGeometry args={[0.029, 16, 16]} />
              <meshBasicMaterial color="#1e1b18" />
            </mesh>
            {/* 큰 별빛 하이라이트 */}
            <mesh position={[-0.009, 0.011, 0.014]}>
              <sphereGeometry args={[0.0095, 10, 10]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* 작은 보조 하이라이트 */}
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
          {/* 어깨 둥근 연결부 */}
          <mesh position={[0, 0, 0]} castShadow>
            <sphereGeometry args={[0.056, 12, 12]} />
            <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
          </mesh>
          {/* 상완 소매 */}
          <mesh position={[0, -0.085, 0]} castShadow>
            <cylinderGeometry args={[0.054, 0.062, 0.17, 12]} />
            <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
          </mesh>
          {/* 팔꿈치 및 전완(아랫팔) */}
          <group ref={leftForearmRef} position={[0, -0.17, 0]} rotation={[-0.18, 0, 0.05]}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.056, 10, 10]} />
              <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.08, 0]} castShadow>
              <cylinderGeometry args={[0.058, 0.052, 0.16, 12]} />
              <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
            </mesh>
            {/* 흰색 소매 동정 (끝단) */}
            <mesh position={[0, -0.16, 0]}>
              <cylinderGeometry args={[0.054, 0.054, 0.024, 12]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} />
            </mesh>
            {/* 왼손 (안쪽 +X면이 평평한 손바닥, 합장 시 오른손바닥과 정면으로 마주 닿음) */}
            <group ref={leftHandRef} position={[0, -0.17, 0]}>
              {/* 손바닥 본체 */}
              <mesh position={[0, -0.038, 0]} castShadow>
                <boxGeometry args={[0.026, 0.062, 0.052]} />
                <meshStandardMaterial color="#fed7aa" roughness={0.65} />
              </mesh>
              {/* 가지런히 모은 손가락 끝 (둥근 아치) */}
              <mesh position={[0, -0.070, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.026, 0.026, 0.026, 12]} />
                <meshStandardMaterial color="#fed7aa" roughness={0.65} />
              </mesh>
              {/* 엄지손가락 */}
              <mesh position={[0.004, -0.030, 0.028]} rotation={[0.3, 0, 0]}>
                <sphereGeometry args={[0.013, 8, 8]} />
                <meshStandardMaterial color="#fed7aa" roughness={0.65} />
              </mesh>
            </group>
          </group>
        </group>

        {/* 9. 오른팔 (어깨 -> 상완 -> 팔꿈치 -> 전완/소매 -> 손목/손바닥) */}
        <group ref={rightArmRef} position={[0.22, 0.19, 0.02]} rotation={[-0.08, 0, 0.22]}>
          {/* 어깨 둥근 연결부 */}
          <mesh position={[0, 0, 0]} castShadow>
            <sphereGeometry args={[0.056, 12, 12]} />
            <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
          </mesh>
          {/* 상완 소매 */}
          <mesh position={[0, -0.085, 0]} castShadow>
            <cylinderGeometry args={[0.054, 0.062, 0.17, 12]} />
            <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
          </mesh>
          {/* 팔꿈치 및 전완(아랫팔) */}
          <group ref={rightForearmRef} position={[0, -0.17, 0]} rotation={[-0.18, 0, -0.05]}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.056, 10, 10]} />
              <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.08, 0]} castShadow>
              <cylinderGeometry args={[0.058, 0.052, 0.16, 12]} />
              <meshStandardMaterial color="#b8b0a8" roughness={0.85} />
            </mesh>
            {/* 흰색 소매 동정 (끝단) */}
            <mesh position={[0, -0.16, 0]}>
              <cylinderGeometry args={[0.054, 0.054, 0.024, 12]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} />
            </mesh>
            {/* 오른손 (안쪽 -X면이 평평한 손바닥, 합장 시 왼손바닥과 정면으로 마주 닿음) */}
            <group ref={rightHandRef} position={[0, -0.17, 0]}>
              {/* 손바닥 본체 */}
              <mesh position={[0, -0.038, 0]} castShadow>
                <boxGeometry args={[0.026, 0.062, 0.052]} />
                <meshStandardMaterial color="#fed7aa" roughness={0.65} />
              </mesh>
              {/* 가지런히 모은 손가락 끝 (둥근 아치) */}
              <mesh position={[0, -0.070, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.026, 0.026, 0.026, 12]} />
                <meshStandardMaterial color="#fed7aa" roughness={0.65} />
              </mesh>
              {/* 엄지손가락 */}
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
