/**
 * @fileoverview 顶部导航栏组件
 * @module components/Layout/NavigationBar
 */

import { BaseComponent } from '../core/BaseComponent.js';

export class NavigationBar extends BaseComponent {
  constructor() {
    super();
    this.setStyles(/* css */ `
      :host {
        display: block;
        height: 60px;
        background: #1a1a1a;
        border-bottom: 1px solid #333;
      }
      
      .navbar {
        height: 100%;
        display: flex;
        align-items: center;
        padding: 0 20px;
        justify-content: space-between;
      }
      
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        font-weight: 700;
        color: #fff;
        user-select: none;
      }
      
      .brand-icon {
        font-size: 24px;
      }
      
      .menu {
        display: flex;
        gap: 10px;
      }
      
      .btn {
        background: transparent;
        border: 1px solid transparent;
        color: #ccc;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .actions {
        display: flex;
        gap: 10px;
      }
      
      .icon-btn {
        background: transparent;
        border: none;
        color: #aaa;
        font-size: 20px;
        cursor: pointer;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
      }
      
      .icon-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
    `);
  }

  template() {
    return `
      <div class="navbar">
        <div class="brand">
          <span class="brand-icon">🎨</span>
          <span class="brand-text">Immersa 3D</span>
        </div>
        
        <nav class="menu">
          <button class="btn" data-action="new">新建</button>
          <button class="btn" data-action="open">打开</button>
          <button class="btn" data-action="save">保存</button>
          <button class="btn" data-action="export">导出</button>
        </nav>
        
        <div class="actions">
          <button class="icon-btn" data-action="settings" title="设置">⚙️</button>
          <button class="icon-btn" data-action="help" title="帮助">❓</button>
        </div>
      </div>
    `;
  }

  addEventListeners() {
    this.$$('[data-action]').forEach((btn) => {
      btn.onclick = () => {
        this.emit('nav-action', { action: btn.dataset.action });
      };
    });
  }
}

customElements.define('navigation-bar', NavigationBar);
