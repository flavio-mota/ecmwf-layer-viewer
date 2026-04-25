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
// replace default zoom labels with FontAwesome icons
setTimeout(() => {
  const zin = document.querySelector('.leaflet-control-zoom-in');
  const zout = document.querySelector('.leaflet-control-zoom-out');
  if (zin) zin.innerHTML = '<i class="fa-solid fa-plus"></i>';
  if (zout) zout.innerHTML = '<i class="fa-solid fa-minus"></i>';
}, 50);

const layerManager = new LayerManager(map);
layerManager.init();

uiManager.setMap(map);

// --- Leaflet Draw: seleção de retângulo para download WCS ---
let drawnRectangle = null;
let drawnLayerGroup = new L.FeatureGroup();
map.addLayer(drawnLayerGroup);
// drawer state
let currentDrawer = null;
let drawActive = false;
// when true, map click handler should ignore the next click (set by rectangle clicks)
let suppressMapClick = false;
// custom edit state
let isEditingCustom = false;
let _editState = {
  mode: null, // 'move' | 'resize'
  edges: null,
  origBounds: null,
  origMouseLatLng: null,
};

// global helper used from multiple scopes
function updateRectButtonsState() {
  if (window.__updateDrawButtons) window.__updateDrawButtons();
}

// global function to toggle edit visuals/state
function setEditMode(on) {
  if (!drawnRectangle) return;
  if (on) {
    // enable custom edit mode
    isEditingCustom = true;
    drawnRectangle.setStyle({ color: '#ff0000', dashArray: '6', weight: 3 });
    attachCustomEditHandlers();
  } else {
    // disable custom edit mode
    isEditingCustom = false;
    detachCustomEditHandlers();
    drawnRectangle.setStyle({ color: '#ff7800', dashArray: null, weight: 3 });
  }
  updateRectButtonsState();
}

function attachCustomEditHandlers() {
  if (!drawnRectangle) return;
  // store handler refs so we can remove them
  drawnRectangle._customHandlers = drawnRectangle._customHandlers || {};

  const tol = 8; // px tolerance for edge detection

  const onRectMouseDown = function (ev) {
    if (!ev || !ev.latlng) return;
    // stop click from opening popup
    try {
      if (ev.originalEvent) {
        L.DomEvent.stopPropagation(ev.originalEvent);
        L.DomEvent.preventDefault(ev.originalEvent);
      }
    } catch (e) {}

    const pt = map.latLngToContainerPoint(ev.latlng);
    const b = drawnRectangle.getBounds();
    const nw = map.latLngToContainerPoint(b.getNorthWest());
    const ne = map.latLngToContainerPoint(b.getNorthEast());
    const sw = map.latLngToContainerPoint(b.getSouthWest());
    const se = map.latLngToContainerPoint(b.getSouthEast());

    const minX = Math.min(nw.x, sw.x);
    const maxX = Math.max(ne.x, se.x);
    const minY = Math.min(nw.y, ne.y);
    const maxY = Math.max(sw.y, se.y);

    const nearWest = Math.abs(pt.x - minX) <= tol;
    const nearEast = Math.abs(pt.x - maxX) <= tol;
    const nearNorth = Math.abs(pt.y - minY) <= tol;
    const nearSouth = Math.abs(pt.y - maxY) <= tol;

    if (nearWest || nearEast || nearNorth || nearSouth) {
      _editState.mode = 'resize';
      _editState.edges = { west: nearWest, east: nearEast, north: nearNorth, south: nearSouth };
    } else {
      _editState.mode = 'move';
      _editState.edges = null;
    }
    _editState.origBounds = drawnRectangle.getBounds();
    _editState.origMouseLatLng = ev.latlng;
    // disable map interactions while dragging/resizing
    try {
      if (map.dragging && map.dragging.disable) map.dragging.disable();
      if (map.doubleClickZoom && map.doubleClickZoom.disable) map.doubleClickZoom.disable();
      if (map.boxZoom && map.boxZoom.disable) map.boxZoom.disable();
      const container = map.getContainer();
      if (container) container.classList.add('editing-cursor');
    } catch (e) {}
  };

  const onMapMouseMove = function (ev) {
    if (!_editState.mode) return;
    if (!ev || !ev.latlng) return;
    const curr = ev.latlng;
    const ob = _editState.origBounds;
    if (!ob) return;
    let north = ob.getNorth();
    let south = ob.getSouth();
    let west = ob.getWest();
    let east = ob.getEast();

    if (_editState.mode === 'move') {
      const dLat = curr.lat - _editState.origMouseLatLng.lat;
      const dLng = curr.lng - _editState.origMouseLatLng.lng;
      north = ob.getNorth() + dLat;
      south = ob.getSouth() + dLat;
      west = ob.getWest() + dLng;
      east = ob.getEast() + dLng;
    } else if (_editState.mode === 'resize') {
      const edges = _editState.edges;
      if (edges.west) west = curr.lng;
      if (edges.east) east = curr.lng;
      if (edges.north) north = curr.lat;
      if (edges.south) south = curr.lat;
      // prevent inverted bounds
      if (north < south) { const tmp = north; north = south; south = tmp; }
      if (east < west) { const tmp = east; east = west; west = tmp; }
    }

    try {
      drawnRectangle.setBounds(L.latLngBounds([south, west], [north, east]));
    } catch (e) {}
  };

  const onMapMouseUp = function (ev) {
    _editState.mode = null;
    _editState.edges = null;
    _editState.origBounds = null;
    _editState.origMouseLatLng = null;
    // restore map interactions
    try {
      if (map.dragging && map.dragging.enable) map.dragging.enable();
      if (map.doubleClickZoom && map.doubleClickZoom.enable) map.doubleClickZoom.enable();
      if (map.boxZoom && map.boxZoom.enable) map.boxZoom.enable();
      const container = map.getContainer();
      if (container) container.classList.remove('editing-cursor');
    } catch (e) {}
  };

  drawnRectangle._customHandlers.onRectMouseDown = onRectMouseDown;
  drawnRectangle._customHandlers.onMapMouseMove = onMapMouseMove;
  drawnRectangle._customHandlers.onMapMouseUp = onMapMouseUp;

  drawnRectangle.on('mousedown', onRectMouseDown);
  map.on('mousemove', onMapMouseMove);
  map.on('mouseup', onMapMouseUp);
}

function detachCustomEditHandlers() {
  if (!drawnRectangle || !drawnRectangle._customHandlers) return;
  const h = drawnRectangle._customHandlers;
  try { drawnRectangle.off('mousedown', h.onRectMouseDown); } catch (e) {}
  try { map.off('mousemove', h.onMapMouseMove); } catch (e) {}
  try { map.off('mouseup', h.onMapMouseUp); } catch (e) {}
  drawnRectangle._customHandlers = null;
  _editState.mode = null;
}

// Create draw control but disable built-in edit UI — we'll manage edit/remove with custom buttons
const drawControl = new L.Control.Draw({
  position: 'topright',
  draw: {
    rectangle: {
      shapeOptions: { color: '#ff7800' }
    },
    polygon: false,
    polyline: false,
    circle: false,
    marker: false,
    circlemarker: false
  },
  edit: false
});
// Do not add the default Leaflet.Draw control UI — we use a custom L.Control instead

map.on(L.Draw.Event.CREATED, (e) => {
  // keep only one rectangle at a time
  drawnLayerGroup.clearLayers();
  drawnRectangle = e.layer;
  drawnLayerGroup.addLayer(e.layer);

  // ensure default style
  try { drawnRectangle.setStyle({ color: '#ff7800', dashArray: null, weight: 3 }); } catch (e) {}

  // clicking the rectangle toggles editing
  drawnRectangle.on('click', (ev) => {
    if (!drawnRectangle) return;
    // prevent the click from bubbling to the map (avoid opening pointer popup)
    try {
      if (ev && ev.originalEvent) {
        // mark to suppress the next map click and stop DOM propagation
        suppressMapClick = true;
        setTimeout(() => { suppressMapClick = false; }, 50);
        L.DomEvent.stopPropagation(ev.originalEvent);
        L.DomEvent.preventDefault(ev.originalEvent);
      }
    } catch (e) {}
    // toggle custom editing
    if (isEditingCustom) {
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  });


  // if a programmatic drawer was active, disable it now to avoid new draws
  if (currentDrawer) {
    try { currentDrawer.disable(); } catch (err) {}
    currentDrawer = null;
  }
  drawActive = false;

  // try to update UI buttons if available
  if (window.__updateDrawButtons) window.__updateDrawButtons();
  if (typeof updateRectButtonsState === 'function') updateRectButtonsState();
});

map.on('draw:deleted', (e) => {
  drawnRectangle = null;
  updateRectButtonsState();
});

// Bind or create WCS download button
function bindWcsDownload(btn) {
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!drawnRectangle) {
      alert('Selecione um retângulo no mapa para baixar o recorte.');
      return;
    }
    // don't allow download while editing
    if (isEditingCustom) {
      alert('Finalize a edição antes de baixar o recorte.');
      return;
    }
    const bounds = drawnRectangle.getBounds();
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];

    const state = uiManager.getState ? uiManager.getState() : {};
    const param = state.parameter || (CONFIG.parameters ? Object.keys(CONFIG.parameters)[0] : '');
    const paramConfig = CONFIG.parameters[param];
    if (!paramConfig) {
      alert('Parâmetro inválido.');
      return;
    }

    const wcsBase = CONFIG.geoserver.url.replace('/wms', '/wcs');
    let wcsUrl = `${wcsBase}?service=WCS&version=2.0.1&request=GetCoverage` +
      `&coverageId=${CONFIG.geoserver.workspace}:${paramConfig.layerName}` +
      `&format=image/tiff` +
      `&subset=Long(${bbox[0]},${bbox[2]})` +
      `&subset=Lat(${bbox[1]},${bbox[3]})`;

    const validTime = state.date && state.runTime && state.step ? Utils.calculateValidTime(state.date, state.runTime, state.step) : null;
    let url = wcsUrl;
    if (validTime) url += `&subset=time("${validTime}")`;
    if (paramConfig.hasLevels && state.level) url += `&subset=elevation(${state.level})`;

    const paramName = paramConfig.layerName || param;
    const dateStr = validTime ? validTime.split('T')[0] : 'data';
    const levelStr = state.level ? `_lev${state.level}` : '';
    const bboxStr = `_bbox${bbox.map(v => v.toFixed(3)).join('_')}`;
    const filename = `${paramName}_${dateStr}${levelStr}${bboxStr}_recorte.tif`;

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

const existingWcsBtn = document.getElementById('downloadWcsBtn');
if (existingWcsBtn) {
  bindWcsDownload(existingWcsBtn);
} else {
  const controlsDiv = document.querySelector('.tools-section');
  if (controlsDiv) {
    const wcsBtn = document.createElement('button');
    wcsBtn.id = 'downloadWcsBtn';
    wcsBtn.className = 'tool-btn';
    wcsBtn.textContent = 'Download Recorte (WCS)';
    controlsDiv.appendChild(wcsBtn);
    bindWcsDownload(wcsBtn);
  }
}

// --- Draw/Edit buttons as a Leaflet control (topright) ---
let drawBtn = null, editBtn = null;
(function createDrawEditControl() {
  const DrawEditControl = L.Control.extend({
    onAdd: function (map) {
      const container = L.DomUtil.create('div', 'leaflet-bar custom-draw-control');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.margin = '6px';

      // draw button (anchor to match Leaflet controls)
      drawBtn = L.DomUtil.create('a', 'tool-btn', container);
      drawBtn.id = 'drawToggleBtn';
      drawBtn.href = '#';
      drawBtn.title = 'Desenhar / Remover retângulo';
      drawBtn.setAttribute('role', 'button');

      // edit button
      editBtn = L.DomUtil.create('a', 'tool-btn', container);
      editBtn.id = 'editToggleBtn';
      editBtn.href = '#';
      editBtn.title = 'Editar / Confirmar edição';
      editBtn.setAttribute('role', 'button');

      // prevent clicks from bubbling to the map
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      return container;
    }
  });

  map.addControl(new DrawEditControl({ position: 'topright' }));

  // reuse original updateButtons logic, adapted to anchors
  function updateButtons() {
    const hasRect = !!drawnRectangle;
    const iconDraw = '<i class="fa-solid fa-square"></i>';
    const iconCancel = '<i class="fa-solid fa-xmark"></i>';
    const iconTrash = '<i class="fa-solid fa-trash"></i>';

    if (!hasRect) {
      drawBtn.innerHTML = drawActive ? iconCancel : iconDraw;
    } else {
      drawBtn.innerHTML = iconTrash;
    }

    const iconPencil = '<i class="fa-solid fa-pen"></i>';
    const iconCheck = '<i class="fa-solid fa-check"></i>';

    if (!hasRect) {
      editBtn.classList.add('disabled');
      editBtn.innerHTML = iconPencil;
      editBtn.setAttribute('aria-disabled', 'true');
    } else {
      editBtn.classList.remove('disabled');
      editBtn.setAttribute('aria-disabled', 'false');
      const editingOn = isEditingCustom;
      editBtn.innerHTML = editingOn ? iconCheck : iconPencil;
    }
  }

  // expose updateButtons to global so CREATED handler can refresh UI
  window.__updateDrawButtons = updateButtons;

  // Start/stop draw mode
  L.DomEvent.on(drawBtn, 'click', (e) => {
    L.DomEvent.stop(e);
    const hasRect = !!drawnRectangle;
    if (!hasRect) {
      if (!drawActive) {
        currentDrawer = new L.Draw.Rectangle(map, drawControl.options.draw.rectangle);
        currentDrawer.enable();
        drawActive = true;
      } else {
        if (currentDrawer) {
          try { currentDrawer.disable(); } catch (err) {}
          currentDrawer = null;
        }
        drawActive = false;
      }
    } else {
      drawnLayerGroup.clearLayers();
      drawnRectangle = null;
    }
    updateButtons();
  });

  // Edit toggle
  L.DomEvent.on(editBtn, 'click', (e) => {
    L.DomEvent.stop(e);
    if (!drawnRectangle) return;
    const editingOn = isEditingCustom;
    setEditMode(!editingOn);
  });

  // keep buttons in sync when rectangle is created/removed
  map.on(L.Draw.Event.CREATED, () => { drawActive = false; updateButtons(); });
  map.on('draw:deleted', () => { drawActive = false; updateButtons(); });
  map.on('click', () => setTimeout(updateButtons, 50));

  // initial render (will be refreshed by CREATED if needed)
  setTimeout(updateButtons, 50);
})();

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
  if (suppressMapClick) return;
  // if custom editing is active, finalize edit on outside click and suppress popup
  if (isEditingCustom) {
    // finalize edit and do not open popup for this click
    setEditMode(false);
    return;
  }
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