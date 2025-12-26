/**
 * @fileoverview 全局设置模态框
 * @module components/Modals/SettingsModal
 */

import { BaseModal } from '../core/BaseModal.js';

export class SettingsModal extends BaseModal {
  template() {
    return `
      <div class="overlay" id="overlay">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">系统设置</h3>
            <button class="close-btn" id="close-btn">×</button>
          </div>
          <div class="modal-content">
            <div class="section-title">渲染</div>
            <div class="setting-item">
              <label>抗锯齿 (FSAA)</label>
              <input type="checkbox" id="antialias" checked>
            </div>
            <div class="setting-item">
              <label>允许阴影 (Shadows)</label>
              <input type="checkbox" id="shadows" checked>
            </div>
            <div class="setting-item">
              <label>高精度深度 (High Precision)</label>
              <input type="checkbox" id="high-precision" checked>
            </div>
            
            <div class="section-title">界面</div>
            <div class="setting-item">
              <label>显示 FPS</label>
              <input type="checkbox" id="show-fps" checked>
            </div>
            <div class="setting-item">
              <label>自动保存 (分钟)</label>
              <input type="number" id="autosave" value="5" min="0" max="60" style="width: 60px">
            </div>
          </div>
          <div class="modal-footer">
            <button class="secondary" id="reset-btn">重置默认</button>
            <button class="primary" id="save-btn">保存更改</button>
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
      .section-title {
        color: #646cff;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 24px 0 12px 0;
        font-weight: 700;
        border-bottom: 1px solid #333;
        padding-bottom: 8px;
      }
      
      .section-title:first-child {
        margin-top: 0;
      }
      
      .setting-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 4px;
        border-bottom: 1px solid #2a2a2a;
      }
      
      input[type="number"] {
        background: #333;
        border: 1px solid #444;
        color: #fff;
        padding: 5px;
        border-radius: 4px;
      }
    `
    );
  }

  connectedCallback() {
    super.connectedCallback();

    this.$('#save-btn').onclick = () => {
      // 收集设置并发出事件
      const settings = {
        render: {
          antialias: this.$('#antialias').checked,
          shadows: this.$('#shadows').checked,
        },
        ui: {
          showFps: this.$('#show-fps').checked,
        },
      };
      this.emit('save', settings);
      this.close();
    };

    this.$('#reset-btn').onclick = () => {
      // 简单重置 UI
      this.$$('input[type="checkbox"]').forEach((i) => (i.checked = true));
    };
  }
}

customElements.define('settings-modal', SettingsModal);
