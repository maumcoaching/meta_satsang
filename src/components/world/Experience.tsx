import React, { Suspense } from 'react';
import { Environment } from './Environment';
import { Ground } from './Ground';
import { TempleDeck } from './TempleDeck';
import { CircleDeck } from './CircleDeck';
import { Geumgangjwa } from './Geumgangjwa';
import { Character } from '../player/Character';
import { RemotePlayers } from '../player/RemotePlayers';

export const Experience: React.FC = () => {
  return (
    <Suspense fallback={null}>
      {/* 환경, 하늘, 조명, 안개 */}
      <Environment />

      {/* 대지, 디딤돌, 연못, 소나무 */}
      <Ground />

      {/* 대청마루, 기와지붕, 기둥, 풍경, 석등, 좌복 */}
      <TempleDeck />

      {/* 연못 너머 대형 원형 밝은 원목 삿상 데크 플라자 (서원동산) */}
      <CircleDeck />

      {/* 서원동산 북쪽 거대한 금강경 바위 비석 - 금강좌 (사람 키의 4배 높이 7m) */}
      <Geumgangjwa position={[-24, 0, -1.5]} />

      {/* 내 플레이어 아바타 및 3인칭 추종 카메라 */}
      <Character />

      {/* 함께 접속 중인 다른 도량 방문자들 (P2P 실시간 멀티플레이어) */}
      <RemotePlayers />

      {/* 
        ==================================================================
        [Vibe Coding Zone] 
        앞으로 자연어 프롬프팅으로 만들 다양한 컴포넌트들을 이 아래에 추가할 수 있습니다!
        예: <ThreeStoryStonePagoda position={[6, 0, -4]} />
            <TeaTable position={[-2, 0.45, 0]} />
            <IncensePrayerSpot />
        ==================================================================
      */}
    </Suspense>
  );
};
