/**
 * @fileoverview 侧边栏组件 - 容器组件
 * @module components/Layout/Sidebar
 */

import { BaseComponent } from '../core/BaseComponent.js';

export class Sidebar extends BaseComponent {
  constructor() {
    super();
    this.position = 'left'; // 'left' or 'right'
    this.width = '280px';
  }

  static get observedAttributes() {
    return ['position', 'width'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'position') {
      this.position = newValue;
      this.setStyles(this._getStyle());
      this.render();
    }
  }

  _getStyle() {
    const borderSide = this.position === 'left' ? 'border-right' : 'border-left';
    return /* css */ `
      :host {
        display: block;
        width: 280px;
        height: 100%;
        background: #1e1e1e;
        ${borderSide}: 1px solid #333;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .section {
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid #333;
      }
      
      .section:last-child {
        border-bottom: none;
        flex: 1;
        overflow: hidden;
      }
      
      .header {
        padding: 12px 15px;
        background: #252525;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #aaa;
        border-bottom: 1px solid #333;
      }
      
      .content {
        padding: 0;
        overflow-y: auto;
      }
      
      /* Slot 样式 */
      ::slotted(*) {
        padding: 10px;
      }
    `;
  }

  connectedCallback() {
    this.position = this.getAttribute('position') || 'left';
    this.setStyles(this._getStyle());
    super.connectedCallback();
  }

  template() {
    return `
      <div class="sections-container">
        <slot></slot>
      </div>
    `;
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
      }
      .content {
        overflow-y: auto;
        flex: 1;
      }
      .hidden {
        display: none;
      }
    `);
    super.connectedCallback();
  }

  template() {
    return `
      <div class="header">
        <span>${this.title}</span>
        <span class="toggle">-</span>
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
        toggle.textContent = content.classList.contains('hidden') ? '+' : '-';
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
