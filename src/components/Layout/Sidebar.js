/**
 * @fileoverview 侧边栏组件 - 支持可调整宽度和折叠
 * @module components/Layout/Sidebar
 */

import { BaseComponent } from '../core/BaseComponent.js';

/**
 * 可调整宽度的侧边栏组件
 * @class
 * @extends BaseComponent
 */
export class Sidebar extends BaseComponent {
  constructor() {
    super();
    this.position = 'left'; // 'left' or 'right'
    this.minWidth = 200;
    this.maxWidth = 450;
    this.defaultWidth = 280;
    this.isCollapsed = false;
    this.isResizing = false;
    this._storageKey = 'sidebar-width';
  }

  static get observedAttributes() {
    return ['position', 'width', 'collapsed'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'position') {
      this.position = newValue;
      this._storageKey = `sidebar-${newValue}-width`;
      this.setStyles(this._getStyle());
      this.render();
    }
  }

  _getStyle() {
    const borderSide = this.position === 'left' ? 'border-right' : 'border-left';
    const resizeHandleSide = this.position === 'left' ? 'right' : 'left';

    return /* css */ `
      :host {
        display: flex;
        flex-direction: row;
        height: 100%;
        background: #1e1e1e;
        position: relative;
        transition: width 0.2s ease;
      }

      :host(.collapsed) {
        width: 48px !important;
      }

      .sidebar-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        ${borderSide}: 1px solid #333;
      }

      :host(.collapsed) .sidebar-content {
        display: none;
      }

      .sections-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* 折叠栏 */
      .collapse-bar {
        width: 48px;
        min-width: 48px;
        display: none;
        flex-direction: column;
        align-items: center;
        padding-top: 8px;
        gap: 8px;
        background: #1a1a1a;
        ${borderSide}: 1px solid #333;
      }

      :host(.collapsed) .collapse-bar {
        display: flex;
      }

      .collapse-icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
        color: #888;
      }

      .collapse-icon:hover {
        background: var(--color-primary, #4a90e2);
        color: #fff;
      }

      /* 调整大小句柄 */
      .resize-handle {
        position: absolute;
        top: 0;
        ${resizeHandleSide}: 0;
        width: 6px;
        height: 100%;
        cursor: ${this.position === 'left' ? 'ew-resize' : 'ew-resize'};
        background: transparent;
        z-index: 100;
        transition: background 0.2s;
      }

      .resize-handle:hover,
      .resize-handle.active {
        background: var(--color-primary, #4a90e2);
      }

      :host(.collapsed) .resize-handle {
        display: none;
      }

      /* 折叠/展开按钮 */
      .toggle-btn {
        position: absolute;
        top: 50%;
        ${resizeHandleSide}: -14px;
        transform: translateY(-50%);
        width: 14px;
        height: 48px;
        background: #252525;
        border: 1px solid #333;
        border-${this.position === 'left' ? 'left' : 'right'}: none;
        border-radius: ${this.position === 'left' ? '0 4px 4px 0' : '4px 0 0 4px'};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: #666;
        z-index: 101;
        transition: all 0.2s;
      }

      .toggle-btn:hover {
        background: var(--color-primary, #4a90e2);
        color: #fff;
      }

      :host(.collapsed) .toggle-btn {
        ${resizeHandleSide}: -14px;
      }

      /* Slot 样式 */
      ::slotted(*) {
        padding: 10px;
      }
    `;
  }

  connectedCallback() {
    this.position = this.getAttribute('position') || 'left';
    this._storageKey = `sidebar-${this.position}-width`;
    this.setStyles(this._getStyle());
    super.connectedCallback();

    // 恢复保存的宽度
    this._restoreWidth();
  }

  template() {
    const arrow = this.position === 'left' ? '◀' : '▶';
    return `
      <div class="sidebar-content">
        <div class="sections-container">
          <slot></slot>
        </div>
      </div>
      <div class="collapse-bar">
        <div class="collapse-icon" data-action="expand" title="展开侧边栏">📁</div>
        <div class="collapse-icon" data-action="expand" title="展开侧边栏">📂</div>
      </div>
      <div class="resize-handle"></div>
      <div class="toggle-btn" title="折叠/展开">${arrow}</div>
    `;
  }

  addEventListeners() {
    const resizeHandle = this.$('.resize-handle');
    const toggleBtn = this.$('.toggle-btn');
    const collapseIcons = this.$$('.collapse-icon');

    // 拖拽调整宽度
    if (resizeHandle) {
      resizeHandle.onmousedown = (e) => this._startResize(e);
    }

    // 折叠/展开按钮
    if (toggleBtn) {
      toggleBtn.onclick = () => this._toggleCollapse();
    }

    // 折叠图标点击展开
    collapseIcons.forEach((icon) => {
      icon.onclick = () => this._toggleCollapse();
    });

    // 全局事件（需要在 document 上监听）
    this._onMouseMove = (e) => this._handleResize(e);
    this._onMouseUp = () => this._stopResize();
  }

  /**
   * 开始调整大小
   * @private
   */
  _startResize(e) {
    e.preventDefault();
    this.isResizing = true;
    this.$('.resize-handle')?.classList.add('active');
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }

  /**
   * 处理调整大小
   * @private
   */
  _handleResize(e) {
    if (!this.isResizing) return;

    const rect = this.getBoundingClientRect();
    let newWidth;

    if (this.position === 'left') {
      newWidth = e.clientX - rect.left;
    } else {
      newWidth = rect.right - e.clientX;
    }

    // 限制范围
    newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
    this.style.width = `${newWidth}px`;
  }

  /**
   * 停止调整大小
   * @private
   */
  _stopResize() {
    if (!this.isResizing) return;

    this.isResizing = false;
    this.$('.resize-handle')?.classList.remove('active');
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // 保存宽度
    this._saveWidth();
  }

  /**
   * 切换折叠状态
   * @private
   */
  _toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.classList.toggle('collapsed', this.isCollapsed);

    // 更新箭头方向
    const toggleBtn = this.$('.toggle-btn');
    if (toggleBtn) {
      if (this.isCollapsed) {
        toggleBtn.textContent = this.position === 'left' ? '▶' : '◀';
      } else {
        toggleBtn.textContent = this.position === 'left' ? '◀' : '▶';
      }
    }

    // 触发事件
    this.emit('collapse', { collapsed: this.isCollapsed });
  }

  /**
   * 保存宽度到 localStorage
   * @private
   */
  _saveWidth() {
    try {
      const width = parseInt(this.style.width) || this.defaultWidth;
      localStorage.setItem(this._storageKey, width.toString());
    } catch (e) {
      // localStorage 不可用
    }
  }

  /**
   * 从 localStorage 恢复宽度
   * @private
   */
  _restoreWidth() {
    try {
      const saved = localStorage.getItem(this._storageKey);
      if (saved) {
        const width = parseInt(saved);
        if (width >= this.minWidth && width <= this.maxWidth) {
          this.style.width = `${width}px`;
        }
      } else {
        this.style.width = `${this.defaultWidth}px`;
      }
    } catch (e) {
      this.style.width = `${this.defaultWidth}px`;
    }
  }

  /**
   * 展开侧边栏
   */
  expand() {
    if (this.isCollapsed) {
      this._toggleCollapse();
    }
  }

  /**
   * 折叠侧边栏
   */
  collapse() {
    if (!this.isCollapsed) {
      this._toggleCollapse();
    }
  }
}

/**
 * 侧边栏区块组件
 */
export class SidebarSection extends BaseComponent {
  constructor() {
    super();
    this.title = 'Section';
  }

  static get observedAttributes() {
    return ['title'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'title' && oldValue !== newValue) {
      this.title = newValue;
      this.render();
    }
  }

  connectedCallback() {
    this.title = this.getAttribute('title') || 'Section';
    this.setStyles(/* css */ `
      :host {
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid #333;
        max-height: 100%;
        overflow: hidden;
      }
      :host(:last-child) {
        border-bottom: none;
        flex: 1;
      }
      .header {
        padding: 10px 15px;
        background: #252525;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #aaa;
        border-bottom: 1px solid #333;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .header:hover {
        background: #2a2a2a;
      }
      .content {
        overflow-y: auto;
        flex: 1;
      }
      .hidden {
        display: none;
      }
      .toggle {
        font-size: 10px;
        color: #666;
        transition: transform 0.2s;
      }
      .toggle.collapsed {
        transform: rotate(-90deg);
      }
    `);
    super.connectedCallback();
  }

  template() {
    return `
      <div class="header">
        <span>${this.title}</span>
        <span class="toggle">▼</span>
      </div>
      <div class="content">
        <slot></slot>
      </div>
    `;
  }

  addEventListeners() {
    const header = this.$('.header');
    const content = this.$('.content');
    const toggle = this.$('.toggle');

    if (header) {
      header.onclick = () => {
        content.classList.toggle('hidden');
        toggle.classList.toggle('collapsed', content.classList.contains('hidden'));
        // 如果隐藏了，取消 flex: 1 避免占位
        if (content.classList.contains('hidden')) {
          this.style.flex = '0 0 auto';
        } else {
          // 恢复默认行为 (由 CSS 控制，或设为 1 如果是最后一个)
          this.style.flex = '';
        }
      };
    }
  }
}

customElements.define('app-sidebar', Sidebar);
customElements.define('sidebar-section', SidebarSection);
