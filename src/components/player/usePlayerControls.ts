import { useEffect, useRef } from 'react';

export interface PlayerControlsState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  meditate: boolean;
  bow: boolean;
  joystickX: number;
  joystickY: number;
}

// 싱글톤 상태로 모바일 조이스틱과 키보드 입력을 공유
export const sharedControls: PlayerControlsState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  meditate: false,
  bow: false,
  joystickX: 0,
  joystickY: 0,
};

export function usePlayerControls() {
  const controls = useRef(sharedControls);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 텍스트 입력 중일 때는 조작 무시
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          sharedControls.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          sharedControls.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          sharedControls.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          sharedControls.right = true;
          break;
        case 'Space':
          sharedControls.jump = true;
          break;
        case 'KeyE':
          sharedControls.meditate = !sharedControls.meditate;
          if (sharedControls.meditate) sharedControls.bow = false;
          break;
        case 'KeyC':
          sharedControls.bow = !sharedControls.bow;
          if (sharedControls.bow) sharedControls.meditate = false;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          sharedControls.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          sharedControls.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          sharedControls.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          sharedControls.right = false;
          break;
        case 'Space':
          sharedControls.jump = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return controls;
}
