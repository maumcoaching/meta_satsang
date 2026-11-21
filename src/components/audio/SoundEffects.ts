// Web Audio API 기반 산사 힐링 사운드 신시사이저
// 외부 음원 파일 다운로드 없이 브라우저 자체 오디오 엔진으로 즉각 연주됩니다.

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientInterval: number | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 음소거 토글
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    } else if (!this.isMuted && !this.ambientInterval) {
      this.startAmbientChimes();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // 1. 목탁 소리 (Moktak / Woodblock)
  public playMoktak() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // 목탁의 특유의 몽글몽글하고 속이 빈 목재 공명음 (주파수 ~820Hz -> ~400Hz 급격한 피치 드롭)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(860, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.08);

    // 대역통과 필터로 나무의 둔탁한 질감 강조
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, t);
    filter.Q.setValueAtTime(3.5, t);

    // 어택과 빠른 감쇠
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // 2. 범종 / 싱잉볼 소리 (Temple Bell / Singing Bowl)
  public playSingingBowl() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const baseFreq = 220; // A3 은은하고 깊은 소리
    const harmonics = [1, 2.76, 5.4, 8.9]; // 종 특유의 비정수 배음 비율
    const gains = [0.25, 0.12, 0.05, 0.02];

    harmonics.forEach((h, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * h, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(gains[i], t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 4.5); // 길게 울려 퍼지는 여운

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 4.6);
    });
  }

  // 3. 은은한 풍경(바람 종소리) 앰비언트 루프
  public startAmbientChimes() {
    if (this.ambientInterval) return;
    this.ambientInterval = window.setInterval(() => {
      if (this.isMuted) return;
      if (Math.random() > 0.45) {
        this.playWindChime();
      }
    }, 4000);
  }

  public playWindChime() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [880, 987, 1174, 1318, 1567, 1760]; // 펜타토닉 맑은 종소리
    const note = notes[Math.floor(Math.random() * notes.length)];
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.00001, t + 2.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 2.3);
  }

  // 4. 발소리 (Footstep)
  public playStep() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.04, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
  }
}

export const sound = new SoundManager();
