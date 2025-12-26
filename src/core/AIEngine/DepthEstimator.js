/**
 * @fileoverview 深度估计器
 * @module core/AIEngine/DepthEstimator
 */

import { ModelManager } from './ModelManager.js';

/** @constant {string} */
const MIDAS_MODEL_ID = 'midas-small';

/** @constant {string} */
const MIDAS_MODEL_PATH = '/models/midas/midas_v21_small_256.onnx';

/**
 * 深度估计器
 * 使用 MiDaS 模型进行单目深度估计
 * @class
 */
export class DepthEstimator {
  /**
   * @param {ModelManager} modelManager - 模型管理器实例
   */
  constructor(modelManager) {
    /** @type {ModelManager} */
    this.modelManager = modelManager;
    
    /** @type {boolean} */
    this._ready = false;
    
    /** @private */
    this._inputSize = 256;
    
    /** @private */
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
  }

  /**
   * 初始化深度估计器
   */
  async init() {
    try {
      await this.modelManager.loadModel(MIDAS_MODEL_ID, MIDAS_MODEL_PATH, {
        type: 'onnx'
      });
      
      this._ready = true;
      console.log('✅ DepthEstimator 初始化完成');
      
    } catch (error) {
      console.error('❌ DepthEstimator 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否就绪
   * @returns {boolean}
   */
  isReady() {
    return this._ready && this.modelManager.isModelLoaded(MIDAS_MODEL_ID);
  }

  /**
   * 估计深度
   * @param {HTMLImageElement|HTMLCanvasElement|ImageData} input - 输入图像
   * @returns {Promise<Float32Array>} 深度图数据
   */
  async estimate(input) {
    if (!this.isReady()) {
      throw new Error('DepthEstimator 未初始化');
    }

    console.log('🔍 开始深度估计...');
    const startTime = performance.now();

    // 预处理图像
    const tensorInput = await this._preprocessImage(input);

    // 运行推理
    const output = await this.modelManager.runInference(MIDAS_MODEL_ID, tensorInput);

    // 后处理
    const depthMap = this._postprocessOutput(output);

    const elapsed = performance.now() - startTime;
    console.log(`✅ 深度估计完成 (${elapsed.toFixed(2)}ms)`);

    return depthMap;
  }

  /**
   * 预处理图像
   * @private
   */
  async _preprocessImage(input) {
    // 获取原始尺寸
    let width, height, imageData;
    
    if (input instanceof HTMLImageElement) {
      width = input.naturalWidth;
      height = input.naturalHeight;
      this._canvas.width = this._inputSize;
      this._canvas.height = this._inputSize;
      this._ctx.drawImage(input, 0, 0, this._inputSize, this._inputSize);
      imageData = this._ctx.getImageData(0, 0, this._inputSize, this._inputSize);
      
    } else if (input instanceof HTMLCanvasElement) {
      width = input.width;
      height = input.height;
      this._canvas.width = this._inputSize;
      this._canvas.height = this._inputSize;
      this._ctx.drawImage(input, 0, 0, this._inputSize, this._inputSize);
      imageData = this._ctx.getImageData(0, 0, this._inputSize, this._inputSize);
      
    } else if (input instanceof ImageData) {
      width = input.width;
      height = input.height;
      this._canvas.width = this._inputSize;
      this._canvas.height = this._inputSize;
      // 缩放 ImageData
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.putImageData(input, 0, 0);
      this._ctx.drawImage(tempCanvas, 0, 0, this._inputSize, this._inputSize);
      imageData = this._ctx.getImageData(0, 0, this._inputSize, this._inputSize);
      
    } else {
      throw new Error('不支持的输入类型');
    }

    // 转换为 Float32Array (NCHW 格式)
    const { data } = imageData;
    const size = this._inputSize;
    const floatData = new Float32Array(3 * size * size);

    // MiDaS 归一化参数
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const srcIdx = (y * size + x) * 4;
        
        // RGB 通道，归一化到 [0, 1]，然后标准化
        floatData[0 * size * size + y * size + x] = (data[srcIdx] / 255 - mean[0]) / std[0];
        floatData[1 * size * size + y * size + x] = (data[srcIdx + 1] / 255 - mean[1]) / std[1];
        floatData[2 * size * size + y * size + x] = (data[srcIdx + 2] / 255 - mean[2]) / std[2];
      }
    }

    // 创建 ONNX Tensor
    const ort = await import('onnxruntime-web');
    const inputTensor = new ort.Tensor('float32', floatData, [1, 3, size, size]);

    return { input: inputTensor };
  }

  /**
   * 后处理输出
   * @private
   */
  _postprocessOutput(output) {
    // 获取输出 tensor
    const outputTensor = output[Object.keys(output)[0]];
    const depthData = outputTensor.data;
    const size = this._inputSize;

    // 归一化深度值到 [0, 1]
    let minDepth = Infinity;
    let maxDepth = -Infinity;

    for (let i = 0; i < depthData.length; i++) {
      if (depthData[i] < minDepth) minDepth = depthData[i];
      if (depthData[i] > maxDepth) maxDepth = depthData[i];
    }

    const range = maxDepth - minDepth || 1;
    const normalizedDepth = new Float32Array(depthData.length);

    for (let i = 0; i < depthData.length; i++) {
      // 反转深度（近处为 1，远处为 0）
      normalizedDepth[i] = 1 - (depthData[i] - minDepth) / range;
    }

    return normalizedDepth;
  }

  /**
   * 生成深度纹理
   * @param {Float32Array} depthMap - 深度图数据
   * @param {number} width - 输出宽度
   * @param {number} height - 输出高度
   * @returns {HTMLCanvasElement}
   */
  createDepthCanvas(depthMap, width = this._inputSize, height = this._inputSize) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < depthMap.length; i++) {
      const value = Math.floor(depthMap[i] * 255);
      const idx = i * 4;
      imageData.data[idx] = value;     // R
      imageData.data[idx + 1] = value; // G
      imageData.data[idx + 2] = value; // B
      imageData.data[idx + 3] = 255;   // A
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * 获取输入尺寸
   * @returns {number}
   */
  getInputSize() {
    return this._inputSize;
  }

  /**
   * 销毁深度估计器
   */
  dispose() {
    this._ready = false;
    console.log('🗑️ DepthEstimator 已销毁');
  }
}

export default DepthEstimator;
