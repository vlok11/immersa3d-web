/**
 * @fileoverview 天空控制器 - 动态天空与环境系统
 * @module modules/AtmosphereSystem/SkyController
 */

import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

/**
 * 天气预设
 * @enum {string}
 */
export const WeatherPreset = {
  CLEAR: 'clear',
  CLOUDY: 'cloudy',
  OVERCAST: 'overcast',
  SUNSET: 'sunset',
  NIGHT: 'night',
  GOLDEN_HOUR: 'goldenHour',
};

/**
 * 天空控制器
 * @class
 */
export class SkyController {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.WebGLRenderer} renderer
   */
  constructor(scene, renderer) {
    /** @type {THREE.Scene} */
    this.scene = scene;

    /** @type {THREE.WebGLRenderer} */
    this.renderer = renderer;

    /** @type {Sky|null} */
    this.sky = null;

    /** @type {THREE.Vector3} */
    this.sun = new THREE.Vector3();

    /** @type {THREE.PMREMGenerator|null} */
    this.pmremGenerator = null;

    /** @type {THREE.Texture|null} */
    this.envMap = null;

    /** @private */
    this._parameters = {
      turbidity: 10,
      rayleigh: 3,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.7,
      elevation: 45,
      azimuth: 180,
    };

    this._init();
  }

  /**
   * 初始化天空系统
   * @private
   */
  _init() {
    // 创建天空
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.scene.add(this.sky);

    // 创建 PMREM 生成器（用于环境贴图）
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    // 应用默认参数
    this._updateSky();

    console.log('✅ SkyController 初始化完成');
  }

  /**
   * 更新天空参数
   * @private
   */
  _updateSky() {
    const uniforms = this.sky.material.uniforms;

    uniforms['turbidity'].value = this._parameters.turbidity;
    uniforms['rayleigh'].value = this._parameters.rayleigh;
    uniforms['mieCoefficient'].value = this._parameters.mieCoefficient;
    uniforms['mieDirectionalG'].value = this._parameters.mieDirectionalG;

    // 计算太阳位置
    const phi = THREE.MathUtils.degToRad(90 - this._parameters.elevation);
    const theta = THREE.MathUtils.degToRad(this._parameters.azimuth);

    this.sun.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(this.sun);

    // 更新环境贴图
    this._updateEnvironment();
  }

  /**
   * 更新环境贴图
   * @private
   */
  _updateEnvironment() {
    if (this.envMap) {
      this.envMap.dispose();
    }

    // 生成新的环境贴图
    this.envMap = this.pmremGenerator.fromScene(this.sky).texture;
    this.scene.environment = this.envMap;
    this.scene.background = this.envMap;
  }

  /**
   * 设置时间（小时）
   * @param {number} hour - 0-24
   */
  setTimeOfDay(hour) {
    // 计算太阳高度角
    // 6:00 日出，12:00 正午，18:00 日落
    const normalizedTime = ((hour - 6) / 12) * Math.PI;
    const elevation = Math.sin(normalizedTime) * 90;

    // 限制范围
    this._parameters.elevation = Math.max(-10, Math.min(90, elevation));

    // 根据时间调整大气参数
    if (hour >= 5 && hour < 7) {
      // 黎明
      this._parameters.turbidity = 8;
      this._parameters.rayleigh = 4;
    } else if (hour >= 7 && hour < 17) {
      // 白天
      this._parameters.turbidity = 10;
      this._parameters.rayleigh = 3;
    } else if (hour >= 17 && hour < 19) {
      // 黄昏
      this._parameters.turbidity = 8;
      this._parameters.rayleigh = 4;
    } else {
      // 夜晚
      this._parameters.turbidity = 2;
      this._parameters.rayleigh = 0.5;
    }

    this._updateSky();
    console.log(`🌅 时间设置: ${hour}:00`);
  }

  /**
   * 应用天气预设
   * @param {string} preset
   */
  setWeather(preset) {
    switch (preset) {
      case WeatherPreset.CLEAR:
        this._parameters.turbidity = 10;
        this._parameters.rayleigh = 3;
        this._parameters.mieCoefficient = 0.005;
        this._parameters.mieDirectionalG = 0.8;
        this._parameters.elevation = 60;
        break;

      case WeatherPreset.CLOUDY:
        this._parameters.turbidity = 15;
        this._parameters.rayleigh = 1;
        this._parameters.mieCoefficient = 0.01;
        this._parameters.mieDirectionalG = 0.5;
        this._parameters.elevation = 45;
        break;

      case WeatherPreset.OVERCAST:
        this._parameters.turbidity = 20;
        this._parameters.rayleigh = 0.5;
        this._parameters.mieCoefficient = 0.02;
        this._parameters.mieDirectionalG = 0.3;
        this._parameters.elevation = 30;
        break;

      case WeatherPreset.SUNSET:
        this._parameters.turbidity = 4;
        this._parameters.rayleigh = 4;
        this._parameters.mieCoefficient = 0.01;
        this._parameters.mieDirectionalG = 0.95;
        this._parameters.elevation = 5;
        break;

      case WeatherPreset.NIGHT:
        this._parameters.turbidity = 2;
        this._parameters.rayleigh = 0.2;
        this._parameters.mieCoefficient = 0.001;
        this._parameters.mieDirectionalG = 0.8;
        this._parameters.elevation = -10;
        break;

      case WeatherPreset.GOLDEN_HOUR:
        this._parameters.turbidity = 6;
        this._parameters.rayleigh = 3;
        this._parameters.mieCoefficient = 0.005;
        this._parameters.mieDirectionalG = 0.95;
        this._parameters.elevation = 15;
        break;

      default:
        console.warn(`未知天气预设: ${preset}`);
        return;
    }

    this._updateSky();
    console.log(`🌤️ 天气预设: ${preset}`);
  }

  /**
   * 设置太阳位置
   * @param {number} elevation - 高度角 (度)
   * @param {number} azimuth - 方位角 (度)
   */
  setSunPosition(elevation, azimuth) {
    this._parameters.elevation = elevation;
    this._parameters.azimuth = azimuth;
    this._updateSky();
  }

  /**
   * 设置大气参数
   * @param {object} params
   */
  setAtmosphereParams(params) {
    Object.assign(this._parameters, params);
    this._updateSky();
  }

  /**
   * 获取太阳方向向量
   * @returns {THREE.Vector3}
   */
  getSunDirection() {
    return this.sun.clone().normalize();
  }

  /**
   * 加载 HDRI 环境贴图
   * @param {string} url - HDRI 文件 URL
   * @returns {Promise<void>}
   */
  async loadHDRI(url) {
    const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
    const loader = new RGBELoader();

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (texture) => {
          // 隐藏程序化天空
          this.sky.visible = false;

          // 设置 HDRI 环境
          texture.mapping = THREE.EquirectangularReflectionMapping;
          this.scene.background = texture;
          this.scene.environment = this.pmremGenerator.fromEquirectangular(texture).texture;

          if (this.envMap) this.envMap.dispose();
          this.envMap = this.scene.environment;

          console.log('🖼️ HDRI 加载完成');
          resolve();
        },
        undefined,
        reject
      );
    });
  }

  /**
   * 重置为程序化天空
   */
  resetToProceduralSky() {
    this.sky.visible = true;
    this._updateSky();
  }

  /**
   * 获取可用天气预设
   * @returns {string[]}
   */
  static getWeatherPresets() {
    return Object.values(WeatherPreset);
  }

  /**
   * 销毁
   */
  dispose() {
    if (this.sky) {
      this.scene.remove(this.sky);
      this.sky.geometry.dispose();
      this.sky.material.dispose();
      this.sky = null;
    }

    if (this.envMap) {
      this.envMap.dispose();
      this.envMap = null;
    }

    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
      this.pmremGenerator = null;
    }

    console.log('🗑️ SkyController 已销毁');
  }
}

export default SkyController;
