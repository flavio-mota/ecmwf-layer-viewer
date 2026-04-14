import { CONFIG } from '../config.js';
import { Utils } from './Utils.js';

export class UIManager {
  constructor() {
    this.elements = {
      param: document.getElementById('paramSelect'),
      date: document.getElementById('dateSelect'),
      runTime: document.getElementById('runTimeSelect'),
      step: document.getElementById('stepSelect'),
      level: document.getElementById('levelSelect'),
      levelGroup: document.getElementById('levelGroup'),
      opacity: document.getElementById('opacitySlider'),
      opacityVal: document.getElementById('opacityValue'),
      info: document.getElementById('currentInfo'),
      animType: document.getElementById('animationTypeSelect'),
      playBtn: document.getElementById('playBtn'),
      stopBtn: document.getElementById('stopBtn'),
      legendImg: document.getElementById('wmsLegend'),
      legendTitle: document.getElementById('legendTitle'),
      metadataBarText: document.getElementById('metadataBarText')
    };
    this.callbacks = {};
    this.lastMetadataData = null;
  }

  init(onStateChange, onAnimationControl, extraCallbacks = {}) {
    this.callbacks = extraCallbacks;

    Object.values(CONFIG.parameters).forEach(p => {
      this.addOption(this.elements.param, p.id, p.name);
    });

    CONFIG.data.dates.forEach(d => this.addOption(this.elements.date, d, Utils.formatDateLabel(d)));
    CONFIG.data.runTimes.forEach(r => this.addOption(this.elements.runTime, r, `${r}h`));
    CONFIG.steps.forEach(s => this.addOption(this.elements.step, s, `+${s}h`));
    CONFIG.levels.forEach(l => {
      const opt = this.addOption(this.elements.level, l, `${l} hPa`);
      if (l === 850) opt.selected = true;
    });

    // Apply URL params if present
    const urlState = Utils.readURLParams();
    if (urlState) {
      if (urlState.parameter) this.elements.param.value = urlState.parameter;
      if (urlState.date) this.elements.date.value = urlState.date;
      if (urlState.runTime) this.elements.runTime.value = urlState.runTime;
      if (urlState.step) this.elements.step.value = urlState.step;
      if (urlState.level) this.elements.level.value = urlState.level;
    }

    const handleChange = () => {
      this.updateVisibility();
      onStateChange(this.getState());
      this.updateURL();
    };

    this.elements.param.addEventListener('change', handleChange);
    this.elements.date.addEventListener('change', handleChange);
    this.elements.runTime.addEventListener('change', handleChange);
    this.elements.step.addEventListener('change', handleChange);
    this.elements.level.addEventListener('change', handleChange);

    this.elements.opacity.addEventListener('input', (e) => {
      this.elements.opacityVal.textContent = `${e.target.value}%`;
      onStateChange({ opacity: e.target.value });
    });

    this.elements.playBtn.addEventListener('click', () => onAnimationControl('play'));
    this.elements.stopBtn.addEventListener('click', () => onAnimationControl('stop'));
    this.elements.animType.addEventListener('change', (e) => onAnimationControl('type', e.target.value));

    // Extra callbacks
    if (extraCallbacks.onDownloadTif) {
      document.getElementById('downloadTifBtn')?.addEventListener('click', () => extraCallbacks.onDownloadTif());
    }
    if (extraCallbacks.onDownloadSld) {
      document.getElementById('downloadSldBtn')?.addEventListener('click', () => extraCallbacks.onDownloadSld());
    }
    if (extraCallbacks.openMetadata) {
      document.getElementById('metadataBarClick')?.addEventListener('click', () => extraCallbacks.openMetadata());
    }
    if (extraCallbacks.openCitation) {
      document.getElementById('openCitationBtn')?.addEventListener('click', () => extraCallbacks.openCitation());
    }

    this.updateVisibility();
    this.initModalHandlers();
  }

  initModalHandlers() {
    // Close modals when clicking outside (on overlay)
    ['metadataModal', 'citationModal', 'meteogramModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          if (e.target === el) {
            this.toggleModal(id, false);
          }
        });
      }
    });

    // Wire close buttons to the handlers stored in this._modalHandlers
    document.getElementById('closeMetadataModal')?.addEventListener('click', () => {
      this.toggleModal('metadataModal', false);
    });
    document.getElementById('closeCitationModal')?.addEventListener('click', () => {
      this.toggleModal('citationModal', false);
    });
    document.getElementById('closeMeteogramModal')?.addEventListener('click', () => {
      this.toggleModal('meteogramModal', false);
    });
    document.getElementById('copyCitationBtn')?.addEventListener('click', () => {
      const el = document.getElementById('citationText');
      if (el) {
        navigator.clipboard.writeText(el.value).then(() => {
          const btn = document.getElementById('copyCitationBtn');
          if (btn) btn.textContent = 'Copiado!';
          setTimeout(() => { if (btn) btn.textContent = 'Copiar'; }, 2000);
        });
      }
    });
  }

  updateVisibility() {
    const paramId = this.elements.param.value;
    const config = CONFIG.parameters[paramId];

    if (config && config.hasLevels) {
      this.elements.levelGroup.style.display = 'block';
      this.toggleAnimOption('levels', false);
    } else {
      this.elements.levelGroup.style.display = 'none';
      if (this.elements.animType.value === 'levels') {
        this.elements.animType.value = 'steps';
      }
      this.toggleAnimOption('levels', true);
    }
  }

  toggleAnimOption(val, disabled) {
    const option = Array.from(this.elements.animType.options).find(o => o.value === val);
    if (option) option.disabled = disabled;
  }

  addOption(select, value, text) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    select.appendChild(opt);
    return opt;
  }

  getState() {
    return {
      parameter: this.elements.param.value,
      date: this.elements.date.value,
      runTime: this.elements.runTime.value,
      step: this.elements.step.value,
      level: this.elements.level.value,
      animType: this.elements.animType.value
    };
  }

  getStateWithMapInfo(map) {
    const center = map.getCenter();
    const state = this.getState();
    state.lat = center.lat;
    state.lng = center.lng;
    state.zoom = map.getZoom();
    return state;
  }

  setState(state) {
    if (state.step) this.elements.step.value = state.step;
    if (state.level) this.elements.level.value = state.level;
  }

  setPlaying(isPlaying) {
    this.elements.playBtn.disabled = isPlaying;
    this.elements.stopBtn.disabled = !isPlaying;
    this.elements.param.disabled = isPlaying;
    this.elements.date.disabled = isPlaying;
    this.elements.runTime.disabled = isPlaying;
  }

  updateDashboard(data) {
    // data: { validTimeIso, legendUrl, paramName }
    const dateObj = new Date(data.validTimeIso);
    const fmtDate = dateObj.toLocaleString('pt-BR', { timeZone: 'UTC' });

    this.elements.info.innerHTML = ` <strong>Parâmetro:</strong> ${data.paramName}<br> <strong>Valid Time (UTC):</strong> ${fmtDate} `;

    if (data.legendUrl && this.elements.legendImg.src !== data.legendUrl) {
      this.elements.legendImg.src = data.legendUrl;
      this.elements.legendTitle.textContent = data.paramName;
    }

    this.updateMetadataBar(data);
  }

  updateMetadataBar(data) {
    this.lastMetadataData = data;
    this._renderMetadataBar();
  }

  _renderMetadataBar(data) {
    const d = this.lastMetadataData;
    if (!d || !this.elements.metadataBarText) return;
    const state = this.getState();
    const paramConfig = CONFIG.parameters[state.parameter];
    const level = paramConfig?.hasLevels ? ` ${state.level}hPa |` : '';
    let mapInfo = '';
    if (this.map) {
      const c = this.map.getCenter();
      mapInfo = `${c.lat.toFixed(2)}, ${c.lng.toFixed(2)} | z${this.map.getZoom()} |`;
    }
    this.elements.metadataBarText.innerHTML = `ECMWF Viewer <span class="metadata-dot">&middot;</span> ${d.paramName} |${level} <span class="metadata-dot">&middot;</span> ${mapInfo} <span class="metadata-dot">&middot;</span> step +${state.step}h`;
  }

  updateURL() {
    const state = this.getState();
    if (this.map) {
      const center = this.map.getCenter();
      state.lat = center.lat;
      state.lng = center.lng;
      state.zoom = this.map.getZoom();
    }
    const qs = Utils.buildURLParams(state);
    if (qs) {
      history.replaceState(null, '', '?' + qs);
    }
  }

  setMap(map) {
    this.map = map;
    this.map.on('moveend', () => {
      this._renderMetadataBar();
      this.updateURL();
    });
  }

  toggleModal(modalId, show) {
    const el = document.getElementById(modalId);
    if (!el) return;
    if (show) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }

  populateCitation(text) {
    const el = document.getElementById('citationText');
    if (el) el.value = text;
  }
}