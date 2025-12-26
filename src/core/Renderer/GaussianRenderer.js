/**
 * @fileoverview 3D 高斯泼溅渲染器
 * @module core/Renderer/GaussianRenderer
 * @description 基于 Spark 的 3DGS 渲染器，支持加载和渲染 .splat/.ply/.spz 文件
 */

import * as THREE from 'three';

/**
 * 高斯泼溅渲染器
 * 使用 Spark 库实现浏览器端 3DGS 渲染
 * @class
 */
export class GaussianRenderer {
  /**
   * @param {THREE.WebGLRenderer} renderer - Three.js 渲染器
   * @param {THREE.Scene} scene - Three.js 场景
   * @param {Object} [options] - 配置选项
   */
  constructor(renderer, scene, options = {}) {
    /** @type {THREE.WebGLRenderer} */
    this.renderer = renderer;

    /** @type {THREE.Scene} */
    this.scene = scene;

    /** @type {Object} */
    this.options = {
      maxSplats: options.maxSplats || 1000000,
      ...options,
    };

    /** @type {Object|null} */
    this._spark = null;

    /** @type {Array} */
    this._splatMeshes = [];

    /** @type {boolean} */
    this._ready = false;

    /** @type {boolean} */
    this._enabled = false;
  }

  /**
   * 初始化渲染器
   * @returns {Promise<void>}
   */
  async init() {
    try {
      console.log('🔄 正在初始化 GaussianRenderer...');

      // 动态导入 Spark
      const spark = await import('@sparkjsdev/spark');
      this._spark = spark;

      this._ready = true;
      console.log('✅ GaussianRenderer 初始化完成');
    } catch (error) {
      console.error('❌ GaussianRenderer 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否就绪
   * @returns {boolean}
   */
  isReady() {
    return this._ready && this._spark !== null;
  }

  /**
   * 检查是否启用
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * 启用/禁用 3DGS 渲染
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled;
    this._splatMeshes.forEach((mesh) => {
      mesh.visible = enabled;
    });
    console.log(`🎮 GaussianRenderer ${enabled ? '已启用' : '已禁用'}`);
  }

  /**
   * 加载 3DGS 文件
   * @param {string} url - 文件 URL (.splat, .ply, .spz, .ksplat)
   * @param {Object} [options] - 加载选项
   * @returns {Promise<Object>} 加载的 SplatMesh
   */
  async loadSplat(url, options = {}) {
    if (!this.isReady()) {
      throw new Error('GaussianRenderer 未初始化');
    }

    console.log(`🔄 正在加载 3DGS 文件: ${url}`);
    const startTime = performance.now();

    try {
      const { SplatLoader, SplatMesh, PackedSplats } = this._spark;

      // 创建加载器
      const loader = new SplatLoader();

      // 加载文件
      const packedSplats = await loader.load(url, {
        onProgress: options.onProgress,
      });

      // 创建 SplatMesh
      const splatMesh = new SplatMesh(packedSplats, {
        maxSplats: this.options.maxSplats,
      });

      // 应用变换
      if (options.position) {
        splatMesh.position.copy(options.position);
      }
      if (options.rotation) {
        splatMesh.rotation.copy(options.rotation);
      }
      if (options.scale) {
        if (typeof options.scale === 'number') {
          splatMesh.scale.setScalar(options.scale);
        } else {
          splatMesh.scale.copy(options.scale);
        }
      }

      // 添加到场景
      this.scene.add(splatMesh);
      this._splatMeshes.push(splatMesh);

      const elapsed = performance.now() - startTime;
      console.log(`✅ 3DGS 文件加载完成 (${elapsed.toFixed(2)}ms)`);

      return splatMesh;
    } catch (error) {
      console.error('❌ 3DGS 文件加载失败:', error);
      throw error;
    }
  }

  /**
   * 从 ArrayBuffer 加载 3DGS 数据
   * @param {ArrayBuffer} buffer - 文件数据
   * @param {string} fileType - 文件类型: 'splat' | 'ply' | 'spz' | 'ksplat'
   * @param {Object} [options] - 加载选项
   * @returns {Promise<Object>} 加载的 SplatMesh
   */
  async loadFromBuffer(buffer, fileType, options = {}) {
    if (!this.isReady()) {
      throw new Error('GaussianRenderer 未初始化');
    }

    console.log(`🔄 正在从 Buffer 加载 3DGS (${fileType})...`);

    try {
      const { unpackSplats, SplatMesh, PackedSplats } = this._spark;

      // 解包数据
      const packedSplats = await unpackSplats(new Uint8Array(buffer), fileType);

      // 创建 SplatMesh
      const splatMesh = new SplatMesh(packedSplats, {
        maxSplats: this.options.maxSplats,
      });

      // 添加到场景
      this.scene.add(splatMesh);
      this._splatMeshes.push(splatMesh);

      console.log('✅ 3DGS Buffer 加载完成');
      return splatMesh;
    } catch (error) {
      console.error('❌ 3DGS Buffer 加载失败:', error);
      throw error;
    }
  }

  /**
   * 移除 SplatMesh
   * @param {Object} splatMesh - 要移除的 SplatMesh
   */
  removeSplat(splatMesh) {
    const index = this._splatMeshes.indexOf(splatMesh);
    if (index > -1) {
      this.scene.remove(splatMesh);
      this._splatMeshes.splice(index, 1);
      console.log('🗑️ SplatMesh 已移除');
    }
  }

  /**
   * 清除所有 SplatMesh
   */
  clearAll() {
    this._splatMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
    });
    this._splatMeshes = [];
    console.log('🗑️ 所有 SplatMesh 已清除');
  }

  /**
   * 获取所有 SplatMesh
   * @returns {Array}
   */
  getSplatMeshes() {
    return [...this._splatMeshes];
  }

  /**
   * 获取 Splat 数量
   * @returns {number}
   */
  getSplatCount() {
    return this._splatMeshes.length;
  }

  /**
   * 渲染 (如果使用 SparkRenderer)
   * 注意: 如果使用 Three.js 标准渲染器，不需要调用此方法
   * @param {THREE.Camera} camera
   */
  render(camera) {
    // Spark 的 SplatMesh 已经集成到 Three.js 渲染管线
    // 通常不需要额外的渲染调用
  }

  /**
   * 销毁渲染器
   */
  dispose() {
    this.clearAll();
    this._spark = null;
    this._ready = false;
    console.log('🗑️ GaussianRenderer 已销毁');
  }
}

export default GaussianRenderer;
