/**
 * @fileoverview Immersa 3D Web 应用入口
 * @module main
 */

import './index.css';
import { SceneManager } from './core/Renderer/SceneManager.js';
import { ImageProcessor } from './modules/InputSystem/ImageProcessor.js';
import { MeshGenerator } from './modules/GeometrySystem/MeshGenerator.js';
import { ProjectionManager } from './modules/ProjectionSystem/ProjectionManager.js';
import { EffectsManager } from './modules/PostProcessing/EffectsManager.js';
import { CameraAnimator, AnimationType } from './modules/CameraSystem/CameraAnimator.js';
import { MediaExporter } from './core/Utils/MediaExporter.js';
import { StereoRenderer } from './modules/Effects3D/stereo/StereoRenderer.js';
import { ParticleSystem } from './modules/AtmosphereSystem/ParticleSystem.js';
import { SkyController } from './modules/AtmosphereSystem/SkyController.js';
import { LightingManager } from './modules/AtmosphereSystem/LightingManager.js';
import { FogController } from './modules/AtmosphereSystem/FogController.js';
// import { ProjectPanel } from './components/Layout/ProjectPanel.js';
// import { LayersPanel } from './components/Layout/LayersPanel.js';
// import { ExportModal } from './components/Modals/ExportModal.js';
// import { SettingsModal } from './components/Modals/SettingsModal.js';
// import { HelpModal } from './components/Modals/HelpModal.js';
import { CameraPath } from './modules/CameraSystem/CameraPath.js';
import { errorHandler, keyboardShortcuts } from './core/Utils/index.js';
import Logger from './utils/Logger.js';
// 新增模块导入
import VideoProcessor from './modules/InputSystem/VideoProcessor.js';
import SuperResolution, { UpscaleMethod } from './modules/EnhancementSystem/SuperResolution.js';
import FrameInterpolation from './modules/EnhancementSystem/FrameInterpolation.js';
import LUTManager from './modules/PostProcessing/LUTManager.js';
import { MaterialEditor } from './modules/GeometrySystem/MaterialEditor.js';
import { TextureManager } from './modules/GeometrySystem/TextureManager.js';
import { ParallaxManager } from './modules/Effects3D/stereo/ParallaxManager.js';
// import * as THREE from 'three';

// 注册全局错误处理
errorHandler.register();

// ========================================
// 应用初始化
// ========================================

/**
 * 应用主类
 */
class App {
  constructor() {
    /** @private */
    this._initialized = false;

    /** @type {HTMLElement} */
    this.loadingScreen = document.getElementById('loading-screen');

    /** @type {HTMLElement} */
    this.mainApp = document.getElementById('main-app');

    /** @type {HTMLElement} */
    this.viewportCanvas = document.getElementById('viewport-canvas');

    /** @type {HTMLInputElement} */
    this.fileInput = document.getElementById('file-input');

    /** @type {HTMLElement} */
    this.uploadZone = document.getElementById('upload-zone');

    /** @type {SceneManager|null} */
    this.sceneManager = null;

    /** @type {ImageProcessor|null} */
    this.imageProcessor = null;

    /** @type {MeshGenerator|null} */
    this.meshGenerator = null;

    /** @type {THREE.Mesh|null} */
    this.currentMesh = null;

    /** @type {number} */
    this.depthScale = 1.0;

    /** @type {ProjectionManager|null} */
    this.projectionManager = null;

    /** @type {EffectsManager|null} */
    this.effectsManager = null;

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

    // 新增模块属性
    /** @type {VideoProcessor|null} */
    this.videoProcessor = null;

    /** @type {SuperResolution|null} */
    this.superResolution = null;

    /** @type {FrameInterpolation|null} */
    this.frameInterpolation = null;

    /** @type {LUTManager|null} */
    this.lutManager = null;

    /** @type {FogController|null} */
    this.fogController = null;

    /** @type {MaterialEditor|null} */
    this.materialEditor = null;

    /** @type {TextureManager|null} */
    this.textureManager = null;

    /** @type {ParallaxManager|null} */
    this.parallaxManager = null;

    /** @private AI 增强设置 */
    this._upscaleMethod = UpscaleMethod.BICUBIC;
    this._enableSuperResolution = false;
  }


  /**
   * 初始化应用
   */
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
      // this._setupDragDrop(); // Moved to ProjectPanel

      // 初始化快捷键
      this._setupShortcuts();
      this._setupPropertyControls();
      this._setupTimeline();

      // 隐藏加载界面，显示主应用
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

  /**
   * 更新加载文本
   * @private
   */
  _updateLoadingText(text) {
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = text;
    }
  }

  /**
   * 检测浏览器能力
   * @private
   */
  async _detectCapabilities() {
    const capabilities = {
      webgpu: false,
      webgl2: false,
      webgl: false,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      webWorker: typeof Worker !== 'undefined',
    };

    // 检测 WebGPU
    if ('gpu' in navigator) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        capabilities.webgpu = !!adapter;
      } catch (e) {
        capabilities.webgpu = false;
      }
    }

    // 检测 WebGL 2.0
    const canvas = document.createElement('canvas');
    capabilities.webgl2 = !!canvas.getContext('webgl2');
    capabilities.webgl = !!canvas.getContext('webgl');

    // 更新状态栏
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

  /**
   * 加载核心模块
   * @private
   */
  async _loadCoreModules() {
    // 初始化图像处理器
    this.imageProcessor = new ImageProcessor();

    // 初始化网格生成器
    this.meshGenerator = new MeshGenerator();

    Logger.log('📦 核心模块加载完成');
  }

  /**
   * 初始化 3D 渲染器
   * @private
   */
  async _initRenderer() {
    if (!this.viewportCanvas) {
      throw new Error('找不到视口容器');
    }

    // 创建场景管理器
    this.sceneManager = new SceneManager(this.viewportCanvas);

    // 创建投影管理器
    this.projectionManager = new ProjectionManager(
      this.sceneManager.scene,
      this.sceneManager.camera
    );

    // 创建后处理效果管理器
    this.effectsManager = new EffectsManager(
      this.sceneManager.renderer,
      this.sceneManager.scene,
      this.sceneManager.camera
    );

    // 替换渲染循环以使用后处理
    this.sceneManager.addUpdateCallback(() => {
      if (this.effectsManager.hasEnabledEffects()) {
        this.effectsManager.render();
      }
    });

    // 创建相机动画控制器
    this.cameraAnimator = new CameraAnimator(this.sceneManager.camera, this.sceneManager.controls);

    // 创建媒体导出器
    this.mediaExporter = new MediaExporter(this.sceneManager.renderer);

    // 创建立体渲染器
    this.stereoRenderer = new StereoRenderer(
      this.sceneManager.renderer,
      this.sceneManager.scene,
      this.sceneManager.camera
    );

    // 创建粒子系统
    this.particleSystem = new ParticleSystem(this.sceneManager.scene);

    // 创建天空控制器
    this.skyController = new SkyController(this.sceneManager.scene, this.sceneManager.renderer);

    // 创建光照管理器
    this.lightingManager = new LightingManager(this.sceneManager.scene);

    // 创建 CameraPath (依赖 CameraAnimator)
    this.cameraPath = new CameraPath(this.sceneManager.camera, this.sceneManager.controls);

    this.cameraPath.setScene(this.sceneManager.scene);

    // === 新增模块初始化 ===

    // 创建视频处理器 (懒加载模式，不在启动时加载 FFmpeg)
    this.videoProcessor = new VideoProcessor();

    // 创建超分辨率处理器
    this.superResolution = new SuperResolution();

    // 创建帧插值处理器
    this.frameInterpolation = new FrameInterpolation();

    // 创建 LUT 管理器
    this.lutManager = new LUTManager();

    // 创建雾效控制器
    this.fogController = new FogController(this.sceneManager.scene);

    // 创建材质编辑器
    this.materialEditor = new MaterialEditor();

    // 创建纹理管理器
    this.textureManager = new TextureManager();

    // 创建视差管理器
    this.parallaxManager = new ParallaxManager(this.sceneManager.camera);

    // === 新增模块初始化结束 ===

    // 添加粒子更新到渲染循环
    this.sceneManager.addUpdateCallback((delta) => {
      if (this.particleSystem) {
        this.particleSystem.update(delta);
      }
    });

    // 启动渲染循环
    this.sceneManager.start();

    Logger.log('🎮 3D 渲染器初始化完成');

  }

  /**
   * 设置事件监听器
   * @private
   */
  _setupEventListeners() {
    // 导航栏事件
    const nav = document.getElementById('main-nav');
    if (nav) {
      nav.addEventListener('nav-action', (e) => {
        this._handleNavAction(e.detail.action);
      });
    }

    // 占位符上传按钮事件
    const uploadImageBtn = document.getElementById('upload-image-btn');
    if (uploadImageBtn) {
      uploadImageBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          if (e.target.files.length > 0) {
            this._handleFileUpload(e.target.files[0]);
          }
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
          if (e.target.files.length > 0) {
            this._handleFileUpload(e.target.files[0]);
          }
        };
        input.click();
      };
    }

    // 导出确认事件
    const exportModal = document.getElementById('export-modal');
    if (exportModal) {
      exportModal.addEventListener('confirm', (e) => {
        this._handleExport(e.detail);
      });
    }

    // 设置保存事件
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
      settingsModal.addEventListener('save', (e) => {
        Logger.log('保存设置:', e.detail);
        this._showToast('设置已保存', 'success');
        // TODO: 应用设置
      });
    }

    // 工具栏按钮
    document.querySelectorAll('.toolbar__btn[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.toolbar__btn[data-tool]')
          .forEach((b) => b.classList.remove('toolbar__btn--active'));
        btn.classList.add('toolbar__btn--active');
        this._handleToolChange(btn.dataset.tool);
      });
    });

    // 重置视图按钮
    document.querySelector('[data-action="reset-view"]')?.addEventListener('click', () => {
      this.sceneManager?.resetView();
      this._showToast('视图已重置', 'info');
    });

    // 项目面板文件选择
    const projectPanel = document.getElementById('project-panel');
    if (projectPanel) {
      projectPanel.addEventListener('file-selected', (e) => {
        if (e.detail.file) {
          this._handleFileUpload(e.detail.file);
        }
      });
    }

    // 图层面板选择
    const layersPanel = document.getElementById('layers-panel');
    if (layersPanel) {
      layersPanel.addEventListener('layer-visibility-change', () => {
        // 场景由于对象可见性改变，需要重新渲染一帧
        // SceneManager 循环默认在跑，所以这里其实不需要额外操作，除非暂停了
      });

      layersPanel.addEventListener('layer-selected', (e) => {
        if (e.detail.object) {
          // TODO: 高亮选中对象，更新属性面板
          this.currentMesh = e.detail.object;
          Logger.log('选中对象:', this.currentMesh.name);
        }
      });
    }

    // 时间轴播放按钮
    document.querySelector('[data-action="play"]')?.addEventListener('click', () => {
      this._togglePlayback(true);
    });

    document.querySelector('[data-action="pause"]')?.addEventListener('click', () => {
      this._togglePlayback(false);
    });

    // 全屏按钮
    document.querySelector('[data-action="fullscreen"]')?.addEventListener('click', () => {
      this._toggleFullscreen();
    });
  }

  /**
   * 设置快捷键
   * @private
   */
  _setupShortcuts() {
    keyboardShortcuts.init();

    // 播放/暂停
    keyboardShortcuts.register(
      'Space',
      (_) => {
        const btn = document.querySelector('[data-action="play"]');
        if (btn) this._togglePlayback(!this.cameraAnimator?.isPlaying);
      },
      '播放/暂停动画'
    );

    // 撤销 (Ctrl+Z)
    keyboardShortcuts.register(
      'Ctrl+Z',
      () => {
        this._showToast('撤销功能暂未实现', 'info');
      },
      '撤销操作'
    );

    // 保存 (Ctrl+S)
    keyboardShortcuts.register(
      'Ctrl+S',
      (e) => {
        e.preventDefault();
        this._showToast('保存项目...', 'info');
      },
      '保存项目'
    );

    // 全屏 (F11 或 F)
    keyboardShortcuts.register(
      'F',
      () => {
        this._toggleFullscreen();
      },
      '切换全屏'
    );
  }

  /**
   * 设置属性控件
   * @private
   */
  _setupPropertyControls() {
    const panel = document.getElementById('main-properties');
    if (!panel) return;

    // 1. 投影设置
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

    // 2. 立体设置
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

    // 3. 氛围环境
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

    // 4. 粒子效果
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

    // 5. 后期处理
    panel.addGroup('postprocess', '后期处理');

    panel.addControl('postprocess', {
      type: 'checkbox',
      label: '启用辉光',
      value: false,
      onChange: (val) => this._toggleEffect('bloom', val),
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

    // 6. 雾效设置
    panel.addGroup('fog', '雾效设置');

    panel.addControl('fog', {
      type: 'select',
      label: '雾效预设',
      value: 'clear',
      options: [
        { label: '无', value: 'clear' },
        { label: '薄雾', value: 'lightMist' },
        { label: '晨雾', value: 'morningFog' },
        { label: '浓雾', value: 'denseFog' },
        { label: '霾', value: 'haze' },
        { label: '水下', value: 'underwater' },
        { label: '神秘', value: 'mystical' },
      ],
      onChange: (val) => this.fogController?.applyPreset(val),
    });

    panel.addControl('fog', {
      type: 'slider',
      label: '雾密度',
      value: 0.02,
      min: 0,
      max: 0.1,
      step: 0.001,
      onChange: (val) => this.fogController?.setDensity(val),
    });

    // 7. LUT 色彩
    panel.addGroup('lut', 'LUT 色彩');

    panel.addControl('lut', {
      type: 'select',
      label: 'LUT 预设',
      value: 'none',
      options: [
        { label: '无', value: 'none' },
        { label: '电影感', value: 'cinematic' },
        { label: '复古', value: 'vintage' },
        { label: '暖色调', value: 'warm' },
        { label: '冷色调', value: 'cool' },
        { label: '棕褐色', value: 'sepia' },
        { label: '黑白', value: 'noir' },
        { label: '鲜艳', value: 'vibrant' },
        { label: '柔和', value: 'muted' },
        { label: '青橙', value: 'tealOrange' },
      ],
      onChange: (val) => this.lutManager?.setCurrentLUT(val),
    });

    panel.addControl('lut', {
      type: 'slider',
      label: 'LUT 强度',
      value: 1.0,
      min: 0,
      max: 1,
      step: 0.05,
      onChange: (val) => this.lutManager?.setIntensity(val),
    });

    // 8. 材质设置
    panel.addGroup('material', '材质设置');

    panel.addControl('material', {
      type: 'select',
      label: '材质类型',
      value: 'standard',
      options: [
        { label: '标准', value: 'standard' },
        { label: '物理', value: 'physical' },
        { label: '基础', value: 'basic' },
        { label: 'Phong', value: 'phong' },
        { label: '卡通', value: 'toon' },
      ],
      onChange: (val) => this._updateMaterialType(val),
    });

    panel.addControl('material', {
      type: 'slider',
      label: '粗糙度',
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
      onChange: (val) => this.materialEditor?.setRoughness(val),
    });

    panel.addControl('material', {
      type: 'slider',
      label: '金属度',
      value: 0,
      min: 0,
      max: 1,
      step: 0.05,
      onChange: (val) => this.materialEditor?.setMetalness(val),
    });

    // 9. AI 增强
    panel.addGroup('enhancement', 'AI 增强');

    panel.addControl('enhancement', {
      type: 'select',
      label: '超分方法',
      value: 'bicubic',
      options: [
        { label: '双三次插值', value: 'bicubic' },
        { label: 'Lanczos', value: 'lanczos' },
        { label: 'AI (SRCNN)', value: 'srcnn' },
      ],
      onChange: (val) => (this._upscaleMethod = val),
    });

    panel.addControl('enhancement', {
      type: 'checkbox',
      label: '启用超分辨率',
      value: false,
      onChange: (val) => (this._enableSuperResolution = val),
    });
  }


  /**
   * 设置时间轴
   * @private
   */
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
      if (this.cameraPath) {
        this.cameraPath.seek(this.currentTimelineTime);
      }
    });

    timeline.addEventListener('addKeyframe', () => {
      if (this.cameraPath) {
        this.cameraPath.captureKeyframe(this.currentTimelineTime);
        timeline.addKeyframeMarker(this.currentTimelineTime);
        this._showToast(`已添加关键帧 @ ${this.currentTimelineTime.toFixed(2)}s`, 'success');
      }
    });

    // 连接 CameraPath 更新到时间轴
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

  /**
   * 隐藏加载界面
   * @private
   */
  _hideLoading() {
    if (this.loadingScreen) {
      this.loadingScreen.style.opacity = '0';
      this.loadingScreen.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        this.loadingScreen.style.display = 'none';
      }, 300);
    }
    if (this.mainApp) {
      this.mainApp.style.display = 'flex';
    }
  }

  /**
   * 处理导航操作
   * @private
   */
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

  /**
   * 清空场景
   * @private
   */
  _clearScene() {
    if (this.currentMesh && this.sceneManager) {
      this.sceneManager.remove(this.currentMesh);

      // 释放资源
      if (this.currentMesh.geometry) this.currentMesh.geometry.dispose();
      if (this.currentMesh.material) {
        if (this.currentMesh.material.map) this.currentMesh.material.map.dispose();
        if (this.currentMesh.material.uniforms?.depthMap?.value) {
          this.currentMesh.material.uniforms.depthMap.value.dispose();
        }
        if (this.currentMesh.material.uniforms?.colorMap?.value) {
          this.currentMesh.material.uniforms.colorMap.value.dispose();
        }
        this.currentMesh.material.dispose();
      }

      this.currentMesh = null;
    }

    // 恢复占位符
    const placeholder = document.createElement('div');
    placeholder.className = 'viewport__placeholder';
    placeholder.innerHTML = '<p>请上传图片或视频开始创作</p>';
    // 注意：不需要添加，因为 canvas 会覆盖

    this._updateStatus('就绪');
    Logger.log('🗑️ 场景已清空');
  }

  /**
   * 导出图像
   * @private
   */
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

  /**
   * 开始录制视频
   */
  startVideoRecording() {
    if (!this.mediaExporter) {
      this._showToast('导出器未初始化', 'error');
      return;
    }

    this.mediaExporter.startRecording({ fps: 30, maxDuration: 30 });
    this._showToast('开始录制...', 'info');
    this._updateStatus('录制中');
  }

  /**
   * 停止录制并导出视频
   */
  async stopVideoRecording() {
    if (!this.mediaExporter) return;

    this.mediaExporter.stopRecording();
    this._showToast('正在处理视频...', 'info');

    try {
      await this.mediaExporter.downloadVideo({
        filename: `immersa3d-video-${Date.now()}`,
      });
      this._showToast('视频已导出', 'success');
    } catch (error) {
      Logger.error('视频导出失败:', error);
      this._showToast('视频导出失败', 'error');
    }

    this._updateStatus('就绪');
  }

  /**
   * 处理工具切换
   * @private
   */
  _handleToolChange(tool) {
    Logger.log(`🔧 切换工具: ${tool}`);
    this._updateStatus(`工具: ${tool}`);
  }

  /**
   * 更新材质类型
   * @private
   * @param {string} type - 材质类型
   */
  _updateMaterialType(type) {
    if (!this.materialEditor || !this.currentMesh) {
      Logger.warn('无法更新材质：未选中物体或材质编辑器未初始化');
      return;
    }

    try {
      const newMaterial = this.materialEditor.createMaterial(type);
      this.materialEditor.setTarget(this.currentMesh);
      this.materialEditor.applyMaterial(newMaterial);
      Logger.log(`🎨 材质类型已更新: ${type}`);
    } catch (error) {
      Logger.error('更新材质失败:', error);
      this._showToast('更新材质失败', 'error');
    }
  }


  /**
   * 处理文件上传
   * @private
   */
  async _handleFileUpload(file) {
    Logger.log(`📁 上传文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      this._showToast('请上传图片或视频文件', 'error');
      return;
    }

    this._showToast(`正在处理: ${file.name}`, 'info');
    this._updateStatus(`处理中: ${file.name}`);

    try {
      if (isImage) {
        await this._processImage(file);
      } else {
        await this._processVideo(file);
      }

      this._showToast('3D 转换完成！', 'success');

      // 更新图层列表
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

  /**
   * 处理图片 - 完整的 3D 转换流程
   * @private
   */
  async _processImage(file) {
    if (!this.imageProcessor || !this.meshGenerator || !this.sceneManager) {
      throw new Error('核心模块未初始化');
    }

    // 1. 加载图像
    this._updateStatus('加载图像...');
    const image = await this.imageProcessor.loadImage(file);
    Logger.log(`🖼️ 图像加载完成: ${image.naturalWidth} × ${image.naturalHeight}`);

    // 更新分辨率状态
    const resStatus = document.getElementById('status-resolution');
    if (resStatus) {
      resStatus.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
    }

    // 2. 调整图像大小（保持性能）
    const maxSize = 1024;
    const resizedCanvas = this.imageProcessor.resizeKeepAspect(image, maxSize);
    Logger.log(`📐 调整尺寸: ${resizedCanvas.width} × ${resizedCanvas.height}`);

    // 3. 生成模拟深度图（真实场景中应使用 AI 模型）
    this._updateStatus('生成深度图...');
    const depthData = this._generateSimulatedDepthMap(resizedCanvas);
    Logger.log('🔍 深度图生成完成');

    // 4. 创建纹理
    this._updateStatus('创建纹理...');
    const colorTexture = await this.imageProcessor.createTexture(resizedCanvas);
    const depthTexture = await this.imageProcessor.createDepthTexture(
      depthData,
      resizedCanvas.width,
      resizedCanvas.height
    );

    // 5. 清除旧的网格
    if (this.currentMesh) {
      this._clearScene();
    }

    // 6. 生成 3D 网格
    this._updateStatus('生成 3D 网格...');
    const aspectRatio = resizedCanvas.width / resizedCanvas.height;
    this.currentMesh = this.meshGenerator.generateFromDepthMap(depthTexture, colorTexture, {
      resolution: 256,
      depthScale: this.depthScale,
      width: aspectRatio * 2,
      height: 2,
    });

    // 7. 添加到场景
    this.sceneManager.add(this.currentMesh);

    // 调整相机位置
    this.sceneManager.camera.position.set(0, 0, 3);
    this.sceneManager.camera.lookAt(0, 0, 0);
    this.sceneManager.controls.update();

    Logger.log('✅ 3D 网格创建完成');
  }

  /**
   * 生成模拟深度图
   * 使用图像亮度作为深度的近似值
   * @private
   */
  _generateSimulatedDepthMap(canvas) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const depthData = new Float32Array(width * height);

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;

      // 使用加权亮度公式
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // 添加一些基于位置的变化来模拟透视
      const x = (i % width) / width;
      const y = Math.floor(i / width) / height;

      // 中心较近，边缘较远
      const centerX = 0.5;
      const centerY = 0.5;
      const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

      // 结合亮度和位置
      const depth = luminance * 0.7 + (1 - distFromCenter) * 0.3;

      depthData[i] = Math.max(0, Math.min(1, depth));
    }

    return depthData;
  }

  /**
   * 处理视频
   * @private
   */
  async _processVideo(file) {
    Logger.log('🎬 视频处理:', file.name);
    this._showToast('视频处理功能开发中...', 'info');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  /**
   * 更新深度缩放
   * @private
   */
  _updateDepthScale(value) {
    this.depthScale = value;
    Logger.log(`🔍 深度强度: ${value}`);

    if (this.currentMesh && this.meshGenerator) {
      this.meshGenerator.updateDepthScale(this.currentMesh, value);
    }
  }

  /**
   * 更新视差强度
   * @private
   */
  _updateParallaxIntensity(value) {
    Logger.log(`🎚️ 视差强度: ${value}`);
    // TODO: 应用视差效果
  }

  /**
   * 更新投影模式
   * @private
   */
  _updateProjectionMode(mode) {
    Logger.log(`📐 投影模式: ${mode}`);

    if (!this.projectionManager || !this.currentMesh) {
      this._showToast('请先加载图像', 'warning');
      return;
    }

    // 应用投影模式
    this.projectionManager.setProjectionMode(mode, this.currentMesh, {
      radius: 2,
      strength: 1.0,
    });

    // 调整相机位置以适应新投影
    if (mode === 'spherical' || mode === 'cylindrical') {
      this.sceneManager.camera.position.set(0, 0, 5);
    } else {
      this.sceneManager.camera.position.set(0, 0, 3);
    }
    this.sceneManager.controls.update();

    this._showToast(`已切换到 ${this._getProjectionName(mode)} 模式`, 'success');
  }

  /**
   * 获取投影模式中文名
   * @private
   */
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

  /**
   * 切换效果
   * @private
   */
  _toggleEffect(effectId, enabled) {
    Logger.log(`✨ 效果 ${effectId}: ${enabled ? '开启' : '关闭'}`);

    if (!this.effectsManager) {
      this._showToast('后处理系统未初始化', 'error');
      return;
    }

    // 映射 HTML 元素 ID 到效果名称
    const effectMap = {
      bloom: 'bloom',
      vignette: 'vignette',
      colorgrade: 'colorCorrection',
    };

    const effectName = effectMap[effectId] || effectId;
    this.effectsManager.setEffectEnabled(effectName, enabled);

    const effectNames = {
      bloom: '辉光',
      vignette: '暗角',
      colorCorrection: '色彩校正',
    };

    this._showToast(
      `${effectNames[effectName] || effectId} 效果${enabled ? '已开启' : '已关闭'}`,
      'success'
    );
  }

  /**
   * 切换播放状态（相机动画）
   * @private
   */
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
        // 播放默认的环绕动画
        this.cameraAnimator.playPreset(AnimationType.ORBIT, {
          duration: 10,
          repeat: -1, // 无限循环
        });

        // 完成后更新按钮状态
        this.cameraAnimator.onComplete(() => {
          this._togglePlayback(false);
        });
      }
      this._showToast('开始播放相机动画', 'info');
    } else {
      this.cameraAnimator.pause();
      this._showToast('动画已暂停', 'info');
    }

    Logger.log(`▶️ 播放状态: ${playing ? '播放' : '暂停'}`);
  }

  /**
   * 播放指定类型的相机动画
   * @param {string} type - 动画类型
   * @param {object} options - 动画选项
   */
  playAnimation(type, options = {}) {
    if (!this.cameraAnimator) {
      this._showToast('相机动画未初始化', 'error');
      return;
    }

    this.cameraAnimator.playPreset(type, options);
    this._togglePlayback(true);
  }

  /**
   * 停止动画并重置相机
   */
  stopAnimation() {
    if (this.cameraAnimator) {
      this.cameraAnimator.reset();
      this._togglePlayback(false);
    }
  }

  /**
   * 切换全屏
   * @private
   */
  _toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.viewportCanvas?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * 更新状态消息
   * @private
   */
  _updateStatus(message) {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = message;
    }
  }

  /**
   * 显示 Toast 消息
   * @private
   */
  _showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // 3秒后移除
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ========================================
  // 立体渲染控制
  // ========================================

  /**
   * 设置立体渲染模式
   * @param {string} mode - 立体模式
   */
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

  /**
   * 设置眼间距
   * @param {number} separation - 眼间距（米）
   */
  setEyeSeparation(separation) {
    if (this.stereoRenderer) {
      this.stereoRenderer.setEyeSeparation(separation);
    }
  }

  // ========================================
  // 氛围粒子控制
  // ========================================

  /**
   * 应用氛围效果预设
   * @param {string} preset - 预设名称
   * @param {object} options - 选项
   */
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

  /**
   * 设置氛围效果颜色
   * @param {number} color - 十六进制颜色
   */
  setAtmosphereColor(color) {
    if (this.particleSystem) {
      this.particleSystem.setColor(color);
    }
  }

  /**
   * 设置氛围效果透明度
   * @param {number} opacity - 0-1
   */
  setAtmosphereOpacity(opacity) {
    if (this.particleSystem) {
      this.particleSystem.setOpacity(opacity);
    }
  }

  /**
   * 清除氛围效果
   */
  clearAtmosphere() {
    if (this.particleSystem) {
      this.particleSystem.clear();
      this._showToast('氛围效果已清除', 'info');
    }
  }

  /**
   * 处理导出
   * @private
   */
  async _handleExport({ format, quality, duration }) {
    if (!this.mediaExporter) return;

    this._showToast(`开始导出 ${format.toUpperCase()}...`, 'info');

    try {
      if (format === 'webm') {
        const recordingDuration = duration || 5; // 默认 5 秒
        this._showToast(`正在录制视频 (${recordingDuration}s)...`, 'info');

        // 开始录制
        this.mediaExporter.startRecording({ fps: 30, maxDuration: recordingDuration });

        // 等待录制完成
        await new Promise((resolve) => setTimeout(resolve, recordingDuration * 1000 + 500));

        // 停止录制
        this.mediaExporter.stopRecording();

        // 导出
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

// ========================================
// 启动应用
// ========================================

const app = new App();

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// 导出供其他模块使用
export { app };
