import { MapManager } from './modules/MapManager.js';
import { LayerManager } from './modules/LayerManager.js';
import { UIManager } from './modules/UIManager.js';
import { AnimationManager } from './modules/AnimationManager.js';
import { CONFIG } from './config.js';

const mapManager = new MapManager(CONFIG);
const uiManager = new UIManager();

const animationManager = new AnimationManager(
  (newState) => updateApp(newState),
  (newState) => uiManager.setState(newState)
);

const map = mapManager.init('map');

const layerManager = new LayerManager(map);
layerManager.init();

function updateApp(state) {
  if (state.opacity !== undefined) {
    layerManager.setOpacity(state.opacity);
    return;
  }

  const result = layerManager.update({
    parameter: state.parameter,
    date: state.date,
    runTime: state.runTime,
    step: state.step,
    level: state.level
  });

  if (result) {
    uiManager.updateDashboard(result);
  }
}

uiManager.init(
  (newState) => {
    updateApp(newState);
  },
  (action, value) => {
    const state = uiManager.getState();

    if (action === 'play') {
      uiManager.setPlaying(true);
      animationManager.start(state.animType, state);
    } else if (action === 'stop') {
      uiManager.setPlaying(false);
      animationManager.stop();
    } else if (action === 'type') {
      if (animationManager.timer) {
        animationManager.stop();
        animationManager.start(value, state);
      }
    }
  }
);

updateApp(uiManager.getState());