import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from './components/world/Experience';
import { OverlayUI } from './components/ui/OverlayUI';
import { Joystick } from './components/ui/Joystick';
import { usePlayerControls } from './components/player/usePlayerControls';

export const App: React.FC = () => {
  // 전역 키보드 조작 이벤트 리스너 등록
  usePlayerControls();

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 1. 3D WebGL 캔버스 */}
      <Canvas
        shadows
        camera={{ position: [0, 2.5, 7.5], fov: 50, near: 0.1, far: 150 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Experience />
      </Canvas>

      {/* 2. 모바일 가상 조이스틱 & 행동 버튼 */}
      <Joystick />

      {/* 3. 2D 오버레이 UI (헤더, 사운드, 목탁, 조작 가이드) */}
      <OverlayUI />
    </div>
  );
};

export default App;
