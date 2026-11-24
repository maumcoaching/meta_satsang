import { joinRoom } from 'trystero';

export interface PlayerData {
  x: number;
  y: number;
  z: number;
  rot: number;
  meditate: boolean;
  bow: boolean;
  prostrate?: boolean;
  isMoving: boolean;
  nickname: string;
}

export interface RemotePlayer extends PlayerData {
  id: string;
  lastSeen: number;
  // 부드러운 위치 보간용 목표값
  targetX: number;
  targetY: number;
  targetZ: number;
  targetRot: number;
}

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
  '연꽃 향기',
  '산골 시냇물',
];

// 로컬 닉네임 로드 또는 생성
function initLocalNickname(): string {
  try {
    const saved = localStorage.getItem('sansa_nickname');
    if (saved) return saved;
    const random = SERENE_NAMES[Math.floor(Math.random() * SERENE_NAMES.length)];
    localStorage.setItem('sansa_nickname', random);
    return random;
  } catch {
    return SERENE_NAMES[Math.floor(Math.random() * SERENE_NAMES.length)];
  }
}

class MultiplayerManager {
  private room: ReturnType<typeof joinRoom> | null = null;
  private playerAction: any = null;
  private remotePlayers = new Map<string, RemotePlayer>();
  private listeners = new Set<(players: RemotePlayer[]) => void>();
  private countListeners = new Set<(count: number) => void>();
  private localNickname: string = '';
  private lastBroadcast = 0;
  private isInitialized = false;

  constructor() {
    this.localNickname = initLocalNickname();
  }

  public getNickname(): string {
    return this.localNickname;
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // Nostr 릴레이 기반 서버리스 P2P 룸 접속 (별도 서버 비용/설정 없이 무료 연결)
      this.room = joinRoom(
        { appId: 'sansa_meta_satsang_prod' },
        'zen_sanctuary'
      );

      this.playerAction = this.room.makeAction('player_sync');

      // 1. 다른 유저로부터 위치/상태 수신
      this.playerAction.onMessage((data: PlayerData, context: { peerId: string }) => {
        const peerId = context.peerId;
        const now = Date.now();

        const existing = this.remotePlayers.get(peerId);
        if (existing) {
          existing.targetX = data.x;
          existing.targetY = data.y;
          existing.targetZ = data.z;
          existing.targetRot = data.rot;
          existing.meditate = data.meditate;
          existing.bow = data.bow;
          existing.prostrate = !!data.prostrate;
          existing.isMoving = data.isMoving;
          existing.nickname = data.nickname || existing.nickname;
          existing.lastSeen = now;
        } else {
          this.remotePlayers.set(peerId, {
            ...data,
            id: peerId,
            lastSeen: now,
            targetX: data.x,
            targetY: data.y,
            targetZ: data.z,
            targetRot: data.rot,
          });
          this.notifyCount();
        }

        this.notifyListeners();
      });

      // 2. 다른 유저가 접속했을 때
      this.room.onPeerJoin((context: { peerId: string }) => {
        // 접속자 수 갱신 알림
        this.notifyCount();
      });

      // 3. 다른 유저가 나갔을 때
      this.room.onPeerLeave((context: { peerId: string }) => {
        const peerId = context.peerId;
        if (this.remotePlayers.has(peerId)) {
          this.remotePlayers.delete(peerId);
          this.notifyListeners();
          this.notifyCount();
        }
      });

      // 4. 비정상 종료된 피어 정리 타이머 (6초 이상 패킷 없을 시 퇴장 처리)
      setInterval(() => {
        const now = Date.now();
        let changed = false;
        for (const [id, player] of this.remotePlayers.entries()) {
          if (now - player.lastSeen > 7000) {
            this.remotePlayers.delete(id);
            changed = true;
          }
        }
        if (changed) {
          this.notifyListeners();
          this.notifyCount();
        }
      }, 3000);
    } catch (err) {
      console.warn('Multiplayer init skipped or failed:', err);
    }
  }

  // 로컬 플레이어 상태 전송 (20fps 스로틀링)
  public broadcastState(data: Omit<PlayerData, 'nickname'>) {
    if (!this.playerAction) return;

    const now = performance.now();
    // 50ms (초당 20회) 이상 간격으로만 전송하여 네트워크 부하 방지
    if (now - this.lastBroadcast < 50) return;
    this.lastBroadcast = now;

    const payload: PlayerData = {
      ...data,
      nickname: this.localNickname,
    };

    this.playerAction.send(payload).catch(() => {});
  }

  // 상태 구독
  public subscribe(cb: (players: RemotePlayer[]) => void) {
    this.listeners.add(cb);
    cb(Array.from(this.remotePlayers.values()));
    return () => this.listeners.delete(cb);
  }

  public subscribeCount(cb: (count: number) => void) {
    this.countListeners.add(cb);
    cb(this.remotePlayers.size + 1); // 나 포함
    return () => this.countListeners.delete(cb);
  }

  public getPeerCount(): number {
    return this.remotePlayers.size + 1; // 나 포함 총 접속자 수
  }

  private notifyListeners() {
    const list = Array.from(this.remotePlayers.values());
    for (const listener of this.listeners) {
      listener(list);
    }
  }

  private notifyCount() {
    const count = this.remotePlayers.size + 1;
    for (const listener of this.countListeners) {
      listener(count);
    }
  }
}

export const multiplayer = new MultiplayerManager();
