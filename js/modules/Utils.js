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
  }
};