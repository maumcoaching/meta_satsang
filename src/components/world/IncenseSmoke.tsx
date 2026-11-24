import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SmokeParticle {
  life: number;        // 0.0 (생성) ~ 1.0 (소멸)
  speed: number;       // 상승 속도
  curlPhase: number;   // 흔들림 위상차
  driftAngle: number;  // 방 안의 미세한 공기 흐름 방향
  curlFreq: number;    // 회오리 주파수
}

export const IncenseSmoke: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const emberLightRef = useRef<THREE.PointLight>(null);
  const stemLineRef = useRef<THREE.Line>(null);

  const count = 75; // 자연스러운 연기 입자 수

  // 1. 파티클 기본 물리 속성 및 버퍼 배열 생성
  const { particles, positions, sizes, opacities } = useMemo(() => {
    const pts: SmokeParticle[] = [];
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const op = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // 헌향 직후 향 끝에서부터 연기가 자연스럽게 피어오르도록 초기 수명 설정
      const initialLife = (i / count) * 0.25;
      pts.push({
        life: initialLife,
        speed: 0.26 + Math.random() * 0.08,
        curlPhase: Math.random() * Math.PI * 2,
        driftAngle: Math.random() * Math.PI * 2,
        curlFreq: 2.8 + Math.random() * 1.5,
      });

      pos[i * 3 + 0] = 0;
      pos[i * 3 + 1] = 0.22;
      pos[i * 3 + 2] = 0;

      sz[i] = 10;
      op[i] = 0;
    }

    return { particles: pts, positions: pos, sizes: sz, opacities: op };
  }, []);

  // 2. 가느다란 선향 하단 실줄기 (Laminar Stream) 지오메트리
  const stemSegments = 16;
  const stemGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array((stemSegments + 1) * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  // 3. 부드러운 가우시안 원형 연기 셰이더 (각진 사각형 방지)
  const smokeMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aOpacity;
        varying float vOpacity;
        varying float vHeightProgress;

        void main() {
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // 3D 원근에 따른 부드러운 크기 스케일링
          float pSize = aSize * (260.0 / -mvPosition.z);
          gl_PointSize = clamp(pSize, 1.0, 160.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uBaseColor;
        uniform vec3 uFadeColor;
        varying float vOpacity;

        void main() {
          // 중앙 기준 (-0.5 ~ 0.5)
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          // 완벽하게 둥글고 가장자리가 몽환적으로 흐려지는 연기 감쇠 (Gaussian falloff)
          float alpha = smoothstep(0.5, 0.02, dist);
          alpha = pow(alpha, 1.5) * vOpacity;

          // 부드러운 백회색 연기 컬러
          gl_FragColor = vec4(uBaseColor, alpha);
        }
      `,
      uniforms: {
        uBaseColor: { value: new THREE.Color('#e0e4eb') },
        uFadeColor: { value: new THREE.Color('#cbd5e1') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. 향 끝의 붉은 불씨 미세한 숨결 깜빡임
    if (emberLightRef.current) {
      emberLightRef.current.intensity = 0.25 + Math.sin(time * 5) * 0.08 + Math.cos(time * 11) * 0.04;
    }

    // 2. 하단부 매끄러운 연기 실줄기 (Laminar ribbon) 곡선 업데이트
    if (stemLineRef.current) {
      const stemPos = stemGeometry.attributes.position as THREE.BufferAttribute;
      const stemArr = stemPos.array as Float32Array;
      const stemHeight = 0.16;

      for (let j = 0; j <= stemSegments; j++) {
        const t = j / stemSegments;
        const y = 0.22 + t * stemHeight;
        // 미세하게 살랑이는 바람 웨이브
        const curveX = Math.sin(time * 3.0 + t * 4.0) * (t * t * 0.015);
        const curveZ = Math.cos(time * 2.5 + t * 3.5) * (t * t * 0.012);

        stemArr[j * 3 + 0] = curveX;
        stemArr[j * 3 + 1] = y;
        stemArr[j * 3 + 2] = curveZ;
      }
      stemPos.needsUpdate = true;
    }

    // 3. 연기 파티클 구름 업데이트
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const sizeAttr = geo.attributes.aSize as THREE.BufferAttribute;
      const opAttr = geo.attributes.aOpacity as THREE.BufferAttribute;

      const posArr = posAttr.array as Float32Array;
      const sizeArr = sizeAttr.array as Float32Array;
      const opArr = opAttr.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const p = particles[i];

        // 수명 진행
        p.life += p.speed * delta * 0.65;
        if (p.life > 1.0) {
          p.life = 0;
          p.driftAngle = Math.random() * Math.PI * 2;
        }

        const l = p.life;

        // 높이: 처음엔 천천히 피어나다 위로 갈수록 공기 대류를 타고 부드럽게 상승
        const currentY = 0.22 + Math.pow(l, 0.85) * 1.15;

        // 수평 회오리 및 살랑임 (하단은 좁고, 상부로 갈수록 풍성하게 번짐)
        const spreadRadius = Math.pow(l, 1.4) * 0.09;
        const waveX = Math.sin(time * p.curlFreq + l * 8.0 + p.curlPhase) * spreadRadius;
        const waveZ = Math.cos(time * (p.curlFreq * 0.85) + l * 7.0 + p.curlPhase) * spreadRadius;

        // 미세한 한쪽 방향 공기 대류
        const driftX = Math.cos(p.driftAngle) * (l * 0.035);
        const driftZ = Math.sin(p.driftAngle) * (l * 0.035);

        posArr[i * 3 + 0] = waveX + driftX;
        posArr[i * 3 + 1] = currentY;
        posArr[i * 3 + 2] = waveZ + driftZ;

        // 크기(Size): 향 끝에서는 가느다랗게 시작(8)해서, 위로 올라갈수록 몽환적인 구름처럼 확장(50~80)
        sizeArr[i] = 10 + Math.pow(l, 0.7) * 75;

        // 투명도(Opacity):
        // 0~0.15: 서서히 나타남
        // 0.15~0.5: 또렷하게 피어오름
        // 0.5~1.0: 공기 중으로 서서히 흔적 없이 흩어짐
        let alpha = 0;
        if (l < 0.15) {
          alpha = (l / 0.15) * 0.42;
        } else if (l < 0.5) {
          alpha = 0.42 - (l - 0.15) * 0.15;
        } else {
          alpha = 0.37 * (1.0 - (l - 0.5) / 0.5);
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
      {/* 1. 향 끝의 타오르는 붉은 불씨 & 은은한 광원 */}
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.014, 12, 12]} />
        <meshBasicMaterial color="#ff4d00" />
      </mesh>
      <pointLight
        ref={emberLightRef}
        position={[0, 0.225, 0]}
        color="#ff7a00"
        intensity={0.25}
        distance={0.8}
        decay={2}
      />

      {/* 2. 향 끝에서 피어나는 가느다란 연기 실줄기 (Laminar Stream) */}
      <primitive object={new THREE.Line(stemGeometry, new THREE.LineBasicMaterial({
        color: '#e2e8f0',
        transparent: true,
        opacity: 0.35,
        linewidth: 1,
      }))} ref={stemLineRef} />

      {/* 3. 몽환적으로 피어오르는 부드러운 가우시안 연기 입자 구름 */}
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
