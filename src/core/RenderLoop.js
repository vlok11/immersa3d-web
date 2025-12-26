/**
 * @fileoverview 核心渲染循环管理器
 * @module core/RenderLoop
 */

import * as THREE from 'three';
import Logger from '../utils/Logger.js';

/**
 * 负责管理 requestAnimationFrame 循环、时间及统计信息
 */
export class RenderLoop {
  constructor() {
    /** @private */
    this._isRunning = false;
    /** @private */
    this._animationId = null;
    /** @private */
    this._callbacks = new Set();
    /** @private */
    this._clock = new THREE.Clock();

    /** @private */
    this._stats = {
      fps: 0,
      frameCount: 0,
      lastTime: performance.now(),
    };

    // 绑定上下文
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);

    // 监听可见性变化
    document.addEventListener('visibilitychange', this._handleVisibilityChange);
  }

  /**
   * 处理页面可见性变化
   * @private
   */
  _handleVisibilityChange() {
    if (document.hidden) {
      Logger.log('⏸️ 页面隐藏，暂停渲染循环');
      this.stop();
    } else {
      Logger.log('▶️ 页面可见，恢复渲染循环');
      this.start();
    }
  }

  /**
   * 请求新的一帧 (用于按需渲染)
   */
  invalidate() {
    if (!this._isRunning && !document.hidden) {
      this.start();
    }
  }

  dispose() {
    this.stop();
    document.removeEventListener('visibilitychange', this._handleVisibilityChange);
  }

  /**
   * 启动渲染循环
   */
  start() {
    if (this._isRunning) return;

    this._isRunning = true;
    this._clock.start();
    this._animate();

    Logger.log('▶️ RenderLoop 已启动');
  }

  /**
   * 停止渲染循环
   */
  stop() {
    this._isRunning = false;
    this._clock.stop();

    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }

    Logger.log('⏹️ RenderLoop 已停止');
  }

  /**
   * 添加每帧回调
   * @param {Function} callback (delta, elapsed) => void
   */
  add(callback) {
    this._callbacks.add(callback);
  }

  /**
   * 移除回调
   * @param {Function} callback
   */
  remove(callback) {
    this._callbacks.delete(callback);
  }

  /**
   * 获取当前 FPS
   * @returns {number}
   */
  get fps() {
    return this._stats.fps;
  }

  /**
   * 内部动画循环
   * @private
   */
  _animate() {
    if (!this._isRunning) return;

    this._animationId = requestAnimationFrame(this._animate.bind(this));

    const delta = this._clock.getDelta();
    const elapsed = this._clock.getElapsedTime();

    try {
      this._callbacks.forEach((callback) => callback(delta, elapsed));
    } catch (error) {
      Logger.error('❌ RenderLoop 回调错误:', error);
      this.stop(); // 防止无限错误
    }

    this._updateStats();
  }

  /**
   * 更新 FPS 统计
   * @private
   */
  _updateStats() {
    this._stats.frameCount++;
    const now = performance.now();

    if (now - this._stats.lastTime >= 1000) {
      this._stats.fps = Math.round((this._stats.frameCount * 1000) / (now - this._stats.lastTime));
      this._stats.frameCount = 0;
      this._stats.lastTime = now;
    }
  }
}

export const renderLoop = new RenderLoop();
