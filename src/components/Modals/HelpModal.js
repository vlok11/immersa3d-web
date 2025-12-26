/**
 * @fileoverview 帮助与关于模态框
 * @module components/Modals/HelpModal
 */

import { BaseModal } from '../core/BaseModal.js';

export class HelpModal extends BaseModal {
  template() {
    return `
      <div class="overlay" id="overlay">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">帮助与关于</h3>
            <button class="close-btn" id="close-btn">×</button>
          </div>
          <div class="modal-content">
            <div class="about-section">
              <div class="logo">🎨 Immersa 3D</div>
              <p>版本 v1.0.0 (Beta)</p>
              <p>AI 驱动的新一代 3D 内容创作工具。</p>
            </div>
            
            <div class="shortcut-list">
              <h4>🎹 键盘快捷键</h4>
              <div class="shortcut-item">
                <span>播放 / 暂停</span>
                <span class="key">Space</span>
              </div>
              <div class="shortcut-item">
                <span>保存项目</span>
                <span class="key">Ctrl + S</span>
              </div>
              <div class="shortcut-item">
                <span>切换全屏</span>
                <span class="key">F</span>
              </div>
              <div class="shortcut-item">
                <span>重置视图</span>
                <span class="key">R</span>
              </div>
              <div class="shortcut-item">
                <span>删除选中对象</span>
                <span class="key">Delete</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="primary" id="ok-btn">关闭</button>
          </div>
        </div>
      </div>
    `;
  }

  styles() {
    const baseStyles = super.styles();
    return (
      baseStyles +
      /* css */ `
      .about-section {
        text-align: center;
        padding: 20px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        margin-bottom: 20px;
      }
      
      .logo {
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 10px;
        background: linear-gradient(45deg, #646cff, #aaddff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      h4 {
        margin: 0 0 15px 0;
        color: #ddd;
      }
      
      .shortcut-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #333;
      }
      
      .key {
        background: #333;
        padding: 2px 8px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        border: 1px solid #444;
      }
    `
    );
  }

  connectedCallback() {
    super.connectedCallback();
    this.$('#ok-btn').onclick = () => this.close();
  }
}

customElements.define('help-modal', HelpModal);
