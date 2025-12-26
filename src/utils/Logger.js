/**
 * @fileoverview 日志工具 - 统一管理日志输出
 * @module utils/Logger
 */

/**
 * 日志级别
 * @enum {number}
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

/**
 * 日志工具类
 */
export class Logger {
  /**
   * 当前日志级别
   * @type {number}
   * @private
   */
  static _level = LogLevel.INFO;

  /**
   * 设置日志级别
   * @param {number} level - LogLevel 枚举值
   */
  static setLevel(level) {
    this._level = level;
  }

  /**
   * 获取当前日志级别
   * @returns {number}
   */
  static getLevel() {
    return this._level;
  }

  /**
   * 输出调试信息
   * @param {string} message
   * @param {...any} args
   */
  static debug(message, ...args) {
    if (this._level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * 输出普通信息
   * @param {string} message
   * @param {...any} args
   */
  static info(message, ...args) {
    if (this._level <= LogLevel.INFO) {
      console.info(`ℹ️ ${message}`, ...args);
    }
  }

  /**
   * 输出日志信息 (info 的别名)
   * @param {string} message
   * @param {...any} args
   */
  static log(message, ...args) {
    if (this._level <= LogLevel.INFO) {
      console.log(message, ...args);
    }
  }

  /**
   * 输出警告信息
   * @param {string} message
   * @param {...any} args
   */
  static warn(message, ...args) {
    if (this._level <= LogLevel.WARN) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  }

  /**
   * 输出错误信息
   * @param {string} message
   * @param {...any} args
   */
  static error(message, ...args) {
    if (this._level <= LogLevel.ERROR) {
      console.error(`❌ ${message}`, ...args);
    }
  }

  /**
   * 分组开始
   * @param {string} label
   */
  static group(label) {
    if (this._level < LogLevel.NONE) {
      console.group(label);
    }
  }

  /**
   * 分组结束
   */
  static groupEnd() {
    if (this._level < LogLevel.NONE) {
      console.groupEnd();
    }
  }
}

// 默认导出单例或类
export default Logger;
