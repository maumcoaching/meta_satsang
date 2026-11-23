import React, { useEffect, useState } from 'react';
import { multiplayer, RemotePlayer as RemotePlayerType } from '../multiplayer/MultiplayerService';
import { RemotePlayer } from './RemotePlayer';

export const RemotePlayers: React.FC = () => {
  const [players, setPlayers] = useState<RemotePlayerType[]>([]);

  useEffect(() => {
    // 멀티플레이어 서비스 초기화 및 구독
    multiplayer.init();
    const unsubscribe = multiplayer.subscribe((remoteList) => {
      setPlayers(remoteList);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <group>
      {players.map((p) => (
        <RemotePlayer key={p.id} player={p} />
      ))}
    </group>
  );
};
