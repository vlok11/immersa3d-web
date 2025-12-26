/**
 * @fileoverview AI 模型下载器 - 管理模型下载、缓存和版本
 * @module core/AIEngine/ModelDownloader
 */

/**
 * 模型配置
 */
const MODEL_REGISTRY = {
  'depth-anything': {
    name: 'Depth Anything',
    url: 'https://huggingface.co/models/depth-anything/resolve/main/model.onnx',
    size: 50 * 1024 * 1024, // ~50MB
    version: '1.0.0',
    type: 'onnx',
  },
  yolov8n: {
    name: 'YOLOv8 Nano',
    url: 'https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx',
    size: 6.4 * 1024 * 1024, // ~6.4MB
    version: '8.0.0',
    type: 'onnx',
  },
  'esrgan-x4': {
    name: 'ESRGAN 4x',
    url: 'https://tfhub.dev/captain-pool/esrgan-tf2/1/model.json',
    size: 16 * 1024 * 1024, // ~16MB
    version: '1.0.0',
    type: 'tfjs',
  },
};

/**
 * 模型下载器
 */
export class ModelDownloader {
  constructor() {
    /** @private */
    this._dbName = 'immersa3d-models';

    /** @private */
    this._dbVersion = 1;

    /** @private */
    this._db = null;

    /** @type {function|null} */
    this.onProgress = null;

    /** @type {function|null} */
    this.onComplete = null;

    /** @type {function|null} */
    this.onError = null;
  }

  /**
   * 初始化 IndexedDB
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this._db) return this._db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this._dbName, this._dbVersion);

      request.onerror = () => {
        reject(new Error('无法打开模型数据库'));
      };

      request.onsuccess = (event) => {
        this._db = event.target.result;
        console.log('📦 模型数据库已初始化');
        resolve(this._db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('models')) {
          const store = db.createObjectStore('models', { keyPath: 'id' });
          store.createIndex('version', 'version', { unique: false });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * 获取可用模型列表
   * @returns {object[]}
   */
  getAvailableModels() {
    return Object.entries(MODEL_REGISTRY).map(([id, config]) => ({
      id,
      ...config,
      sizeFormatted: this._formatBytes(config.size),
    }));
  }

  /**
   * 检查模型是否已缓存
   * @param {string} modelId
   * @returns {Promise<boolean>}
   */
  async isCached(modelId) {
    await this.init();

    return new Promise((resolve) => {
      const transaction = this._db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.get(modelId);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(false);
          return;
        }

        // 检查版本
        const config = MODEL_REGISTRY[modelId];
        if (config && result.version !== config.version) {
          resolve(false); // 需要更新
          return;
        }

        resolve(true);
      };

      request.onerror = () => resolve(false);
    });
  }

  /**
   * 下载模型
   * @param {string} modelId
   * @returns {Promise<ArrayBuffer>}
   */
  async download(modelId) {
    const config = MODEL_REGISTRY[modelId];
    if (!config) {
      throw new Error(`未知模型: ${modelId}`);
    }

    // 检查缓存
    const cached = await this._getFromCache(modelId);
    if (cached) {
      console.log(`✅ 从缓存加载模型: ${config.name}`);
      return cached;
    }

    console.log(`⬇️ 开始下载模型: ${config.name}`);

    try {
      const response = await fetch(config.url);
      if (!response.ok) {
        throw new Error(`下载失败: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const contentLength = +response.headers.get('Content-Length') || config.size;

      let receivedLength = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // 进度回调
        if (this.onProgress) {
          const progress = receivedLength / contentLength;
          this.onProgress({
            modelId,
            name: config.name,
            loaded: receivedLength,
            total: contentLength,
            progress: Math.min(progress, 1),
          });
        }
      }

      // 合并 chunks
      const data = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        data.set(chunk, position);
        position += chunk.length;
      }

      // 缓存到 IndexedDB
      await this._saveToCache(modelId, data.buffer, config.version);

      console.log(`✅ 模型下载完成: ${config.name}`);

      if (this.onComplete) {
        this.onComplete({ modelId, name: config.name });
      }

      return data.buffer;
    } catch (error) {
      console.error(`❌ 模型下载失败: ${config.name}`, error);

      if (this.onError) {
        this.onError({ modelId, name: config.name, error });
      }

      throw error;
    }
  }

  /**
   * 从缓存获取模型
   * @private
   */
  async _getFromCache(modelId) {
    await this.init();

    return new Promise((resolve) => {
      const transaction = this._db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.get(modelId);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // 版本检查
        const config = MODEL_REGISTRY[modelId];
        if (config && result.version !== config.version) {
          resolve(null);
          return;
        }

        resolve(result.data);
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * 保存到缓存
   * @private
   */
  async _saveToCache(modelId, data, version) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');

      const record = {
        id: modelId,
        data: data,
        version: version,
        timestamp: Date.now(),
      };

      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('缓存保存失败'));
    });
  }

  /**
   * 清除模型缓存
   * @param {string} [modelId] - 如果不提供则清除所有
   */
  async clearCache(modelId) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');

      const request = modelId ? store.delete(modelId) : store.clear();

      request.onsuccess = () => {
        console.log(modelId ? `🗑️ 已清除模型缓存: ${modelId}` : '🗑️ 已清除所有模型缓存');
        resolve();
      };
      request.onerror = () => reject(new Error('清除缓存失败'));
    });
  }

  /**
   * 获取缓存大小
   * @returns {Promise<number>}
   */
  async getCacheSize() {
    await this.init();

    return new Promise((resolve) => {
      const transaction = this._db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.getAll();

      request.onsuccess = () => {
        const total = request.result.reduce((sum, item) => {
          return sum + (item.data?.byteLength || 0);
        }, 0);
        resolve(total);
      };

      request.onerror = () => resolve(0);
    });
  }

  /**
   * 格式化字节数
   * @private
   */
  _formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }
}

export default ModelDownloader;
