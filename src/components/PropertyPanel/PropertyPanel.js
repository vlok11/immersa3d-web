/**
 * @fileoverview 属性面板组件 - 支持分类、搜索和折叠
 * @module components/PropertyPanel/PropertyPanel
 */

import { BaseComponent } from '../core/BaseComponent.js';

/**
 * 属性面板组件
 * @class
 * @extends BaseComponent
 */
export class PropertyPanel extends BaseComponent {
  constructor() {
    super();
    /** @type {Map<string, object>} 分类映射 */
    this._categories = new Map();
    /** @type {Map<string, object>} 控件组映射 */
    this._groups = new Map();
    /** @type {string} 搜索关键词 */
    this._searchQuery = '';

    this.setStyles(/* css */ `
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

      /* 搜索框 */
      .search-box {
        position: relative;
        margin-bottom: 16px;
      }

      .search-input {
        width: 100%;
        padding: 8px 12px 8px 32px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        color: #fff;
        font-size: 12px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .search-input::placeholder {
        color: #666;
      }

      .search-input:focus {
        border-color: var(--color-primary, #4a90e2);
        box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
      }

      .search-icon {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 12px;
        color: #666;
        pointer-events: none;
      }

      .search-clear {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        font-size: 14px;
        padding: 2px 6px;
        border-radius: 50%;
        display: none;
      }

      .search-clear.visible {
        display: block;
      }

      .search-clear:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }

      /* 快捷操作栏 */
      .quick-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .quick-btn {
        flex: 1;
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        color: #aaa;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }

      .quick-btn:hover {
        background: var(--color-primary, #4a90e2);
        border-color: var(--color-primary, #4a90e2);
        color: #fff;
      }

      /* 分类容器 */
      .category {
        margin-bottom: 16px;
        border-radius: 8px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.2);
      }

      .category.hidden {
        display: none;
      }

      .category-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.05);
        cursor: pointer;
        user-select: none;
        transition: background 0.2s;
      }

      .category-header:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .category-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-primary, #4a90e2);
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .category-toggle {
        font-size: 10px;
        color: #666;
        transition: transform 0.2s;
      }

      .category-toggle.collapsed {
        transform: rotate(-90deg);
      }

      .category-content {
        max-height: 1000px;
        overflow: hidden;
        transition: max-height 0.3s ease-out;
      }

      .category-content.collapsed {
        max-height: 0;
      }

      /* 控件组 */
      .control-group {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        padding: 12px;
      }

      .control-group:last-child {
        border-bottom: none;
      }

      .control-group.hidden {
        display: none;
      }

      .group-title {
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 8px;
        color: #ccc;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
      }

      .group-toggle {
        font-size: 10px;
        color: #666;
        transition: transform 0.2s;
      }

      .group-toggle.collapsed {
        transform: rotate(-90deg);
      }

      .group-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 500px;
        overflow: hidden;
        transition: max-height 0.2s ease-out, opacity 0.2s;
      }

      .group-content.collapsed {
        max-height: 0;
        opacity: 0;
      }

      /* 控件项 */
      .control-item {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12px;
        min-height: 28px;
        position: relative;
      }

      .label {
        color: #999;
        width: 70px;
        flex-shrink: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .label.highlight {
        color: var(--color-primary, #4a90e2);
        font-weight: 500;
      }

      .value-display {
        width: 40px;
        text-align: right;
        color: #666;
        font-family: monospace;
        font-size: 11px;
        flex-shrink: 0;
      }

      /* Inputs */
      input[type="range"] {
        flex: 2;
        margin: 0 8px;
        accent-color: var(--color-primary, #4a90e2);
        height: 4px;
      }

      input[type="color"] {
        width: 28px;
        height: 20px;
        border: none;
        padding: 0;
        background: none;
        cursor: pointer;
        border-radius: 4px;
      }

      input[type="text"], input[type="number"] {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #fff;
        padding: 4px 8px;
        border-radius: 4px;
        width: 60px;
        font-size: 11px;
      }

      select {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #fff;
        padding: 4px 8px;
        border-radius: 4px;
        flex: 2;
        font-size: 11px;
        cursor: pointer;
      }

      select:focus {
        border-color: var(--color-primary, #4a90e2);
        outline: none;
      }

      button.control-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #fff;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
        width: 100%;
        text-align: center;
        font-size: 11px;
      }

      button.control-btn:hover {
        background: var(--color-primary, #4a90e2);
      }

      input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: var(--color-primary, #4a90e2);
        cursor: pointer;
      }
      
      .checkbox-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }

      /* 无结果提示 */
      .no-results {
        text-align: center;
        padding: 24px;
        color: #666;
        font-size: 12px;
      }

      .no-results-icon {
        font-size: 32px;
        margin-bottom: 8px;
        opacity: 0.5;
      }
    `);
  }

  connectedCallback() {
    super.connectedCallback();
    this.renderGroups();
  }

  /**
   * 添加分类
   * @param {string} id - 分类 ID
   * @param {string} title - 分类标题
   * @param {object} options - 配置选项
   */
  addCategory(id, title, options = {}) {
    if (!this._categories.has(id)) {
      this._categories.set(id, {
        id,
        title,
        collapsed: options.collapsed ?? false,
        groups: [],
      });
    }
  }

  /**
   * 添加控制组
   * @param {string} id - 组 ID
   * @param {string} title - 组标题
   * @param {object} options - 配置选项
   */
  addGroup(id, title, options = {}) {
    if (!this._groups.has(id)) {
      const group = {
        id,
        title,
        controls: [],
        collapsed: options.collapsed ?? false,
        category: options.category || null,
      };
      this._groups.set(id, group);

      // 如果指定了分类，添加到分类中
      if (options.category && this._categories.has(options.category)) {
        this._categories.get(options.category).groups.push(id);
      }
    }
  }

  /**
   * 添加控件
   * @param {string} groupId - 组 ID
   * @param {object} config - 控件配置
   */
  addControl(groupId, config) {
    const group = this._groups.get(groupId);
    if (group) {
      group.controls.push(config);
    }
  }

  /**
   * 完成配置后渲染
   */
  finishSetup() {
    this.renderGroups();
  }

  /**
   * 清除所有组
   */
  clear() {
    this._categories.clear();
    this._groups.clear();
    this.renderGroups();
  }

  /**
   * 渲染面板
   */
  renderGroups() {
    const container = this.$('.panel-content');
    if (!container) return;

    container.innerHTML = '';

    const query = this._searchQuery.toLowerCase().trim();
    let hasResults = false;

    // 按分类渲染
    this._categories.forEach((category) => {
      const categoryEl = document.createElement('div');
      categoryEl.className = 'category';
      categoryEl.dataset.categoryId = category.id;

      // 分类头部
      const header = document.createElement('div');
      header.className = 'category-header';
      header.innerHTML = `
        <span class="category-title">${category.title}</span>
        <span class="category-toggle ${category.collapsed ? 'collapsed' : ''}">▼</span>
      `;

      // 分类内容
      const content = document.createElement('div');
      content.className = `category-content ${category.collapsed ? 'collapsed' : ''}`;

      // 渲染该分类下的所有组
      let categoryHasVisibleGroups = false;
      category.groups.forEach((groupId) => {
        const group = this._groups.get(groupId);
        if (group) {
          const groupEl = this._renderGroup(group, query);
          if (groupEl) {
            content.appendChild(groupEl);
            categoryHasVisibleGroups = true;
            hasResults = true;
          }
        }
      });

      // 如果分类有可见组，则显示分类
      if (categoryHasVisibleGroups || !query) {
        categoryEl.classList.toggle('hidden', !categoryHasVisibleGroups && query);

        header.onclick = () => {
          category.collapsed = !category.collapsed;
          content.classList.toggle('collapsed', category.collapsed);
          header
            .querySelector('.category-toggle')
            .classList.toggle('collapsed', category.collapsed);
        };

        categoryEl.appendChild(header);
        categoryEl.appendChild(content);
        container.appendChild(categoryEl);
      }
    });

    // 渲染未分类的组
    this._groups.forEach((group) => {
      if (!group.category) {
        const groupEl = this._renderGroup(group, query);
        if (groupEl) {
          container.appendChild(groupEl);
          hasResults = true;
        }
      }
    });

    // 无结果提示
    if (query && !hasResults) {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.innerHTML = `
        <div class="no-results-icon">🔍</div>
        <div>未找到 "${this._searchQuery}" 相关控件</div>
      `;
      container.appendChild(noResults);
    }
  }

  /**
   * 渲染单个控件组
   * @private
   */
  _renderGroup(group, query) {
    // 搜索过滤
    const titleMatch = group.title.toLowerCase().includes(query);
    const controlMatches = group.controls.filter((c) => c.label?.toLowerCase().includes(query));

    if (query && !titleMatch && controlMatches.length === 0) {
      return null;
    }

    const groupEl = document.createElement('div');
    groupEl.className = 'control-group';
    groupEl.dataset.groupId = group.id;

    // 组标题
    const header = document.createElement('div');
    header.className = 'group-title';
    header.innerHTML = `
      <span>${group.title}</span>
      <span class="group-toggle ${group.collapsed ? 'collapsed' : ''}">▼</span>
    `;

    // 组内容
    const content = document.createElement('div');
    content.className = `group-content ${group.collapsed ? 'collapsed' : ''}`;

    // 渲染控件
    group.controls.forEach((control) => {
      const shouldHighlight = query && control.label?.toLowerCase().includes(query);
      const item = this._createControlItem(control, shouldHighlight);
      content.appendChild(item);
    });

    header.onclick = () => {
      group.collapsed = !group.collapsed;
      content.classList.toggle('collapsed', group.collapsed);
      header.querySelector('.group-toggle').classList.toggle('collapsed', group.collapsed);
    };

    groupEl.appendChild(header);
    groupEl.appendChild(content);
    return groupEl;
  }

  /**
   * 创建控件项
   * @private
   */
  _createControlItem(config, highlight = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'control-item';

    const { type, label, value, min, max, step, options, onChange } = config;

    // Label
    if (type !== 'button') {
      const labelEl = document.createElement('div');
      labelEl.className = `label ${highlight ? 'highlight' : ''}`;
      labelEl.textContent = label;
      labelEl.title = label;
      wrapper.appendChild(labelEl);
    }

    let input;

    switch (type) {
      case 'slider': {
        input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step || 0.1;
        input.value = value;

        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'value-display';
        valueDisplay.textContent = Number(value).toFixed(step < 0.1 ? 2 : 1);

        input.oninput = (e) => {
          const val = parseFloat(e.target.value);
          valueDisplay.textContent = val.toFixed(step < 0.1 ? 2 : 1);
          if (onChange) onChange(val);
        };
        wrapper.appendChild(input);
        wrapper.appendChild(valueDisplay);
        break;
      }

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
        options.forEach((opt) => {
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
        input.className = 'control-btn';
        input.textContent = label;
        input.onclick = () => {
          if (onChange) onChange();
        };
        wrapper.appendChild(input);
        break;
    }

    return wrapper;
  }

  /**
   * 处理搜索
   * @private
   */
  _handleSearch(query) {
    this._searchQuery = query;
    this.renderGroups();

    // 更新清除按钮
    const clearBtn = this.$('.search-clear');
    if (clearBtn) {
      clearBtn.classList.toggle('visible', query.length > 0);
    }
  }

  /**
   * 重置所有效果
   */
  resetAll() {
    this.emit('reset-all');
  }

  addEventListeners() {
    // 搜索功能
    const searchInput = this.$('.search-input');
    if (searchInput) {
      searchInput.oninput = (e) => this._handleSearch(e.target.value);
    }

    const clearBtn = this.$('.search-clear');
    if (clearBtn) {
      clearBtn.onclick = () => {
        const input = this.$('.search-input');
        if (input) {
          input.value = '';
          this._handleSearch('');
        }
      };
    }

    // 快捷操作
    const resetBtn = this.$('[data-action="reset"]');
    if (resetBtn) {
      resetBtn.onclick = () => this.resetAll();
    }
  }

  template() {
    return `
      <div class="panel-header">属性</div>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" class="search-input" placeholder="搜索控件...">
        <button class="search-clear">×</button>
      </div>
      <div class="quick-actions">
        <button class="quick-btn" data-action="reset" title="重置所有效果">🔄 重置</button>
      </div>
      <div class="panel-content"></div>
    `;
  }
}

customElements.define('property-panel', PropertyPanel);
