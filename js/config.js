export const CONFIG = {
  geoserver: {
    url: "http://localhost:8080/geoserver/wms",
    workspace: "ecmwf",
    format: "image/png",
    transparent: true
  },
  // Configuração dos Parâmetros Disponíveis
  parameters: {
    icing: {
      id: "icing",
      name: "Icing Index",
      layerName: "icing_index",
      style: "icing_style",
      hasLevels: true
    },
    wind: {
      id: "wind",
      name: "Wind Speed (m/s)",
      layerName: "wind_speed_ecmwf",
      style: "wind_style",
      hasLevels: true
    },
    rain: {
      id: "rain",
      name: "Rain Accumulation (mm)",
      layerName: "rain_accumulation_ecmwf",
      style: "rain_style",
      hasLevels: false
    }
  },
  data: {
    dates: ["20251109"],
    runTimes: ["00", "12"]
  },
  steps: Array.from({ length: 41 }, (_, i) => i * 3),
  levels: [950, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200, 150],
  map: {
    center: [-15, -50],
    zoom: 3,
    minZoom: 3,
    maxZoom: 10,
    maxBounds: [
      [-90, -Infinity],
      [90, Infinity]
    ],
    maxBoundsViscosity: 0.01
  },
  animation: {
    interval: 2000
  }
};