import { CONFIG } from '../config.js';
import { Utils } from './Utils.js';

export class LayerManager {
  constructor(map) {
    this.map = map;
    this.wmsLayer = null;
    this.currentOpacity = 0.7;
    this.currentParamName = "";
    this.currentParam = "";
  }

  init() {
    this.wmsLayer = L.tileLayer.wms(CONFIG.geoserver.url, {
      format: CONFIG.geoserver.format,
      transparent: CONFIG.geoserver.transparent,
      version: '1.1.0',
      attribution: "ECMWF Data",
      crossOrigin: true
    });

    this.wmsLayer.setOpacity(this.currentOpacity);
    this.wmsLayer.addTo(this.map);
  }

  update(params) {
    const { parameter, date, runTime, step, level } = params;

    const paramConfig = CONFIG.parameters[parameter];
    if (!paramConfig) return;

    this.currentParamName = paramConfig.name;
    this.currentParam = parameter;

    const fullLayerName = `${CONFIG.geoserver.workspace}:${paramConfig.layerName}`;

    const validTimeIso = Utils.calculateValidTime(date, runTime, step);

    const wmsParams = {
      layers: fullLayerName,
      time: validTimeIso,
      styles: paramConfig.style || '',
      srs: 'EPSG:3857' // Garante alinhamento com GetFeatureInfo
    };

    if (paramConfig.hasLevels) {
      wmsParams.elevation = level;
    } else {
      delete wmsParams.elevation;
    }

    if (this.wmsLayer) {
      this.wmsLayer.setParams(wmsParams);
    }

    console.log(`[WMS] Layer: ${fullLayerName} | Time: ${validTimeIso}`);

    const legendUrl = this.getLegendUrl(fullLayerName, paramConfig.style);

    return { validTimeIso, legendUrl, paramName: paramConfig.name };
  }

  setOpacity(val) {
    this.currentOpacity = val / 100;
    if (this.wmsLayer) {
      this.wmsLayer.setOpacity(this.currentOpacity);
    }
  }

  getLegendUrl(layerName, styleName) {
    const params = new URLSearchParams({
      request: 'GetLegendGraphic',
      version: '1.0.0',
      format: 'image/png',
      width: '20',
      height: '20',
      layer: layerName,
      legend_options: 'fontName:Arial;fontSize:10;forceLabels:on'
    });

    if (styleName) {
      params.append('style', styleName);
    }

    return `${CONFIG.geoserver.url}?${params.toString()}`;
  }

  async getFeatureInfo(latlng) {
    if (!this.wmsLayer) return null;

    const size = this.map.getSize();
    const point = this.map.latLngToContainerPoint(latlng);
    const bounds = this.map.getBounds();

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    // Projeção EPSG:3857 (Web Mercator)
    const crs = L.CRS.EPSG3857;
    const swProj = crs.project(sw);
    const neProj = crs.project(ne);

    const params = {
      request: 'GetFeatureInfo',
      service: 'WMS',
      srs: 'EPSG:3857',
      styles: this.wmsLayer.wmsParams.styles,
      transparent: this.wmsLayer.wmsParams.transparent,
      version: this.wmsLayer.wmsParams.version,
      format: this.wmsLayer.wmsParams.format,
      bbox: `${swProj.x},${swProj.y},${neProj.x},${neProj.y}`,
      height: size.y,
      width: size.x,
      layers: this.wmsLayer.wmsParams.layers,
      query_layers: this.wmsLayer.wmsParams.layers,
      info_format: 'application/json',
      time: this.wmsLayer.wmsParams.time
    };

    if (this.wmsLayer.wmsParams.elevation) {
      params.elevation = this.wmsLayer.wmsParams.elevation;
    }

    // Coordenadas do clique (X, Y)
    params.x = Math.floor(point.x);
    params.y = Math.floor(point.y);

    const strParams = new URLSearchParams(params).toString();
    const url = `${CONFIG.geoserver.url}?${strParams}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Erro no GetFeatureInfo:", error);
      return null;
    }
  }

  downloadGeoTIFF(state) {
    const paramConfig = CONFIG.parameters[state.parameter];
    if (!paramConfig) return;

    // 1. Pega os limites da visualização atual do mapa (MBR / Bounding Box)
    const bounds = this.map.getBounds();
    const minLat = bounds.getSouth().toFixed(4);
    const maxLat = bounds.getNorth().toFixed(4);
    const minLon = bounds.getWest().toFixed(4);
    const maxLon = bounds.getEast().toFixed(4);

    // 2. Base da URL do WCS (GetCoverage)
    const wcsUrl = CONFIG.geoserver.url.replace('/wms', '/wcs');
    const layerName = `${CONFIG.geoserver.workspace}:${paramConfig.layerName}`;

    // Parâmetros obrigatórios
    let url = `${wcsUrl}?service=WCS&version=2.0.1&request=GetCoverage&coverageId=${layerName}&format=image/tiff`;

    // 3. Adiciona o Subsetting Espacial (O Retângulo na tela)
    url += `&subset=Lat(${minLat},${maxLat})`;
    url += `&subset=Long(${minLon},${maxLon})`;

    // 4. Adiciona a dimensão de Tempo (se estiver ativa)
    const timeISO = Utils.calculateValidTime(state.date, state.runTime, state.step);
    if (timeISO) {
      url += `&subset=time("${timeISO}")`;
    }

    // 5. Adiciona a dimensão de Nível de Pressão (se aplicável)
    if (paramConfig.hasLevels && state.level !== null && state.level !== undefined) {
      url += `&subset=elevation(${state.level})`;
    }

    console.log("Iniciando download do WCS: ", url);

    // 6. Cria um link invisível e força o download no navegador
    const a = document.createElement('a');
    a.href = url;


    // Nome descritivo para o arquivo
    const levelStr = state.level ? `_lev${state.level}` : '';
    const bboxStr = `_bbox${minLon}_${minLat}_${maxLon}_${maxLat}`;
    a.download = `${paramConfig.layerName}_${timeISO ? timeISO.split('T')[0] : 'data'}${levelStr}${bboxStr}_recorte.tif`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Para consistência com o método anterior, ainda retornamos uma Promise
    return Promise.resolve();
  }

  async downloadSLD() {
    const paramConfig = CONFIG.parameters[this.currentParam];
    if (!paramConfig || !paramConfig.style) return;

    const styleName = paramConfig.style;
    const fullLayerName = `${CONFIG.geoserver.workspace}:${paramConfig.layerName}`;

    // WMS GetStyles - endpoint público que retorna o SLD
    const url = `${CONFIG.geoserver.url}?service=WMS&request=GetStyles&version=1.1.1&layers=${fullLayerName}`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      if (text.includes('<sld:') || text.includes('<StyledLayerDescriptor') || text.includes('<UserStyle')) {
        const layerName = paramConfig.layerName || 'layer';
        this._triggerDownload(new Blob([text], { type: 'application/xml' }), `${layerName}_${styleName}.sld.xml`);
        return;
      }
    } catch (e) {
      console.error('Erro ao baixar SLD:', e);
    }

    alert('Não foi possível acessar o SLD.');
  }

  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async getMeteogramData(state, lat, lng) {
    const paramConfig = CONFIG.parameters[state.parameter];
    const fullLayerName = `${CONFIG.geoserver.workspace}:${paramConfig.layerName}`;

    // Precisamos do estado atual do mapa para GetFeatureInfo do WMS
    const size = this.map.getSize();
    const bounds = this.map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const crs = L.CRS.EPSG3857;
    const swProj = crs.project(sw);
    const neProj = crs.project(ne);
    const point = this.map.latLngToContainerPoint(L.latLng(lat, lng));

    // Todos os steps usando WMS GetFeatureInfo
    const promises = CONFIG.steps.map(async (step) => {
      const validTimeIso = Utils.calculateValidTime(state.date, state.runTime, step);

      const params = {
        request: 'GetFeatureInfo',
        service: 'WMS',
        srs: 'EPSG:3857',
        styles: paramConfig.style || '',
        transparent: true,
        version: '1.1.0',
        format: 'image/png',
        bbox: `${swProj.x},${swProj.y},${neProj.x},${neProj.y}`,
        height: size.y,
        width: size.x,
        layers: fullLayerName,
        query_layers: fullLayerName,
        info_format: 'application/json',
        time: validTimeIso,
        x: Math.floor(point.x),
        y: Math.floor(point.y)
      };

      if (paramConfig.hasLevels && state.level !== null) {
        params.elevation = state.level;
      }

      const strParams = new URLSearchParams(params).toString();
      const url = `${CONFIG.geoserver.url}?${strParams}`;

      try {
        const response = await fetch(url);
        if (!response.ok) return { step, time: validTimeIso, value: null };

        // Em vez de .json(), lemos como texto primeiro
        const text = await response.text();

        // Se o GeoServer devolver um XML (erro de dimensão não encontrada)
        if (text.trim().startsWith('<')) {
          return { step, time: validTimeIso, value: null };
        }

        // Se passar pela verificação, é um JSON válido
        const data = JSON.parse(text);

        let value = null;
        if (data && data.features && data.features.length > 0) {
          const props = data.features[0].properties;
          const keys = Object.keys(props);
          if (keys.length > 0) {
            value = props[keys[0]]; // Extrai o valor do pixel
          }
        }

        return { step, time: validTimeIso, value };
      } catch (e) {
        return { step, time: validTimeIso, value: null };
      }
    });

    // Aguarda que todos os tempos sejam recolhidos (dispara todos ao mesmo tempo)
    return await Promise.all(promises);
  }

}