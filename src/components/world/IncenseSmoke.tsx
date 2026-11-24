import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StreamNode {
  life: number;       // 0.0 (향 끝) ~ 1.0 (상단 소멸)
  speed: number;      // 일정한 상승 유속
  microOffset: number; // 한 줄기 내부의 미세한 결 차이
}

export const IncenseSmoke: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const emberLightRef = useRef<THREE.PointLight>(null);
  const streamLineRef = useRef<THREE.Line>(null);

  // 한 줄기 얇은 물줄기처럼 매끄럽게 이어지는 미세 입자 수
  const count = 60;
  const streamSegments = 72;

  // 단일 물줄기 파동 함수: 위쪽으로 유려하게 흘러 올라가는 단일 S자 실줄기 궤적
  const getStreamOffset = (l: number, time: number) => {
    // (l * 주파수 - time * 유속) 형태로 파동 자체가 아래에서 위로 물 흐르듯 타고 올라감
    const flowPhase = l * 7.2 - time * 2.1;
    const secondaryPhase = l * 3.6 - time * 1.15;
    const sway = Math.pow(l, 1.15) * 0.028; // 옆으로 퍼지지 않고 가느다란 한 줄기 유지
    const x = Math.sin(flowPhase) * sway + Math.sin(secondaryPhase) * (l * 0.01);
    const z = Math.cos(flowPhase * 0.85) * (sway * 0.75);
    return { x, z };
  };

  // 1. 한 줄기 궤적을 따라 흐르는 미세 물결 입자 초기화
  const { nodes, positions, sizes, opacities } = useMemo(() => {
    const list: StreamNode[] = [];
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const op = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      list.push({
        life: i / count,
        speed: 0.28, // 모든 입자가 한 줄기 물처럼 동일한 속도로 매끄럽게 상승
        microOffset: (i % 3 - 1) * 0.0015,
      });

      pos[i * 3 + 0] = 0;
      pos[i * 3 + 1] = 0.22;
      pos[i * 3 + 2] = 0;

      sz[i] = 5;
      op[i] = 0;
    }

    return { nodes: list, positions: pos, sizes: sz, opacities: op };
  }, []);

  // 2. 향 끝에서 상단까지 끊김 없이 이어지는 한 줄기 실크 물줄기 라인 지오메트리 & 셰이더
  const { streamGeometry, streamLineMaterial } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array((streamSegments + 1) * 3);
    const prog = new Float32Array(streamSegments + 1);

    for (let j = 0; j <= streamSegments; j++) {
      prog[j] = j / streamSegments;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aProgress', new THREE.BufferAttribute(prog, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aProgress;
        varying float vAlpha;
        void main() {
          // 하단은 선명하고 위로 올라갈수록 물결처럼 부드럽게 사라짐
          float fadeIn = smoothstep(0.0, 0.06, aProgress);
          float fadeOut = 1.0 - smoothstep(0.25, 1.0, aProgress);
          vAlpha = fadeIn * fadeOut * 0.42;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(0.90, 0.93, 0.97, vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    return { streamGeometry: geo, streamLineMaterial: mat };
  }, []);

  // 3. 한 줄기를 감싸는 얇고 투명한 물결 윤기 셰이더 (넓게 퍼지는 구름 효과 제거)
  const smokeMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aOpacity;
        varying float vOpacity;

        void main() {
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float pSize = aSize * (220.0 / -mvPosition.z);
          gl_PointSize = clamp(pSize, 1.0, 32.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uBaseColor;
        varying float vOpacity;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.05, dist);
          alpha = pow(alpha, 1.8) * vOpacity;

          gl_FragColor = vec4(uBaseColor, alpha);
        }
      `,
      uniforms: {
        uBaseColor: { value: new THREE.Color('#e8eef5') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const totalHeight = 0.95;

    // 1. 향 끝의 붉은 불씨 미세한 숨결
    if (emberLightRef.current) {
      emberLightRef.current.intensity = 0.22 + Math.sin(time * 5) * 0.06;
    }

    // 2. 한 줄기 얇은 물결 실선(Laminar Stream) 업데이트
    if (streamLineRef.current) {
      const posAttr = streamGeometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      for (let j = 0; j <= streamSegments; j++) {
        const l = j / streamSegments;
        const y = 0.22 + l * totalHeight;
        const { x, z } = getStreamOffset(l, time);

        arr[j * 3 + 0] = x;
        arr[j * 3 + 1] = y;
        arr[j * 3 + 2] = z;
      }
      posAttr.needsUpdate = true;
    }

    // 3. 실선과 동일한 단일 궤적을 따라 위로 흐르는 얇은 물결 입자 업데이트
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const sizeAttr = geo.attributes.aSize as THREE.BufferAttribute;
      const opAttr = geo.attributes.aOpacity as THREE.BufferAttribute;

      const posArr = posAttr.array as Float32Array;
      const sizeArr = sizeAttr.array as Float32Array;
      const opArr = opAttr.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const n = nodes[i];
        n.life += n.speed * delta;
        if (n.life > 1.0) {
          n.life -= 1.0;
        }

        const l = n.life;
        const currentY = 0.22 + l * totalHeight;
        const { x, z } = getStreamOffset(l, time);

        posArr[i * 3 + 0] = x + n.microOffset;
        posArr[i * 3 + 1] = currentY;
        posArr[i * 3 + 2] = z;

        // 퍼지지 않고 끝까지 가느다란 한 줄기 두께(5 ~ 13) 유지
        sizeArr[i] = 5.0 + l * 8.0;

        // 투명도: 과하지 않고 맑고 은은한 한 줄기 흐름
        let alpha = 0;
        if (l < 0.08) {
          alpha = (l / 0.08) * 0.24;
        } else if (l < 0.7) {
          alpha = 0.24 * (1.0 - (l - 0.08) * 0.35);
        } else {
          alpha = 0.18 * (1.0 - (l - 0.7) / 0.3);
        }

        opArr[i] = Math.max(0, alpha);
      }

      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      opAttr.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. 향 끝의 작은 붉은 불씨 */}
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.01, 10, 10]} />
        <meshBasicMaterial color="#ff4d00" />
      </mesh>
      <pointLight
        ref={emberLightRef}
        position={[0, 0.225, 0]}
        color="#ff7a00"
        intensity={0.22}
        distance={0.6}
        decay={2}
      />

      {/* 2. 한 줄기 얇은 물처럼 위로 흘러 올라가는 연속 실줄기 */}
      <primitive object={new THREE.Line(streamGeometry, streamLineMaterial)} ref={streamLineRef} />

      {/* 3. 실줄기 궤적을 따라 함께 흐르는 가느다란 윤기 입자 */}
      <points ref={pointsRef} material={smokeMaterial}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aSize"
            count={count}
            array={sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aOpacity"
            count={count}
            array={opacities}
            itemSize={1}
          />
        </bufferGeometry>
      </points>
    </group>
  );
};
