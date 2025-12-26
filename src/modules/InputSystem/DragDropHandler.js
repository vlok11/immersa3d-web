/**
 * @fileoverview 拖拽上传处理器
 * @module modules/InputSystem/DragDropHandler
 */

/**
 * 拖拽上传处理器
 * @class
 */
export class DragDropHandler {
  /**
   * @param {HTMLElement} dropZone - 拖拽目标区域
   * @param {object} options - 配置选项
   */
  constructor(dropZone, options = {}) {
    /** @type {HTMLElement} */
    this.dropZone = dropZone;

    /** @type {string[]} */
    this.acceptedTypes = options.acceptedTypes || ['image/*', 'video/*'];

    /** @type {number} 最大文件大小 (MB) */
    this.maxFileSize = options.maxFileSize || 100;

    /** @type {boolean} */
    this.multiple = options.multiple ?? true;

    /** @type {Function|null} */
    this.onFilesSelected = options.onFilesSelected || null;

    /** @type {Function|null} */
    this.onError = options.onError || null;

    /** @type {Function|null} */
    this.onDragEnter = options.onDragEnter || null;

    /** @type {Function|null} */
    this.onDragLeave = options.onDragLeave || null;

    /** @private */
    this._dragCounter = 0;

    /** @private */
    this._boundHandlers = {};

    this._init();
  }

  /**
   * 初始化事件监听
   * @private
   */
  _init() {
    // 绑定事件处理器
    this._boundHandlers = {
      dragenter: this._handleDragEnter.bind(this),
      dragleave: this._handleDragLeave.bind(this),
      dragover: this._handleDragOver.bind(this),
      drop: this._handleDrop.bind(this),
    };

    // 添加事件监听
    for (const [event, handler] of Object.entries(this._boundHandlers)) {
      this.dropZone.addEventListener(event, handler);
    }

    // 阻止整个文档的默认拖拽行为
    document.addEventListener('dragover', this._preventDefault);
    document.addEventListener('drop', this._preventDefault);

    console.log('✅ DragDropHandler 初始化完成');
  }

  /**
   * 阻止默认行为
   * @private
   */
  _preventDefault(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * 处理拖入事件
   * @private
   */
  _handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();

    this._dragCounter++;

    if (this._dragCounter === 1) {
      this.dropZone.classList.add('drag-over');
      if (this.onDragEnter) this.onDragEnter(e);
    }
  }

  /**
   * 处理拖离事件
   * @private
   */
  _handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();

    this._dragCounter--;

    if (this._dragCounter === 0) {
      this.dropZone.classList.remove('drag-over');
      if (this.onDragLeave) this.onDragLeave(e);
    }
  }

  /**
   * 处理拖拽悬停
   * @private
   */
  _handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }

  /**
   * 处理放置事件
   * @private
   */
  _handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    this._dragCounter = 0;
    this.dropZone.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files);
    this._processFiles(files);
  }

  /**
   * 处理文件
   * @private
   */
  _processFiles(files) {
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      // 检查文件类型
      if (!this._isValidType(file)) {
        errors.push({
          file: file.name,
          error: `不支持的文件类型: ${file.type || '未知'}`,
        });
        continue;
      }

      // 检查文件大小
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > this.maxFileSize) {
        errors.push({
          file: file.name,
          error: `文件过大: ${sizeMB.toFixed(2)}MB (最大 ${this.maxFileSize}MB)`,
        });
        continue;
      }

      validFiles.push(file);

      // 非多选模式只取第一个有效文件
      if (!this.multiple && validFiles.length > 0) break;
    }

    // 报告错误
    if (errors.length > 0 && this.onError) {
      this.onError(errors);
    }

    // 回调有效文件
    if (validFiles.length > 0 && this.onFilesSelected) {
      this.onFilesSelected(validFiles);
      console.log(`📁 接收到 ${validFiles.length} 个文件`);
    }
  }

  /**
   * 检查文件类型是否有效
   * @private
   */
  _isValidType(file) {
    const fileType = file.type;

    for (const accepted of this.acceptedTypes) {
      if (accepted.endsWith('/*')) {
        // 通配符匹配 (e.g., image/*)
        const category = accepted.split('/')[0];
        if (fileType.startsWith(category + '/')) {
          return true;
        }
      } else if (accepted === fileType) {
        // 精确匹配
        return true;
      }
    }

    return false;
  }

  /**
   * 创建隐藏的文件输入
   * @returns {HTMLInputElement}
   */
  createFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = this.multiple;
    input.accept = this.acceptedTypes.join(',');
    input.style.display = 'none';

    input.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        this._processFiles(files);
      }
      // 重置以便可以选择相同文件
      input.value = '';
    });

    return input;
  }

  /**
   * 触发文件选择对话框
   */
  openFileDialog() {
    const input = this.createFileInput();
    document.body.appendChild(input);
    input.click();

    // 延迟移除
    setTimeout(() => input.remove(), 1000);
  }

  /**
   * 设置接受的文件类型
   * @param {string[]} types
   */
  setAcceptedTypes(types) {
    this.acceptedTypes = types;
  }

  /**
   * 设置最大文件大小
   * @param {number} sizeMB
   */
  setMaxFileSize(sizeMB) {
    this.maxFileSize = sizeMB;
  }

  /**
   * 销毁处理器
   */
  dispose() {
    // 移除事件监听
    for (const [event, handler] of Object.entries(this._boundHandlers)) {
      this.dropZone.removeEventListener(event, handler);
    }

    document.removeEventListener('dragover', this._preventDefault);
    document.removeEventListener('drop', this._preventDefault);

    this.dropZone.classList.remove('drag-over');

    console.log('🗑️ DragDropHandler 已销毁');
  }
}

export default DragDropHandler;
