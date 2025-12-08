let map;
let currentLayer = null;
let animationInterval = null;
let currentStepIndex = 0;

// Inicializa o mapa
function initMap() {
  map = L.map("map").setView(CONFIG.map.center, CONFIG.map.zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: CONFIG.map.maxZoom,
    minZoom: CONFIG.map.minZoom,
  }).addTo(map);
}

// Popula os dropdowns
function populateControls() {
  const dates = Object.keys(CONFIG.data);
  const dateSelect = document.getElementById("dateSelect");

  dates.forEach((date) => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = formatDate(date);
    dateSelect.appendChild(option);
  });

  // Popula níveis
  const levelSelect = document.getElementById("levelSelect");
  CONFIG.levels.forEach((level) => {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = `${level} hPa`;
    if (level === 850) option.selected = true; // Nível padrão
    levelSelect.appendChild(option);
  });

  // Atualiza run times quando data muda
  dateSelect.addEventListener("change", updateRunTimeSelect);
  
  // Atualiza steps quando run time muda
  const runTimeSelect = document.getElementById("runTimeSelect");
  runTimeSelect.addEventListener("change", updateStepSelect);
  
  updateRunTimeSelect();
}

function updateRunTimeSelect() {
  const date = document.getElementById("dateSelect").value;
  const runTimeSelect = document.getElementById("runTimeSelect");
  runTimeSelect.innerHTML = "";

  if (date && CONFIG.data[date]) {
    const runTimes = Object.keys(CONFIG.data[date]).sort();
    runTimes.forEach((runTime) => {
      const option = document.createElement("option");
      option.value = runTime;
      option.textContent = `${runTime}h`;
      runTimeSelect.appendChild(option);
    });
    
    updateStepSelect();
  }
}

function updateStepSelect() {
  const date = document.getElementById("dateSelect").value;
  const runTime = document.getElementById("runTimeSelect").value;
  const stepSelect = document.getElementById("stepSelect");
  stepSelect.innerHTML = "";

  if (date && runTime && CONFIG.data[date]?.[runTime]) {
    const steps = Object.keys(CONFIG.data[date][runTime]).sort(
      (a, b) => Number(a) - Number(b)
    );
    steps.forEach((step) => {
      const option = document.createElement("option");
      option.value = step;
      option.textContent = `${step}h`;
      stepSelect.appendChild(option);
    });
  }
}

// Carrega e exibe um GeoTIFF
async function loadGeoTIFF(url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const data = await image.readRasters();
    const bbox = image.getBoundingBox();

    return {
      data: data[0], // primeiro band
      width: image.getWidth(),
      height: image.getHeight(),
      bbox: bbox,
    };
  } catch (error) {
    console.error("Erro ao carregar GeoTIFF:", error);
    return null;
  }
}

// Renderiza os dados no mapa
async function renderLayer() {
  const date = document.getElementById("dateSelect").value;
  const runTime = document.getElementById("runTimeSelect").value;
  const step = document.getElementById("stepSelect").value;
  const level = document.getElementById("levelSelect").value;

  if (!date || !runTime || !step || !level) return;

  const url = CONFIG.data[date]?.[runTime]?.[step]?.[level];
  if (!url) {
    console.warn("Arquivo não encontrado:", { date, runTime, step, level });
    updateInfo(date, runTime, step, level, "Arquivo não encontrado");
    return;
  }

  updateInfo(date, runTime, step, level, "Carregando...");
  const geoData = await loadGeoTIFF(url);
  if (!geoData) {
    updateInfo(date, runTime, step, level, "Erro ao carregar arquivo");
    return;
  }

  // Remove camada anterior
  if (currentLayer) {
    map.removeLayer(currentLayer);
  }

  // Cria canvas com os dados
  const canvas = document.createElement("canvas");
  canvas.width = geoData.width;
  canvas.height = geoData.height;
  const ctx = canvas.getContext("2d");

  // Renderiza com escala de cores usando Plotty ou fallback
  if (typeof plotty !== "undefined" && plotty.plot) {
    // Usa Plotty se disponível
    const scaleArray = buildPlottyScale(CONFIG.colorScale || "viridis");
    const plot = new plotty.plot({
      canvas: canvas,
      data: geoData.data,
      width: geoData.width,
      height: geoData.height,
      domain: [0, 1],
      colorScale: scaleArray,
    });
    plot.render();
  } else {
    // Fallback: renderização manual com paleta configurável
    console.warn("Plotty não disponível, usando renderização manual");
    renderPalette(
      canvas,
      geoData.data,
      geoData.width,
      geoData.height,
      CONFIG.colorScale || "viridis"
    );
  }

  // Adiciona ao mapa
  const bounds = [
    [geoData.bbox[1], geoData.bbox[0]], // SW
    [geoData.bbox[3], geoData.bbox[2]], // NE
  ];

  currentLayer = L.imageOverlay(canvas.toDataURL(), bounds, {
    opacity: document.getElementById("opacitySlider").value / 100,
  }).addTo(map);

  // Atualiza info
  updateInfo(date, runTime, step, level);
}

// Atualiza informações exibidas
function updateInfo(date, runTime, step, level, status = null) {
  const info = document.getElementById("currentInfo");
  let html = `
        <strong>Data:</strong> ${formatDate(date)}<br>
        <strong>Run time:</strong> ${runTime}h<br>
        <strong>Step:</strong> ${step}h<br>
        <strong>Nível:</strong> ${level} hPa
    `;
  if (status) {
    html += `<br><span style="color: ${
      status.includes("Erro") ? "#dc3545" : "#666"
    }; font-size: 11px;">${status}</span>`;
  }
  info.innerHTML = html;
}

// Formata data para exibição
function formatDate(dateStr) {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${day}/${month}/${year}`;
}

// Renderização manual com paletas (fallback)
function renderPalette(canvas, data, width, height, paletteName = "viridis") {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);

  // Dados já normalizados em [0,1]
  function clamp01(t) {
    return Math.max(0, Math.min(1, t));
  }

  function viridisColor(t) {
    t = clamp01(t);
    const r = Math.floor(68 + (253 - 68) * (1 - Math.pow(1 - t, 2)));
    const g = Math.floor(1 + (231 - 1) * (1 - Math.pow(1 - t, 1.5)));
    const b = Math.floor(84 + (37 - 84) * Math.pow(t, 2));
    return [r, g, b];
  }

  function bluesColor(t) {
    // Gradiente simples de branco → azul escuro
    t = clamp01(t);
    const r = Math.floor(255 * (1 - t));
    const g = Math.floor(255 * (1 - t));
    const b = Math.floor(255);
    // Ajuste para tons mais ricos de azul
    const b2 = Math.floor(200 + 55 * t); // 200→255
    return [r, g, b2];
  }

  function infernoColor(t) {
    // Opcional: outra paleta quente simples
    t = clamp01(t);
    const r = Math.floor(30 + 225 * t);
    const g = Math.floor(10 + 60 * Math.pow(t, 1.5));
    const b = Math.floor(30 + 80 * (1 - t));
    return [r, g, b];
  }

  function magmaColor(t) {
    t = clamp01(t);
    // Simplified magma approximation
    const r = Math.floor(50 + 205 * t);
    const g = Math.floor(10 + 40 * Math.pow(t, 1.3));
    const b = Math.floor(60 + 70 * (1 - t));
    return [r, g, b];
  }

  function plasmaColor(t) {
    t = clamp01(t);
    const r = Math.floor(60 + 195 * t);
    const g = Math.floor(0 + 255 * Math.pow(t, 0.5) * (1 - (1 - t) * 0.3));
    const b = Math.floor(130 + 80 * (1 - t));
    return [r, g, b];
  }

  function turboColor(t) {
    // Google Turbo approximation
    t = clamp01(t);
    const r = Math.floor(34 + 220 * t - 120 * t * (1 - t));
    const g = Math.floor(31 + 230 * Math.pow(t, 1.2) * (1 - 0.4 * (1 - t)));
    const b = Math.floor(60 + 240 * (1 - t) - 100 * t * (1 - t));
    return [r, g, b];
  }

  function cubehelixColor(t) {
    // Simple cubehelix-like spiral
    t = clamp01(t);
    const angle = 2 * Math.PI * (0.5 + t);
    const r = Math.floor(255 * clamp01(t + 0.1 * Math.cos(angle)));
    const g = Math.floor(255 * clamp01(t + 0.1 * Math.cos(angle + 2)));
    const b = Math.floor(255 * clamp01(t + 0.1 * Math.cos(angle + 4)));
    return [r, g, b];
  }

  const pickColor = (t) => {
    switch ((paletteName || "").toLowerCase()) {
      case "blues":
        return bluesColor(t);
      case "inferno":
        return infernoColor(t);
      case "magma":
        return magmaColor(t);
      case "plasma":
        return plasmaColor(t);
      case "turbo":
        return turboColor(t);
      case "cubehelix":
        return cubehelixColor(t);
      case "viridis":
      default:
        return viridisColor(t);
    }
  };

  const tThresh = getTransparentThreshold();
  for (let i = 0; i < data.length; i++) {
    let v = data[i];
    if (!Number.isFinite(v)) v = 0.0;
    const [r, g, b] = pickColor(v);
    const idx = i * 4;
    imageData.data[idx] = r;
    imageData.data[idx + 1] = g;
    imageData.data[idx + 2] = b;
    // Transparente se valor <= threshold
    imageData.data[idx + 3] = v <= tThresh ? 0 : 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

// Animação
function startAnimation() {
  const stepSelect = document.getElementById("stepSelect");
  const steps = Array.from(stepSelect.options).map((o) => o.value);
  currentStepIndex = 0;

  document.getElementById("playBtn").disabled = true;
  document.getElementById("stopBtn").disabled = false;

  animationInterval = setInterval(() => {
    stepSelect.value = steps[currentStepIndex];
    renderLayer();

    currentStepIndex++;
    if (currentStepIndex >= steps.length) {
      currentStepIndex = 0; // Loop
    }
  }, CONFIG.animation.interval);
}

function stopAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
  document.getElementById("playBtn").disabled = false;
  document.getElementById("stopBtn").disabled = true;
}

// Verifica se as bibliotecas necessárias estão carregadas
function checkLibraries() {
  if (typeof L === "undefined") {
    console.error("Leaflet não foi carregado!");
    return false;
  }
  if (typeof GeoTIFF === "undefined") {
    console.error("GeoTIFF.js não foi carregado!");
    return false;
  }
  if (typeof plotty === "undefined") {
    console.warn("Plotty não foi carregado, usando renderização manual");
  }
  return true;
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  if (!checkLibraries()) {
    document.getElementById("currentInfo").innerHTML =
      '<span style="color: red;">Erro: Bibliotecas não carregadas. Verifique o console.</span>';
    return;
  }

  initMap();
  populateControls();
  // Ajusta paleta inicial no dropdown, se existir
  const paletteSelect = document.getElementById("paletteSelect");
  if (paletteSelect) {
    paletteSelect.value = (CONFIG.colorScale || "viridis").toLowerCase();
    paletteSelect.addEventListener("change", (e) => {
      CONFIG.colorScale = e.target.value;
      setLegendGradient(CONFIG.colorScale);
      renderLayer();
    });
  }

  // Inicializa legenda conforme paleta atual
  setLegendGradient(CONFIG.colorScale || "viridis");

  document.getElementById("dateSelect").addEventListener("change", renderLayer);
  document.getElementById("runTimeSelect").addEventListener("change", renderLayer);
  document.getElementById("stepSelect").addEventListener("change", renderLayer);
  document
    .getElementById("levelSelect")
    .addEventListener("change", renderLayer);

  document.getElementById("opacitySlider").addEventListener("input", (e) => {
    document.getElementById("opacityValue").textContent = `${e.target.value}%`;
    if (currentLayer) {
      currentLayer.setOpacity(e.target.value / 100);
    }
  });

  document.getElementById("playBtn").addEventListener("click", startAnimation);
  document.getElementById("stopBtn").addEventListener("click", stopAnimation);

  // Renderiza inicial
  renderLayer();
});

// Helpers de transparência/legenda
function getTransparentThreshold() {
  // Threshold de valor para considerar transparente (0..1)
  const t = Number(
    (typeof CONFIG !== 'undefined' && (CONFIG.transparentZeroThreshold ?? CONFIG.transparentThreshold)) ?? 0
  );
  if (Number.isFinite(t) && t >= 0 && t <= 1) return t;
  return 0;
}

function getLegendTransparentPercent() {
  // Percentual visual da faixa transparente na legenda (0..100)
  const p = Number(
    (typeof CONFIG !== 'undefined' && (CONFIG.legendTransparentPercent ?? CONFIG.transparentPercent)) ?? NaN
  );
  if (Number.isFinite(p) && p >= 0 && p <= 100) return p;
  const t = getTransparentThreshold();
  // Se threshold > 0, usa equivalente em %; senão um valor visual mínimo
  return t > 0 ? Math.round(t * 100) : 10;
}

// Atualiza o gradiente da legenda conforme a paleta
function setLegendGradient(paletteName) {
  const el = document.getElementById("legendScale");
  if (!el) return;
  const name = (paletteName || "viridis").toLowerCase();

  // Define cores-chave por paleta (sem transparência)
  function paletteStops(nm) {
    switch (nm) {
      case "blues":
        return ["#ffffff", "#cfe8ff", "#80bfff", "#3399ff", "#0d47a1"];
      case "inferno":
        return ["#000004", "#1f0c48", "#550f6d", "#88226a", "#b6375f", "#e1593a", "#fb9b06", "#fcf000"];
      case "magma":
        return ["#000004", "#2c105c", "#731f6f", "#b63679", "#e65461", "#fb8761", "#fec287", "#fbe6c4"];
      case "plasma":
        return ["#0d0887", "#5b02a3", "#9a179b", "#cb4679", "#ed7953", "#fb9f3a", "#fdc527", "#f0f921"];
      case "turbo":
        return ["#23171b", "#3e1f5a", "#6d40a4", "#9677c3", "#b9b5d2", "#cdd8cc", "#d5e9b2", "#d7f879"];
      case "cubehelix":
        return ["#000000", "#27354f", "#226d5c", "#4fa84b", "#d7ce46", "#d88933", "#c74f47", "#ffffff"];
      case "viridis":
      default:
        return ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
    }
  }

  const colors = paletteStops(name);
  const zeroPct = getLegendTransparentPercent();
  // Monta gradient com região inicial transparente e depois as cores da paleta
  const parts = [
    `rgba(0,0,0,0) 0%`,
    `rgba(0,0,0,0) ${zeroPct}%`,
  ];
  const step = (100 - zeroPct) / (colors.length - 1);
  colors.forEach((c, i) => {
    const pos = zeroPct + i * step;
    parts.push(`${c} ${pos}%`);
  });
  const paletteGradient = `linear-gradient(to right, ${parts.join(", ")})`;

  // Checkerboard para indicar transparência por baixo do gradiente
  const checker = [
    "linear-gradient(45deg, #eee 25%, transparent 25%)",
    "linear-gradient(-45deg, #eee 25%, transparent 25%)",
    "linear-gradient(45deg, transparent 75%, #eee 75%)",
    "linear-gradient(-45deg, transparent 75%, #eee 75%)",
  ].join(", ");

  el.style.backgroundImage = `${paletteGradient}, ${checker}`;
  el.style.backgroundSize = `auto, 10px 10px, 10px 10px, 10px 10px, 10px 10px`;
  el.style.backgroundPosition = `0 0, 0 0, 5px 5px, 5px 5px`;
  el.style.backgroundColor = `#ffffff`;

  // Atualiza rótulos conforme threshold
  const labels = document.querySelectorAll('.legend .legend-labels span');
  const t = getTransparentThreshold();
  if (labels && labels.length >= 5) {
    if (t > 0) {
      labels[0].textContent = `≤ ${t.toFixed(2)} (transp.)`;
    } else {
      labels[0].textContent = '0 (transp.)';
    }
    for (let i = 1; i < 5; i++) {
      const v = t + (i * (1 - t)) / 4;
      labels[i].textContent = v.toFixed(2);
    }
  }
}

// Constrói escala para Plotty com transparência no zero
function buildPlottyScale(name) {
  const n = 12; // número de amostras totais (maior para suavidade)
  const t = getTransparentThreshold();
  const k = Math.max(1, Math.round(n * t)); // slots transparentes no início
  const arr = [];
  for (let i = 0; i < k; i++) arr.push("#00000000");
  function sample(fn) {
    const steps = n - arr.length;
    for (let i = 1; i <= steps; i++) {
      const tt = i / steps;
      const [r, g, b] = fn(tt);
      const hex =
        "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
      arr.push(hex);
    }
  }
  // Reusa funções já definidas dentro renderPalette? Simples: duplicar lógicas mínimas
  function viridis(t) {
    t = Math.max(0, Math.min(1, t));
    const r = Math.floor(68 + (253 - 68) * (1 - Math.pow(1 - t, 2)));
    const g = Math.floor(1 + (231 - 1) * (1 - Math.pow(1 - t, 1.5)));
    const b = Math.floor(84 + (37 - 84) * Math.pow(t, 2));
    return [r, g, b];
  }
  function blues(t) {
    t = Math.max(0, Math.min(1, t));
    const r = Math.floor(255 * (1 - t));
    const g = Math.floor(255 * (1 - t));
    const b2 = Math.floor(200 + 55 * t);
    return [r, g, b2];
  }
  function inferno(t) {
    t = Math.max(0, Math.min(1, t));
    const r = Math.floor(30 + 225 * t);
    const g = Math.floor(10 + 60 * Math.pow(t, 1.5));
    const b = Math.floor(30 + 80 * (1 - t));
    return [r, g, b];
  }
  function magma(t) {
    t = Math.max(0, Math.min(1, t));
    const r = Math.floor(50 + 205 * t);
    const g = Math.floor(10 + 40 * Math.pow(t, 1.3));
    const b = Math.floor(60 + 70 * (1 - t));
    return [r, g, b];
  }
  function plasma(t) {
    t = Math.max(0, Math.min(1, t));
    const r = Math.floor(60 + 195 * t);
    const g = Math.floor(0 + 255 * Math.pow(t, 0.5) * (1 - (1 - t) * 0.3));
    const b = Math.floor(130 + 80 * (1 - t));
    return [r, g, b];
  }
  function turbo(t) {
    t = Math.max(0, Math.min(1, t));
    const r = Math.floor(34 + 220 * t - 120 * t * (1 - t));
    const g = Math.floor(31 + 230 * Math.pow(t, 1.2) * (1 - 0.4 * (1 - t)));
    const b = Math.floor(60 + 240 * (1 - t) - 100 * t * (1 - t));
    return [r, g, b];
  }
  function cubehelix(t) {
    t = Math.max(0, Math.min(1, t));
    const angle = 2 * Math.PI * (0.5 + t);
    const r = Math.floor(255 * Math.max(0, Math.min(1, t + 0.1 * Math.cos(angle))));
    const g = Math.floor(255 * Math.max(0, Math.min(1, t + 0.1 * Math.cos(angle + 2))));
    const b = Math.floor(255 * Math.max(0, Math.min(1, t + 0.1 * Math.cos(angle + 4))));
    return [r, g, b];
  }
  switch ((name || "").toLowerCase()) {
    case "blues":
      sample(blues); break;
    case "inferno":
      sample(inferno); break;
    case "magma":
      sample(magma); break;
    case "plasma":
      sample(plasma); break;
    case "turbo":
      sample(turbo); break;
    case "cubehelix":
      sample(cubehelix); break;
    case "viridis":
    default:
      sample(viridis); break;
  }
  return arr;
}
