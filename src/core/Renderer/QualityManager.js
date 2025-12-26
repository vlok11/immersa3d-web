/**
 * @fileoverview 渲染质量管理器
 * @module core/Renderer/QualityManager
 */

import * as THREE from 'three';
import { renderLoop } from '../RenderLoop.js';
import Logger from '../../utils/Logger.js';

export const QualityProfile = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  ULTRA: 'ultra',
};

export class QualityManager {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {SceneManager} sceneManager
   * @param {RenderingPipeline} renderingPipeline
   */
  constructor(renderer, sceneManager, renderingPipeline) {
    this.renderer = renderer;
    this.sceneManager = sceneManager;
    this.renderingPipeline = renderingPipeline;

    this.config = {
      [QualityProfile.LOW]: {
        pixelRatio: 0.75, // 低于 1.0 以提高性能
        antialias: false,
        shadows: false,
        postProcessing: false,
        textureQuality: 'low',
      },
      [QualityProfile.MEDIUM]: {
        pixelRatio: 1.0,
        antialias: true,
        shadows: true,
        shadowMapSize: 1024,
        postProcessing: true,
        bloom: false,
        vignette: true,
      },
      [QualityProfile.HIGH]: {
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
        antialias: true,
        shadows: true,
        shadowMapSize: 2048,
        postProcessing: true,
        bloom: true,
        vignette: true,
        smaa: true,
      },
      [QualityProfile.ULTRA]: {
        pixelRatio: Math.min(window.devicePixelRatio, 2.0),
        antialias: true,
        shadows: true,
        shadowMapSize: 4096,
        postProcessing: true,
        bloom: true,
        vignette: true,
        smaa: true,
        screenSpaceReflections: true, // 预留
      },
    };

    this.currentProfile = QualityProfile.HIGH;
    this.isAuto = true;
    this._checkInterval = 2000; // 每 2 秒检查一次
    this._lastCheck = 0;
    this._history = [];

    // 绑定更新
    renderLoop.add(this._update.bind(this));
  }

  setProfile(profile) {
    if (!this.config[profile]) return;
    Logger.log(`⚡ 切换渲染质量: ${profile}`);
    this.currentProfile = profile;
    this._applyConfig(this.config[profile]);
  }

  setAutoMode(enabled) {
    this.isAuto = enabled;
    Logger.log(`🤖 自动质量调节: ${enabled ? '开启' : '关闭'}`);
  }

  _applyConfig(conf) {
    if (!this.renderer) return;

    // 分辨率/DPR
    this.renderer.setPixelRatio(conf.pixelRatio);

    // 阴影
    this.renderer.shadowMap.enabled = conf.shadows;
    if (conf.shadows && this.renderer.shadowMap.type !== THREE.PCFSoftShadowMap) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.needsUpdate = true;
    }

    // 更新场景及灯光阴影貼圖大小 (需遍历)
    // 注意：修改 shadowMapSize 需要重新构建 shadow map，开销较大，通常只在初始化或明确切换时做
    // 这里简化处理，仅调整 renderer 参数

    // 后处理
    if (this.renderingPipeline) {
      // 如果有关闭后处理的选项，可以在 EffectsManager 中添加全局开关
      // 目前仅控制特定效果
      if (typeof conf.bloom !== 'undefined') this.renderingPipeline.setEffect('bloom', conf.bloom);
      if (typeof conf.vignette !== 'undefined')
        this.renderingPipeline.setEffect('vignette', conf.vignette);
      if (typeof conf.smaa !== 'undefined') this.renderingPipeline.setEffect('smaa', conf.smaa);
    }

    // 强制重绘一帧以应用更改
    // this.renderer.render(...); // RenderLoop 会处理
  }

  _update(_delta, _elapsed) {
    if (!this.isAuto) return;

    const now = performance.now();
    if (now - this._lastCheck < this._checkInterval) return;

    this._lastCheck = now;
    const currentFps = renderLoop.fps;

    this._history.push(currentFps);
    if (this._history.length > 5) this._history.shift();

    const avgFps = this._history.reduce((a, b) => a + b, 0) / this._history.length;

    // 简单的迟滞调整策略
    if (avgFps < 30 && this.currentProfile !== QualityProfile.LOW) {
      this._downgrade();
    } else if (avgFps > 58 && this.currentProfile !== QualityProfile.ULTRA) {
      // 只有在稳定高帧率时才升级，且不大激进
      if (this.currentProfile === QualityProfile.LOW) this.setProfile(QualityProfile.MEDIUM);
      // 避免频繁升降，暂不自动升级到 High/Ultra，除非用户显式设置
    }
  }

  _downgrade() {
    if (this.currentProfile === QualityProfile.ULTRA) this.setProfile(QualityProfile.HIGH);
    else if (this.currentProfile === QualityProfile.HIGH) this.setProfile(QualityProfile.MEDIUM);
    else if (this.currentProfile === QualityProfile.MEDIUM) this.setProfile(QualityProfile.LOW);
  }
}
