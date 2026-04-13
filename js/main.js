import { MapManager } from './modules/MapManager.js';
import { LayerManager } from './modules/LayerManager.js';
import { UIManager } from './modules/UIManager.js';
import { AnimationManager } from './modules/AnimationManager.js';
import { Utils } from './modules/Utils.js';
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

uiManager.setMap(map);

// Restore map position from URL
const urlState2 = Utils.readURLParams();
if (urlState2 && (urlState2.lat !== undefined || urlState2.zoom !== undefined)) {
  const lat = urlState2.lat ?? CONFIG.map.center[0];
  const lng = urlState2.lng ?? CONFIG.map.center[1];
  const zoom = urlState2.zoom ?? CONFIG.map.zoom;
  map.setView([lat, lng], zoom);
}

map.on('click', async (e) => {
  const popup = L.popup({
    className: 'info-pointer',
    closeButton: true,
    autoPan: false
  }).setLatLng(e.latlng)
    .setContent('<div class="loading-pulse">Carregando...</div>')
    .openOn(map);

  const data = await layerManager.getFeatureInfo(e.latlng);

  if (data && data.features && data.features.length > 0) {
    const props = data.features[0].properties;

    let value = null;
    const keys = Object.keys(props);
    if (keys.length > 0) {
      value = props[keys[0]];
    }

    if (value !== null) {
      const formattedValue = typeof value === 'number' ? value.toFixed(1) : value;

      const html = `
        <div class="pointer-content">
          <span class="pointer-label">${layerManager.currentParamName}</span>
          <div class="pointer-value">
            ${formattedValue}
          </div>
          <div class="pointer-coords">
            ${e.latlng.lat.toFixed(3)}, ${e.latlng.lng.toFixed(3)}
          </div>
        </div>
      `;
      popup.setContent(html);
    } else {
      popup.setContent('Sem dados');
    }
  } else {
    popup.setContent('Sem dados aqui');
  }
});

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
  },
  {
    onDownloadTif: () => {
      layerManager.downloadGeoTIFF(uiManager.getState());
    },
    onDownloadSld: () => {
      layerManager.downloadSLD();
    },
    openMetadata: () => {
      uiManager.toggleModal('metadataModal', true);
    },
    openCitation: () => {
      const state = uiManager.getState();
      const citation = Utils.generateABNTCitation(state, CONFIG.parameters, window.location.href.split('?')[0]);
      uiManager.populateCitation(citation);
      uiManager.toggleModal('citationModal', true);
    }
  }
);

updateApp(uiManager.getState());