/**
 * @fileoverview 纹理管理器
 * @module modules/GeometrySystem/TextureManager
 */

import * as THREE from 'three';

/**
 * 纹理格式
 * @enum {string}
 */
export const TextureFormat = {
  RGB: 'rgb',
  RGBA: 'rgba',
  DEPTH: 'depth',
  NORMAL: 'normal',
};

/**
 * 纹理管理器
 * @class
 */
export class TextureManager {
  constructor() {
    /** @type {Map<string, THREE.Texture>} */
    this.textures = new Map();

    /** @type {THREE.TextureLoader} */
    this.loader = new THREE.TextureLoader();

    /** @private */
    this._cache = new Map();
  }

  /**
   * 从 URL 加载纹理
   * @param {string} url
   * @param {object} options
   * @returns {Promise<THREE.Texture>}
   */
  async loadFromUrl(url, options = {}) {
    const {
      name = url,
      colorSpace = THREE.SRGBColorSpace,
      wrapS = THREE.ClampToEdgeWrapping,
      wrapT = THREE.ClampToEdgeWrapping,
      minFilter = THREE.LinearMipmapLinearFilter,
      magFilter = THREE.LinearFilter,
      generateMipmaps = true,
    } = options;

    // 检查缓存
    if (this._cache.has(url)) {
      return this._cache.get(url);
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          texture.colorSpace = colorSpace;
          texture.wrapS = wrapS;
          texture.wrapT = wrapT;
          texture.minFilter = minFilter;
          texture.magFilter = magFilter;
          texture.generateMipmaps = generateMipmaps;
          texture.needsUpdate = true;

          this.textures.set(name, texture);
          this._cache.set(url, texture);

          console.log(`✅ 纹理加载完成: ${name}`);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`❌ 纹理加载失败: ${url}`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * 从 Canvas 创建纹理
   * @param {HTMLCanvasElement} canvas
   * @param {string} name
   * @param {object} options
   * @returns {THREE.CanvasTexture}
   */
  createFromCanvas(canvas, name, options = {}) {
    const { colorSpace = THREE.SRGBColorSpace, generateMipmaps = true } = options;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = colorSpace;
    texture.generateMipmaps = generateMipmaps;
    texture.needsUpdate = true;

    this.textures.set(name, texture);
    console.log(`✅ Canvas 纹理创建: ${name}`);

    return texture;
  }

  /**
   * 从 ImageData 创建纹理
   * @param {ImageData} imageData
   * @param {string} name
   * @returns {THREE.DataTexture}
   */
  createFromImageData(imageData, name) {
    const texture = new THREE.DataTexture(
      imageData.data,
      imageData.width,
      imageData.height,
      THREE.RGBAFormat
    );
    texture.needsUpdate = true;

    this.textures.set(name, texture);
    console.log(`✅ ImageData 纹理创建: ${name} (${imageData.width}x${imageData.height})`);

    return texture;
  }

  /**
   * 创建深度纹理
   * @param {Float32Array|Uint8Array} depthData
   * @param {number} width
   * @param {number} height
   * @param {string} name
   * @returns {THREE.DataTexture}
   */
  createDepthTexture(depthData, width, height, name) {
    let data;

    if (depthData instanceof Float32Array) {
      // 转换为 RGBA Uint8
      data = new Uint8Array(width * height * 4);
      for (let i = 0; i < depthData.length; i++) {
        const value = Math.floor(depthData[i] * 255);
        const idx = i * 4;
        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
        data[idx + 3] = 255;
      }
    } else {
      data = depthData;
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    this.textures.set(name, texture);
    console.log(`✅ 深度纹理创建: ${name} (${width}x${height})`);

    return texture;
  }

  /**
   * 创建法线贴图
   * @param {Float32Array} depthData
   * @param {number} width
   * @param {number} height
   * @param {string} name
   * @param {number} strength - 法线强度
   * @returns {THREE.DataTexture}
   */
  createNormalMap(depthData, width, height, name, strength = 1.0) {
    const data = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // 采样相邻像素
        const left = x > 0 ? depthData[idx - 1] : depthData[idx];
        const right = x < width - 1 ? depthData[idx + 1] : depthData[idx];
        const top = y > 0 ? depthData[idx - width] : depthData[idx];
        const bottom = y < height - 1 ? depthData[idx + width] : depthData[idx];

        // 计算梯度
        const dx = (right - left) * strength;
        const dy = (bottom - top) * strength;

        // 归一化法线
        const length = Math.sqrt(dx * dx + dy * dy + 1);
        const nx = -dx / length;
        const ny = -dy / length;
        const nz = 1 / length;

        // 转换到 0-255 范围
        const outIdx = idx * 4;
        data[outIdx] = Math.floor((nx * 0.5 + 0.5) * 255);
        data[outIdx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
        data[outIdx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
        data[outIdx + 3] = 255;
      }
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    this.textures.set(name, texture);
    console.log(`✅ 法线贴图创建: ${name}`);

    return texture;
  }

  /**
   * 获取纹理
   * @param {string} name
   * @returns {THREE.Texture|undefined}
   */
  get(name) {
    return this.textures.get(name);
  }

  /**
   * 检查纹理是否存在
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.textures.has(name);
  }

  /**
   * 移除纹理
   * @param {string} name
   */
  remove(name) {
    const texture = this.textures.get(name);
    if (texture) {
      texture.dispose();
      this.textures.delete(name);
      console.log(`🗑️ 纹理已移除: ${name}`);
    }
  }

  /**
   * 更新纹理内容
   * @param {string} name
   * @param {HTMLImageElement|HTMLCanvasElement|ImageData} source
   */
  update(name, source) {
    const texture = this.textures.get(name);
    if (texture) {
      if (source instanceof ImageData) {
        texture.image = source;
      } else {
        texture.image = source;
      }
      texture.needsUpdate = true;
    }
  }

  /**
   * 获取所有纹理名称
   * @returns {string[]}
   */
  getNames() {
    return Array.from(this.textures.keys());
  }

  /**
   * 清除所有纹理
   */
  clear() {
    this.textures.forEach((texture) => texture.dispose());
    this.textures.clear();
    this._cache.clear();
    console.log('🗑️ 所有纹理已清除');
  }

  /**
   * 销毁
   */
  dispose() {
    this.clear();
    console.log('🗑️ TextureManager 已销毁');
  }
}

export default TextureManager;
