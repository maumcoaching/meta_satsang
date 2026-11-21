import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Bell, Music, HelpCircle, Sparkles, X } from 'lucide-react';
import { sound } from '../audio/SoundEffects';
import confetti from 'canvas-confetti';

const SERENE_NAMES = [
  '고요한 구름',
  '맑은 바람',
  '다정한 솔잎',
  '달빛 연못',
  '새벽 이슬',
  '차분한 바위',
  '따뜻한 햇살',
  '은은한 녹차',
  '푸른 이끼',
  '평온한 대숲',
];

const ZEN_MESSAGES = [
  '지나간 일에 얽매이지 말고, 오지 않은 일에 불안해하지 마라. 지금 이 순간 여기에 머물라.',
  '마음이 고요하면 온 세상이 함께 평온해집니다.',
  '흐르는 물은 앞을 다투지 않고 고요히 바다로 흘러갑니다.',
  '가장 깊은 호흡으로 오늘 하루 애쓴 나 자신을 따뜻하게 안아주세요.',
  '비우면 비로소 새로운 평화가 채워집니다.',
  '흔들리는 것은 바람이 아니라, 그 바람을 바라보는 내 마음일 뿐입니다.',
];

export const OverlayUI: React.FC = () => {
  const [nickname, setNickname] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showWisdom, setShowWisdom] = useState(false);
  const [currentWisdom, setCurrentWisdom] = useState('');
  const [moktakCount, setMoktakCount] = useState(0);

  useEffect(() => {
    // 무작위 산사 이름 부여
    const randomName = SERENE_NAMES[Math.floor(Math.random() * SERENE_NAMES.length)];
    setNickname(randomName);

    // 은은한 자연 풍경 소리 시작
    sound.startAmbientChimes();
  }, []);

  const handleMoktakClick = () => {
    sound.playMoktak();
    setMoktakCount((prev) => prev + 1);

    // 10회마다 작은 힐링 축하 꽃가루
    if ((moktakCount + 1) % 10 === 0) {
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#f472b6', '#fed7aa', '#fde047'],
      });
    }
  };

  const handleBellClick = () => {
    sound.playSingingBowl();
  };

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleOpenWisdom = () => {
    const randomWisdom = ZEN_MESSAGES[Math.floor(Math.random() * ZEN_MESSAGES.length)];
    setCurrentWisdom(randomWisdom);
    setShowWisdom(true);
    sound.playSingingBowl();
  };

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      {/* 1. 상단 헤더 바 */}
      <header
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 100%)',
        }}
      >
        {/* 좌측 타이틀 & 사용자 닉네임 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>🪷</span>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: '#ffffff',
                letterSpacing: 2,
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                fontFamily: "'Noto Serif KR', serif",
              }}
            >
              온라인 산사 (山寺)
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#4ade80',
                display: 'inline-block',
                boxShadow: '0 0 8px #4ade80',
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: '#e2e8f0',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            >
              도량에 머무는 이: <strong>{nickname}</strong>
            </span>
          </div>
        </div>

        {/* 우측 퀵 컨트롤 버튼들 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
          {/* 목탁 치기 버튼 */}
          <button
            onClick={handleMoktakClick}
            title="목탁 치기"
            style={{
              padding: '8px 14px',
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.88)',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: '#451a03',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span>🪵</span>
            <span>목탁 치기 {moktakCount > 0 && `(${moktakCount})`}</span>
          </button>

          {/* 범종 / 싱잉볼 버튼 */}
          <button
            onClick={handleBellClick}
            title="풍경/종소리 울리기"
            style={{
              padding: '8px 12px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.88)',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#b45309',
            }}
          >
            <Bell size={18} />
          </button>

          {/* 오늘의 화두 (명상 메시지) */}
          <button
            onClick={handleOpenWisdom}
            title="오늘의 화두 보기"
            style={{
              padding: '8px 12px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.88)',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9333ea',
            }}
          >
            <Sparkles size={18} />
          </button>

          {/* 소리 토글 버튼 */}
          <button
            onClick={handleToggleSound}
            title={isMuted ? '음소거 해제' : '음소거'}
            style={{
              padding: '8px 12px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.88)',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isMuted ? '#ef4444' : '#1e293b',
            }}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* 도움말 버튼 */}
          <button
            onClick={() => setShowHelp(true)}
            title="도움말 및 조작법"
            style={{
              padding: '8px 12px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.88)',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
            }}
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      {/* 2. 하단 조작 가이드 안내 (데스크톱 전용 힌트) */}
      <footer
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 20px',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(10px)',
          borderRadius: 24,
          color: '#f8fafc',
          fontSize: 13,
          letterSpacing: 0.5,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap',
        }}
      >
        <span>
          ⌨️ <strong>WASD</strong> 이동
        </span>
        <span>|</span>
        <span>
          🧘 <strong>E</strong> 좌선
        </span>
        <span>|</span>
        <span>
          🙏 <strong>C</strong> 합장
        </span>
        <span>|</span>
        <span>
          ⬆️ <strong>Space</strong> 점프
        </span>
        <span>|</span>
        <span>
          🖱️ <strong>드래그</strong> 시점 회전
        </span>
      </footer>

      {/* 3. 오늘의 화두(명상 지혜) 팝업 모달 */}
      {showWisdom && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            padding: 24,
          }}
          onClick={() => setShowWisdom(false)}
        >
          <div
            style={{
              maxWidth: 440,
              width: '100%',
              backgroundColor: '#fafaf9',
              borderRadius: 20,
              padding: '32px 28px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              position: 'relative',
              border: '1px solid #e7e5e4',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>🪷</span>
            <h3
              style={{
                fontFamily: "'Noto Serif KR', serif",
                fontSize: 20,
                color: '#44403c',
                marginBottom: 16,
              }}
            >
              오늘의 화두
            </h3>
            <p
              style={{
                fontFamily: "'Noto Serif KR', serif",
                fontSize: 16,
                lineHeight: 1.8,
                color: '#1c1917',
                marginBottom: 24,
                wordBreak: 'keep-all',
              }}
            >
              "{currentWisdom}"
            </p>
            <button
              onClick={() => setShowWisdom(false)}
              style={{
                padding: '10px 24px',
                borderRadius: 24,
                backgroundColor: '#78350f',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              마음에 담기
            </button>
          </div>
        </div>
      )}

      {/* 4. 도움말 모달 */}
      {showHelp && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            padding: 24,
          }}
          onClick={() => setShowHelp(false)}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: '28px 24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHelp(false)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              <X size={20} />
            </button>

            <h3
              style={{
                fontFamily: "'Noto Serif KR', serif",
                fontSize: 20,
                color: '#1e293b',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>🪷</span> 온라인 산사 안내
            </h3>

            <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p>
                복잡한 일상에서 벗어나 조용히 머물며 쉴 수 있는 3D 가상 도량입니다. 별도의 회원가입이나 설치 없이 언제든 웹 브라우저로 들어올 수 있습니다.
              </p>

              <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: 12 }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: 6 }}>조작 방법</strong>
                <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li><strong>이동:</strong> PC는 <code>WASD</code> 또는 방향키, 모바일은 화면 좌측 조이스틱</li>
                  <li><strong>시점:</strong> 마우스나 손가락으로 화면을 드래그하여 360도 둘러보기</li>
                  <li><strong>합장 & 좌선:</strong> <code>C</code>(합장 인사), <code>E</code>(방석 위 명상)</li>
                  <li><strong>상호작용:</strong> 대청마루의 풍경(종), 방석, 향로, 연못을 클릭해보세요.</li>
                </ul>
              </div>

              <p style={{ fontSize: 13, color: '#94a3b8' }}>
                💡 <strong>바이브 코딩 팁:</strong> 이 공간의 모든 건물과 자연물은 독립된 컴포넌트로 구성되어 있어, AI에게 새로운 요소(석탑, 불상, 차실 등)를 자연어로 추가해달라고 요청할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
