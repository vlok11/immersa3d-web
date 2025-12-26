/**
 * @fileoverview Three.js 场景管理器
 * @module core/Renderer/SceneManager
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Three.js 场景管理器
 * @class
 */
export class SceneManager {
  /**
   * @param {HTMLElement} container - 渲染容器
   */
  constructor(container) {
    /** @type {HTMLElement} */
    this.container = container;
    
    /** @type {THREE.Scene} */
    this.scene = new THREE.Scene();
    
    /** @type {THREE.PerspectiveCamera} */
    this.camera = null;
    
    /** @type {THREE.WebGLRenderer} */
    this.renderer = null;
    
    /** @type {OrbitControls} */
    this.controls = null;
    
    /** @type {Array} */
    this._disposables = [];
    
    /** @type {number} */
    this._animationId = null;
    
    /** @type {boolean} */
    this._isRunning = false;
    
    /** @type {Function[]} */
    this._updateCallbacks = [];
    
    /** @private */
    this._clock = new THREE.Clock();
    
    /** @private */
    this._stats = {
      fps: 0,
      frameCount: 0,
      lastTime: performance.now()
    };
    
    this._init();
  }

  /**
   * 初始化场景
   * @private
   */
  _init() {
    this._setupRenderer();
    this._setupCamera();
    this._setupControls();
    this._setupLights();
    this._setupEnvironment();
    this._setupEventListeners();
    
    console.log('✅ SceneManager 初始化完成');
  }

  /**
   * 设置渲染器
   * @private
   */
  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false
    });
    
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 清空容器并添加 canvas
    const placeholder = this.container.querySelector('.viewport__placeholder');
    if (placeholder) placeholder.remove();
    
    this.container.appendChild(this.renderer.domElement);
  }

  /**
   * 设置相机
   * @private
   */
  _setupCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * 设置控制器
   * @private
   */
  _setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI;
  }

  /**
   * 设置灯光
   * @private
   */
  _setupLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    // 主光源
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    this.scene.add(mainLight);
    
    // 填充光
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 0, -5);
    this.scene.add(fillLight);
  }

  /**
   * 设置环境
   * @private
   */
  _setupEnvironment() {
    // 设置背景色
    this.scene.background = new THREE.Color(0x0a0a12);
    
    // 添加网格辅助（可选）
    const gridHelper = new THREE.GridHelper(10, 20, 0x333344, 0x222233);
    gridHelper.position.y = -1;
    this.scene.add(gridHelper);
    this._disposables.push(gridHelper);
  }

  /**
   * 设置事件监听
   * @private
   */
  _setupEventListeners() {
    window.addEventListener('resize', this._onResize.bind(this));
  }

  /**
   * 处理窗口大小变化
   * @private
   */
  _onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  /**
   * 添加更新回调
   * @param {Function} callback - 每帧调用的回调函数
   */
  addUpdateCallback(callback) {
    this._updateCallbacks.push(callback);
  }

  /**
   * 移除更新回调
   * @param {Function} callback
   */
  removeUpdateCallback(callback) {
    const index = this._updateCallbacks.indexOf(callback);
    if (index > -1) {
      this._updateCallbacks.splice(index, 1);
    }
  }

  /**
   * 开始渲染循环
   */
  start() {
    if (this._isRunning) return;
    
    this._isRunning = true;
    this._clock.start();
    this._animate();
    
    console.log('▶️ 渲染循环已启动');
  }

  /**
   * 停止渲染循环
   */
  stop() {
    this._isRunning = false;
    this._clock.stop();
    
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    
    console.log('⏹️ 渲染循环已停止');
  }

  /**
   * 渲染循环
   * @private
   */
  _animate() {
    if (!this._isRunning) return;
    
    this._animationId = requestAnimationFrame(this._animate.bind(this));
    
    const delta = this._clock.getDelta();
    const elapsed = this._clock.getElapsedTime();
    
    // 更新控制器
    this.controls.update();
    
    // 调用更新回调
    for (const callback of this._updateCallbacks) {
      callback(delta, elapsed);
    }
    
    // 渲染场景
    this.renderer.render(this.scene, this.camera);
    
    // 更新 FPS 统计
    this._updateStats();
  }

  /**
   * 更新统计信息
   * @private
   */
  _updateStats() {
    this._stats.frameCount++;
    const now = performance.now();
    
    if (now - this._stats.lastTime >= 1000) {
      this._stats.fps = Math.round(this._stats.frameCount * 1000 / (now - this._stats.lastTime));
      this._stats.frameCount = 0;
      this._stats.lastTime = now;
      
      // 更新状态栏 FPS
      const fpsElement = document.getElementById('status-fps');
      if (fpsElement) {
        fpsElement.textContent = `${this._stats.fps} FPS`;
      }
    }
  }

  /**
   * 添加物体到场景
   * @param {THREE.Object3D} object
   */
  add(object) {
    this.scene.add(object);
  }

  /**
   * 从场景移除物体
   * @param {THREE.Object3D} object
   */
  remove(object) {
    this.scene.remove(object);
  }

  /**
   * 重置相机视图
   */
  resetView() {
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
    this.controls.reset();
  }

  /**
   * 获取当前 FPS
   * @returns {number}
   */
  getFPS() {
    return this._stats.fps;
  }

  /**
   * 获取渲染器信息
   * @returns {object}
   */
  getRendererInfo() {
    return {
      memory: this.renderer.info.memory,
      render: this.renderer.info.render,
      capabilities: {
        isWebGL2: this.renderer.capabilities.isWebGL2,
        maxTextures: this.renderer.capabilities.maxTextures,
        maxTextureSize: this.renderer.capabilities.maxTextureSize
      }
    };
  }

  /**
   * 销毁场景管理器
   */
  dispose() {
    this.stop();
    
    // 移除事件监听
    window.removeEventListener('resize', this._onResize.bind(this));
    
    // 销毁可销毁对象
    for (const item of this._disposables) {
      if (item.geometry) item.geometry.dispose();
      if (item.material) {
        if (Array.isArray(item.material)) {
          item.material.forEach(m => m.dispose());
        } else {
          item.material.dispose();
        }
      }
    }
    
    // 销毁控制器
    this.controls?.dispose();
    
    // 销毁渲染器
    this.renderer?.dispose();
    
    // 清空场景
    this.scene.clear();
    
    console.log('🗑️ SceneManager 已销毁');
  }
}

export default SceneManager;
