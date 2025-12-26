/**
 * @fileoverview 模块管理器 (EventBus + Dependency Injection)
 * @module core/ModuleManager
 */

import Logger from '../utils/Logger.js';

class ModuleManager {
  constructor() {
    this._modules = new Map();
    this._events = new Map();
  }

  /**
   * 注册模块
   * @param {string} name
   * @param {object} instance
   */
  register(name, instance) {
    if (this._modules.has(name)) {
      Logger.warn(`模块 ${name} 已存在，将被覆盖`);
    }
    this._modules.set(name, instance);
    Logger.log(`📦 模块已注册: ${name}`);
  }

  /**
   * 获取模块
   * @param {string} name
   * @returns {object|undefined}
   */
  get(name) {
    return this._modules.get(name);
  }

  /**
   * 订阅事件
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    this._events.get(event).add(callback);

    return () => this.off(event, callback);
  }

  /**
   * 取消订阅
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (this._events.has(event)) {
      this._events.get(event).delete(callback);
    }
  }

  /**
   * 发布事件
   * @param {string} event
   * @param {any} data
   */
  emit(event, data) {
    if (this._events.has(event)) {
      this._events.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 销毁所有模块
   */
  dispose() {
    this._modules.forEach((module) => {
      if (module.dispose && typeof module.dispose === 'function') {
        module.dispose();
      }
    });
    this._modules.clear();
    this._events.clear();
    Logger.log('🗑️ ModuleManager 已销毁所有模块');
  }
}

export const moduleManager = new ModuleManager();
export default moduleManager;
