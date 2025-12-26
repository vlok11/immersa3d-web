/**
 * @fileoverview 图像处理器
 * @module modules/InputSystem/ImageProcessor
 */

/**
 * 支持的图像格式
 * @constant {string[]}
 */
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

/**
 * 图像处理器
 * @class
 */
export class ImageProcessor {
  constructor() {
    /** @private */
    this._canvas = document.createElement('canvas');

    /** @private */
    this._ctx = this._canvas.getContext('2d', {
      willReadFrequently: true,
    });
  }

  /**
   * 检查文件格式是否支持
   * @param {File} file
   * @returns {boolean}
   */
  isSupported(file) {
    return SUPPORTED_FORMATS.includes(file.type);
  }

  /**
   * 加载图像文件
   * @param {File} file - 图像文件
   * @returns {Promise<HTMLImageElement>}
   */
  async loadImage(file) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported(file)) {
        reject(new Error(`不支持的图像格式: ${file.type}`));
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图像加载失败'));
      };

      img.src = url;
    });
  }

  /**
   * 加载图像 URL
   * @param {string} url - 图像 URL
   * @returns {Promise<HTMLImageElement>}
   */
  async loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图像加载失败'));

      img.src = url;
    });
  }

  /**
   * 获取图像数据
   * @param {HTMLImageElement} image
   * @param {object} options
   * @returns {ImageData}
   */
  getImageData(image, options = {}) {
    const { width = image.naturalWidth, height = image.naturalHeight } = options;

    this._canvas.width = width;
    this._canvas.height = height;
    this._ctx.drawImage(image, 0, 0, width, height);

    return this._ctx.getImageData(0, 0, width, height);
  }

  /**
   * 调整图像大小
   * @param {HTMLImageElement|HTMLCanvasElement} source
   * @param {number} targetWidth
   * @param {number} targetHeight
   * @returns {HTMLCanvasElement}
   */
  resize(source, targetWidth, targetHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    return canvas;
  }

  /**
   * 保持宽高比调整大小
   * @param {HTMLImageElement} image
   * @param {number} maxSize - 最大边长
   * @returns {HTMLCanvasElement}
   */
  resizeKeepAspect(image, maxSize) {
    const { naturalWidth: w, naturalHeight: h } = image;

    let targetWidth, targetHeight;

    if (w > h) {
      targetWidth = Math.min(w, maxSize);
      targetHeight = Math.round((h / w) * targetWidth);
    } else {
      targetHeight = Math.min(h, maxSize);
      targetWidth = Math.round((w / h) * targetHeight);
    }

    return this.resize(image, targetWidth, targetHeight);
  }

  /**
   * 转换为 Three.js 纹理
   * @param {HTMLImageElement|HTMLCanvasElement} source
   * @returns {Promise<THREE.Texture>}
   */
  async createTexture(source) {
    const THREE = await import('three');

    const texture = new THREE.Texture(source);
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    return texture;
  }

  /**
   * 创建深度数据纹理
   * @param {Float32Array} depthData
   * @param {number} width
   * @param {number} height
   * @returns {Promise<THREE.DataTexture>}
   */
  async createDepthTexture(depthData, width, height) {
    const THREE = await import('three');

    // 转换为 RGBA 格式
    const data = new Uint8Array(width * height * 4);

    for (let i = 0; i < depthData.length; i++) {
      const value = Math.floor(depthData[i] * 255);
      const idx = i * 4;
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return texture;
  }

  /**
   * 图像转 Base64
   * @param {HTMLCanvasElement} canvas
   * @param {string} format
   * @param {number} quality
   * @returns {string}
   */
  toDataURL(canvas, format = 'image/jpeg', quality = 0.9) {
    return canvas.toDataURL(format, quality);
  }

  /**
   * 图像转 Blob
   * @param {HTMLCanvasElement} canvas
   * @param {string} format
   * @param {number} quality
   * @returns {Promise<Blob>}
   */
  async toBlob(canvas, format = 'image/jpeg', quality = 0.9) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('转换失败'))),
        format,
        quality
      );
    });
  }

  /**
   * 应用灰度
   * @param {ImageData} imageData
   * @returns {ImageData}
   */
  applyGrayscale(imageData) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    return imageData;
  }

  /**
   * 翻转图像
   * @param {HTMLCanvasElement} canvas
   * @param {boolean} horizontal
   * @param {boolean} vertical
   * @returns {HTMLCanvasElement}
   */
  flip(canvas, horizontal = false, vertical = false) {
    const result = document.createElement('canvas');
    result.width = canvas.width;
    result.height = canvas.height;
    const ctx = result.getContext('2d');

    ctx.save();
    ctx.translate(horizontal ? canvas.width : 0, vertical ? canvas.height : 0);
    ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();

    return result;
  }

  /**
   * 获取图像元数据
   * @param {HTMLImageElement} image
   * @returns {object}
   */
  getMetadata(image) {
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      aspectRatio: image.naturalWidth / image.naturalHeight,
    };
  }
}

export { SUPPORTED_FORMATS };
export default ImageProcessor;
