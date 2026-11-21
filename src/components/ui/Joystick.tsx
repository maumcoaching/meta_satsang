import React, { useRef, useState, useEffect } from 'react';
import { sharedControls } from '../player/usePlayerControls';
import { sound } from '../audio/SoundEffects';

export const Joystick: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isTouched, setIsTouched] = useState(false);
  const touchId = useRef<number | null>(null);

  const [isMeditating, setIsMeditating] = useState(false);
  const [isBowing, setIsBowing] = useState(false);

  // 화면 크기 체크 (터치 환경 또는 모바일 화면일 때 강조)
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 850);

    const onResize = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 850);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchId.current = touch.identifier;
    setIsTouched(true);
    updateKnob(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId.current) {
        updateKnob(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId.current) {
        touchId.current = null;
        setIsTouched(false);
        setKnobPos({ x: 0, y: 0 });
        sharedControls.joystickX = 0;
        sharedControls.joystickY = 0;
        break;
      }
    }
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = rect.width / 2 - 20;

    let normX = dx;
    let normY = dy;
    if (dist > maxRadius) {
      normX = (dx / dist) * maxRadius;
      normY = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: normX, y: normY });

    // 입력 상태 전파 (-1 ~ 1 정규화)
    sharedControls.joystickX = normX / maxRadius;
    sharedControls.joystickY = -(normY / maxRadius); // Y는 위가 전진(+1)
  };

  // 모바일이 아니어도 터치 지원 장치거나 화면이 작으면 표시
  if (!isTouchDevice) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}>
      {/* 1. 좌측 하단 가상 조이스틱 */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.22)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(255, 255, 255, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      >
        {/* 중앙 노브 */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: isTouched ? '#f59e0b' : 'rgba(255, 255, 255, 0.85)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            transition: isTouched ? 'none' : 'transform 0.15s ease-out',
          }}
        />
      </div>

      {/* 2. 우측 하단 행동 버튼들 (합장, 좌선, 점프) */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          pointerEvents: 'auto',
        }}
      >
        {/* 합장 (인사) 버튼 */}
        <button
          onClick={() => {
            const next = !isBowing;
            setIsBowing(next);
            sharedControls.bow = next;
            if (next) {
              setIsMeditating(false);
              sharedControls.meditate = false;
              sound.playMoktak();
            }
          }}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: isBowing ? '#991b1b' : 'rgba(255, 255, 255, 0.85)',
            color: isBowing ? '#ffffff' : '#333333',
            border: '2px solid rgba(255,255,255,0.6)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 18 }}>🙏</span>
          <span>합장</span>
        </button>

        {/* 좌선 (명상) 버튼 */}
        <button
          onClick={() => {
            const next = !isMeditating;
            setIsMeditating(next);
            sharedControls.meditate = next;
            if (next) {
              setIsBowing(false);
              sharedControls.bow = false;
              sound.playSingingBowl();
            }
          }}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: isMeditating ? '#d97706' : 'rgba(255, 255, 255, 0.85)',
            color: isMeditating ? '#ffffff' : '#333333',
            border: '2px solid rgba(255,255,255,0.6)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 18 }}>🧘</span>
          <span>좌선</span>
        </button>

        {/* 점프 버튼 */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            sharedControls.jump = true;
          }}
          onTouchEnd={() => {
            sharedControls.jump = false;
          }}
          onClick={() => {
            sharedControls.jump = true;
            setTimeout(() => {
              sharedControls.jump = false;
            }, 150);
          }}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            color: '#333333',
            border: '2px solid rgba(255,255,255,0.6)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 18 }}>⬆️</span>
          <span>점프</span>
        </button>
      </div>
    </div>
  );
};
