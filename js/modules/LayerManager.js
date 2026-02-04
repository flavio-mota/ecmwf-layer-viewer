import { CONFIG } from '../config.js';
import { Utils } from './Utils.js';

export class LayerManager {
  constructor(map) {
    this.map = map;
    this.wmsLayer = null;
    this.currentOpacity = 0.7;
    this.currentParamName = "";
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
}