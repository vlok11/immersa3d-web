/**
 * @fileoverview 全局错误处理系统
 * @module core/Utils/ErrorHandler
 */

/**
 * 错误严重级别
 */
export const ErrorLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  FATAL: 'fatal',
};

/**
 * 错误类型
 */
export const ErrorType = {
  NETWORK: 'network',
  MODEL_LOAD: 'model_load',
  RENDER: 'render',
  FILE_PROCESS: 'file_process',
  WEBGL: 'webgl',
  MEMORY: 'memory',
  UNKNOWN: 'unknown',
};

/**
 * 自定义错误类
 */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {string} type
   * @param {string} level
   * @param {object} context
   */
  constructor(message, type = ErrorType.UNKNOWN, level = ErrorLevel.ERROR, context = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.level = level;
    this.context = context;
    this.timestamp = Date.now();
  }
}

/**
 * 错误处理器
 */
export class ErrorHandler {
  constructor() {
    /** @private */
    this._errorListeners = [];

    /** @private */
    this._errorLog = [];

    /** @private */
    this._maxLogSize = 100;

    /** @type {boolean} */
    this.isRegistered = false;
  }

  /**
   * 注册全局错误处理
   */
  register() {
    if (this.isRegistered) return;

    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handle(
        new AppError(
          event.reason?.message || '未处理的 Promise 拒绝',
          ErrorType.UNKNOWN,
          ErrorLevel.ERROR,
          { originalError: event.reason }
        )
      );
      event.preventDefault();
    });

    // 捕获全局错误
    window.addEventListener('error', (event) => {
      this.handle(
        new AppError(event.message, ErrorType.UNKNOWN, ErrorLevel.ERROR, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        })
      );
    });

    // 捕获 WebGL 上下文丢失
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        this.handle(new AppError('WebGL 上下文丢失', ErrorType.WEBGL, ErrorLevel.FATAL));
      });
    }

    this.isRegistered = true;
    console.log('🛡️ 全局错误处理已注册');
  }

  /**
   * 处理错误
   * @param {AppError|Error} error
   */
  handle(error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError(error.message, ErrorType.UNKNOWN, ErrorLevel.ERROR, {
            originalError: error,
          });

    // 记录到日志
    this._log(appError);

    // 通知监听器
    this._notifyListeners(appError);

    // 控制台输出
    this._consoleLog(appError);

    // 显示用户通知
    this._showUserNotification(appError);
  }

  /**
   * 添加错误监听器
   * @param {function} listener
   */
  addListener(listener) {
    this._errorListeners.push(listener);
  }

  /**
   * 移除错误监听器
   * @param {function} listener
   */
  removeListener(listener) {
    const index = this._errorListeners.indexOf(listener);
    if (index > -1) {
      this._errorListeners.splice(index, 1);
    }
  }

  /**
   * 获取错误日志
   * @returns {AppError[]}
   */
  getErrorLog() {
    return [...this._errorLog];
  }

  /**
   * 清除错误日志
   */
  clearLog() {
    this._errorLog = [];
  }

  /**
   * 记录错误
   * @private
   */
  _log(error) {
    this._errorLog.push(error);
    if (this._errorLog.length > this._maxLogSize) {
      this._errorLog.shift();
    }
  }

  /**
   * 通知监听器
   * @private
   */
  _notifyListeners(error) {
    this._errorListeners.forEach((listener) => {
      try {
        listener(error);
      } catch (e) {
        console.error('错误监听器抛出异常:', e);
      }
    });
  }

  /**
   * 控制台日志
   * @private
   */
  _consoleLog(error) {
    const prefix =
      {
        [ErrorLevel.INFO]: 'ℹ️',
        [ErrorLevel.WARNING]: '⚠️',
        [ErrorLevel.ERROR]: '❌',
        [ErrorLevel.FATAL]: '💀',
      }[error.level] || '❓';

    const method =
      {
        [ErrorLevel.INFO]: 'info',
        [ErrorLevel.WARNING]: 'warn',
        [ErrorLevel.ERROR]: 'error',
        [ErrorLevel.FATAL]: 'error',
      }[error.level] || 'log';

    console[method](`${prefix} [${error.type}] ${error.message}`, error.context);
  }

  /**
   * 显示用户通知
   * @private
   */
  _showUserNotification(error) {
    // 只有 ERROR 和 FATAL 级别才显示通知
    if (error.level !== ErrorLevel.ERROR && error.level !== ErrorLevel.FATAL) {
      return;
    }

    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${error.level === ErrorLevel.FATAL ? 'error' : 'warning'}`;

    const message = this._getUserFriendlyMessage(error);
    toast.innerHTML = `
      <span class="toast__icon">${error.level === ErrorLevel.FATAL ? '💀' : '⚠️'}</span>
      <span class="toast__text">${message}</span>
    `;

    toastContainer.appendChild(toast);

    // 自动移除
    setTimeout(() => {
      toast.classList.add('toast--fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  /**
   * 获取用户友好的错误消息
   * @private
   */
  _getUserFriendlyMessage(error) {
    const messages = {
      [ErrorType.NETWORK]: '网络连接失败，请检查网络',
      [ErrorType.MODEL_LOAD]: 'AI 模型加载失败，请刷新重试',
      [ErrorType.RENDER]: '渲染出现问题，尝试降低画质',
      [ErrorType.FILE_PROCESS]: '文件处理失败，请检查文件格式',
      [ErrorType.WEBGL]: '图形渲染引擎出错，请刷新页面',
      [ErrorType.MEMORY]: '内存不足，请关闭其他应用',
      [ErrorType.UNKNOWN]: '发生未知错误',
    };

    return messages[error.type] || error.message;
  }
}

// 单例导出
export const errorHandler = new ErrorHandler();
