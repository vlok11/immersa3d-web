/**
 * @fileoverview AI 超分辨率增强
 * @module modules/EnhancementSystem/SuperResolution
 */

import * as tf from '@tensorflow/tfjs';

/**
 * 超分倍率
 * @enum {number}
 */
export const UpscaleFactor = {
  X2: 2,
  X4: 4,
};

/**
 * 超分辨率方法
 * @enum {string}
 */
export const UpscaleMethod = {
  BICUBIC: 'bicubic', // 双三次插值
  LANCZOS: 'lanczos', // Lanczos 插值
  ESRGAN: 'esrgan', // AI 超分（需要模型）
  SRCNN: 'srcnn', // 轻量 AI 超分
};

/**
 * 超分辨率处理器
 * @class
 */
export class SuperResolution {
  constructor() {
    /** @private */
    this._model = null;

    /** @private */
    this._modelType = null;

    /** @type {Function|null} */
    this.onProgress = null;
  }

  /**
   * 加载 AI 模型
   * @param {string} modelPath - 模型路径
   * @param {string} type - 模型类型
   * @returns {Promise<boolean>}
   */
  async loadModel(modelPath, type = 'srcnn') {
    try {
      // 设置 TensorFlow.js 后端
      await tf.ready();

      // 尝试使用 WebGPU，回退到 WebGL
      const backends = ['webgpu', 'webgl'];
      for (const backend of backends) {
        try {
          await tf.setBackend(backend);
          break;
        } catch {
          continue;
        }
      }

      console.log(`🧠 TensorFlow.js 后端: ${tf.getBackend()}`);

      // 加载模型
      this._model = await tf.loadGraphModel(modelPath);
      this._modelType = type;

      console.log(`✅ 超分模型加载完成: ${type}`);
      return true;
    } catch (error) {
      console.error('模型加载失败:', error);
      return false;
    }
  }

  /**
   * 超分辨率处理
   * @param {HTMLImageElement|HTMLCanvasElement|ImageData} input - 输入图像
   * @param {object} options - 选项
   * @returns {Promise<HTMLCanvasElement>}
   */
  async upscale(input, options = {}) {
    const { factor = UpscaleFactor.X2, method = UpscaleMethod.BICUBIC } = options;

    // 转换为 Canvas
    const inputCanvas = this._toCanvas(input);
    const { width, height } = inputCanvas;
    const targetWidth = width * factor;
    const targetHeight = height * factor;

    let result;

    switch (method) {
      case UpscaleMethod.BICUBIC:
        result = this._bicubicUpscale(inputCanvas, targetWidth, targetHeight);
        break;

      case UpscaleMethod.LANCZOS:
        result = this._lanczosUpscale(inputCanvas, targetWidth, targetHeight);
        break;

      case UpscaleMethod.ESRGAN:
      case UpscaleMethod.SRCNN:
        if (!this._model) {
          console.warn('AI 模型未加载，使用双三次插值');
          result = this._bicubicUpscale(inputCanvas, targetWidth, targetHeight);
        } else {
          result = await this._aiUpscale(inputCanvas, factor);
        }
        break;

      default:
        result = this._bicubicUpscale(inputCanvas, targetWidth, targetHeight);
    }

    console.log(`🔍 超分完成: ${width}×${height} → ${targetWidth}×${targetHeight}`);
    return result;
  }

  /**
   * 双三次插值放大
   * @private
   */
  _bicubicUpscale(canvas, targetWidth, targetHeight) {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;

    const ctx = outputCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

    return outputCanvas;
  }

  /**
   * Lanczos 插值放大
   * @private
   */
  _lanczosUpscale(canvas, targetWidth, targetHeight) {
    // 多步放大以获得更好的质量
    const steps = Math.ceil(Math.log2(targetWidth / canvas.width));
    let current = canvas;

    for (let i = 0; i < steps; i++) {
      const nextWidth = Math.min(current.width * 2, targetWidth);
      const nextHeight = Math.min(current.height * 2, targetHeight);

      const stepCanvas = document.createElement('canvas');
      stepCanvas.width = nextWidth;
      stepCanvas.height = nextHeight;

      const ctx = stepCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(current, 0, 0, nextWidth, nextHeight);

      current = stepCanvas;
    }

    // 最终调整到目标尺寸
    if (current.width !== targetWidth || current.height !== targetHeight) {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = targetWidth;
      finalCanvas.height = targetHeight;
      const ctx = finalCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(current, 0, 0, targetWidth, targetHeight);
      return finalCanvas;
    }

    return current;
  }

  /**
   * AI 超分辨率
   * @private
   */
  async _aiUpscale(canvas, factor) {
    // 准备输入张量
    const imageTensor = tf.browser.fromPixels(canvas);
    const normalized = imageTensor.toFloat().div(255.0);
    const batched = normalized.expandDims(0);

    try {
      // 推理
      const output = this._model.predict(batched);

      // 处理输出
      const squeezed = output.squeeze();
      const clipped = squeezed.clipByValue(0, 1);
      const scaled = clipped.mul(255).cast('int32');

      // 转换回 Canvas
      const outputCanvas = document.createElement('canvas');
      const [height, width] = scaled.shape.slice(0, 2);
      outputCanvas.width = width;
      outputCanvas.height = height;

      await tf.browser.toPixels(scaled, outputCanvas);

      // 清理
      tf.dispose([imageTensor, normalized, batched, output, squeezed, clipped, scaled]);

      return outputCanvas;
    } catch (error) {
      console.error('AI 超分失败:', error);
      // 回退到双三次
      tf.dispose([imageTensor, normalized, batched]);
      return this._bicubicUpscale(canvas, canvas.width * factor, canvas.height * factor);
    }
  }

  /**
   * 转换为 Canvas
   * @private
   */
  _toCanvas(input) {
    if (input instanceof HTMLCanvasElement) {
      return input;
    }

    const canvas = document.createElement('canvas');

    if (input instanceof HTMLImageElement) {
      canvas.width = input.naturalWidth || input.width;
      canvas.height = input.naturalHeight || input.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(input, 0, 0);
    } else if (input instanceof ImageData) {
      canvas.width = input.width;
      canvas.height = input.height;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(input, 0, 0);
    }

    return canvas;
  }

  /**
   * 图像锐化
   * @param {HTMLCanvasElement} canvas
   * @param {number} amount - 锐化量 0-1
   * @returns {HTMLCanvasElement}
   */
  sharpen(canvas, amount = 0.5) {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const ctx = outputCanvas.getContext('2d');

    // 绘制原图
    ctx.drawImage(canvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // 锐化卷积核
    const kernel = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];

    const result = new Uint8ClampedArray(data.length);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          result[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, sum));
        }
        result[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
      }
    }

    const resultData = new ImageData(result, width, height);
    ctx.putImageData(resultData, 0, 0);

    return outputCanvas;
  }

  /**
   * 销毁
   */
  dispose() {
    if (this._model) {
      this._model.dispose();
      this._model = null;
    }
    console.log('🗑️ SuperResolution 已销毁');
  }
}

export default SuperResolution;
