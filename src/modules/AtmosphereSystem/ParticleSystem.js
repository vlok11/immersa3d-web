/**
 * @fileoverview 氛围粒子系统 - 创建沉浸式视觉效果
 * @module modules/AtmosphereSystem/ParticleSystem
 */

import * as THREE from 'three';

/**
 * 粒子预设类型
 * @enum {string}
 */
export const ParticlePreset = {
  DUST: 'dust', // 灰尘
  SNOW: 'snow', // 雪花
  RAIN: 'rain', // 雨滴
  FIREFLIES: 'fireflies', // 萤火虫
  STARS: 'stars', // 星空
  SPARKLE: 'sparkle', // 闪烁
  FOG: 'fog', // 雾气
  BUBBLES: 'bubbles', // 气泡
};

/**
 * 氛围粒子系统
 * @class
 */
export class ParticleSystem {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    /** @type {THREE.Scene} */
    this.scene = scene;

    /** @type {THREE.Points|null} */
    this.particles = null;

    /** @type {string} */
    this.currentPreset = null;

    /** @type {boolean} */
    this.isActive = false;

    /** @private */
    this._clock = new THREE.Clock();

    /** @private */
    this._velocities = null;

    /** @private */
    this._config = {
      count: 1000,
      size: 0.02,
      opacity: 0.6,
      speed: 0.5,
      spread: 5,
      color: 0xffffff,
    };
  }

  /**
   * 应用预设
   * @param {string} preset
   * @param {object} options
   */
  applyPreset(preset, options = {}) {
    // 清除现有粒子
    this.clear();

    // 获取预设配置
    const config = this._getPresetConfig(preset);
    Object.assign(this._config, config, options);

    this.currentPreset = preset;
    this._createParticles();
    this.isActive = true;

    console.log(`✨ 应用氛围预设: ${preset}`);
  }

  /**
   * 获取预设配置
   * @private
   */
  _getPresetConfig(preset) {
    const configs = {
      [ParticlePreset.DUST]: {
        count: 500,
        size: 0.015,
        opacity: 0.4,
        speed: 0.1,
        spread: 4,
        color: 0xccccaa,
        movement: 'float',
      },
      [ParticlePreset.SNOW]: {
        count: 800,
        size: 0.03,
        opacity: 0.8,
        speed: 0.3,
        spread: 6,
        color: 0xffffff,
        movement: 'fall',
      },
      [ParticlePreset.RAIN]: {
        count: 1500,
        size: 0.005,
        opacity: 0.6,
        speed: 2.0,
        spread: 5,
        color: 0xaaddff,
        movement: 'rain',
      },
      [ParticlePreset.FIREFLIES]: {
        count: 50,
        size: 0.04,
        opacity: 0.9,
        speed: 0.2,
        spread: 3,
        color: 0xffee88,
        movement: 'glow',
      },
      [ParticlePreset.STARS]: {
        count: 2000,
        size: 0.02,
        opacity: 1.0,
        speed: 0.0,
        spread: 20,
        color: 0xffffff,
        movement: 'twinkle',
      },
      [ParticlePreset.SPARKLE]: {
        count: 200,
        size: 0.025,
        opacity: 0.8,
        speed: 0.5,
        spread: 3,
        color: 0xffffdd,
        movement: 'sparkle',
      },
      [ParticlePreset.FOG]: {
        count: 100,
        size: 0.5,
        opacity: 0.1,
        speed: 0.05,
        spread: 8,
        color: 0xcccccc,
        movement: 'drift',
      },
      [ParticlePreset.BUBBLES]: {
        count: 100,
        size: 0.05,
        opacity: 0.5,
        speed: 0.2,
        spread: 4,
        color: 0x88ccff,
        movement: 'rise',
      },
    };

    return configs[preset] || configs[ParticlePreset.DUST];
  }

  /**
   * 创建粒子
   * @private
   */
  _createParticles() {
    const { count, size, opacity, spread, color } = this._config;

    // 创建几何体
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    this._velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // 随机位置
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

      // 随机大小变化
      sizes[i] = size * (0.5 + Math.random());

      // 随机透明度变化
      opacities[i] = opacity * (0.5 + Math.random() * 0.5);

      // 随机速度
      this._velocities[i * 3] = (Math.random() - 0.5) * 0.1;
      this._velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      this._velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    // 创建材质
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(color) },
        baseOpacity: { value: opacity },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float opacity;
        varying float vOpacity;
        uniform float time;
        
        void main() {
          vOpacity = opacity;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 baseColor;
        uniform float baseOpacity;
        varying float vOpacity;
        
        void main() {
          // 圆形粒子
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // 柔和边缘
          float alpha = smoothstep(0.5, 0.2, dist) * vOpacity * baseOpacity;
          
          gl_FragColor = vec4(baseColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  /**
   * 更新粒子
   * @param {number} delta - 时间增量
   */
  update(delta) {
    if (!this.particles || !this.isActive) return;

    const positions = this.particles.geometry.attributes.position.array;
    const { speed, spread, movement } = this._config;
    const time = this._clock.getElapsedTime();

    // 更新时间 uniform
    this.particles.material.uniforms.time.value = time;

    for (let i = 0; i < positions.length / 3; i++) {
      const idx = i * 3;

      switch (movement) {
        case 'float':
          // 漂浮效果
          positions[idx] += Math.sin(time + i) * speed * delta * 0.1;
          positions[idx + 1] += Math.cos(time + i * 0.5) * speed * delta * 0.1;
          positions[idx + 2] += Math.sin(time * 0.5 + i) * speed * delta * 0.05;
          break;

        case 'fall':
          // 下落效果（雪、雨）
          positions[idx + 1] -= speed * delta;
          positions[idx] += Math.sin(time + i) * speed * delta * 0.1;

          // 重置位置
          if (positions[idx + 1] < -spread / 2) {
            positions[idx + 1] = spread / 2;
            positions[idx] = (Math.random() - 0.5) * spread;
            positions[idx + 2] = (Math.random() - 0.5) * spread;
          }
          break;

        case 'rain':
          // 雨滴（快速下落）
          positions[idx + 1] -= speed * delta;

          if (positions[idx + 1] < -spread / 2) {
            positions[idx + 1] = spread / 2;
            positions[idx] = (Math.random() - 0.5) * spread;
            positions[idx + 2] = (Math.random() - 0.5) * spread;
          }
          break;

        case 'rise':
          // 上升效果（气泡）
          positions[idx + 1] += speed * delta;
          positions[idx] += Math.sin(time * 2 + i) * speed * delta * 0.2;

          if (positions[idx + 1] > spread / 2) {
            positions[idx + 1] = -spread / 2;
            positions[idx] = (Math.random() - 0.5) * spread;
            positions[idx + 2] = (Math.random() - 0.5) * spread;
          }
          break;

        case 'glow':
          // 萤火虫（随机漫游）
          positions[idx] += (this._velocities[idx] + Math.sin(time * 0.5 + i) * 0.02) * speed;
          positions[idx + 1] +=
            (this._velocities[idx + 1] + Math.cos(time * 0.3 + i) * 0.02) * speed;
          positions[idx + 2] +=
            (this._velocities[idx + 2] + Math.sin(time * 0.4 + i) * 0.01) * speed;

          // 边界检查
          if (Math.abs(positions[idx]) > spread / 2) this._velocities[idx] *= -1;
          if (Math.abs(positions[idx + 1]) > spread / 2) this._velocities[idx + 1] *= -1;
          if (Math.abs(positions[idx + 2]) > spread / 2) this._velocities[idx + 2] *= -1;
          break;

        case 'drift':
          // 漂移效果（雾气）
          positions[idx] += Math.sin(time * 0.2 + i) * speed * delta;
          positions[idx + 2] += Math.cos(time * 0.1 + i) * speed * delta;
          break;

        case 'twinkle':
        case 'sparkle':
          // 闪烁效果由 shader 处理，位置不变
          break;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * 设置粒子颜色
   * @param {number} color - 十六进制颜色
   */
  setColor(color) {
    this._config.color = color;
    if (this.particles) {
      this.particles.material.uniforms.baseColor.value.set(color);
    }
  }

  /**
   * 设置透明度
   * @param {number} opacity - 0-1
   */
  setOpacity(opacity) {
    this._config.opacity = opacity;
    if (this.particles) {
      this.particles.material.uniforms.baseOpacity.value = opacity;
    }
  }

  /**
   * 设置速度
   * @param {number} speed
   */
  setSpeed(speed) {
    this._config.speed = speed;
  }

  /**
   * 暂停
   */
  pause() {
    this.isActive = false;
  }

  /**
   * 继续
   */
  resume() {
    this.isActive = true;
  }

  /**
   * 清除粒子
   */
  clear() {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      this.particles.material.dispose();
      this.particles = null;
    }
    this.currentPreset = null;
    this.isActive = false;
  }

  /**
   * 获取可用预设列表
   * @returns {string[]}
   */
  static getAvailablePresets() {
    return Object.values(ParticlePreset);
  }

  /**
   * 销毁
   */
  dispose() {
    this.clear();
    console.log('🗑️ ParticleSystem 已销毁');
  }
}

export default ParticleSystem;
