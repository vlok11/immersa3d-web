/**
 * @fileoverview 立体渲染器 - 支持多种立体 3D 模式
 * @module modules/Effects3D/stereo/StereoRenderer
 */

import * as THREE from 'three';

/**
 * 立体模式枚举
 * @enum {string}
 */
export const StereoMode = {
  NONE: 'none',
  ANAGLYPH: 'anaglyph',         // 红青 3D
  SIDE_BY_SIDE: 'sideBySide',   // 左右分屏
  TOP_BOTTOM: 'topBottom',       // 上下分屏
  INTERLACED: 'interlaced',      // 交错
  CROSS_EYED: 'crossEyed'        // 交叉眼
};

/**
 * 立体渲染器
 * @class
 */
export class StereoRenderer {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  constructor(renderer, scene, camera) {
    /** @type {THREE.WebGLRenderer} */
    this.renderer = renderer;
    
    /** @type {THREE.Scene} */
    this.scene = scene;
    
    /** @type {THREE.PerspectiveCamera} */
    this.camera = camera;
    
    /** @type {string} */
    this.mode = StereoMode.NONE;
    
    /** @type {number} 眼间距 */
    this.eyeSeparation = 0.064;
    
    /** @type {number} 聚焦距离 */
    this.focalLength = 3;
    
    /** @private */
    this._leftCamera = null;
    
    /** @private */
    this._rightCamera = null;
    
    /** @private */
    this._anaglyphMaterial = null;
    
    /** @private */
    this._renderTargetLeft = null;
    
    /** @private */
    this._renderTargetRight = null;
    
    /** @private */
    this._quad = null;
    
    /** @private */
    this._orthoCamera = null;
    
    /** @private */
    this._orthoScene = null;
    
    this._init();
  }

  /**
   * 初始化立体渲染
   * @private
   */
  _init() {
    // 创建左右相机
    this._leftCamera = this.camera.clone();
    this._rightCamera = this.camera.clone();
    
    // 创建渲染目标
    const size = this.renderer.getSize(new THREE.Vector2());
    this._createRenderTargets(size.x, size.y);
    
    // 创建红青 3D 材质
    this._createAnaglyphMaterial();
    
    // 创建正交场景用于合成
    this._orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this._orthoCamera.position.z = 1;
    this._orthoScene = new THREE.Scene();
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    this._quad = new THREE.Mesh(geometry, this._anaglyphMaterial);
    this._orthoScene.add(this._quad);
    
    console.log('✅ StereoRenderer 初始化完成');
  }

  /**
   * 创建渲染目标
   * @private
   */
  _createRenderTargets(width, height) {
    const options = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType
    };

    if (this._renderTargetLeft) this._renderTargetLeft.dispose();
    if (this._renderTargetRight) this._renderTargetRight.dispose();

    this._renderTargetLeft = new THREE.WebGLRenderTarget(width, height, options);
    this._renderTargetRight = new THREE.WebGLRenderTarget(width, height, options);
  }

  /**
   * 创建红青立体材质
   * @private
   */
  _createAnaglyphMaterial() {
    this._anaglyphMaterial = new THREE.ShaderMaterial({
      uniforms: {
        leftTexture: { value: null },
        rightTexture: { value: null }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D leftTexture;
        uniform sampler2D rightTexture;
        varying vec2 vUv;
        
        void main() {
          vec4 left = texture2D(leftTexture, vUv);
          vec4 right = texture2D(rightTexture, vUv);
          
          // 红青合成：左眼红通道，右眼青通道
          gl_FragColor = vec4(
            left.r,
            right.g,
            right.b,
            1.0
          );
        }
      `
    });
  }

  /**
   * 设置立体模式
   * @param {string} mode
   */
  setMode(mode) {
    this.mode = mode;
    console.log(`👓 立体模式: ${mode}`);
  }

  /**
   * 设置眼间距
   * @param {number} separation - 眼间距（米）
   */
  setEyeSeparation(separation) {
    this.eyeSeparation = separation;
  }

  /**
   * 设置聚焦距离
   * @param {number} distance
   */
  setFocalLength(distance) {
    this.focalLength = distance;
  }

  /**
   * 更新立体相机位置
   * @private
   */
  _updateStereoCameras() {
    // 复制主相机属性
    this._leftCamera.copy(this.camera);
    this._rightCamera.copy(this.camera);
    
    // 计算眼睛偏移
    const halfSeparation = this.eyeSeparation / 2;
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3();
    
    // 获取相机右方向
    right.crossVectors(
      new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion),
      up
    ).normalize();
    
    // 偏移左右相机
    this._leftCamera.position.add(right.clone().multiplyScalar(-halfSeparation));
    this._rightCamera.position.add(right.clone().multiplyScalar(halfSeparation));
    
    // 调整相机朝向聚焦点（toe-in）
    const target = this.camera.position.clone().add(
      new THREE.Vector3(0, 0, -this.focalLength).applyQuaternion(this.camera.quaternion)
    );
    
    this._leftCamera.lookAt(target);
    this._rightCamera.lookAt(target);
    
    // 更新投影矩阵
    this._leftCamera.updateProjectionMatrix();
    this._rightCamera.updateProjectionMatrix();
  }

  /**
   * 渲染立体图像
   */
  render() {
    if (this.mode === StereoMode.NONE) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this._updateStereoCameras();

    const currentRenderTarget = this.renderer.getRenderTarget();
    const size = this.renderer.getSize(new THREE.Vector2());

    switch (this.mode) {
      case StereoMode.ANAGLYPH:
        this._renderAnaglyph();
        break;
      case StereoMode.SIDE_BY_SIDE:
        this._renderSideBySide(size);
        break;
      case StereoMode.TOP_BOTTOM:
        this._renderTopBottom(size);
        break;
      case StereoMode.CROSS_EYED:
        this._renderCrossEyed(size);
        break;
      default:
        this.renderer.render(this.scene, this.camera);
    }

    this.renderer.setRenderTarget(currentRenderTarget);
  }

  /**
   * 渲染红青 3D
   * @private
   */
  _renderAnaglyph() {
    // 渲染左眼
    this.renderer.setRenderTarget(this._renderTargetLeft);
    this.renderer.clear();
    this.renderer.render(this.scene, this._leftCamera);
    
    // 渲染右眼
    this.renderer.setRenderTarget(this._renderTargetRight);
    this.renderer.clear();
    this.renderer.render(this.scene, this._rightCamera);
    
    // 合成
    this._anaglyphMaterial.uniforms.leftTexture.value = this._renderTargetLeft.texture;
    this._anaglyphMaterial.uniforms.rightTexture.value = this._renderTargetRight.texture;
    
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this._orthoScene, this._orthoCamera);
  }

  /**
   * 渲染左右分屏
   * @private
   */
  _renderSideBySide(size) {
    const halfWidth = Math.floor(size.x / 2);
    
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    
    // 左眼
    this.renderer.setViewport(0, 0, halfWidth, size.y);
    this.renderer.setScissor(0, 0, halfWidth, size.y);
    this.renderer.setScissorTest(true);
    this.renderer.render(this.scene, this._leftCamera);
    
    // 右眼
    this.renderer.setViewport(halfWidth, 0, halfWidth, size.y);
    this.renderer.setScissor(halfWidth, 0, halfWidth, size.y);
    this.renderer.render(this.scene, this._rightCamera);
    
    // 重置
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, size.x, size.y);
  }

  /**
   * 渲染上下分屏
   * @private
   */
  _renderTopBottom(size) {
    const halfHeight = Math.floor(size.y / 2);
    
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    
    // 上（左眼）
    this.renderer.setViewport(0, halfHeight, size.x, halfHeight);
    this.renderer.setScissor(0, halfHeight, size.x, halfHeight);
    this.renderer.setScissorTest(true);
    this.renderer.render(this.scene, this._leftCamera);
    
    // 下（右眼）
    this.renderer.setViewport(0, 0, size.x, halfHeight);
    this.renderer.setScissor(0, 0, size.x, halfHeight);
    this.renderer.render(this.scene, this._rightCamera);
    
    // 重置
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, size.x, size.y);
  }

  /**
   * 渲染交叉眼（左右交换）
   * @private
   */
  _renderCrossEyed(size) {
    const halfWidth = Math.floor(size.x / 2);
    
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    
    // 右眼在左边
    this.renderer.setViewport(0, 0, halfWidth, size.y);
    this.renderer.setScissor(0, 0, halfWidth, size.y);
    this.renderer.setScissorTest(true);
    this.renderer.render(this.scene, this._rightCamera);
    
    // 左眼在右边
    this.renderer.setViewport(halfWidth, 0, halfWidth, size.y);
    this.renderer.setScissor(halfWidth, 0, halfWidth, size.y);
    this.renderer.render(this.scene, this._leftCamera);
    
    // 重置
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, size.x, size.y);
  }

  /**
   * 调整大小
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    this._createRenderTargets(width, height);
  }

  /**
   * 获取可用模式列表
   * @returns {string[]}
   */
  static getAvailableModes() {
    return Object.values(StereoMode);
  }

  /**
   * 销毁
   */
  dispose() {
    if (this._renderTargetLeft) this._renderTargetLeft.dispose();
    if (this._renderTargetRight) this._renderTargetRight.dispose();
    if (this._anaglyphMaterial) this._anaglyphMaterial.dispose();
    if (this._quad) {
      this._quad.geometry.dispose();
    }
    
    console.log('🗑️ StereoRenderer 已销毁');
  }
}

export default StereoRenderer;
