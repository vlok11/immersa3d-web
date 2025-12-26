/**
 * @fileoverview 模态框基类组件
 * @module components/core/BaseModal
 */

import { BaseComponent } from '../core/BaseComponent.js';

export class BaseModal extends BaseComponent {
  constructor() {
    super();
    this.visible = false;
  }

  template() {
    return `
      <div class="overlay" id="overlay">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title"><slot name="title">标题</slot></h3>
            <button class="close-btn" id="close-btn">×</button>
          </div>
          <div class="modal-content">
            <slot></slot>
          </div>
          <div class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `;
  }

  styles() {
    return /* css */ `
      :host {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      :host([visible]) {
        display: block;
        opacity: 1;
      }
      
      .overlay {
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
      }
      
      .modal {
        background: #1e1e1e;
        border: 1px solid #333;
        border-radius: 8px;
        width: 500px;
        max-width: 90%;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        transform: translateY(20px);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      
      :host([visible]) .modal {
        transform: translateY(0);
      }
      
      .modal-header {
        padding: 15px 20px;
        border-bottom: 1px solid #333;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .modal-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #eee;
      }
      
      .close-btn {
        background: none;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0 5px;
        line-height: 1;
        transition: color 0.2s;
      }
      
      .close-btn:hover {
        color: #fff;
      }
      
      .modal-content {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
        color: #ccc;
      }
      
      .modal-footer {
        padding: 15px 20px;
        border-top: 1px solid #333;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      
      /* 通用按钮样式供子类使用 */
      ::slotted(button) {
        padding: 8px 16px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
      }
      
      ::slotted(button.primary) {
        background: #646cff;
        color: white;
      }
      
      ::slotted(button.primary:hover) {
        background: #7c83ff;
      }
      
      ::slotted(button.secondary) {
        background: #333;
        color: #eee;
      }
      
      ::slotted(button.secondary:hover) {
        background: #444;
      }
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.setStyles(this.styles());

    // 关闭按钮
    this.$('#close-btn').onclick = () => this.close();

    // 点击遮罩关闭
    this.$('#overlay').onclick = (e) => {
      if (e.target.id === 'overlay') this.close();
    };

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (this.visible && e.key === 'Escape') this.close();
    });
  }

  open() {
    this.visible = true;
    this.setAttribute('visible', '');
    this.emit('opened');
  }

  close() {
    this.visible = false;
    this.removeAttribute('visible');
    this.emit('closed');
  }
}

customElements.define('base-modal', BaseModal);
