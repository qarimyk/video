import { SleepTimerDuration, SleepTimerState } from '../types';

type SleepTimerListener = (state: SleepTimerState) => void;
type ActionCallback = () => void;
type VolumeFadeCallback = (volumeRatio: number) => void;

class SleepTimerService {
  private state: SleepTimerState = {
    isActive: false,
    durationMode: '30m',
    totalSeconds: 1800,
    remainingSeconds: 1800,
    fadeOutVolume: true,
    targetEndTime: null,
    targetTrigger: 'time',
  };

  private intervalId: any = null;
  private listeners: Set<SleepTimerListener> = new Set();
  private onPausePlaybackCallback: ActionCallback | null = null;
  private onVolumeFadeCallback: VolumeFadeCallback | null = null;

  constructor() {
    // Initial state
  }

  public getState(): SleepTimerState {
    return { ...this.state };
  }

  public subscribe(listener: SleepTimerListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const copy = this.getState();
    this.listeners.forEach((l) => l(copy));
  }

  public registerCallbacks(
    onPause: ActionCallback,
    onVolumeFade?: VolumeFadeCallback
  ) {
    this.onPausePlaybackCallback = onPause;
    if (onVolumeFade) {
      this.onVolumeFadeCallback = onVolumeFade;
    }
  }

  /**
   * Start or update the sleep timer
   */
  public startTimer(
    duration: SleepTimerDuration,
    customMinutes: number = 30,
    fadeOutVolume: boolean = true
  ) {
    this.clearTimer();

    let totalSecs = 1800;
    let triggerType: 'time' | 'end-of-media' | 'end-of-playlist' = 'time';

    if (duration === '15m') totalSecs = 15 * 60;
    else if (duration === '30m') totalSecs = 30 * 60;
    else if (duration === '45m') totalSecs = 45 * 60;
    else if (duration === '60m') totalSecs = 60 * 60;
    else if (duration === 'custom') totalSecs = Math.max(1, Math.round(customMinutes)) * 60;
    else if (duration === 'end-of-media') {
      totalSecs = 0;
      triggerType = 'end-of-media';
    } else if (duration === 'end-of-playlist') {
      totalSecs = 0;
      triggerType = 'end-of-playlist';
    }

    const now = Date.now();
    const targetEndTime = triggerType === 'time' ? now + totalSecs * 1000 : null;

    this.state = {
      isActive: true,
      durationMode: duration,
      totalSeconds: totalSecs,
      remainingSeconds: totalSecs,
      fadeOutVolume,
      targetEndTime,
      targetTrigger: triggerType,
    };

    this.notify();

    if (triggerType === 'time') {
      this.intervalId = setInterval(() => {
        this.tick();
      }, 1000);
    }
  }

  private tick() {
    if (!this.state.isActive || !this.state.targetEndTime) {
      this.clearTimer();
      return;
    }

    const now = Date.now();
    const remainingMs = this.state.targetEndTime - now;
    const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

    this.state.remainingSeconds = remainingSecs;

    // Handle smooth volume fade-out over final 30 seconds
    if (this.state.fadeOutVolume && this.onVolumeFadeCallback) {
      if (remainingSecs <= 30 && remainingSecs > 0) {
        const volumeFactor = Math.max(0, remainingSecs / 30);
        this.onVolumeFadeCallback(volumeFactor);
      }
    }

    if (remainingSecs <= 0) {
      this.triggerSleep();
    } else {
      this.notify();
    }
  }

  /**
   * Called when a track / video finishes naturally
   */
  public onMediaEnded(isPlaylistEnd: boolean = false) {
    if (!this.state.isActive) return;

    if (this.state.targetTrigger === 'end-of-media') {
      this.triggerSleep();
    } else if (this.state.targetTrigger === 'end-of-playlist' && isPlaylistEnd) {
      this.triggerSleep();
    }
  }

  /**
   * Trigger sleep: pauses audio/video and resets state
   */
  public triggerSleep() {
    this.clearTimer();
    this.state = {
      ...this.state,
      isActive: false,
      remainingSeconds: 0,
      targetEndTime: null,
    };

    if (this.onPausePlaybackCallback) {
      this.onPausePlaybackCallback();
    }

    // Reset volume ratio
    if (this.onVolumeFadeCallback) {
      this.onVolumeFadeCallback(1.0);
    }

    this.notify();
  }

  /**
   * Cancel and deactivate sleep timer
   */
  public cancelTimer() {
    this.clearTimer();
    this.state = {
      ...this.state,
      isActive: false,
      remainingSeconds: 0,
      targetEndTime: null,
    };

    if (this.onVolumeFadeCallback) {
      this.onVolumeFadeCallback(1.0);
    }

    this.notify();
  }

  private clearTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public formatRemainingTime(): string {
    if (!this.state.isActive) return '';
    if (this.state.targetTrigger === 'end-of-media') return 'End of Video';
    if (this.state.targetTrigger === 'end-of-playlist') return 'End of Playlist';

    const s = this.state.remainingSeconds;
    const mins = Math.floor(s / 60);
    const remSecs = s % 60;
    return `${mins}:${remSecs.toString().padStart(2, '0')}`;
  }
}

export const sleepTimer = new SleepTimerService();
