/**
 * @fileoverview Immersa 3D App Core
 * @module core/App
 */

import { resourceManager } from './ResourceManager.js';

import { SceneManager } from './Renderer/SceneManager.js';
import { GaussianRenderer } from './Renderer/GaussianRenderer.js';
import { ImageProcessor } from '../modules/InputSystem/ImageProcessor.js';
import { MeshGenerator } from '../modules/GeometrySystem/MeshGenerator.js';
import { ProjectionManager } from '../modules/ProjectionSystem/ProjectionManager.js';
import { RenderingPipeline } from './Renderer/RenderingPipeline.js';
import { CameraAnimator, AnimationType } from '../modules/CameraSystem/CameraAnimator.js';
import { MediaExporter } from './Utils/MediaExporter.js';
import { StereoRenderer } from '../modules/Effects3D/stereo/StereoRenderer.js';
import { ParticleSystem } from '../modules/AtmosphereSystem/ParticleSystem.js';
import { SkyController } from '../modules/AtmosphereSystem/SkyController.js';
import { LightingManager } from '../modules/AtmosphereSystem/LightingManager.js';
import { QualityManager, QualityProfile } from './Renderer/QualityManager.js';
import { DepthAnythingEstimator } from './AIEngine/DepthAnythingEstimator.js';
import { CameraPath } from '../modules/CameraSystem/CameraPath.js';
import { inputManager } from '../modules/InputSystem/InputManager.js';
import Logger from '../utils/Logger.js';
import moduleManager from './ModuleManager.js';

/**
 * 应用程序主类
 * 负责协调所有核心模块，管理应用程序生命周期
 * @class
 */
export class App {
  /**
   * 初始化应用实例
   */
  constructor() {
    /**
     * 初始化状态标志
     * @type {boolean}
     * @private
     */
    this._initialized = false;

    /** @type {Array<object>} */
    this._disposables = [];

    // DOM Elements
    /** @type {HTMLElement|null} */
    this.loadingScreen = document.getElementById('loading-screen');
    /** @type {HTMLElement|null} */
    this.mainApp = document.getElementById('main-app');
    /** @type {HTMLCanvasElement|null} */
    this.viewportCanvas = document.getElementById('viewport-canvas');
    /** @type {HTMLInputElement|null} */
    this.fileInput = document.getElementById('file-input');
    /** @type {HTMLElement|null} */
    this.uploadZone = document.getElementById('upload-zone');

    // Managers & Systems
    /** @type {SceneManager|null} */
    this.sceneManager = null;
    /** @type {ImageProcessor|null} */
    this.imageProcessor = null;
    /** @type {MeshGenerator|null} */
    this.meshGenerator = null;
    /** @type {THREE.Object3D|null} */
    this.currentMesh = null;
    /** @type {number} */
    this.depthScale = 1.0;
    /** @type {ProjectionManager|null} */
    this.projectionManager = null;
    /** @type {RenderingPipeline|null} */
    this.renderingPipeline = null;
    /** @type {CameraAnimator|null} */
    this.cameraAnimator = null;
    /** @type {MediaExporter|null} */
    this.mediaExporter = null;
    /** @type {StereoRenderer|null} */
    this.stereoRenderer = null;
    /** @type {ParticleSystem|null} */
    this.particleSystem = null;
    /** @type {SkyController|null} */
    this.skyController = null;
    /** @type {LightingManager|null} */
    this.lightingManager = null;
    /** @type {CameraPath|null} */
    this.cameraPath = null;
    /** @type {DepthAnythingEstimator|null} */
    this.depthEstimator = null;
    /** @type {GaussianRenderer|null} */
    this.gaussianRenderer = null;
    /** @type {QualityManager|null} */
    this.qualityManager = null;

    this.useAIDepth = true;
    this._aiDepthReady = false;
    this.currentTimelineTime = 0;

    // Register instance
    moduleManager.register('app', this);
  }

  async init() {
    try {
      this._updateLoadingText('检测浏览器能力...');
      await this._detectCapabilities();

      this._updateLoadingText('加载核心模块...');
      await this._loadCoreModules();

      this._updateLoadingText('初始化 3D 渲染器...');
      await this._initRenderer();

      this._updateLoadingText('初始化界面...');
      this._setupEventListeners();
      this._setupShortcuts();
      this._setupPropertyControls();
      this._setupTimeline();

      this._hideLoading();
      this._initialized = true;

      this._showToast('Immersa 3D 已就绪', 'success');
      Logger.log('✅ Immersa 3D 初始化完成');
    } catch (error) {
      Logger.error('❌ 初始化失败:', error);
      this._updateLoadingText(`初始化失败: ${error.message}`);
      this._showToast('初始化失败，请刷新页面重试', 'error');
    }
  }

  async _detectCapabilities() {
    const capabilities = {
      webgpu: false,
      webgl2: false,
      webgl: false,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      webWorker: typeof Worker !== 'undefined',
    };

    if ('gpu' in navigator) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        capabilities.webgpu = !!adapter;
      } catch {
        capabilities.webgpu = false;
      }
    }

    const canvas = document.createElement('canvas');
    capabilities.webgl2 = !!canvas.getContext('webgl2');
    capabilities.webgl = !!canvas.getContext('webgl');

    const backendStatus = document.getElementById('status-backend');
    if (backendStatus) {
      if (capabilities.webgpu) {
        backendStatus.textContent = 'WebGPU';
        backendStatus.style.color = 'var(--color-success)';
      } else if (capabilities.webgl2) {
        backendStatus.textContent = 'WebGL 2.0';
      } else if (capabilities.webgl) {
        backendStatus.textContent = 'WebGL 1.0';
        backendStatus.style.color = 'var(--color-warning)';
      } else {
        backendStatus.textContent = '不支持';
        backendStatus.style.color = 'var(--color-error)';
      }
    }

    Logger.log('🔍 浏览器能力检测:', capabilities);
    return capabilities;
  }

  async _loadCoreModules() {
    this.imageProcessor = new ImageProcessor();
    this.meshGenerator = new MeshGenerator();
    this._initDepthEstimator();
    Logger.log('📦 核心模块加载完成');
  }

  async _initDepthEstimator() {
    try {
      this._updateStatus('正在加载 AI 深度模型 (97MB)...');
      Logger.log('🔄 开始加载 Depth Anything V2 模型...');

      this.depthEstimator = new DepthAnythingEstimator({ precision: 'full' });
      await this.depthEstimator.init();

      this._aiDepthReady = true;
      this._updateStatus('AI 深度模型就绪');
      this._showToast('AI 深度模型加载完成', 'success');
      Logger.log('✅ Depth Anything V2 模型加载完成');

      const modelStatus = document.getElementById('status-ai-model');
      if (modelStatus) {
        modelStatus.textContent = 'Depth Anything V2';
        modelStatus.style.color = 'var(--color-success)';
      }
    } catch (error) {
      Logger.error('❌ AI 深度模型加载失败:', error);
      this._showToast('AI 模型加载失败，将使用模拟深度', 'warning');
      this._aiDepthReady = false;
    }
  }

  async _initRenderer() {
    if (!this.viewportCanvas) throw new Error('找不到视口容器');

    this.sceneManager = new SceneManager(this.viewportCanvas);
    this.projectionManager = new ProjectionManager(
      this.sceneManager.scene,
      this.sceneManager.camera
    );
    this.renderingPipeline = new RenderingPipeline(
      this.sceneManager.renderer,
      this.sceneManager.scene,
      this.sceneManager.camera
    );

    // 接管渲染
    this.sceneManager.setRenderHandler((delta) => {
      this.renderingPipeline.render(delta);
    });

    this.cameraAnimator = new CameraAnimator(this.sceneManager.camera, this.sceneManager.controls);
    this.mediaExporter = new MediaExporter(this.sceneManager.renderer);
    this.stereoRenderer = new StereoRenderer(
      this.sceneManager.renderer,
      this.sceneManager.scene,
      this.sceneManager.camera
    );
    this.particleSystem = new ParticleSystem(this.sceneManager.scene);
    this.skyController = new SkyController(this.sceneManager.scene, this.sceneManager.renderer);
    this.lightingManager = new LightingManager(this.sceneManager.scene);
    this.cameraPath = new CameraPath(this.sceneManager.camera, this.sceneManager.controls);
    this.cameraPath.setScene(this.sceneManager.scene);

    this.qualityManager = new QualityManager(
      this.sceneManager.renderer,
      this.sceneManager,
      this.renderingPipeline
    );

    this.sceneManager.addUpdateCallback((delta) => {
      if (this.particleSystem) this.particleSystem.update(delta);
    });

    this.sceneManager.start();
    Logger.log('🎮 3D 渲染器初始化完成');
  }

  _setupEventListeners() {
    const nav = document.getElementById('main-nav');
    if (nav) {
      nav.addEventListener('nav-action', (e) => this._handleNavAction(e.detail.action));
    }

    const uploadImageBtn = document.getElementById('upload-image-btn');
    if (uploadImageBtn) {
      uploadImageBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          if (e.target.files.length > 0) this._handleFileUpload(e.target.files[0]);
        };
        input.click();
      };
    }

    const uploadVideoBtn = document.getElementById('upload-video-btn');
    if (uploadVideoBtn) {
      uploadVideoBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*, .mkv, .avi, .mov';
        input.onchange = (e) => {
          if (e.target.files.length > 0) this._handleFileUpload(e.target.files[0]);
        };
        input.click();
      };
    }

    const exportModal = document.getElementById('export-modal');
    if (exportModal) {
      exportModal.addEventListener('confirm', (e) => this._handleExport(e.detail));
    }

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsModal.addEventListener('save', (e) => {
        Logger.log('保存设置:', e.detail);
        this._showToast('设置已保存', 'success');
      });
    }

    // Tools
    document.querySelectorAll('.toolbar__btn[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.toolbar__btn[data-tool]')
          .forEach((b) => b.classList.remove('toolbar__btn--active'));
        btn.classList.add('toolbar__btn--active');
        this._handleToolChange(btn.dataset.tool);
      });
    });

    document.querySelector('[data-action="reset-view"]')?.addEventListener('click', () => {
      this.sceneManager?.resetView();
      this._showToast('视图已重置', 'info');
    });

    const projectPanel = document.getElementById('project-panel');
    if (projectPanel) {
      projectPanel.addEventListener('file-selected', (e) => {
        if (e.detail.file) this._handleFileUpload(e.detail.file);
      });
    }

    const layersPanel = document.getElementById('layers-panel');
    if (layersPanel) {
      layersPanel.addEventListener('layer-selected', (e) => {
        if (e.detail.object) {
          this.currentMesh = e.detail.object;
          Logger.log('选中对象:', this.currentMesh.name);
        }
      });
    }

    document
      .querySelector('[data-action="play"]')
      ?.addEventListener('click', () => this._togglePlayback(true));
    document
      .querySelector('[data-action="pause"]')
      ?.addEventListener('click', () => this._togglePlayback(false));
    document
      .querySelector('[data-action="fullscreen"]')
      ?.addEventListener('click', () => this._toggleFullscreen());
  }

  _setupShortcuts() {
    inputManager.registerAction('Space', () => {
      const btn = document.querySelector('[data-action="play"]');
      if (btn) this._togglePlayback(!this.cameraAnimator?.isPlaying);
    });

    inputManager.registerAction('Ctrl+Z', () => {
      this._showToast('撤销功能暂未实现', 'info');
    });

    inputManager.registerAction('Ctrl+S', (e) => {
      e.preventDefault();
      this._showToast('保存项目...', 'info');
    });

    inputManager.registerAction('F', () => this._toggleFullscreen());

    // P2: Double click to focus
    inputManager.registerAction('DoubleClick', () => {
      const mouse = inputManager.getMousePosition();
      const object = this.sceneManager.getHitObject(mouse);
      if (object) {
        this.sceneManager.focusOnObject(object);
        this._showToast('已聚焦物体', 'info');
      }
    });
  }

  _setupPropertyControls() {
    const panel = document.getElementById('main-properties');
    if (!panel) return;

    // Camera
    panel.addGroup('camera', '相机设置');
    panel.addControl('camera', {
      type: 'slider',
      label: '阻尼感',
      value: 0.05,
      min: 0.01,
      max: 0.2,
      step: 0.01,
      onChange: (val) => this.sceneManager.setControlParams({ dampingFactor: val }),
    });
    panel.addControl('camera', {
      type: 'slider',
      label: '旋转速度',
      value: 0.5,
      min: 0.1,
      max: 2.0,
      step: 0.1,
      onChange: (val) => this.sceneManager.setControlParams({ rotateSpeed: val }),
    });
    panel.addControl('camera', {
      type: 'checkbox',
      label: '自动旋转',
      value: false,
      onChange: (val) => this.sceneManager.setControlParams({ autoRotate: val }),
    });
    panel.addControl('camera', {
      type: 'slider',
      label: '自旋速度',
      value: 2.0,
      min: 0.1,
      max: 10.0,
      step: 0.1,
      onChange: (val) => this.sceneManager.setControlParams({ autoRotateSpeed: val }),
    });

    // Projection
    panel.addGroup('projection', '投影设置');
    panel.addControl('projection', {
      type: 'select',
      label: '投影模式',
      value: 'perspective',
      options: [
        { label: '透视', value: 'perspective' },
        { label: '正交', value: 'orthographic' },
        { label: '圆柱', value: 'cylindrical' },
        { label: '球面', value: 'spherical' },
        { label: '鱼眼', value: 'fisheye' },
        { label: '立体', value: 'stereo' },
      ],
      onChange: (val) => this._updateProjectionMode(val),
    });
    panel.addControl('projection', {
      type: 'slider',
      label: '深度强度',
      value: 1.0,
      min: 0,
      max: 5.0,
      step: 0.1,
      onChange: (val) => this._updateDepthScale(val),
    });

    // Stereo
    panel.addGroup('stereo', '立体设置');
    panel.addControl('stereo', {
      type: 'select',
      label: '立体模式',
      value: 'none',
      options: [
        { label: '关闭', value: 'none' },
        { label: '红青3D', value: 'anaglyph' },
        { label: '左右分屏', value: 'sideBySide' },
        { label: '上下分屏', value: 'topBottom' },
        { label: '交叉眼', value: 'crossEyed' },
      ],
      onChange: (val) => this.setStereoMode(val),
    });
    panel.addControl('stereo', {
      type: 'slider',
      label: '眼间距',
      value: 0.064,
      min: 0,
      max: 0.2,
      step: 0.001,
      onChange: (val) => this.stereoRenderer?.setEyeSeparation(val),
    });

    // Atmosphere
    panel.addGroup('atmosphere', '氛围环境');
    panel.addControl('atmosphere', {
      type: 'select',
      label: '天气预设',
      value: 'clear',
      options: SkyController.getWeatherPresets().map((p) => {
        const labels = {
          clear: '晴朗',
          cloudy: '多云',
          overcast: '阴天',
          rain: '雨天',
          storm: '暴风雨',
          fog: '雾天',
          sunset: '日落',
          night: '夜晚',
        };
        return { label: labels[p] || p, value: p };
      }),
      onChange: (val) => this.skyController?.setWeather(val),
    });
    panel.addControl('atmosphere', {
      type: 'slider',
      label: '时间',
      value: 12,
      min: 0,
      max: 24,
      step: 0.1,
      onChange: (val) => this.skyController?.setTimeOfDay(val),
    });
    panel.addControl('atmosphere', {
      type: 'select',
      label: '光照预设',
      value: 'studio',
      options: LightingManager.getLightingPresets().map((p) => {
        const labels = {
          studio: '摄影棚',
          outdoor: '户外自然',
          dramatic: '戏剧性',
          soft: '柔和',
          neon: '霓虹夜景',
          cinematic: '电影感',
        };
        return { label: labels[p] || p, value: p };
      }),
      onChange: (val) => this.lightingManager?.applyPreset(val),
    });

    // Particles
    panel.addGroup('particles', '粒子效果');
    panel.addControl('particles', {
      type: 'select',
      label: '效果',
      value: 'none',
      options: [
        { label: '无', value: 'none' },
        ...ParticleSystem.getAvailablePresets().map((p) => {
          const labels = {
            snow: '飘雪',
            rain: '下雨',
            fireflies: '萤火虫',
            stars: '星空',
            sparkle: '闪光',
            fog: '迷雾',
            bubbles: '气泡',
          };
          return { label: labels[p] || p, value: p };
        }),
      ],
      onChange: (val) => this.setAtmosphere(val),
    });
    panel.addControl('particles', {
      type: 'color',
      label: '颜色',
      value: '#ffffff',
      onChange: (val) => this.setAtmosphereColor(val),
    });

    // Quality
    panel.addGroup('quality', '画质设置');
    panel.addControl('quality', {
      type: 'select',
      label: '预设',
      value: 'high',
      options: [
        { label: '低 (性能优先)', value: QualityProfile.LOW },
        { label: '中 (平衡)', value: QualityProfile.MEDIUM },
        { label: '高 (默认)', value: QualityProfile.HIGH },
        { label: '超高 (画质优先)', value: QualityProfile.ULTRA },
      ],
      onChange: (val) => this.qualityManager?.setProfile(val),
    });
    panel.addControl('quality', {
      type: 'checkbox',
      label: '自动调节',
      value: true,
      onChange: (val) => this.qualityManager?.setAutoMode(val),
    });

    // Postprocess
    panel.addGroup('postprocess', '后期处理');
    panel.addControl('postprocess', {
      type: 'checkbox',
      label: 'SMAA 抗锯齿',
      value: true,
      onChange: (val) => this._toggleEffect('smaa', val),
    });
    panel.addControl('postprocess', {
      type: 'checkbox',
      label: '启用辉光',
      value: false,
      onChange: (val) => this._toggleEffect('bloom', val),
    });
    panel.addControl('postprocess', {
      type: 'slider',
      label: '辉光强度',
      value: 0.3,
      min: 0,
      max: 2.0,
      step: 0.1,
      onChange: (val) => this.renderingPipeline?.setBloomStrength(val),
    });
    panel.addControl('postprocess', {
      type: 'slider',
      label: '辉光半径',
      value: 0.5,
      min: 0,
      max: 2.0,
      step: 0.1,
      onChange: (val) => this.renderingPipeline?.setBloomRadius(val),
    });
    panel.addControl('postprocess', {
      type: 'slider',
      label: '辉光阈值',
      value: 0.85,
      min: 0,
      max: 1.0,
      step: 0.05,
      onChange: (val) => this.renderingPipeline?.setBloomThreshold(val),
    });
    panel.addControl('postprocess', {
      type: 'checkbox',
      label: '启用暗角',
      value: false,
      onChange: (val) => this._toggleEffect('vignette', val),
    });
    panel.addControl('postprocess', {
      type: 'checkbox',
      label: '色彩校正',
      value: false,
      onChange: (val) => this._toggleEffect('colorgrade', val),
    });
    panel.addControl('postprocess', {
      type: 'checkbox',
      label: '电影颗粒',
      value: false,
      onChange: (val) => this._toggleEffect('filmGrain', val),
    });
    panel.addControl('postprocess', {
      type: 'slider',
      label: '颗粒强度',
      value: 0.15,
      min: 0,
      max: 1.0,
      step: 0.01,
      onChange: (val) => this.renderingPipeline?.setFilmGrainIntensity(val),
    });
  }

  _setupTimeline() {
    const timeline = document.getElementById('timeline-editor');
    if (!timeline) return;

    this.currentTimelineTime = 0;
    timeline.addEventListener('play', () => {
      if (this.cameraPath) {
        this.cameraPath.play();
        this._updateStatus('播放动画...');
      }
    });

    timeline.addEventListener('stop', () => {
      if (this.cameraPath) {
        this.cameraPath.stop();
        this._updateStatus('动画已停止');
      }
    });

    timeline.addEventListener('seek', (e) => {
      this.currentTimelineTime = e.detail.time;
      if (this.cameraPath) this.cameraPath.seek(this.currentTimelineTime);
    });

    timeline.addEventListener('addKeyframe', () => {
      if (this.cameraPath) {
        this.cameraPath.captureKeyframe(this.currentTimelineTime);
        timeline.addKeyframeMarker(this.currentTimelineTime);
        this._showToast(`已添加关键帧 @ ${this.currentTimelineTime.toFixed(2)}s`, 'success');
      }
    });

    if (this.cameraPath) {
      this.cameraPath.onUpdate((progress) => {
        const duration = this.cameraPath.getDuration() || 10;
        const time = progress * duration;
        this.currentTimelineTime = time;
        timeline.setTime(time);
      });
      this.cameraPath.onComplete(() => {
        this._updateStatus('动画播放完成');
      });
    }
  }

  _hideLoading() {
    if (this.loadingScreen) {
      this.loadingScreen.style.opacity = '0';
      this.loadingScreen.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        this.loadingScreen.style.display = 'none';
      }, 300);
    }
    if (this.mainApp) this.mainApp.style.display = 'flex';
  }

  _handleNavAction(action) {
    Logger.log(`📌 导航操作: ${action}`);
    switch (action) {
      case 'new':
        if (confirm('确定要新建项目吗？未保存的更改将丢失。')) {
          this._clearScene();
          this._showToast('已新建项目', 'success');
        }
        break;
      case 'open':
        this.fileInput?.click();
        break;
      case 'save':
        this._showToast('保存项目功能暂未实现', 'info');
        break;
      case 'export':
        document.getElementById('export-modal')?.open();
        break;
      case 'settings':
        document.getElementById('settings-modal')?.open();
        break;
      case 'help':
        document.getElementById('help-modal')?.open();
        break;
    }
  }

  _clearScene() {
    if (this.currentMesh && this.sceneManager) {
      this.sceneManager.remove(this.currentMesh);
      resourceManager.disposeObject(this.currentMesh);
      this.currentMesh = null;
    }
    this._updateStatus('就绪');
    Logger.log('🗑️ 场景已清空 (ResourceManager)');
  }

  _exportImage() {
    if (!this.mediaExporter) {
      this._showToast('导出器未初始化', 'error');
      return;
    }
    if (!this.currentMesh) {
      this._showToast('请先加载图像', 'warning');
      return;
    }
    try {
      this.mediaExporter.downloadImage({
        format: 'image/png',
        quality: 0.95,
        filename: `immersa3d-${Date.now()}`,
      });
      this._showToast('图像已导出', 'success');
    } catch (error) {
      Logger.error('导出失败:', error);
      this._showToast('导出失败', 'error');
    }
  }

  startVideoRecording() {
    if (!this.mediaExporter) {
      this._showToast('导出器未初始化', 'error');
      return;
    }
    this.mediaExporter.startRecording({ fps: 30, maxDuration: 30 });
    this._showToast('开始录制...', 'info');
    this._updateStatus('录制中');
  }

  async stopVideoRecording() {
    if (!this.mediaExporter) return;
    this.mediaExporter.stopRecording();
    this._showToast('正在处理视频...', 'info');
    try {
      await this.mediaExporter.downloadVideo({ filename: `immersa3d-video-${Date.now()}` });
      this._showToast('视频已导出', 'success');
    } catch (error) {
      Logger.error('视频导出失败:', error);
      this._showToast('视频导出失败', 'error');
    }
    this._updateStatus('就绪');
  }

  _handleToolChange(tool) {
    Logger.log(`🔧 切换工具: ${tool}`);
    this._updateStatus(`工具: ${tool}`);
  }

  async _handleFileUpload(file) {
    Logger.log(`📁 上传文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isGaussianSplat = this._isGaussianSplatFile(file);

    if (!isImage && !isVideo && !isGaussianSplat) {
      this._showToast('请上传图片、视频或 3DGS 文件 (.splat, .ply, .spz)', 'error');
      return;
    }

    this._showToast(`正在处理: ${file.name}`, 'info');
    this._updateStatus(`处理中: ${file.name}`);

    try {
      if (isGaussianSplat) {
        await this.loadGaussianSplat(file);
        this._showToast('3DGS 场景加载完成！', 'success');
      } else if (isImage) {
        await this._processImage(file);
        this._showToast('3D 转换完成！', 'success');
      } else {
        await this._processVideo(file);
        this._showToast('视频处理完成！', 'success');
      }

      const layersPanel = document.getElementById('layers-panel');
      if (layersPanel && this.sceneManager) {
        layersPanel.updateLayers(this.sceneManager.scene.children);
      }
      this._updateStatus('就绪');
    } catch (error) {
      Logger.error('文件处理失败:', error);
      this._showToast(`处理失败: ${error.message}`, 'error');
      this._updateStatus('处理失败');
    }
  }

  async _processImage(file) {
    if (!this.imageProcessor || !this.meshGenerator || !this.sceneManager)
      throw new Error('核心模块未初始化');

    this._updateStatus('加载图像...');
    const image = await this.imageProcessor.loadImage(file);
    Logger.log(`🖼️ 图像加载完成: ${image.naturalWidth} × ${image.naturalHeight}`);

    const resStatus = document.getElementById('status-resolution');
    if (resStatus) resStatus.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;

    const maxSize = 1024;
    const resizedCanvas = this.imageProcessor.resizeKeepAspect(image, maxSize);
    Logger.log(`📐 调整尺寸: ${resizedCanvas.width} × ${resizedCanvas.height}`);

    this._updateStatus('生成深度图...');
    let depthData;

    if (this.useAIDepth && this._aiDepthReady && this.depthEstimator) {
      try {
        this._updateStatus('AI 深度估计中 (Depth Anything V2)...');
        Logger.log('🤖 使用 Depth Anything V2 进行深度估计...');
        depthData = await this.depthEstimator.estimate(resizedCanvas);

        const depthSize = this.depthEstimator.getInputSize();
        if (depthSize !== resizedCanvas.width || depthSize !== resizedCanvas.height) {
          depthData = this._resizeDepthMap(
            depthData,
            depthSize,
            depthSize,
            resizedCanvas.width,
            resizedCanvas.height
          );
        }
        Logger.log('✅ AI 深度估计完成 (Depth Anything V2)');
      } catch (error) {
        Logger.warn('⚠️ AI 深度估计失败，降级使用模拟深度:', error);
        depthData = this._generateSimulatedDepthMap(resizedCanvas);
      }
    } else {
      depthData = this._generateSimulatedDepthMap(resizedCanvas);
    }

    this._updateStatus('创建纹理...');
    const colorTexture = await this.imageProcessor.createTexture(resizedCanvas);
    const depthTexture = await this.imageProcessor.createDepthTexture(
      depthData,
      resizedCanvas.width,
      resizedCanvas.height
    );

    if (this.currentMesh) this._clearScene();

    this._updateStatus('生成 3D 网格...');
    const aspectRatio = resizedCanvas.width / resizedCanvas.height;
    this.currentMesh = this.meshGenerator.generateFromDepthMap(depthTexture, colorTexture, {
      resolution: 256,
      depthScale: this.depthScale,
      width: aspectRatio * 2,
      height: 2,
    });

    resourceManager.trackObject(this.currentMesh);

    this.sceneManager.add(this.currentMesh);
    this.sceneManager.camera.position.set(0, 0, 3);
    this.sceneManager.camera.lookAt(0, 0, 0);
    this.sceneManager.controls.update();

    Logger.log('✅ 3D 网格创建完成');
  }

  _generateSimulatedDepthMap(canvas) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const depthData = new Float32Array(width * height);

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      const x = (i % width) / width;
      const y = Math.floor(i / width) / height;
      const centerX = 0.5;
      const centerY = 0.5;
      const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

      const depth = luminance * 0.7 + (1 - distFromCenter) * 0.3;
      depthData[i] = Math.max(0, Math.min(1, depth));
    }
    return depthData;
  }

  _resizeDepthMap(depthData, srcWidth, srcHeight, dstWidth, dstHeight) {
    const result = new Float32Array(dstWidth * dstHeight);
    const xRatio = srcWidth / dstWidth;
    const yRatio = srcHeight / dstHeight;

    for (let y = 0; y < dstHeight; y++) {
      for (let x = 0; x < dstWidth; x++) {
        const srcX = Math.floor(x * xRatio);
        const srcY = Math.floor(y * yRatio);
        const srcIdx = srcY * srcWidth + srcX;
        const dstIdx = y * dstWidth + x;
        result[dstIdx] = depthData[srcIdx] || 0;
      }
    }
    return result;
  }

  async loadGaussianSplat(file) {
    if (!this.gaussianRenderer) {
      if (!this.sceneManager) throw new Error('场景管理器未初始化');
      this.gaussianRenderer = new GaussianRenderer(
        this.sceneManager.renderer,
        this.sceneManager.scene
      );
      await this.gaussianRenderer.init();
      Logger.log('✅ GaussianRenderer 初始化完成');
    }

    this._updateStatus(`加载 3DGS 文件: ${file.name}...`);
    Logger.log(`📦 加载 3DGS 文件: ${file.name}`);

    try {
      const url = URL.createObjectURL(file);
      const splatMesh = await this.gaussianRenderer.loadSplat(url, {
        onProgress: (progress) => this._updateStatus(`加载 3DGS: ${Math.round(progress * 100)}%`),
      });
      URL.revokeObjectURL(url);

      this.sceneManager.camera.position.set(0, 0, 5);
      this.sceneManager.camera.lookAt(0, 0, 0);
      this.sceneManager.controls.update();

      this._showToast('3DGS 文件加载完成！', 'success');
      this._updateStatus('就绪');
      return splatMesh;
    } catch (error) {
      Logger.error('❌ 3DGS 文件加载失败:', error);
      this._showToast(`3DGS 加载失败: ${error.message}`, 'error');
      throw error;
    }
  }

  _isGaussianSplatFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    return ['splat', 'ply', 'spz', 'ksplat'].includes(ext);
  }

  async _processVideo(file) {
    Logger.log('🎬 视频处理:', file.name);
    this._showToast('视频处理功能开发中...', 'info');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  _updateDepthScale(value) {
    this.depthScale = value;
    Logger.log(`🔍 深度强度: ${value}`);
    if (this.currentMesh && this.meshGenerator) {
      this.meshGenerator.updateDepthScale(this.currentMesh, value);
    }
  }

  // eslint-disable-next-line no-unused-vars
  _updateParallaxIntensity(value) {
    // TODO
  }

  _updateProjectionMode(mode) {
    Logger.log(`📐 投影模式: ${mode}`);
    if (!this.projectionManager || !this.currentMesh) {
      this._showToast('请先加载图像', 'warning');
      return;
    }
    this.projectionManager.setProjectionMode(mode, this.currentMesh, { radius: 2, strength: 1.0 });

    if (mode === 'spherical' || mode === 'cylindrical') {
      this.sceneManager.camera.position.set(0, 0, 5);
    } else {
      this.sceneManager.camera.position.set(0, 0, 3);
    }
    this.sceneManager.controls.update();
    this._showToast(`已切换到 ${this._getProjectionName(mode)} 模式`, 'success');
  }

  _getProjectionName(mode) {
    const names = {
      perspective: '透视',
      orthographic: '正交',
      spherical: '球面',
      cylindrical: '柱面',
      fisheye: '鱼眼',
    };
    return names[mode] || mode;
  }

  _toggleEffect(effectId, enabled) {
    Logger.log(`✨ 效果 ${effectId}: ${enabled ? '开启' : '关闭'}`);
    if (!this.renderingPipeline) {
      this._showToast('后处理系统未初始化', 'error');
      return;
    }

    // Convert 'colorgrade' to 'colorCorrection' if needed, mostly matching pipeline keys
    const effectMap = {
      bloom: 'bloom',
      vignette: 'vignette',
      colorgrade: 'colorCorrection',
      smaa: 'smaa',
    };
    const effectName = effectMap[effectId] || effectId;
    this.renderingPipeline.setEffect(effectName, enabled);

    const effectNames = {
      bloom: '辉光',
      vignette: '暗角',
      colorCorrection: '色彩校正',
      smaa: 'SMAA 抗锯齿',
      filmGrain: '电影颗粒',
    };
    this._showToast(
      `${effectNames[effectName] || effectId} 效果${enabled ? '已开启' : '已关闭'}`,
      'success'
    );
  }

  _togglePlayback(playing) {
    const playBtn = document.querySelector('[data-action="play"]');
    const pauseBtn = document.querySelector('[data-action="pause"]');
    if (playBtn) playBtn.style.display = playing ? 'none' : 'flex';
    if (pauseBtn) pauseBtn.style.display = playing ? 'flex' : 'none';

    if (!this.cameraAnimator) {
      this._showToast('相机动画未初始化', 'error');
      return;
    }

    if (playing) {
      if (this.cameraAnimator.isPlaying) {
        this.cameraAnimator.resume();
      } else {
        this.cameraAnimator.playPreset(AnimationType.ORBIT, { duration: 10, repeat: -1 });
        this.cameraAnimator.onComplete(() => this._togglePlayback(false));
      }
      this._showToast('开始播放相机动画', 'info');
    } else {
      this.cameraAnimator.pause();
      this._showToast('动画已暂停', 'info');
    }
  }

  playAnimation(type, options = {}) {
    if (!this.cameraAnimator) {
      this._showToast('相机动画未初始化', 'error');
      return;
    }
    this.cameraAnimator.playPreset(type, options);
    this._togglePlayback(true);
  }

  stopAnimation() {
    if (this.cameraAnimator) {
      this.cameraAnimator.reset();
      this._togglePlayback(false);
    }
  }

  _toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.viewportCanvas?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  _updateStatus(message) {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) statusMessage.textContent = message;
  }

  _showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  setStereoMode(mode) {
    if (!this.stereoRenderer) {
      this._showToast('立体渲染器未初始化', 'error');
      return;
    }
    this.stereoRenderer.setMode(mode);
    const modeNames = {
      none: '关闭',
      anaglyph: '红青3D',
      sideBySide: '左右分屏',
      topBottom: '上下分屏',
      crossEyed: '交叉眼',
    };
    this._showToast(`立体模式: ${modeNames[mode] || mode}`, 'success');
  }

  setEyeSeparation(separation) {
    if (this.stereoRenderer) this.stereoRenderer.setEyeSeparation(separation);
  }

  setAtmosphere(preset, options = {}) {
    if (!this.particleSystem) {
      this._showToast('粒子系统未初始化', 'error');
      return;
    }
    if (preset === 'none' || !preset) {
      this.particleSystem.clear();
      this._showToast('氛围效果已关闭', 'info');
      return;
    }
    this.particleSystem.applyPreset(preset, options);
    const presetNames = {
      dust: '灰尘',
      snow: '雪花',
      rain: '雨滴',
      fireflies: '萤火虫',
      stars: '星空',
      sparkle: '闪烁',
      fog: '雾气',
      bubbles: '气泡',
    };
    this._showToast(`氛围效果: ${presetNames[preset] || preset}`, 'success');
  }

  setAtmosphereColor(color) {
    if (this.particleSystem) this.particleSystem.setColor(color);
  }

  setAtmosphereOpacity(opacity) {
    if (this.particleSystem) this.particleSystem.setOpacity(opacity);
  }

  clearAtmosphere() {
    if (this.particleSystem) {
      this.particleSystem.clear();
      this._showToast('氛围效果已清除', 'info');
    }
  }

  async _handleExport({ format, quality, duration }) {
    if (!this.mediaExporter) return;
    this._showToast(`开始导出 ${format.toUpperCase()}...`, 'info');
    try {
      if (format === 'webm') {
        const recordingDuration = duration || 5;
        this._showToast(`正在录制视频 (${recordingDuration}s)...`, 'info');
        this.mediaExporter.startRecording({ fps: 30, maxDuration: recordingDuration });
        await new Promise((resolve) => setTimeout(resolve, recordingDuration * 1000 + 500));
        this.mediaExporter.stopRecording();
        const blob = await this.mediaExporter.exportVideo({ fps: 30 });
        this.mediaExporter._downloadBlob(blob, `immersa3d-video-${Date.now()}.webm`);
      } else {
        this.mediaExporter.downloadImage({ format, quality });
      }
      this._showToast('导出成功！', 'success');
    } catch (error) {
      Logger.error('导出失败:', error);
      this._showToast('导出失败', 'error');
    }
  }
}

export const app = new App();
