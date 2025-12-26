/**
 * @fileoverview 雾效控制器
 * @module modules/AtmosphereSystem/FogController
 */

import * as THREE from 'three';

/**
 * 雾效类型
 * @enum {string}
 */
export const FogType = {
  NONE: 'none',
  LINEAR: 'linear',
  EXPONENTIAL: 'exponential',
  EXPONENTIAL_SQUARED: 'exponentialSquared',
};

/**
 * 雾效预设
 * @enum {string}
 */
export const FogPreset = {
  CLEAR: 'clear',
  LIGHT_MIST: 'lightMist',
  MORNING_FOG: 'morningFog',
  DENSE_FOG: 'denseFog',
  HAZE: 'haze',
  UNDERWATER: 'underwater',
  MYSTICAL: 'mystical',
};

/**
 * 雾效控制器
 * @class
 */
export class FogController {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    /** @type {THREE.Scene} */
    this.scene = scene;

    /** @type {string} */
    this.currentType = FogType.NONE;

    /** @type {string} */
    this.currentPreset = FogPreset.CLEAR;

    /** @type {THREE.Color} */
    this.color = new THREE.Color(0xcccccc);

    /** @type {number} */
    this.near = 10;

    /** @type {number} */
    this.far = 100;

    /** @type {number} */
    this.density = 0.02;

    console.log('✅ FogController 初始化完成');
  }

  /**
   * 设置雾效类型
   * @param {string} type
   */
  setType(type) {
    this.currentType = type;
    this._applyFog();
    console.log(`🌫️ 雾效类型: ${type}`);
  }

  /**
   * 应用雾效预设
   * @param {string} preset
   */
  applyPreset(preset) {
    this.currentPreset = preset;

    switch (preset) {
      case FogPreset.CLEAR:
        this.currentType = FogType.NONE;
        break;

      case FogPreset.LIGHT_MIST:
        this.currentType = FogType.EXPONENTIAL;
        this.color.setHex(0xe8e8e8);
        this.density = 0.005;
        break;

      case FogPreset.MORNING_FOG:
        this.currentType = FogType.EXPONENTIAL_SQUARED;
        this.color.setHex(0xd4d4d4);
        this.density = 0.015;
        break;

      case FogPreset.DENSE_FOG:
        this.currentType = FogType.EXPONENTIAL_SQUARED;
        this.color.setHex(0xaaaaaa);
        this.density = 0.05;
        break;

      case FogPreset.HAZE:
        this.currentType = FogType.LINEAR;
        this.color.setHex(0xc9b89c);
        this.near = 5;
        this.far = 50;
        break;

      case FogPreset.UNDERWATER:
        this.currentType = FogType.EXPONENTIAL_SQUARED;
        this.color.setHex(0x1a5276);
        this.density = 0.03;
        break;

      case FogPreset.MYSTICAL:
        this.currentType = FogType.EXPONENTIAL;
        this.color.setHex(0x8e44ad);
        this.density = 0.02;
        break;

      default:
        console.warn(`未知雾效预设: ${preset}`);
        return;
    }

    this._applyFog();
    console.log(`🌫️ 雾效预设: ${preset}`);
  }

  /**
   * 应用雾效到场景
   * @private
   */
  _applyFog() {
    switch (this.currentType) {
      case FogType.NONE:
        this.scene.fog = null;
        break;

      case FogType.LINEAR:
        this.scene.fog = new THREE.Fog(this.color.getHex(), this.near, this.far);
        break;

      case FogType.EXPONENTIAL:
        this.scene.fog = new THREE.FogExp2(this.color.getHex(), this.density);
        break;

      case FogType.EXPONENTIAL_SQUARED:
        this.scene.fog = new THREE.FogExp2(this.color.getHex(), this.density);
        break;
    }
  }

  /**
   * 设置雾效颜色
   * @param {number|string} color - 十六进制颜色或 CSS 颜色字符串
   */
  setColor(color) {
    this.color.set(color);
    if (this.scene.fog) {
      this.scene.fog.color.set(color);
    }
  }

  /**
   * 设置线性雾距离
   * @param {number} near
   * @param {number} far
   */
  setDistance(near, far) {
    this.near = near;
    this.far = far;

    if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = near;
      this.scene.fog.far = far;
    }
  }

  /**
   * 设置指数雾密度
   * @param {number} density
   */
  setDensity(density) {
    this.density = density;

    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = density;
    }
  }

  /**
   * 动画过渡到新雾效
   * @param {object} targetParams - 目标参数
   * @param {number} duration - 过渡时长（秒）
   */
  animateTo(targetParams, duration = 1) {
    // 需要 GSAP 支持
    const gsap = window.gsap;
    if (!gsap) {
      console.warn('GSAP 不可用，直接应用参数');
      if (targetParams.density !== undefined) this.setDensity(targetParams.density);
      if (targetParams.color !== undefined) this.setColor(targetParams.color);
      return;
    }

    if (targetParams.density !== undefined) {
      gsap.to(this, {
        density: targetParams.density,
        duration,
        onUpdate: () => {
          if (this.scene.fog instanceof THREE.FogExp2) {
            this.scene.fog.density = this.density;
          }
        },
      });
    }

    if (targetParams.color !== undefined) {
      const targetColor = new THREE.Color(targetParams.color);
      gsap.to(this.color, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration,
        onUpdate: () => {
          if (this.scene.fog) {
            this.scene.fog.color.copy(this.color);
          }
        },
      });
    }
  }

  /**
   * 清除雾效
   */
  clear() {
    this.scene.fog = null;
    this.currentType = FogType.NONE;
    this.currentPreset = FogPreset.CLEAR;
  }

  /**
   * 获取当前状态
   * @returns {object}
   */
  getState() {
    return {
      type: this.currentType,
      preset: this.currentPreset,
      color: this.color.getHexString(),
      near: this.near,
      far: this.far,
      density: this.density,
    };
  }

  /**
   * 获取可用预设
   * @returns {string[]}
   */
  static getPresets() {
    return Object.values(FogPreset);
  }

  /**
   * 获取可用类型
   * @returns {string[]}
   */
  static getTypes() {
    return Object.values(FogType);
  }

  /**
   * 销毁
   */
  dispose() {
    this.clear();
    console.log('🗑️ FogController 已销毁');
  }
}

export default FogController;
