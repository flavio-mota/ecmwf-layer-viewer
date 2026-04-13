export const Utils = {
  /**
   * Calcula a data/hora final (Valid Time) para o GeoServer
   * TIME = BaseDate + RunTime + Step
   */
  calculateValidTime(dateStr, runTimeStr, stepHoursStr) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(runTimeStr);
    const step = parseInt(stepHoursStr);

    const date = new Date(Date.UTC(year, month, day, hour));

    date.setHours(date.getHours() + step);

    // Retorna formato ISO8601 que o GeoServer entende (ex: 2025-11-09T06:00:00Z)
    return date.toISOString().replace('.000Z', 'Z');
  },

  formatDisplayDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleString('pt-BR', { timeZone: 'UTC' });
  },

  formatDateLabel(str) {
    return `${str.substr(6,2)}/${str.substr(4,2)}/${str.substr(0,4)}`;
  },

  buildURLParams(state) {
    const p = new URLSearchParams();
    if (state.parameter) p.set('param', state.parameter);
    if (state.date) p.set('date', state.date);
    if (state.runTime) p.set('run', state.runTime);
    if (state.step) p.set('step', state.step);
    if (state.level) p.set('level', state.level);
    if (state.lat !== undefined) p.set('lat', state.lat.toFixed(4));
    if (state.lng !== undefined) p.set('lng', state.lng.toFixed(4));
    if (state.zoom !== undefined) p.set('zoom', state.zoom);
    return p.toString();
  },

  readURLParams() {
    const p = new URLSearchParams(window.location.search);
    const out = {};
    if (p.has('param')) out.parameter = p.get('param');
    if (p.has('date')) out.date = p.get('date');
    if (p.has('run')) out.runTime = p.get('run');
    if (p.has('step')) out.step = p.get('step');
    if (p.has('level')) out.level = p.get('level');
    if (p.has('lat')) out.lat = parseFloat(p.get('lat'));
    if (p.has('lng')) out.lng = parseFloat(p.get('lng'));
    if (p.has('zoom')) out.zoom = parseInt(p.get('zoom'));
    return Object.keys(out).length > 0 ? out : null;
  },

  generateABNTCitation(state, parameters, url) {
    const paramConfig = parameters[state.parameter];
    const paramName = paramConfig ? paramConfig.name : state.parameter;
    const dateLabel = state.date ? Utils.formatDateLabel(state.date) : 's.d.';
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    const level = paramConfig?.hasLevels && state.level ? ` ${state.level} hPa.` : '.';
    const location = state.lat && state.lng ? ` ${state.lat.toFixed(2)}, ${state.lng.toFixed(2)},` : '';

    return `ECMWF Viewer. ${paramName}: ${dateLabel}, step +${state.step}h, nível${level} Disponível em: ${url}. Acesso em: ${today}.`;
  }
};