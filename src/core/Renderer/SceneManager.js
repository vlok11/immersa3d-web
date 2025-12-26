/**
 * @fileoverview Three.js 场景管理器
 * @module core/Renderer/SceneManager
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { renderLoop } from '../RenderLoop.js';
import Logger from '../../utils/Logger.js';

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

    /** @type {Function[]} */
    this._updateCallbacks = [];

    this.raycaster = new THREE.Raycaster();

    this._init();
  }

  /**
   * 获取鼠标位置的物体
   * @param {object} mouse {x, y} normalized device coordinates
   * @returns {THREE.Object3D|null}
   */
  getHitObject(mouse) {
    if (!this.camera || !this.scene) return null;

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    // Filter out helper objects if needed (e.g., GridHelper)
    // For now return first hit
    return intersects.length > 0 ? intersects[0].object : null;
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

    // 绑定渲染循环
    this._renderBound = this._render.bind(this);
    renderLoop.add(this._renderBound);

    Logger.log('✅ SceneManager 初始化完成');
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
      stencil: false,
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
    this.controls.dampingFactor = 0.05; // Default smooth
    this.controls.rotateSpeed = 0.5;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI;
  }

  /**
   * 更新控制器参数
   * @param {object} params - 控制参数
   * @param {number} [params.dampingFactor] - 阻尼系数
   * @param {number} [params.rotateSpeed] - 旋转速度
   * @param {boolean} [params.autoRotate] - 是否自动旋转
   * @param {number} [params.autoRotateSpeed] - 自动旋转速度
   */
  setControlParams(params) {
    if (!this.controls) return;

    if (params.dampingFactor !== undefined) {
      this.controls.dampingFactor = params.dampingFactor;
    }
    if (params.rotateSpeed !== undefined) {
      this.controls.rotateSpeed = params.rotateSpeed;
    }
    if (params.autoRotate !== undefined) {
      this.controls.autoRotate = params.autoRotate;
    }
    if (params.autoRotateSpeed !== undefined) {
      this.controls.autoRotateSpeed = params.autoRotateSpeed;
    }
  }

  /**
   * 聚焦到指定物体
   * @param {THREE.Object3D} object - 目标物体
   * @param {number} [duration=1.0] - 动画时长(秒)
   * @returns {{center: THREE.Vector3, distance: number}|undefined} 目标位置和距离
   */
  focusOnObject(object) {
    if (!object || !this.controls) return;

    // 计算包围盒
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // 简单的聚焦逻辑：将控制器目标移动到物体中心，并拉近/拉远相机
    // 注意：更平滑的动画建议在 CameraAnimator 中实现，这里只做基础的目标点设置
    // 为了平滑过渡，我们只需更新 controls.target，OrbitControls 会处理一部分，
    // 但完全平滑的移动通常需要 TWEEN 或自定义动画。
    // 鉴于 P2 任务是"双击聚焦"，我们可以简单地设置 target 并让 controls 更新

    // 如果需要平滑动画，我们可以暂且直接设置，后续在 CameraAnimator 完善
    this.controls.target.copy(center);

    // 调整相机距离
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5; // 1.5倍余量

    // 这里简单地移动相机，实际生产中应使用 CameraAnimator.flyTo
    // this.camera.position.set(center.x, center.y, center.z + cameraZ);
    // this.controls.update();

    return { center, distance: cameraZ }; // 返回目标数据供外部动画使用
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
    this.scene.add(mainLight);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;

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
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
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
   * 设置自定义渲染处理函数
   * @param {Function} handler (delta, elapsed) => void
   */
  setRenderHandler(handler) {
    this._renderHandler = handler;
  }

  /**
   * 开始渲染循环
   */
  start() {
    renderLoop.start();
  }

  /**
   * 停止渲染循环
   */
  stop() {
    renderLoop.stop();
  }

  /**
   * 每帧渲染逻辑
   * @private
   * @param {number} delta
   * @param {number} elapsed
   */
  _render(delta, elapsed) {
    if (!this.renderer || !this.scene || !this.camera) return;

    // 更新控制器
    this.controls.update();

    // 调用额外更新回调
    for (const callback of this._updateCallbacks) {
      callback(delta, elapsed);
    }

    // 渲染场景
    if (this._renderHandler) {
      this._renderHandler(delta, elapsed);
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // 更新 FPS 显示 (此处仅更新 UI，实际统计在 RenderLoop 中)
    this._updateFpsDisplay();
  }

  /**
   * 更新 FPS UI
   * @private
   */
  _updateFpsDisplay() {
    const fpsElement = document.getElementById('status-fps');
    if (fpsElement) {
      fpsElement.textContent = `${renderLoop.fps} FPS`;
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
    return renderLoop.fps;
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
        maxTextureSize: this.renderer.capabilities.maxTextureSize,
      },
    };
  }

  /**
   * 销毁场景管理器
   */
  dispose() {
    renderLoop.remove(this._renderBound);
    this.stop();

    // 移除事件监听
    window.removeEventListener('resize', this._onResize.bind(this));

    // 销毁可销毁对象
    for (const item of this._disposables) {
      if (item.geometry) item.geometry.dispose();
      if (item.material) {
        if (Array.isArray(item.material)) {
          item.material.forEach((m) => m.dispose());
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

    Logger.log('🗑️ SceneManager 已销毁');
  }
}

export default SceneManager;
