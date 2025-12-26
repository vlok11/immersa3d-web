/**
 * @fileoverview AI 模型管理器
 * @module core/AIEngine/ModelManager
 */

/**
 * 模型状态
 * @enum {string}
 */
const ModelState = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
};

/**
 * AI 模型管理器
 * 负责加载、缓存和管理 AI 模型
 * @class
 */
export class ModelManager {
  constructor() {
    /** @type {Map<string, object>} */
    this.models = new Map();

    /** @type {Map<string, string>} */
    this.modelStates = new Map();

    /** @private */
    this._cache = null;

    /** @private */
    this._backend = 'webgl';

    /** @type {boolean} */
    this._initialized = false;

    this._init();
  }

  /**
   * 初始化模型管理器
   * @private
   */
  async _init() {
    try {
      // 检测最佳后端
      this._backend = await this._detectBestBackend();

      // 初始化 IndexedDB 缓存
      await this._initCache();

      this._initialized = true;
      console.log(`✅ ModelManager 初始化完成 (后端: ${this._backend})`);
    } catch (error) {
      console.error('❌ ModelManager 初始化失败:', error);
    }
  }

  /**
   * 检测最佳推理后端
   * @private
   * @returns {Promise<string>}
   */
  async _detectBestBackend() {
    // 检测 WebGPU
    if ('gpu' in navigator) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          console.log('🚀 WebGPU 可用');
          return 'webgpu';
        }
      } catch (_e) {
        // WebGPU 不可用
      }
    }

    // 检测 WebGL 2.0
    const canvas = document.createElement('canvas');
    if (canvas.getContext('webgl2')) {
      console.log('🔸 使用 WebGL 2.0');
      return 'webgl2';
    }

    // 回退 WebGL 1.0
    if (canvas.getContext('webgl')) {
      console.log('🔹 使用 WebGL 1.0');
      return 'webgl';
    }

    // CPU 回退
    console.warn('⚠️ 无 GPU 加速，使用 CPU');
    return 'cpu';
  }

  /**
   * 初始化 IndexedDB 缓存
   * @private
   */
  async _initCache() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('Immersa3D_ModelCache', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this._cache = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * 从缓存获取模型
   * @private
   */
  async _getFromCache(modelId) {
    if (!this._cache) return null;

    return new Promise((resolve, reject) => {
      const transaction = this._cache.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.get(modelId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.data || null);
    });
  }

  /**
   * 保存模型到缓存
   * @private
   */
  async _saveToCache(modelId, data) {
    if (!this._cache) return;

    return new Promise((resolve, reject) => {
      const transaction = this._cache.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      const request = store.put({ id: modelId, data, timestamp: Date.now() });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 加载模型
   * @param {string} modelId - 模型 ID
   * @param {string} modelPath - 模型路径
   * @param {object} options - 加载选项
   * @returns {Promise<object>}
   */
  async loadModel(modelId, modelPath, options = {}) {
    // 检查是否已加载
    if (this.models.has(modelId)) {
      return this.models.get(modelId);
    }

    this.modelStates.set(modelId, ModelState.LOADING);
    console.log(`📦 加载模型: ${modelId}`);

    try {
      // 尝试从缓存加载
      let modelData = await this._getFromCache(modelId);

      if (!modelData) {
        // 从网络加载
        const response = await fetch(modelPath);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        modelData = await response.arrayBuffer();

        // 保存到缓存
        await this._saveToCache(modelId, modelData);
        console.log(`💾 模型已缓存: ${modelId}`);
      } else {
        console.log(`📂 从缓存加载: ${modelId}`);
      }

      // 根据模型类型初始化
      const model = await this._initializeModel(modelId, modelData, options);

      this.models.set(modelId, model);
      this.modelStates.set(modelId, ModelState.READY);

      console.log(`✅ 模型加载完成: ${modelId}`);
      return model;
    } catch (error) {
      this.modelStates.set(modelId, ModelState.ERROR);
      console.error(`❌ 模型加载失败: ${modelId}`, error);
      throw error;
    }
  }

  /**
   * 初始化模型
   * @private
   */
  async _initializeModel(modelId, modelData, options) {
    const { type = 'onnx' } = options;

    if (type === 'onnx') {
      // 动态导入 ONNX Runtime
      const ort = await import('onnxruntime-web');

      // 设置执行提供者
      const executionProviders = this._getExecutionProviders();

      const session = await ort.InferenceSession.create(modelData, {
        executionProviders,
        graphOptimizationLevel: 'all',
      });

      return {
        type: 'onnx',
        session,
        inputNames: session.inputNames,
        outputNames: session.outputNames,
      };
    }

    if (type === 'tfjs') {
      // 动态导入 TensorFlow.js
      const tf = await import('@tensorflow/tfjs');

      // 设置后端
      await tf.setBackend(this._backend === 'webgpu' ? 'webgpu' : 'webgl');
      await tf.ready();

      // 加载模型
      const model = await tf.loadGraphModel(options.modelUrl);

      return {
        type: 'tfjs',
        model,
        tf,
      };
    }

    throw new Error(`不支持的模型类型: ${type}`);
  }

  /**
   * 获取执行提供者
   * @private
   */
  _getExecutionProviders() {
    switch (this._backend) {
      case 'webgpu':
        return ['webgpu'];
      case 'webgl2':
      case 'webgl':
        return ['webgl'];
      default:
        return ['wasm'];
    }
  }

  /**
   * 运行推理
   * @param {string} modelId - 模型 ID
   * @param {object} inputs - 输入数据
   * @returns {Promise<object>}
   */
  async runInference(modelId, inputs) {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`模型未加载: ${modelId}`);
    }

    const startTime = performance.now();

    if (model.type === 'onnx') {
      const results = await model.session.run(inputs);
      const inferenceTime = performance.now() - startTime;
      console.log(`⚡ 推理完成 (${inferenceTime.toFixed(2)}ms): ${modelId}`);
      return results;
    }

    if (model.type === 'tfjs') {
      // const { tf } = model;
      const output = model.model.predict(inputs);
      const inferenceTime = performance.now() - startTime;
      console.log(`⚡ 推理完成 (${inferenceTime.toFixed(2)}ms): ${modelId}`);
      return output;
    }

    throw new Error(`不支持的模型类型: ${model.type}`);
  }

  /**
   * 获取模型状态
   * @param {string} modelId
   * @returns {string}
   */
  getModelState(modelId) {
    return this.modelStates.get(modelId) || ModelState.IDLE;
  }

  /**
   * 检查模型是否已加载
   * @param {string} modelId
   * @returns {boolean}
   */
  isModelLoaded(modelId) {
    return this.modelStates.get(modelId) === ModelState.READY;
  }

  /**
   * 获取当前后端
   * @returns {string}
   */
  getBackend() {
    return this._backend;
  }

  /**
   * 卸载模型
   * @param {string} modelId
   */
  unloadModel(modelId) {
    const model = this.models.get(modelId);
    if (!model) return;

    if (model.type === 'onnx' && model.session) {
      model.session.release?.();
    }

    if (model.type === 'tfjs' && model.model) {
      model.model.dispose?.();
    }

    this.models.delete(modelId);
    this.modelStates.delete(modelId);

    console.log(`🗑️ 模型已卸载: ${modelId}`);
  }

  /**
   * 清除所有模型
   */
  clear() {
    for (const modelId of this.models.keys()) {
      this.unloadModel(modelId);
    }
  }

  /**
   * 销毁模型管理器
   */
  dispose() {
    this.clear();

    if (this._cache) {
      this._cache.close();
      this._cache = null;
    }

    console.log('🗑️ ModelManager 已销毁');
  }
}

export { ModelState };
export default ModelManager;
