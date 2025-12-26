/**
 * @fileoverview 时间轴编辑器组件 - 关键帧动画编辑
 * @module components/Timeline/TimelineEditor
 */

import { BaseComponent } from '../core/BaseComponent.js';

export class TimelineEditor extends BaseComponent {
  constructor() {
    super();
    this.setStyles(/* css */ `
      :host {
        display: block;
        height: 120px;
        background: rgba(20, 20, 20, 0.9);
        border-top: 1px solid #333;
        position: relative;
        user-select: none;
      }
      
      .toolbar {
        height: 30px;
        background: #2a2a2a;
        display: flex;
        align-items: center;
        padding: 0 10px;
        gap: 10px;
        border-bottom: 1px solid #333;
      }
      
      .btn {
        background: transparent;
        border: none;
        color: #ccc;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
      }
      
      .btn:hover {
        background: #444;
        color: #fff;
      }
      
      .btn.active {
        color: var(--color-primary, #4a90e2);
      }
      
      .timeline-track {
        position: relative;
        height: 60px;
        background: #1a1a1a;
        margin-top: 5px;
        overflow: hidden;
      }
      
      .ruler {
        height: 20px;
        background: #222;
        border-bottom: 1px solid #333;
        position: relative;
      }
      
      .keyframe {
        position: absolute;
        top: 20px;
        width: 8px;
        height: 8px;
        background: var(--color-primary, #4a90e2);
        transform: rotate(45deg);
        cursor: pointer;
        margin-left: -4px;
        z-index: 10;
        border: 1px solid #fff;
      }
      
      .keyframe:hover, .keyframe.selected {
        background: #fff;
        transform: rotate(45deg) scale(1.2);
        z-index: 11;
      }
      
      .playhead {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: #ff4444;
        pointer-events: none;
        z-index: 20;
      }
      
      .playhead::before {
        content: '';
        position: absolute;
        top: 0;
        left: -5px;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 8px solid #ff4444;
      }
      
      .time-display {
        font-family: monospace;
        font-size: 12px;
        color: #888;
      }
    `);

    this.totalTime = 10; // 秒
    this.zoom = 100; // 像素/秒
  }

  template() {
    return `
      <div class="toolbar">
        <button class="btn" id="playBtn">▶ 播放</button>
        <button class="btn" id="stopBtn">⏹ 停止</button>
        <button class="btn" id="addKeyBtn">+ 添加关键帧</button>
        <button class="btn" id="clearBtn">🗑 清除</button>
        <span style="flex:1"></span>
        <span class="time-display">00:00 / 10:00</span>
      </div>
      <div class="ruler"></div>
      <div class="timeline-track" id="track">
        <div class="playhead" id="playhead" style="left: 0px"></div>
      </div>
    `;
  }

  addEventListeners() {
    const playBtn = this.$('#playBtn');
    const stopBtn = this.$('#stopBtn');
    const addKeyBtn = this.$('#addKeyBtn');
    const clearBtn = this.$('#clearBtn');
    const track = this.$('#track');

    if (playBtn) playBtn.onclick = () => this.emit('play');
    if (stopBtn) stopBtn.onclick = () => this.emit('stop');
    if (addKeyBtn) addKeyBtn.onclick = () => this.emit('addKeyframe');
    if (clearBtn) clearBtn.onclick = () => this.emit('clearParams');

    // 点击时间轴跳转
    if (track) {
      track.onmousedown = (e) => {
        const rect = track.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = this._xToTime(x);
        this.setTime(time);
        this.emit('seek', { time });

        // 简单拖拽
        const onMove = (moveEvent) => {
          const moveX = moveEvent.clientX - rect.left;
          const moveTime = this._xToTime(moveX);
          this.setTime(moveTime);
          this.emit('seek', { time: moveTime });
        };

        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      };
    }
  }

  /**
   * 设置当前时间
   * @param {number} time
   */
  setTime(time) {
    const x = Math.min(Math.max(0, time * this.zoom), this.totalTime * this.zoom);
    const playhead = this.$('#playhead');
    const display = this.$('.time-display');

    if (playhead) playhead.style.left = `${x}px`;
    if (display)
      display.textContent = `${this._formatTime(time)} / ${this._formatTime(this.totalTime)}`;
  }

  /**
   * 添加关键帧标记
   * @param {number} time
   * @param {object} data
   */
  addKeyframeMarker(time, data) {
    const track = this.$('#track');
    if (!track) return;

    const marker = document.createElement('div');
    marker.className = 'keyframe';
    marker.style.left = `${time * this.zoom}px`;
    marker.title = `Keyframe @ ${time.toFixed(2)}s`;

    marker.onmousedown = (e) => {
      e.stopPropagation(); // 防止触发 playhead 跳转
      this.$('.selected')?.classList.remove('selected');
      marker.classList.add('selected');
      this.emit('selectKeyframe', { time, data });
    };

    track.appendChild(marker);
  }

  /**
   * 清除所有标记
   */
  clearMarkers() {
    const markers = this.$$('.keyframe');
    markers.forEach((m) => m.remove());
  }

  _xToTime(x) {
    return Math.max(0, Math.min(this.totalTime, x / this.zoom));
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    // const ms = Math.floor((seconds % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}

customElements.define('timeline-editor', TimelineEditor);
