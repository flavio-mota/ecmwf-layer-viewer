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
      legendTitle: document.getElementById('legendTitle')
    };
  }

  init(onStateChange, onAnimationControl) {
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

    const handleChange = () => {
      this.updateVisibility();
      onStateChange(this.getState());
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

    this.updateVisibility();
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
  }
}