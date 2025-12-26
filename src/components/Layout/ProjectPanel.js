/**
 * @fileoverview 项目面板组件 - 管理文件导入和资源展示
 * @module components/Layout/ProjectPanel
 */

import { BaseComponent } from '../core/BaseComponent.js';

export class ProjectPanel extends BaseComponent {
  constructor() {
    super();
    this.files = [];
  }

  template() {
    return `
      <div class="project-panel">
        <div class="upload-zone" id="upload-zone">
          <div class="icon">📁</div>
          <p class="text">拖放图片/视频到此处</p>
          <p class="hint">或点击选择文件</p>
          <input type="file" id="file-input" accept="image/*,video/*" multiple hidden />
        </div>
        
        <div class="file-list" id="file-list">
          <!-- 文件列表将在此渲染 -->
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
      
      .project-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 10px;
        gap: 15px;
      }
      
      .upload-zone {
        border: 2px dashed #444;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        background: rgba(255, 255, 255, 0.02);
      }
      
      .upload-zone:hover, .upload-zone.drag-over {
        border-color: #646cff;
        background: rgba(100, 108, 255, 0.1);
      }
      
      .icon {
        font-size: 24px;
        margin-bottom: 8px;
      }
      
      .text {
        font-size: 13px;
        margin: 0 0 4px 0;
        font-weight: 500;
      }
      
      .hint {
        font-size: 11px;
        color: #888;
        margin: 0;
      }
      
      .file-list {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .file-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        background: #2a2a2a;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .file-item:hover {
        background: #333;
      }
      
      .file-item.active {
        background: #646cff;
        color: #fff;
      }
      
      .file-preview {
        width: 32px;
        height: 32px;
        object-fit: cover;
        border-radius: 4px;
        background: #000;
      }
      
      .file-info {
        flex: 1;
        overflow: hidden;
      }
      
      .file-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
      }
      
      .file-meta {
        font-size: 10px;
        opacity: 0.7;
        margin-top: 2px;
      }
      
      .remove-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 4px;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.2s;
      }
      
      .file-item:hover .remove-btn {
        opacity: 1;
      }
      
      .remove-btn:hover {
        color: #ff4444;
      }
    `;
  }

  connectedCallback() {
    super.connectedCallback(); // Render template & styles
    // BaseComponent sets styles via setStyles now, but let's assume we integrate it.
    // Actually BaseComponent usually needs setStyles call or template includes style.
    // Let's modify to standard BaseComponent usage pattern.
    this.setStyles(this.styles());
    this.render(); // Ensure initial render if not called by super (BaseComponent logic varies)
    this._setupInteractions();
  }

  _setupInteractions() {
    const uploadZone = this.$('#upload-zone');
    const fileInput = this.$('#file-input');

    // Click to upload
    uploadZone.onclick = () => fileInput.click();

    // File input change
    fileInput.onchange = (e) => {
      this._handleFiles(Array.from(e.target.files));
      fileInput.value = ''; // Reset
    };

    // Drag and Drop
    uploadZone.ondragover = (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    };

    uploadZone.ondragleave = () => {
      uploadZone.classList.remove('drag-over');
    };

    uploadZone.ondrop = (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      this._handleFiles(Array.from(e.dataTransfer.files));
    };
  }

  _handleFiles(files) {
    const validFiles = files.filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    if (validFiles.length > 0) {
      this.files.push(...validFiles);
      this._renderFileList();

      // Emit event for the first file (auto-select if it's the only one)
      this.emit('file-selected', { file: validFiles[0] });
    }
  }

  _renderFileList() {
    const list = this.$('#file-list');
    list.innerHTML = '';

    this.files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-item';

      // Create thumbnail (async)
      const url = URL.createObjectURL(file);

      item.innerHTML = `
        ${
          file.type.startsWith('image/')
            ? `<img src="${url}" class="file-preview">`
            : `<div class="file-preview" style="display:flex;align-items:center;justify-content:center">🎥</div>`
        }
        <div class="file-info">
          <div class="file-name" title="${file.name}">${file.name}</div>
          <div class="file-meta">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
        </div>
        <button class="remove-btn" title="移除">×</button>
      `;

      // Events
      item.onclick = (e) => {
        if (e.target.classList.contains('remove-btn')) {
          this.files.splice(index, 1);
          this._renderFileList();
          e.stopPropagation();
        } else {
          this.$$('.file-item').forEach((el) => el.classList.remove('active'));
          item.classList.add('active');
          this.emit('file-selected', { file });
        }
      };

      // Cleanup URL when element removed (simplified here, ideally use a manager)

      list.appendChild(item);
    });
  }
}

customElements.define('project-panel', ProjectPanel);
