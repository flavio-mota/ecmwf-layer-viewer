export class MapManager {
  constructor(config) {
    this.config = config;
    this.map = null;
  }

  init(containerId) {
    this.map = L.map(containerId, {
      minZoom: this.config.map.minZoom,
      maxZoom: this.config.map.maxZoom,
      maxBounds: this.config.map.maxBounds,
      maxBoundsViscosity: this.config.map.maxBoundsViscosity,
      bounceAtZoomLimits: true
    }).setView(
      this.config.map.center,
      this.config.map.zoom
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: this.config.map.maxZoom,
      minZoom: this.config.map.minZoom
    }).addTo(this.map);

    return this.map;
  }
}