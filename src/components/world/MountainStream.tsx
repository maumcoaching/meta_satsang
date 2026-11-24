import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const MountainStream: React.FC = () => {
  const waterMatRef = useRef<THREE.ShaderMaterial>(null);

  // 1. 북쪽(z = -34)에서 남쪽(z = +34)으로 법당 오른쪽(x = 10.5 ~ 16.5)을 구비구비 흐르는 개천 중심 곡선
  const streamCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(14.0, 0, -34),
      new THREE.Vector3(10.8, 0, -26),
      new THREE.Vector3(15.6, 0, -18),
      new THREE.Vector3(10.6, 0, -10),
      new THREE.Vector3(15.2, 0, -2),
      new THREE.Vector3(10.5, 0, 6),
      new THREE.Vector3(15.8, 0, 14),
      new THREE.Vector3(11.2, 0, 22),
      new THREE.Vector3(15.0, 0, 30),
      new THREE.Vector3(12.5, 0, 36),
    ]);
  }, []);

  // 2. 곡선을 따라 평평한 리본 형태의 수면 및 강바닥 메쉬 지오메트리 생성
  const { waterGeometry, bedGeometry, bankRocks } = useMemo(() => {
    const segments = 160;
    const waterHalfWidth = 1.25; // 수면 폭 약 2.5m
    const bedHalfWidth = 1.75;   // 자갈 강바닥 폭 약 3.5m

    const buildRibbon = (halfW: number, yHeight: number, meanderWidthMod: boolean) => {
      const positions = new Float32Array((segments + 1) * 2 * 3);
      const uvs = new Float32Array((segments + 1) * 2 * 2);
      const indices: number[] = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const pt = streamCurve.getPointAt(t);
        const tangent = streamCurve.getTangentAt(t).normalize();
        // 수평면(XZ)에서의 법선 벡터 (-tangent.z, 0, tangent.x)
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        // 굽이치는 구간마다 강폭이 자연스럽게 넓어졌다 좁아지는 변화
        const widthScale = meanderWidthMod ? 1.0 + Math.sin(t * Math.PI * 9) * 0.18 : 1.0;
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

        // u: 북쪽(0.0) -> 남쪽(1.0) 흐름 방향, v: 강 왼쪽(0.0) -> 오른쪽(1.0)
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

    // 개천 양옆 기슭을 따라 자연스럽게 놓인 강돌과 바위들
    const rocks: { pos: [number, number, number]; scale: [number, number, number]; rot: number; color: string }[] = [];
    const rockColors = ['#64748b', '#78716c', '#57534e', '#475569'];
    const rockCount = 68;

    for (let i = 0; i < rockCount; i++) {
      const t = (i + 0.5) / rockCount;
      const pt = streamCurve.getPointAt(t);
      const tangent = streamCurve.getTangentAt(t).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const side = i % 2 === 0 ? 1 : -1;
      const distFromCenter = 1.35 + ((i * 7) % 5) * 0.11;
      const rockPt = pt.clone().addScaledVector(normal, side * distFromCenter);

      const rSize = 0.25 + ((i * 13) % 7) * 0.045;
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
          // vUv.x: 0.0(북쪽 상류) -> 1.0(남쪽 하류)
          // (vUv.x * 빈도 - uTime * 속도)로 물결이 북쪽에서 남쪽으로 계속 흘러내려감
          float flow1 = sin(vUv.x * 42.0 - uTime * 3.2 + sin(vUv.y * 8.0) * 1.5);
          float flow2 = cos(vUv.x * 68.0 - uTime * 4.6 - cos(vUv.y * 12.0) * 1.8);
          float ripple = (flow1 + flow2) * 0.5;

          // 강가 가장자리(vUv.y가 0 또는 1 근처)는 얕고 부드럽게 감쇠, 중앙은 깊이감 있는 청록빛
          float centerFactor = sin(vUv.y * 3.14159265);
          vec3 baseWater = mix(uShallowColor, uDeepColor, pow(centerFactor, 0.7));

          // 물결 윤슬과 하얀 물거품 줄기
          float foamLine = smoothstep(0.62, 0.92, ripple) * centerFactor;
          float bankFoam = smoothstep(0.18, 0.02, abs(vUv.y - 0.5) - 0.36) * 0.25 * (0.5 + 0.5 * flow1);

          vec3 finalColor = mix(baseWater, uFoamColor, clamp(foamLine * 0.55 + bankFoam, 0.0, 0.85));

          // 가장자리 자연스러운 알파 블렌딩
          float edgeAlpha = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
          gl_FragColor = vec4(finalColor, edgeAlpha * 0.88);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
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
    </group>
  );
};
