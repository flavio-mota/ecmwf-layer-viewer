import { CONFIG } from '../config.js';
import { Utils } from './Utils.js';

export class LayerManager {
  constructor(map) {
    this.map = map;
    this.wmsLayer = null;
    this.currentOpacity = 0.7;
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

    const fullLayerName = `${CONFIG.geoserver.workspace}:${paramConfig.layerName}`;

    const validTimeIso = Utils.calculateValidTime(date, runTime, step);

    const wmsParams = {
      layers: fullLayerName,
      time: validTimeIso,
      styles: paramConfig.style || ''
    };

    if (paramConfig.hasLevels) {
      wmsParams.elevation = level;
    } else {
      wmsParams.elevation = undefined;
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
}