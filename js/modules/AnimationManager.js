import { CONFIG } from '../config.js';

export class AnimationManager {
  constructor(updateCallback, uiCallback) {
    this.timer = null;
    this.updateCallback = updateCallback;
    this.uiCallback = uiCallback;
    this.interval = CONFIG.animation.interval;
  }

  start(type, currentState) {
    this.stop();

    let list = [];
    let key = '';

    if (type === 'steps') {
      list = CONFIG.steps;
      key = 'step';
    } else {
      list = CONFIG.levels;
      key = 'level';
    }

    let currentIndex = list.indexOf(Number(currentState[key]));
    if (currentIndex === -1) currentIndex = 0;

    this.timer = setInterval(() => {
      currentIndex++;
      if (currentIndex >= list.length) currentIndex = 0;

      const newValue = list[currentIndex];

      const newState = { ...currentState };
      newState[key] = newValue;

      this.uiCallback(newState);
      this.updateCallback(newState);

      currentState = newState;

    }, this.interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}