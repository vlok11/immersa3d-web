/**
 * @fileoverview 光照管理器 - 场景光照控制
 * @module modules/AtmosphereSystem/LightingManager
 */

import * as THREE from 'three';

/**
 * 光照预设
 * @enum {string}
 */
export const LightingPreset = {
  STUDIO: 'studio',
  OUTDOOR: 'outdoor',
  DRAMATIC: 'dramatic',
  SOFT: 'soft',
  NEON: 'neon',
  CINEMATIC: 'cinematic',
};

/**
 * 光照管理器
 * @class
 */
export class LightingManager {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    /** @type {THREE.Scene} */
    this.scene = scene;

    /** @type {Map<string, THREE.Light>} */
    this.lights = new Map();

    /** @type {THREE.AmbientLight|null} */
    this.ambientLight = null;

    /** @type {THREE.DirectionalLight|null} */
    this.mainLight = null;

    /** @type {string} */
    this.currentPreset = null;

    this._init();
  }

  /**
   * 初始化默认光照
   * @private
   */
  _init() {
    // 环境光
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(this.ambientLight);
    this.lights.set('ambient', this.ambientLight);

    // 主方向光（太阳）
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1);
    this.mainLight.position.set(5, 10, 7);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 50;
    this.scene.add(this.mainLight);
    this.lights.set('main', this.mainLight);

    console.log('✅ LightingManager 初始化完成');
  }

  /**
   * 应用光照预设
   * @param {string} preset
   */
  applyPreset(preset) {
    this.currentPreset = preset;

    // 先清除额外的灯光
    this._clearExtraLights();

    switch (preset) {
      case LightingPreset.STUDIO:
        this._applyStudioLighting();
        break;
      case LightingPreset.OUTDOOR:
        this._applyOutdoorLighting();
        break;
      case LightingPreset.DRAMATIC:
        this._applyDramaticLighting();
        break;
      case LightingPreset.SOFT:
        this._applySoftLighting();
        break;
      case LightingPreset.NEON:
        this._applyNeonLighting();
        break;
      case LightingPreset.CINEMATIC:
        this._applyCinematicLighting();
        break;
      default:
        console.warn(`未知光照预设: ${preset}`);
        return;
    }

    console.log(`💡 光照预设: ${preset}`);
  }

  /**
   * 工作室光照
   * @private
   */
  _applyStudioLighting() {
    this.ambientLight.color.set(0x606060);
    this.ambientLight.intensity = 0.4;

    this.mainLight.color.set(0xffffff);
    this.mainLight.intensity = 1.0;
    this.mainLight.position.set(5, 10, 5);

    // 添加补光
    const fillLight = new THREE.DirectionalLight(0x9999ff, 0.3);
    fillLight.position.set(-5, 5, 5);
    this.scene.add(fillLight);
    this.lights.set('fill', fillLight);

    // 添加背光
    const backLight = new THREE.DirectionalLight(0xffffcc, 0.2);
    backLight.position.set(0, 5, -5);
    this.scene.add(backLight);
    this.lights.set('back', backLight);
  }

  /**
   * 户外光照
   * @private
   */
  _applyOutdoorLighting() {
    this.ambientLight.color.set(0x88aacc);
    this.ambientLight.intensity = 0.6;

    this.mainLight.color.set(0xfffaf0);
    this.mainLight.intensity = 1.2;
    this.mainLight.position.set(10, 20, 10);

    // 添加天光
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x545454, 0.6);
    this.scene.add(hemisphereLight);
    this.lights.set('hemisphere', hemisphereLight);
  }

  /**
   * 戏剧性光照
   * @private
   */
  _applyDramaticLighting() {
    this.ambientLight.color.set(0x101020);
    this.ambientLight.intensity = 0.2;

    this.mainLight.color.set(0xff8800);
    this.mainLight.intensity = 1.5;
    this.mainLight.position.set(3, 5, 0);

    // 添加冷色调侧光
    const sideLight = new THREE.SpotLight(0x4488ff, 0.8);
    sideLight.position.set(-5, 3, 3);
    sideLight.angle = Math.PI / 6;
    sideLight.penumbra = 0.5;
    this.scene.add(sideLight);
    this.lights.set('side', sideLight);
  }

  /**
   * 柔和光照
   * @private
   */
  _applySoftLighting() {
    this.ambientLight.color.set(0xffeedd);
    this.ambientLight.intensity = 0.8;

    this.mainLight.color.set(0xffffff);
    this.mainLight.intensity = 0.4;
    this.mainLight.position.set(5, 10, 5);

    // 多个柔和的点光源
    const positions = [
      [3, 5, 3],
      [-3, 5, 3],
      [0, 5, -3],
    ];

    positions.forEach((pos, i) => {
      const light = new THREE.PointLight(0xfff5e6, 0.3, 20);
      light.position.set(...pos);
      this.scene.add(light);
      this.lights.set(`soft_${i}`, light);
    });
  }

  /**
   * 霓虹光照
   * @private
   */
  _applyNeonLighting() {
    this.ambientLight.color.set(0x0a0a1a);
    this.ambientLight.intensity = 0.3;

    this.mainLight.intensity = 0.2;

    // 霓虹色点光源
    const neonColors = [0xff00ff, 0x00ffff, 0xff0080, 0x80ff00];
    const neonPositions = [
      [5, 3, 0],
      [-5, 3, 0],
      [0, 3, 5],
      [0, 3, -5],
    ];

    neonColors.forEach((color, i) => {
      const light = new THREE.PointLight(color, 1.0, 15);
      light.position.set(...neonPositions[i]);
      this.scene.add(light);
      this.lights.set(`neon_${i}`, light);
    });
  }

  /**
   * 电影感光照
   * @private
   */
  _applyCinematicLighting() {
    this.ambientLight.color.set(0x1a1a2e);
    this.ambientLight.intensity = 0.3;

    // 主光（暖色调）
    this.mainLight.color.set(0xffd4a3);
    this.mainLight.intensity = 1.0;
    this.mainLight.position.set(5, 8, 3);

    // 补光（冷色调）
    const fillLight = new THREE.DirectionalLight(0x6699cc, 0.4);
    fillLight.position.set(-5, 5, 3);
    this.scene.add(fillLight);
    this.lights.set('fill', fillLight);

    // 轮廓光
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, 3, -5);
    this.scene.add(rimLight);
    this.lights.set('rim', rimLight);
  }

  /**
   * 清除额外灯光
   * @private
   */
  _clearExtraLights() {
    this.lights.forEach((light, key) => {
      if (key !== 'ambient' && key !== 'main') {
        this.scene.remove(light);
        if (light.dispose) light.dispose();
      }
    });

    // 保留主要灯光
    const ambient = this.lights.get('ambient');
    const main = this.lights.get('main');
    this.lights.clear();
    this.lights.set('ambient', ambient);
    this.lights.set('main', main);
  }

  /**
   * 添加自定义灯光
   * @param {string} name
   * @param {THREE.Light} light
   */
  addLight(name, light) {
    this.scene.add(light);
    this.lights.set(name, light);
  }

  /**
   * 移除灯光
   * @param {string} name
   */
  removeLight(name) {
    const light = this.lights.get(name);
    if (light) {
      this.scene.remove(light);
      if (light.dispose) light.dispose();
      this.lights.delete(name);
    }
  }

  /**
   * 设置环境光
   * @param {number} color
   * @param {number} intensity
   */
  setAmbientLight(color, intensity) {
    this.ambientLight.color.set(color);
    this.ambientLight.intensity = intensity;
  }

  /**
   * 设置主光源
   * @param {object} params
   */
  setMainLight(params) {
    const { color, intensity, position } = params;

    if (color !== undefined) this.mainLight.color.set(color);
    if (intensity !== undefined) this.mainLight.intensity = intensity;
    if (position) this.mainLight.position.set(...position);
  }

  /**
   * 启用/禁用阴影
   * @param {boolean} enabled
   */
  setShadowEnabled(enabled) {
    this.mainLight.castShadow = enabled;
  }

  /**
   * 获取可用光照预设
   * @returns {string[]}
   */
  static getLightingPresets() {
    return Object.values(LightingPreset);
  }

  /**
   * 销毁
   */
  dispose() {
    this.lights.forEach((light) => {
      this.scene.remove(light);
      if (light.dispose) light.dispose();
    });
    this.lights.clear();

    console.log('🗑️ LightingManager 已销毁');
  }
}

export default LightingManager;
