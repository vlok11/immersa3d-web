/**
 * @fileoverview Depth Anything V2 深度估计器
 * @module core/AIEngine/DepthAnythingEstimator
 * @description 使用 Depth Anything V2 模型进行高精度单目深度估计
 */

/**
 * Depth Anything V2 模型配置
 * @constant
 */
const DEPTH_ANYTHING_CONFIG = {
  // 高精度完整模型 (97MB)
  FULL: {
    id: 'depth-anything-v2-full',
    url: 'https://cdn.glitch.me/0f5359e2-6022-421b-88f7-13e276d0fb33/depthanythingv2-vits.onnx',
    size: 97,
    inputSize: 518,
  },
  // 动态输入尺寸版本 (97MB)
  DYNAMIC: {
    id: 'depth-anything-v2-dynamic',
    url: 'https://cdn.glitch.me/0f5359e2-6022-421b-88f7-13e276d0fb33/depthanythingv2-vits-dynamic.onnx',
    size: 97,
    inputSize: 518,
  },
  // 4-bit 量化版本 (18MB) - 备用
  QUANTIZED: {
    id: 'depth-anything-v2-q4f16',
    url: 'https://cdn.glitch.global/0f5359e2-6022-421b-88f7-13e276d0fb33/model_q4f16.onnx',
    size: 18,
    inputSize: 518,
  },
};

/**
 * Depth Anything V2 深度估计器
 * 高精度单目深度估计，比 MiDaS 更精确
 * @class
 */
export class DepthAnythingEstimator {
  /**
   * @param {Object} options - 配置选项
   * @param {string} [options.precision='full'] - 精度级别: 'full' | 'dynamic' | 'quantized'
   * @param {Function} [options.onProgress] - 加载进度回调
   */
  constructor(options = {}) {
    const precision = options.precision || 'full';
    this._config = DEPTH_ANYTHING_CONFIG[precision.toUpperCase()] || DEPTH_ANYTHING_CONFIG.FULL;
    this._onProgress = options.onProgress || null;

    /** @type {ort.InferenceSession|null} */
    this._session = null;

    /** @type {boolean} */
    this._ready = false;

    /** @private */
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');

    // eslint-disable-next-line no-console
    console.log(`📊 DepthAnythingEstimator 配置: ${precision} (${this._config.size}MB)`);
  }

  /**
   * 初始化深度估计器
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // eslint-disable-next-line no-console
      console.log(`🔄 正在加载 Depth Anything V2 模型 (${this._config.size}MB)...`);
      const startTime = performance.now();

      const ort = await import('onnxruntime-web');

      // 配置 ONNX Runtime
      ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;

      // 创建推理会话
      this._session = await ort.InferenceSession.create(this._config.url, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });

      this._ready = true;
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      // eslint-disable-next-line no-console
      console.log(`✅ Depth Anything V2 初始化完成 (${elapsed}s)`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Depth Anything V2 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否就绪
   * @returns {boolean}
   */
  isReady() {
    return this._ready && this._session !== null;
  }

  /**
   * 估计深度
   * @param {HTMLImageElement|HTMLCanvasElement|ImageData} input - 输入图像
   * @returns {Promise<Float32Array>} 深度图数据
   */
  async estimate(input) {
    if (!this.isReady()) {
      throw new Error('DepthAnythingEstimator 未初始化');
    }

    // eslint-disable-next-line no-console
    console.log('🔍 开始 Depth Anything V2 深度估计...');
    const startTime = performance.now();

    // 预处理图像
    const inputTensor = await this._preprocessImage(input);

    // 运行推理
    const results = await this._session.run({ image: inputTensor });

    // 后处理
    const depthMap = this._postprocessOutput(results);

    const elapsed = performance.now() - startTime;
    // eslint-disable-next-line no-console
    console.log(`✅ Depth Anything V2 深度估计完成 (${elapsed.toFixed(2)}ms)`);

    return depthMap;
  }

  /**
   * 预处理图像
   * @private
   * @param {HTMLImageElement|HTMLCanvasElement|ImageData} input
   * @returns {Promise<ort.Tensor>}
   */
  async _preprocessImage(input) {
    const size = this._config.inputSize;
    this._canvas.width = size;
    this._canvas.height = size;

    // 绘制图像到 Canvas
    if (input instanceof HTMLImageElement) {
      this._ctx.drawImage(input, 0, 0, size, size);
    } else if (input instanceof HTMLCanvasElement) {
      this._ctx.drawImage(input, 0, 0, size, size);
    } else if (input instanceof ImageData) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = input.width;
      tempCanvas.height = input.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.putImageData(input, 0, 0);
      this._ctx.drawImage(tempCanvas, 0, 0, size, size);
    } else {
      throw new Error('不支持的输入类型');
    }

    // 获取像素数据
    const imageData = this._ctx.getImageData(0, 0, size, size);
    const { data } = imageData;

    // 转换为 Float32Array (NCHW 格式, RGB 归一化到 0-1)
    const floatData = new Float32Array(3 * size * size);

    // Depth Anything V2 使用简单的 0-1 归一化
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const srcIdx = (y * size + x) * 4;
        const dstIdx = y * size + x;

        // RGB 通道分离，归一化到 [0, 1]
        floatData[0 * size * size + dstIdx] = data[srcIdx] / 255; // R
        floatData[1 * size * size + dstIdx] = data[srcIdx + 1] / 255; // G
        floatData[2 * size * size + dstIdx] = data[srcIdx + 2] / 255; // B
      }
    }

    // 创建 ONNX Tensor
    const ort = await import('onnxruntime-web');
    return new ort.Tensor('float32', floatData, [1, 3, size, size]);
  }

  /**
   * 后处理输出
   * @private
   * @param {Object} results - ONNX 推理结果
   * @returns {Float32Array} 归一化深度图
   */
  _postprocessOutput(results) {
    // 获取输出 tensor (depth)
    const outputTensor = results.depth || results[Object.keys(results)[0]];
    const depthData = new Float32Array(outputTensor.data.buffer);

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
   * 生成深度纹理 Canvas
   * @param {Float32Array} depthMap - 深度图数据
   * @param {number} [width] - 输出宽度
   * @param {number} [height] - 输出高度
   * @returns {HTMLCanvasElement}
   */
  createDepthCanvas(depthMap, width = this._config.inputSize, height = this._config.inputSize) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < depthMap.length; i++) {
      const value = Math.floor(depthMap[i] * 255);
      const idx = i * 4;
      imageData.data[idx] = value; // R
      imageData.data[idx + 1] = value; // G
      imageData.data[idx + 2] = value; // B
      imageData.data[idx + 3] = 255; // A
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * 获取输入尺寸
   * @returns {number}
   */
  getInputSize() {
    return this._config.inputSize;
  }

  /**
   * 获取当前配置
   * @returns {Object}
   */
  getConfig() {
    return { ...this._config };
  }

  /**
   * 销毁深度估计器
   */
  dispose() {
    if (this._session) {
      this._session.release();
      this._session = null;
    }
    this._ready = false;
    // eslint-disable-next-line no-console
    console.log('🗑️ DepthAnythingEstimator 已销毁');
  }
}

export default DepthAnythingEstimator;
