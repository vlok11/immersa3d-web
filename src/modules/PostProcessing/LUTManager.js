/**
 * @fileoverview LUT 颜色查找表管理器
 * @module modules/PostProcessing/LUTManager
 */

import * as THREE from 'three';

/**
 * 内置 LUT 预设
 * @enum {string}
 */
export const LUTPreset = {
  NONE: 'none',
  CINEMATIC: 'cinematic',
  VINTAGE: 'vintage',
  WARM: 'warm',
  COOL: 'cool',
  SEPIA: 'sepia',
  NOIR: 'noir',
  VIBRANT: 'vibrant',
  MUTED: 'muted',
  TEAL_ORANGE: 'tealOrange'
};

/**
 * LUT 管理器
 * @class
 */
export class LUTManager {
  constructor() {
    /** @type {Map<string, THREE.Data3DTexture>} */
    this.luts = new Map();
    
    /** @type {string|null} */
    this.currentLUT = null;
    
    /** @type {number} */
    this.intensity = 1.0;
    
    /** @private */
    this._lutSize = 32;
    
    this._initBuiltInLUTs();
  }

  /**
   * 初始化内置 LUT
   * @private
   */
  _initBuiltInLUTs() {
    // 生成程序化 LUT
    for (const preset of Object.values(LUTPreset)) {
      if (preset !== LUTPreset.NONE) {
        const lutData = this._generateLUT(preset);
        this.luts.set(preset, lutData);
      }
    }
    
    console.log(`✅ LUTManager 初始化完成 (${this.luts.size} 预设)`);
  }

  /**
   * 生成程序化 LUT
   * @private
   */
  _generateLUT(preset) {
    const size = this._lutSize;
    const data = new Uint8Array(size * size * size * 4);
    
    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          const index = (b * size * size + g * size + r) * 4;
          
          // 归一化输入颜色
          let rn = r / (size - 1);
          let gn = g / (size - 1);
          let bn = b / (size - 1);
          
          // 应用颜色变换
          [rn, gn, bn] = this._applyColorTransform(rn, gn, bn, preset);
          
          // 写入数据
          data[index] = Math.round(rn * 255);
          data[index + 1] = Math.round(gn * 255);
          data[index + 2] = Math.round(bn * 255);
          data[index + 3] = 255;
        }
      }
    }

    const texture = new THREE.Data3DTexture(data, size, size, size);
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.UnsignedByteType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.wrapR = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * 应用颜色变换
   * @private
   */
  _applyColorTransform(r, g, b, preset) {
    switch (preset) {
      case LUTPreset.CINEMATIC:
        // 电影感：提升对比度，暖色高光，冷色阴影
        r = this._curve(r, 1.1, 0.05);
        g = this._curve(g, 1.05, 0.03);
        b = this._curve(b, 0.95, 0.08);
        break;
        
      case LUTPreset.VINTAGE:
        // 复古：褪色，暖色调
        r = this._curve(r, 0.9, 0.1) * 0.95 + 0.05;
        g = this._curve(g, 0.85, 0.08) * 0.9 + 0.05;
        b = this._curve(b, 0.8, 0.05) * 0.85 + 0.05;
        break;
        
      case LUTPreset.WARM:
        // 暖色调
        r = Math.min(1, r * 1.1);
        g = g * 1.0;
        b = Math.max(0, b * 0.85);
        break;
        
      case LUTPreset.COOL:
        // 冷色调
        r = Math.max(0, r * 0.9);
        g = g * 0.95;
        b = Math.min(1, b * 1.15);
        break;
        
      case LUTPreset.SEPIA:
        // 褐色调
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        r = Math.min(1, gray * 1.2);
        g = gray * 1.0;
        b = gray * 0.8;
        break;
        
      case LUTPreset.NOIR:
        // 黑白高对比
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        const contrast = this._curve(lum, 1.3, 0);
        r = g = b = contrast;
        break;
        
      case LUTPreset.VIBRANT:
        // 饱和度提升
        const sat = 1.3;
        const lumV = r * 0.299 + g * 0.587 + b * 0.114;
        r = lumV + (r - lumV) * sat;
        g = lumV + (g - lumV) * sat;
        b = lumV + (b - lumV) * sat;
        break;
        
      case LUTPreset.MUTED:
        // 柔和降饱和
        const satM = 0.7;
        const lumM = r * 0.299 + g * 0.587 + b * 0.114;
        r = lumM + (r - lumM) * satM;
        g = lumM + (g - lumM) * satM;
        b = lumM + (b - lumM) * satM;
        break;
        
      case LUTPreset.TEAL_ORANGE:
        // 青橙对比
        const lumTO = r * 0.299 + g * 0.587 + b * 0.114;
        if (lumTO < 0.5) {
          // 阴影偏青
          r = r * 0.8;
          g = g * 0.95;
          b = Math.min(1, b * 1.2);
        } else {
          // 高光偏橙
          r = Math.min(1, r * 1.15);
          g = g * 0.95;
          b = b * 0.8;
        }
        break;
    }

    // 钳制范围
    return [
      Math.max(0, Math.min(1, r)),
      Math.max(0, Math.min(1, g)),
      Math.max(0, Math.min(1, b))
    ];
  }

  /**
   * S 曲线调整
   * @private
   */
  _curve(value, contrast, lift) {
    // 简单的 S 曲线
    const adjusted = (value - 0.5) * contrast + 0.5 + lift;
    return Math.max(0, Math.min(1, adjusted));
  }

  /**
   * 加载外部 LUT 文件
   * @param {string} name - LUT 名称
   * @param {string} url - .cube 文件 URL
   * @returns {Promise<THREE.Data3DTexture>}
   */
  async loadLUT(name, url) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      const texture = this._parseCubeFile(text);
      
      this.luts.set(name, texture);
      console.log(`📦 LUT 加载完成: ${name}`);
      
      return texture;
    } catch (error) {
      console.error(`LUT 加载失败: ${name}`, error);
      throw error;
    }
  }

  /**
   * 解析 .cube 文件
   * @private
   */
  _parseCubeFile(content) {
    const lines = content.split('\n');
    let size = 0;
    const values = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('LUT_3D_SIZE')) {
        size = parseInt(trimmed.split(/\s+/)[1]);
      } else if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('TITLE') && !trimmed.startsWith('DOMAIN')) {
        const parts = trimmed.split(/\s+/).map(parseFloat);
        if (parts.length >= 3 && !isNaN(parts[0])) {
          values.push(...parts.slice(0, 3));
        }
      }
    }

    if (size === 0) {
      throw new Error('无效的 .cube 文件格式');
    }

    const data = new Uint8Array(size * size * size * 4);
    let valueIndex = 0;

    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          const index = (b * size * size + g * size + r) * 4;
          
          data[index] = Math.round(values[valueIndex++] * 255);
          data[index + 1] = Math.round(values[valueIndex++] * 255);
          data[index + 2] = Math.round(values[valueIndex++] * 255);
          data[index + 3] = 255;
        }
      }
    }

    const texture = new THREE.Data3DTexture(data, size, size, size);
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.UnsignedByteType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.wrapR = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * 获取 LUT 纹理
   * @param {string} name
   * @returns {THREE.Data3DTexture|null}
   */
  getLUT(name) {
    return this.luts.get(name) || null;
  }

  /**
   * 设置当前 LUT
   * @param {string} name
   */
  setCurrentLUT(name) {
    this.currentLUT = name;
    console.log(`🎨 LUT 切换: ${name}`);
  }

  /**
   * 设置强度
   * @param {number} intensity - 0-1
   */
  setIntensity(intensity) {
    this.intensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * 获取当前 LUT 纹理
   * @returns {THREE.Data3DTexture|null}
   */
  getCurrentLUT() {
    if (!this.currentLUT || this.currentLUT === LUTPreset.NONE) {
      return null;
    }
    return this.getLUT(this.currentLUT);
  }

  /**
   * 创建 LUT 着色器材质
   * @returns {THREE.ShaderMaterial}
   */
  createLUTMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tLUT: { value: null },
        lutSize: { value: this._lutSize },
        intensity: { value: this.intensity }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform sampler3D tLUT;
        uniform float lutSize;
        uniform float intensity;
        varying vec2 vUv;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          
          // 调整采样坐标避免边缘问题
          float scale = (lutSize - 1.0) / lutSize;
          float offset = 0.5 / lutSize;
          vec3 lutCoord = color.rgb * scale + offset;
          
          // 从 3D LUT 采样
          vec3 lutColor = texture(tLUT, lutCoord).rgb;
          
          // 混合原始颜色和 LUT 颜色
          gl_FragColor = vec4(mix(color.rgb, lutColor, intensity), color.a);
        }
      `
    });
  }

  /**
   * 获取可用预设列表
   * @returns {string[]}
   */
  static getPresets() {
    return Object.values(LUTPreset);
  }

  /**
   * 销毁
   */
  dispose() {
    this.luts.forEach(lut => {
      lut.dispose();
    });
    this.luts.clear();
    console.log('🗑️ LUTManager 已销毁');
  }
}

export default LUTManager;
