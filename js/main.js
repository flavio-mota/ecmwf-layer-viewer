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

// Inicializa o mapa e move controles para a direita
const map = mapManager.init('map');
map.zoomControl.setPosition('topright');

const layerManager = new LayerManager(map);
layerManager.init();

uiManager.setMap(map);

// --- Leaflet Draw: seleção de retângulo para download WCS ---
let drawnRectangle = null;
let drawnLayerGroup = new L.FeatureGroup();
map.addLayer(drawnLayerGroup);

const drawControl = new L.Control.Draw({
  position: 'topright',
  draw: {
    polygon: false,
    polyline: false,
    circle: false,
    marker: false,
    circlemarker: false,
    rectangle: {
      shapeOptions: {
        color: '#007bff',
        weight: 2,
        fillOpacity: 0.1
      }
    }
  },
  edit: {
    featureGroup: drawnLayerGroup,
    edit: false,
    remove: true
  }
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (e) {
  if (drawnRectangle) {
    drawnLayerGroup.removeLayer(drawnRectangle);
  }
  drawnRectangle = e.layer;
  drawnLayerGroup.addLayer(drawnRectangle);
});

map.on('draw:deleted', function () {
  drawnRectangle = null;
});

// Botão para download WCS
const controlsDiv = document.querySelector('.tools-section');
if (controlsDiv) {
  const wcsBtn = document.createElement('button');
  wcsBtn.id = 'downloadWcsBtn';
  wcsBtn.className = 'tool-btn';
  wcsBtn.textContent = 'Download Recorte (WCS)';
  controlsDiv.appendChild(wcsBtn);

  wcsBtn.addEventListener('click', async () => {
    if (!drawnRectangle) {
      alert('Selecione um retângulo no mapa para baixar o recorte.');
      return;
    }
    // Obtém bounding box em EPSG:4326
    const bounds = drawnRectangle.getBounds();
    const bbox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ];
    // Parâmetros atuais
    const state = uiManager.getState ? uiManager.getState() : {};
    const param = state.parameter || (CONFIG.parameters ? Object.keys(CONFIG.parameters)[0] : '');
    const paramConfig = CONFIG.parameters[param];
    if (!paramConfig) {
      alert('Parâmetro inválido.');
      return;
    }
    // Monta URL WCS básica (corrigido para Long/Lat)
    const wcsUrl = `${CONFIG.geoserver.url}?service=WCS&version=2.0.1&request=GetCoverage` +
      `&coverageId=${CONFIG.geoserver.workspace}:${paramConfig.layerName}` +
      `&format=image/tiff` +
      `&subset=Long(${bbox[0]},${bbox[2]})` +
      `&subset=Lat(${bbox[1]},${bbox[3]})`;
    // Adiciona tempo e nível se aplicável
    const validTime = state.date && state.runTime && state.step ?
      Utils.calculateValidTime(state.date, state.runTime, state.step) : null;
    let url = wcsUrl;
    if (validTime) url += `&subset=time(\"${validTime}\")`;
    if (paramConfig.hasLevels && state.level) url += `&subset=elevation(${state.level})`;

    // Nome descritivo para o arquivo
    const paramName = paramConfig.layerName || param;
    const dateStr = validTime ? validTime.split('T')[0] : 'data';
    const levelStr = state.level ? `_lev${state.level}` : '';
    const bboxStr = `_bbox${bbox.map(v => v.toFixed(3)).join('_')}`;
    const filename = `${paramName}_${dateStr}${levelStr}${bboxStr}_recorte.tif`;

    // Download via fetch + Blob
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Erro ao baixar arquivo WCS');
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      alert('Erro ao baixar recorte WCS.');
    }
  });
}

// Variável global para a instância do gráfico do meteograma
let meteogramChartInstance = null;

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
          <button class="tool-btn" style="margin-top: 10px; width: 100%;" onclick="window.openMeteogram(${e.latlng.lat}, ${e.latlng.lng})">
             📊 Meteograma
          </button>
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

// Função global para desenhar o meteograma ao clicar no botão do popup
window.openMeteogram = async (lat, lng) => {
  const state = uiManager.getState();
  const paramConfig = CONFIG.parameters[state.parameter];

  // Fecha o popup do mapa e abre o modal do meteograma
  map.closePopup();
  uiManager.toggleModal('meteogramModal', true);
  
  const titleEl = document.getElementById('meteogramTitle');
  if (titleEl) {
    titleEl.innerHTML = `<span class="loading-pulse">A extrair série temporal...</span>`;
  }

  // Se já existir um gráfico, destrói para renderizar um novo sem sobreposição
  if (meteogramChartInstance) {
    meteogramChartInstance.destroy();
  }

  // Vai buscar os dados através da nova função no LayerManager
  const seriesData = await layerManager.getMeteogramData(state, lat, lng);

  // Prepara os dados (Labels: steps, Values: valores retornados)
  const labels = seriesData.map(d => `+${d.step}h`);
  const values = seriesData.map(d => d.value);

  if (titleEl) {
    titleEl.textContent = `Meteograma: ${paramConfig.name} (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
  }

  // Renderiza o gráfico
  const ctx = document.getElementById('meteogramChart').getContext('2d');
  meteogramChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: paramConfig.name,
        data: values,
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#007bff',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: paramConfig.name }
        },
        x: {
          title: { display: true, text: 'Forecast Step' }
        }
      }
    }
  });
};

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