/**
 * @fileoverview 图层面板组件 - 管理场景对象的可见性和选择
 * @module components/Layout/LayersPanel
 */

import { BaseComponent } from '../core/BaseComponent.js';

export class LayersPanel extends BaseComponent {
  constructor() {
    super();
    this.layers = [];
  }

  template() {
    return `
      <div class="layers-panel">
        <div class="layer-list" id="layer-list">
          <div class="empty-state">暂无图层</div>
        </div>
      </div>
    `;
  }

  styles() {
    return /* css */ `
      :host {
        display: block;
        height: 100%;
        color: #eee;
      }
      
      .layers-panel {
        height: 100%;
        overflow-y: auto;
      }
      
      .layer-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-bottom: 1px solid #333;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
      }
      
      .layer-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .layer-item.active {
        background: #2c3e50;
        border-left: 3px solid #646cff;
      }
      
      .visibility-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        margin-right: 8px;
        font-size: 14px;
        width: 20px;
        text-align: center;
      }
      
      .visibility-btn:hover {
        color: #fff;
      }
      
      .visibility-btn.hidden {
        opacity: 0.3;
      }
      
      .layer-icon {
        margin-right: 8px;
        opacity: 0.7;
      }
      
      .layer-name {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .empty-state {
        padding: 20px;
        text-align: center;
        color: #666;
        font-size: 12px;
        font-style: italic;
      }
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.setStyles(this.styles());
  }

  /**
   * 更新图层列表
   * @param {THREE.Object3D[]} objects
   */
  updateLayers(objects) {
    this.layers = objects.filter((obj) => obj.isMesh || obj.isGroup); // Simple filter
    this._renderList();
  }

  _renderList() {
    const list = this.$('#layer-list');
    list.innerHTML = '';

    if (this.layers.length === 0) {
      list.innerHTML = '<div class="empty-state">暂无图层</div>';
      return;
    }

    this.layers.forEach((obj, index) => {
      const item = document.createElement('div');
      item.className = `layer-item ${obj.userData.selected ? 'active' : ''}`;

      const typeIcon = obj.isMesh ? '📦' : '📁';
      const isVisible = obj.visible;

      item.innerHTML = `
        <button class="visibility-btn ${!isVisible ? 'hidden' : ''}">${isVisible ? '👁️' : '─'}</button>
        <span class="layer-icon">${typeIcon}</span>
        <span class="layer-name">${obj.name || `Object ${index + 1}`}</span>
      `;

      // Events
      const visBtn = item.querySelector('.visibility-btn');
      visBtn.onclick = (e) => {
        e.stopPropagation();
        obj.visible = !obj.visible;
        this.emit('layer-visibility-change', { object: obj, visible: obj.visible });
        this._renderList(); // Re-render to update icon
      };

      item.onclick = () => {
        this.$$('.layer-item').forEach((el) => el.classList.remove('active'));
        item.classList.add('active');
        this.emit('layer-selected', { object: obj });
      };

      list.appendChild(item);
    });
  }
}

customElements.define('layers-panel', LayersPanel);
