/**
 * @fileoverview 预览窗口组件 - 3D 视口容器
 * @module components/Preview/PreviewWindow
 */

import { BaseComponent } from '../core/BaseComponent.js';

/**
 * 预览窗口组件
 * @class
 * @extends BaseComponent
 */
export class PreviewWindow extends BaseComponent {
  constructor() {
    super();
    this.setStyles(/* css */ `
      :host {
        display: block;
        flex: 1;
        position: relative;
        background: #0a0a0a;
        overflow: hidden;
      }
      
      .viewport {
        width: 100%;
        height: 100%;
        position: relative;
      }
      
      #canvas-container {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
      }
      
      .overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 10;
      }
      
      .controls-overlay {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 8px;
        backdrop-filter: blur(10px);
        pointer-events: auto;
      }
      
      .ctrl-btn {
        background: transparent;
        border: none;
        color: #ccc;
        font-size: 16px;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .ctrl-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .ctrl-btn.active {
        color: var(--color-primary, #4a90e2);
      }
      
      .info-overlay {
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.6);
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 11px;
        color: #888;
        font-family: monospace;
        pointer-events: none;
      }
      
      .info-overlay span {
        display: block;
      }
      
      .zoom-overlay {
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 5px;
        pointer-events: auto;
      }
      
      .zoom-btn {
        background: rgba(0, 0, 0, 0.7);
        border: none;
        color: #ccc;
        font-size: 14px;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 4px;
        transition: all 0.2s;
      }
      
      .zoom-btn:hover {
        background: rgba(50, 50, 50, 0.9);
        color: #fff;
      }
      
      .loading-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: #666;
        display: none;
      }
      
      .loading-overlay.visible {
        display: block;
      }
      
      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #333;
        border-top-color: var(--color-primary, #4a90e2);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 10px;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .empty-state {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: #444;
      }
      
      .empty-state .icon {
        font-size: 48px;
        margin-bottom: 10px;
      }
      
      .empty-state .text {
        font-size: 14px;
      }
    `);

    this.isPlaying = false;
    this.showStats = true;
  }

  template() {
    return `
      <div class="viewport">
        <div id="canvas-container"></div>
        
        <div class="overlay">
          <div class="info-overlay" id="stats-display">
            <span>FPS: --</span>
            <span>Draw: -- calls</span>
          </div>
          
          <div class="zoom-overlay">
            <button class="zoom-btn" data-zoom="in">+</button>
            <button class="zoom-btn" data-zoom="out">−</button>
            <button class="zoom-btn" data-zoom="fit">Fit</button>
          </div>
          
          <div class="controls-overlay">
            <button class="ctrl-btn" id="playPauseBtn" title="播放/暂停">▶️</button>
            <button class="ctrl-btn" id="resetBtn" title="重置视图">🔄</button>
            <button class="ctrl-btn" id="fullscreenBtn" title="全屏">🖥️</button>
            <button class="ctrl-btn" id="screenshotBtn" title="截图">📷</button>
            <button class="ctrl-btn" id="videoBtn" title="录制">🎬</button>
          </div>
          
          <div class="loading-overlay" id="loading">
            <div class="spinner"></div>
            <div>处理中...</div>
          </div>
        </div>
        
        <div class="empty-state" id="emptyState">
          <div class="icon">🖼️</div>
          <div class="text">拖放图片或视频开始创作</div>
        </div>
      </div>
    `;
  }

  addEventListeners() {
    // 播放/暂停
    const playPauseBtn = this.$('#playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.onclick = () => {
        this.isPlaying = !this.isPlaying;
        playPauseBtn.textContent = this.isPlaying ? '⏸️' : '▶️';
        this.emit('playPause', { playing: this.isPlaying });
      };
    }

    // 重置视图
    const resetBtn = this.$('#resetBtn');
    if (resetBtn) {
      resetBtn.onclick = () => this.emit('resetView');
    }

    // 全屏
    const fullscreenBtn = this.$('#fullscreenBtn');
    if (fullscreenBtn) {
      fullscreenBtn.onclick = () => this.toggleFullscreen();
    }

    // 截图
    const screenshotBtn = this.$('#screenshotBtn');
    if (screenshotBtn) {
      screenshotBtn.onclick = () => this.emit('screenshot');
    }

    // 录制
    const videoBtn = this.$('#videoBtn');
    if (videoBtn) {
      videoBtn.onclick = () => this.emit('startRecording');
    }

    // 缩放控制
    this.$$('[data-zoom]').forEach((btn) => {
      btn.onclick = () => this.emit('zoom', { action: btn.dataset.zoom });
    });
  }

  /**
   * 获取 Canvas 容器
   * @returns {HTMLElement}
   */
  getCanvasContainer() {
    return this.$('#canvas-container');
  }

  /**
   * 显示加载状态
   * @param {boolean} show
   */
  showLoading(show) {
    const loading = this.$('#loading');
    if (loading) {
      loading.classList.toggle('visible', show);
    }
  }

  /**
   * 显示空状态
   * @param {boolean} show
   */
  showEmptyState(show) {
    const empty = this.$('#emptyState');
    if (empty) {
      empty.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * 更新统计信息
   * @param {object} stats
   */
  updateStats(stats) {
    const display = this.$('#stats-display');
    if (display) {
      display.innerHTML = `
        <span>FPS: ${stats.fps || '--'}</span>
        <span>Draw: ${stats.drawCalls || '--'} calls</span>
        ${stats.triangles ? `<span>Tris: ${stats.triangles}</span>` : ''}
      `;
    }
  }

  /**
   * 切换全屏
   */
  async toggleFullscreen() {
    const container = this.$('#canvas-container');
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch (error) {
      console.warn('全屏切换失败:', error);
    }
  }

  /**
   * 获取当前尺寸
   * @returns {{width: number, height: number}}
   */
  getSize() {
    const container = this.$('#canvas-container');
    if (container) {
      return {
        width: container.clientWidth,
        height: container.clientHeight,
      };
    }
    return { width: 0, height: 0 };
  }
}

customElements.define('preview-window', PreviewWindow);
