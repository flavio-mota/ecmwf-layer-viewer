let map;
let currentLayer = null;
let animationInterval = null;
let currentStepIndex = 0;

// Inicializa o mapa
function initMap() {
    map = L.map('map').setView(CONFIG.map.center, CONFIG.map.zoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: CONFIG.map.maxZoom,
        minZoom: CONFIG.map.minZoom
    }).addTo(map);
}

// Popula os dropdowns
function populateControls() {
    const dates = Object.keys(CONFIG.data);
    const dateSelect = document.getElementById('dateSelect');
    
    dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatDate(date);
        dateSelect.appendChild(option);
    });
    
    // Popula níveis
    const levelSelect = document.getElementById('levelSelect');
    CONFIG.levels.forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = `${level} hPa`;
        if (level === 850) option.selected = true;  // Nível padrão
        levelSelect.appendChild(option);
    });
    
    // Atualiza steps quando data muda
    dateSelect.addEventListener('change', updateStepSelect);
    updateStepSelect();
}

function updateStepSelect() {
    const date = document.getElementById('dateSelect').value;
    const stepSelect = document.getElementById('stepSelect');
    stepSelect.innerHTML = '';
    
    if (date && CONFIG.data[date]) {
        const steps = Object.keys(CONFIG.data[date]).sort((a, b) => Number(a) - Number(b));
        steps.forEach(step => {
            const option = document.createElement('option');
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
            data: data[0],  // primeiro band
            width: image.getWidth(),
            height: image.getHeight(),
            bbox: bbox
        };
    } catch (error) {
        console.error('Erro ao carregar GeoTIFF:', error);
        return null;
    }
}

// Renderiza os dados no mapa
async function renderLayer() {
    const date = document.getElementById('dateSelect').value;
    const step = document.getElementById('stepSelect').value;
    const level = document.getElementById('levelSelect').value;
    
    if (!date || !step || !level) return;
    
    const url = CONFIG.data[date]?.[step]?.[level];
    if (!url) {
        console.warn('Arquivo não encontrado:', { date, step, level });
        updateInfo(date, step, level, 'Arquivo não encontrado');
        return;
    }
    
    updateInfo(date, step, level, 'Carregando...');
    const geoData = await loadGeoTIFF(url);
    if (!geoData) {
        updateInfo(date, step, level, 'Erro ao carregar arquivo');
        return;
    }
    
    // Remove camada anterior
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }
    
    // Cria canvas com os dados
    const canvas = document.createElement('canvas');
    canvas.width = geoData.width;
    canvas.height = geoData.height;
    const ctx = canvas.getContext('2d');
    
    // Renderiza com escala de cores usando Plotty ou fallback
    if (typeof plotty !== 'undefined' && plotty.plot) {
        // Usa Plotty se disponível
        const plot = new plotty.plot({
            canvas: canvas,
            data: geoData.data,
            width: geoData.width,
            height: geoData.height,
            domain: [0, 1],
            colorScale: CONFIG.colorScale || 'viridis'
        });
        plot.render();
    } else {
        // Fallback: renderização manual com escala viridis
        console.warn('Plotty não disponível, usando renderização manual');
        renderViridis(canvas, geoData.data, geoData.width, geoData.height);
    }
    
    // Adiciona ao mapa
    const bounds = [
        [geoData.bbox[1], geoData.bbox[0]],  // SW
        [geoData.bbox[3], geoData.bbox[2]]   // NE
    ];
    
    currentLayer = L.imageOverlay(canvas.toDataURL(), bounds, {
        opacity: document.getElementById('opacitySlider').value / 100
    }).addTo(map);
    
    // Atualiza info
    updateInfo(date, step, level);
}

// Atualiza informações exibidas
function updateInfo(date, step, level, status = null) {
    const info = document.getElementById('currentInfo');
    let html = `
        <strong>Data:</strong> ${formatDate(date)}<br>
        <strong>Step:</strong> ${step}h<br>
        <strong>Nível:</strong> ${level} hPa
    `;
    if (status) {
        html += `<br><span style="color: ${status.includes('Erro') ? '#dc3545' : '#666'}; font-size: 11px;">${status}</span>`;
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

// Renderização manual com escala viridis (fallback)
function renderViridis(canvas, data, width, height) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    
    // Normaliza os dados para 0-1
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    // Função para converter valor normalizado (0-1) para cor viridis
    function viridisColor(t) {
        // Aproximação da paleta viridis
        t = Math.max(0, Math.min(1, t));
        const r = Math.floor(68 + (253 - 68) * (1 - Math.pow(1 - t, 2)));
        const g = Math.floor(1 + (231 - 1) * (1 - Math.pow(1 - t, 1.5)));
        const b = Math.floor(84 + (37 - 84) * Math.pow(t, 2));
        return [r, g, b];
    }
    
    // Preenche o ImageData
    for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - min) / range;
        const [r, g, b] = viridisColor(normalized);
        const idx = i * 4;
        imageData.data[idx] = r;     // R
        imageData.data[idx + 1] = g; // G
        imageData.data[idx + 2] = b; // B
        imageData.data[idx + 3] = 255; // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Animação
function startAnimation() {
    const stepSelect = document.getElementById('stepSelect');
    const steps = Array.from(stepSelect.options).map(o => o.value);
    currentStepIndex = 0;
    
    document.getElementById('playBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    
    animationInterval = setInterval(() => {
        stepSelect.value = steps[currentStepIndex];
        renderLayer();
        
        currentStepIndex++;
        if (currentStepIndex >= steps.length) {
            currentStepIndex = 0;  // Loop
        }
    }, CONFIG.animation.interval);
}

function stopAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    document.getElementById('playBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

// Verifica se as bibliotecas necessárias estão carregadas
function checkLibraries() {
    if (typeof L === 'undefined') {
        console.error('Leaflet não foi carregado!');
        return false;
    }
    if (typeof GeoTIFF === 'undefined') {
        console.error('GeoTIFF.js não foi carregado!');
        return false;
    }
    if (typeof plotty === 'undefined') {
        console.warn('Plotty não foi carregado, usando renderização manual');
    }
    return true;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    if (!checkLibraries()) {
        document.getElementById('currentInfo').innerHTML = 
            '<span style="color: red;">Erro: Bibliotecas não carregadas. Verifique o console.</span>';
        return;
    }
    
    initMap();
    populateControls();
    
    document.getElementById('dateSelect').addEventListener('change', renderLayer);
    document.getElementById('stepSelect').addEventListener('change', renderLayer);
    document.getElementById('levelSelect').addEventListener('change', renderLayer);
    
    document.getElementById('opacitySlider').addEventListener('input', (e) => {
        document.getElementById('opacityValue').textContent = `${e.target.value}%`;
        if (currentLayer) {
            currentLayer.setOpacity(e.target.value / 100);
        }
    });
    
    document.getElementById('playBtn').addEventListener('click', startAnimation);
    document.getElementById('stopBtn').addEventListener('click', stopAnimation);
    
    // Renderiza inicial
    renderLayer();
});