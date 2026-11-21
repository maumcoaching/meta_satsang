import React, { Suspense } from 'react';
import { Environment } from './Environment';
import { Ground } from './Ground';
import { TempleDeck } from './TempleDeck';
import { Character } from '../player/Character';

export const Experience: React.FC = () => {
  return (
    <Suspense fallback={null}>
      {/* 환경, 하늘, 조명, 안개 */}
      <Environment />

      {/* 대지, 디딤돌, 연못, 소나무 */}
      <Ground />

      {/* 대청마루, 기와지붕, 기둥, 풍경, 석등, 좌복 */}
      <TempleDeck />

      {/* 플레이어 아바타 및 3인칭 추종 카메라 */}
      <Character />

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
