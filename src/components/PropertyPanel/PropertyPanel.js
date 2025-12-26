/**
 * @fileoverview 属性面板组件 - 自动生成 UI 控制项
 * @module components/PropertyPanel/PropertyPanel
 */

import { BaseComponent } from '../core/BaseComponent.js';

export class PropertyPanel extends BaseComponent {
  constructor() {
    super();
    this._groups = new Map();
    this.setStyles(/* css */`
      :host {
        display: block;
        background: rgba(30, 30, 30, 0.8);
        backdrop-filter: blur(10px);
        border-radius: 8px;
        padding: 16px;
        color: #fff;
        width: 100%;
        max-height: 100%;
        overflow-y: auto;
      }
      
      .panel-header {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #aaa;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .control-group {
        margin-bottom: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 12px;
      }

      .control-group:last-child {
        border-bottom: none;
      }

      .group-title {
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--color-primary, #4a90e2);
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
      }

      .group-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .group-content.collapsed {
        display: none;
      }

      .control-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
      }

      .label {
        color: #ccc;
        flex: 1;
      }

      .value-display {
        width: 40px;
        text-align: right;
        color: #888;
        font-family: monospace;
      }

      /* Inputs */
      input[type="range"] {
        flex: 2;
        margin: 0 8px;
        accent-color: var(--color-primary, #4a90e2);
      }

      input[type="color"] {
        width: 30px;
        height: 20px;
        border: none;
        padding: 0;
        background: none;
        cursor: pointer;
      }

      input[type="text"], input[type="number"] {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        padding: 4px;
        border-radius: 4px;
        width: 60px;
      }

      select {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        padding: 4px;
        border-radius: 4px;
        flex: 2;
      }

      button {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #fff;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
        width: 100%;
        text-align: center;
      }

      button:hover {
        background: var(--color-primary, #4a90e2);
      }
      
      .checkbox-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }
    `);
  }

  connectedCallback() {
    super.connectedCallback();
    this.renderGroups();
  }

  /**
    * 添加控制组
    * @param {string} id
    * @param {string} title
    */
  addGroup(id, title) {
    if (!this._groups.has(id)) {
      this._groups.set(id, {
        title,
        controls: [],
        collapsed: false
      });
      this.renderGroups();
    }
  }

  /**
   * 添加控件
   * @param {string} groupId
   * @param {object} config
   */
  addControl(groupId, config) {
    const group = this._groups.get(groupId);
    if (group) {
      group.controls.push(config);
      this.renderGroups();
    }
  }

  /**
   * 清除所有组
   */
  clear() {
    this._groups.clear();
    this.renderGroups();
  }

  renderGroups() {
    const container = this.$('.panel-content');
    if (!container) return;

    container.innerHTML = '';

    this._groups.forEach((group, id) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'control-group';
      
      const header = document.createElement('div');
      header.className = 'group-title';
      header.innerHTML = `
        <span>${group.title}</span>
        <span>${group.collapsed ? '+' : '-'}</span>
      `;
      header.onclick = () => {
        group.collapsed = !group.collapsed;
        content.classList.toggle('collapsed', group.collapsed);
        header.querySelector('span:last-child').textContent = group.collapsed ? '+' : '-';
      };

      const content = document.createElement('div');
      content.className = `group-content ${group.collapsed ? 'collapsed' : ''}`;

      group.controls.forEach(control => {
        const item = this._createControlItem(control);
        content.appendChild(item);
      });

      groupEl.appendChild(header);
      groupEl.appendChild(content);
      container.appendChild(groupEl);
    });
  }

  _createControlItem(config) {
    const wrapper = document.createElement('div');
    wrapper.className = 'control-item';

    const { type, label, value, min, max, step, options, onChange } = config;

    // Label
    if (type !== 'button') {
      const labelEl = document.createElement('div');
      labelEl.className = 'label';
      labelEl.textContent = label;
      wrapper.appendChild(labelEl);
    }

    let input;

    switch (type) {
      case 'slider':
        input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step || 0.1;
        input.value = value;
        
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'value-display';
        valueDisplay.textContent = value;
        
        input.oninput = (e) => {
          const val = parseFloat(e.target.value);
          valueDisplay.textContent = val.toFixed(step < 0.1 ? 2 : 1);
          if (onChange) onChange(val);
        };
        wrapper.appendChild(input);
        wrapper.appendChild(valueDisplay);
        break;

      case 'color':
        input = document.createElement('input');
        input.type = 'color';
        input.value = value;
        input.oninput = (e) => {
          if (onChange) onChange(e.target.value);
        };
        wrapper.appendChild(input);
        break;

      case 'select':
        input = document.createElement('select');
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          option.selected = opt.value === value;
          input.appendChild(option);
        });
        input.onchange = (e) => {
          if (onChange) onChange(e.target.value);
        };
        wrapper.appendChild(input);
        break;

      case 'checkbox':
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = value;
        input.onchange = (e) => {
          if (onChange) onChange(e.target.checked);
        };
        wrapper.appendChild(input);
        break;

      case 'button':
        input = document.createElement('button');
        input.textContent = label;
        input.onclick = () => {
          if (onChange) onChange();
        };
        wrapper.appendChild(input);
        break;
    }

    return wrapper;
  }

  template() {
    return `
      <div class="panel-header">Properties</div>
      <div class="panel-content"></div>
    `;
  }
}

customElements.define('property-panel', PropertyPanel);
