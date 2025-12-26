/**
 * @fileoverview 导出设置模态框
 * @module components/Modals/ExportModal
 */

import { BaseModal } from '../core/BaseModal.js';

export class ExportModal extends BaseModal {
  template() {
    return `
      <div class="overlay" id="overlay">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">导出项目</h3>
            <button class="close-btn" id="close-btn">×</button>
          </div>
          <div class="modal-content">
            <div class="form-group">
              <label>导出格式</label>
              <div class="options-grid">
                <label class="option-card active">
                  <input type="radio" name="format" value="png" checked>
                  <span class="icon">🖼️</span>
                  <span class="label">PNG 图片</span>
                </label>
                <label class="option-card">
                  <input type="radio" name="format" value="jpeg">
                  <span class="icon">📷</span>
                  <span class="label">JPEG 图片</span>
                </label>
                <label class="option-card">
                  <input type="radio" name="format" value="webm">
                  <span class="icon">🎬</span>
                  <span class="label">WebM 视频</span>
                </label>
              </div>
            </div>

            <div class="form-group" id="quality-group">
              <label>质量设置 (0.1 - 1.0)</label>
              <div class="range-wrap">
                <input type="range" id="quality" min="0.1" max="1.0" step="0.1" value="0.9">
                <span id="quality-val">0.9</span>
              </div>
            </div>

            <div class="form-group hidden" id="duration-group">
              <label>视频时长 (秒)</label>
              <input type="number" id="duration" value="5" min="1" max="60">
            </div>
          </div>
          <div class="modal-footer">
            <button class="secondary" id="cancel-btn">取消</button>
            <button class="primary" id="export-btn">开始导出</button>
          </div>
        </div>
      </div>
    `;
  }

  styles() {
    // 继承基础样式并添加特定样式
    const baseStyles = super.styles();
    return (
      baseStyles +
      /* css */ `
      .form-group {
        margin-bottom: 20px;
      }
      
      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #eee;
      }
      
      .options-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      
      .option-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #2a2a2a;
        border: 2px solid transparent;
        border-radius: 8px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .option-card:hover {
        background: #333;
      }
      
      .option-card input {
        display: none;
      }
      
      .option-card.active {
        border-color: #646cff;
        background: rgba(100, 108, 255, 0.1);
      }
      
      .icon {
        font-size: 24px;
        margin-bottom: 8px;
      }
      
      .range-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      input[type="range"] {
        flex: 1;
      }
      
      input[type="number"] {
        background: #333;
        border: 1px solid #444;
        color: #fff;
        padding: 8px;
        border-radius: 4px;
        width: 100%;
      }
      
      .hidden {
        display: none;
      }
    `
    );
  }

  connectedCallback() {
    super.connectedCallback();

    // 格式切换
    const formatRadios = this.$$('input[name="format"]');
    const cards = this.$$('.option-card');
    const durationGroup = this.$('#duration-group');

    formatRadios.forEach((radio) => {
      radio.onchange = (e) => {
        // 更新样式
        cards.forEach((c) => c.classList.remove('active'));
        e.target.closest('.option-card').classList.add('active');

        // 显示/隐藏时长
        if (e.target.value === 'webm') {
          durationGroup.classList.remove('hidden');
        } else {
          durationGroup.classList.add('hidden');
        }
      };
    });

    // 质量滑块
    const qualityInput = this.$('#quality');
    const qualityVal = this.$('#quality-val');
    qualityInput.oninput = () => (qualityVal.textContent = qualityInput.value);

    // 按钮事件
    this.$('#cancel-btn').onclick = () => this.close();
    this.$('#export-btn').onclick = () => this._handleExport();
  }

  _handleExport() {
    const format = this.$('input[name="format"]:checked').value;
    const quality = parseFloat(this.$('#quality').value);
    const duration = parseInt(this.$('#duration').value);

    this.emit('confirm', { format, quality, duration });
    this.close();
  }
}

customElements.define('export-modal', ExportModal);
