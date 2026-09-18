export class SafeTimer {
  private startTime: number;
  private lastTime: number;

  constructor() {
    this.startTime = performance.now() / 1000;
    this.lastTime = this.startTime;
  }

  getElapsedTime(): number {
    return performance.now() / 1000 - this.startTime;
  }

  getDelta(): number {
    const now = performance.now() / 1000;
    const delta = now - this.lastTime;
    this.lastTime = now;
    return Math.min(delta, 0.1);
  }

  reset(): void {
    this.startTime = performance.now() / 1000;
    this.lastTime = this.startTime;
  }
}
