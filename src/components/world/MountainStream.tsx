import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const BRIDGE_Z = 6.0;
export const BRIDGE_HALF_WIDTH = 0.65;  // 다리 통행 가능 폭 (z: 5.35 ~ 6.65, 총 폭 1.3m의 아담한 다리)
export const BRIDGE_HALF_LENGTH = 1.85; // 다리 길이 반경 (x: 9.35 ~ 13.05, 총 길이 3.7m)
export const STREAM_BLOCK_HALF_WIDTH = 1.52; // 개울물 진입 차단 반경

// 법당 오른쪽 개천의 중심 X 좌표 (북쪽 z=-36 에서 남쪽 z=+36 으로 구비구비 흐르는 곡선)
export function getStreamCenterX(z: number): number {
  return 13.2 - Math.cos((z - BRIDGE_Z) * 0.36) * 2.0 + Math.sin((z - BRIDGE_Z) * 0.18) * 0.7;
}

// 다리 위에서의 아치형 바닥 높이 계산
export function getBridgeHeight(x: number, z: number): number {
  if (Math.abs(z - BRIDGE_Z) > BRIDGE_HALF_WIDTH + 0.08) return 0;
  const centerX = getStreamCenterX(BRIDGE_Z); // 11.2
  const dx = x - centerX;
  if (Math.abs(dx) > BRIDGE_HALF_LENGTH) return 0;
  const norm = dx / BRIDGE_HALF_LENGTH; // -1 ~ 1
  return Math.max(0, (1 - norm * norm) * 0.34);
}

export const MountainStream: React.FC = () => {
  const waterMatRef = useRef<THREE.ShaderMaterial>(null);

  // 1. getStreamCenterX(z) 수식을 그대로 따라가는 3D 스플라인 곡선 생성
  const streamCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const z = THREE.MathUtils.lerp(-36, 36, i / steps);
      pts.push(new THREE.Vector3(getStreamCenterX(z), 0, z));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, []);

  // 2. 곡선을 따라 평평한 리본 형태의 수면 및 강바닥 메쉬 지오메트리 생성
  const { waterGeometry, bedGeometry, bankRocks } = useMemo(() => {
    const segments = 160;
    const waterHalfWidth = 1.22; // 수면 폭 약 2.44m
    const bedHalfWidth = 1.70;   // 자갈 강바닥 폭 약 3.4m

    const buildRibbon = (halfW: number, yHeight: number, meanderWidthMod: boolean) => {
      const positions = new Float32Array((segments + 1) * 2 * 3);
      const uvs = new Float32Array((segments + 1) * 2 * 2);
      const indices: number[] = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const pt = streamCurve.getPointAt(t);
        const tangent = streamCurve.getTangentAt(t).normalize();
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        const widthScale = meanderWidthMod ? 1.0 + Math.sin(t * Math.PI * 9) * 0.14 : 1.0;
        const w = halfW * widthScale;

        const leftPt = pt.clone().addScaledVector(normal, w);
        const rightPt = pt.clone().addScaledVector(normal, -w);

        const vIdx = i * 2;
        positions[vIdx * 3 + 0] = leftPt.x;
        positions[vIdx * 3 + 1] = yHeight;
        positions[vIdx * 3 + 2] = leftPt.z;

        positions[(vIdx + 1) * 3 + 0] = rightPt.x;
        positions[(vIdx + 1) * 3 + 1] = yHeight;
        positions[(vIdx + 1) * 3 + 2] = rightPt.z;

        uvs[vIdx * 2 + 0] = t;
        uvs[vIdx * 2 + 1] = 0;
        uvs[(vIdx + 1) * 2 + 0] = t;
        uvs[(vIdx + 1) * 2 + 1] = 1;

        if (i < segments) {
          const a = i * 2;
          const b = i * 2 + 1;
          const c = (i + 1) * 2;
          const d = (i + 1) * 2 + 1;
          indices.push(a, b, c, b, d, c);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    };

    const wGeo = buildRibbon(waterHalfWidth, 0.032, true);
    const bGeo = buildRibbon(bedHalfWidth, 0.012, true);

    // 개천 양옆 기슭을 따라 자연스럽게 놓인 강돌과 바위들 (다리 입구 구간은 통행을 위해 비워둠)
    const rocks: { pos: [number, number, number]; scale: [number, number, number]; rot: number; color: string }[] = [];
    const rockColors = ['#64748b', '#78716c', '#57534e', '#475569'];
    const rockCount = 72;

    for (let i = 0; i < rockCount; i++) {
      const t = (i + 0.5) / rockCount;
      const pt = streamCurve.getPointAt(t);

      // 작은 다리 진입로(z: 4.8 ~ 7.2) 주변은 바위를 놓지 않아 다리를 편하게 건널 수 있게 함
      if (Math.abs(pt.z - BRIDGE_Z) < 1.25) continue;

      const tangent = streamCurve.getTangentAt(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const side = i % 2 === 0 ? 1 : -1;
      const distFromCenter = 1.32 + ((i * 7) % 5) * 0.1;
      const rockPt = pt.clone().addScaledVector(normal, side * distFromCenter);

      const rSize = 0.24 + ((i * 13) % 7) * 0.042;
      rocks.push({
        pos: [rockPt.x, rSize * 0.35, rockPt.z],
        scale: [rSize * 1.2, rSize * 0.65, rSize],
        rot: (i * 1.7) % Math.PI,
        color: rockColors[i % rockColors.length],
      });
    }

    return { waterGeometry: wGeo, bedGeometry: bGeo, bankRocks: rocks };
  }, [streamCurve]);

  // 3. 북쪽(u=0)에서 남쪽(u=1)으로 맑은 물결과 윤슬이 끊임없이 흘러가는 커스텀 워터 셰이더
  const waterShaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color('#1e6078') },
        uShallowColor: { value: new THREE.Color('#38a3a5') },
        uFoamColor: { value: new THREE.Color('#e0f2fe') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uFoamColor;
        varying vec2 vUv;

        void main() {
          float flow1 = sin(vUv.x * 42.0 - uTime * 3.2 + sin(vUv.y * 8.0) * 1.5);
          float flow2 = cos(vUv.x * 68.0 - uTime * 4.6 - cos(vUv.y * 12.0) * 1.8);
          float ripple = (flow1 + flow2) * 0.5;

          float centerFactor = sin(vUv.y * 3.14159265);
          vec3 baseWater = mix(uShallowColor, uDeepColor, pow(centerFactor, 0.7));

          float foamLine = smoothstep(0.62, 0.92, ripple) * centerFactor;
          float bankFoam = smoothstep(0.18, 0.02, abs(vUv.y - 0.5) - 0.36) * 0.25 * (0.5 + 0.5 * flow1);

          vec3 finalColor = mix(baseWater, uFoamColor, clamp(foamLine * 0.55 + bankFoam, 0.0, 0.85));

          float edgeAlpha = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
          gl_FragColor = vec4(finalColor, edgeAlpha * 0.88);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  // 4. 개울을 건너는 작은 아치형 원목 다리 (Small Wooden Footbridge) 데이터
  const bridgeCenterX = getStreamCenterX(BRIDGE_Z); // 11.2
  const bridgePlanks = useMemo(() => {
    const list: { x: number; y: number; tilt: number }[] = [];
    const plankCount = 13;
    for (let i = 0; i < plankCount; i++) {
      const norm = -0.92 + (i / (plankCount - 1)) * 1.84; // -0.92 ~ +0.92
      const x = norm * BRIDGE_HALF_LENGTH;
      const y = (1 - norm * norm) * 0.34;
      // 아치 접선 기울기: dy/dx = -2 * norm * 0.34 / BRIDGE_HALF_LENGTH
      const tilt = Math.atan(-2 * norm * (0.34 / BRIDGE_HALF_LENGTH));
      list.push({ x, y, tilt });
    }
    return list;
  }, []);

  useFrame((state) => {
    waterShaderMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <group>
      {/* 1. 개천 바닥 자갈/모래층 */}
      <mesh geometry={bedGeometry} receiveShadow>
        <meshStandardMaterial color="#6b6659" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* 2. 북쪽에서 남쪽으로 구비구비 흘러내리는 맑은 개천 수면 */}
      <mesh ref={waterMatRef as any} geometry={waterGeometry}>
        <primitive object={waterShaderMaterial} attach="material" />
      </mesh>

      {/* 3. 개천 기슭을 따라 놓인 자연석 강돌과 바위들 */}
      {bankRocks.map((rock, idx) => (
        <mesh
          key={idx}
          position={rock.pos}
          scale={rock.scale}
          rotation={[0.1, rock.rot, 0.08]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={rock.color} roughness={0.9} />
        </mesh>
      ))}

      {/* 4. 개울을 건너는 아담한 아치형 나무 다리 (중심: x=11.2, z=6.0) */}
      <group position={[bridgeCenterX, 0, BRIDGE_Z]}>
        {/* 다리 바닥 아치형 원목 널빤지들 */}
        {bridgePlanks.map((p, i) => (
          <mesh
            key={i}
            position={[p.x, p.y + 0.02, 0]}
            rotation={[0, 0, p.tilt]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.23, 0.045, BRIDGE_HALF_WIDTH * 2]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#8c5a32' : '#7c4d28'} roughness={0.8} />
          </mesh>
        ))}

        {/* 다리 하부 양옆 아치 지지대 보 & 상단 난간 기둥/손잡이 */}
        {[-BRIDGE_HALF_WIDTH + 0.06, BRIDGE_HALF_WIDTH - 0.06].map((rz, sideIdx) => (
          <group key={sideIdx} position={[0, 0, rz]}>
            {/* 난간 기둥 5개 (좌우 끝, 중간, 중앙 정점) */}
            {[-0.85, -0.42, 0, 0.42, 0.85].map((norm, pIdx) => {
              const px = norm * BRIDGE_HALF_LENGTH;
              const py = (1 - norm * norm) * 0.34;
              return (
                <group key={pIdx} position={[px, py, 0]}>
                  {/* 수직 기둥 */}
                  <mesh position={[0, 0.22, 0]} castShadow>
                    <cylinderGeometry args={[0.035, 0.04, 0.44, 10]} />
                    <meshStandardMaterial color="#5c3818" roughness={0.85} />
                  </mesh>
                  {/* 기둥 위 작은 둥근 마감 */}
                  <mesh position={[0, 0.45, 0]} castShadow>
                    <sphereGeometry args={[0.045, 10, 10]} />
                    <meshStandardMaterial color="#45270f" roughness={0.8} />
                  </mesh>
                </group>
              );
            })}

            {/* 아치형 손잡이 난간 가로대 (4구간 연결) */}
            {[
              [-0.85, -0.42],
              [-0.42, 0],
              [0, 0.42],
              [0.42, 0.85],
            ].map(([n1, n2], segIdx) => {
              const x1 = n1 * BRIDGE_HALF_LENGTH;
              const y1 = (1 - n1 * n1) * 0.34 + 0.38;
              const x2 = n2 * BRIDGE_HALF_LENGTH;
              const y2 = (1 - n2 * n2) * 0.34 + 0.38;
              const len = Math.hypot(x2 - x1, y2 - y1);
              const angle = Math.atan2(y2 - y1, x2 - x1);
              return (
                <mesh
                  key={segIdx}
                  position={[(x1 + x2) / 2, (y1 + y2) / 2, 0]}
                  rotation={[0, 0, angle]}
                  castShadow
                >
                  <boxGeometry args={[len + 0.04, 0.045, 0.05]} />
                  <meshStandardMaterial color="#6b4220" roughness={0.8} />
                </mesh>
              );
            })}
          </group>
        ))}
      </group>
    </group>
  );
};
