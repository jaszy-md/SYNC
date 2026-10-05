import { facilityHudConfig } from './facilityHudConfig.js';

// Timing only; the HUD renders this state without modifying stage progression.
export class HelperSpeech {
  constructor(config = facilityHudConfig.speech) {
    this.config = config;
    this.dismiss();
  }
  speak(text, reducedMotion = false) {
    this.text = text;
    this.elapsed = 0;
    this.reducedMotion = reducedMotion;
    this.visible = true;
  }
  dismiss() {
    this.text = '';
    this.elapsed = 0;
    this.visible = false;
  }
  get typingDuration() {
    return this.reducedMotion ? 0 : this.text.length / this.config.charactersPerSecond;
  }
  get speaking() {
    return this.visible && this.elapsed < this.typingDuration;
  }
  get visibleText() {
    return this.text.slice(
      0,
      this.reducedMotion
        ? this.text.length
        : Math.floor(this.elapsed * this.config.charactersPerSecond),
    );
  }
  get mouthOpen() {
    return this.speaking && Math.floor(this.elapsed / this.config.mouthPeriod) % 2 === 1;
  }
  update(dt) {
    if (!this.visible) return;
    this.elapsed += dt;
    if (this.elapsed >= this.typingDuration + this.config.lingerSeconds) this.visible = false;
  }
}
