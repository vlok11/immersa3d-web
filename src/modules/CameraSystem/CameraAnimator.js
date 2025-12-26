/**
 * @fileoverview 相机动画系统
 * @module modules/CameraSystem/CameraAnimator
 */

import * as THREE from 'three';
import gsap from 'gsap';

/**
 * 预设动画类型
 * @enum {string}
 */
export const AnimationType = {
  ORBIT: 'orbit',           // 环绕
  DOLLY: 'dolly',           // 推拉
  PAN: 'pan',               // 平移
  ZOOM: 'zoom',             // 缩放
  SHAKE: 'shake',           // 晃动
  PARALLAX: 'parallax',     // 视差
  SPIRAL: 'spiral',         // 螺旋
  BOUNCE: 'bounce'          // 弹跳
};

/**
 * 缓动类型
 * @enum {string}
 */
export const EasingType = {
  LINEAR: 'none',
  EASE_IN: 'power2.in',
  EASE_OUT: 'power2.out',
  EASE_IN_OUT: 'power2.inOut',
  ELASTIC: 'elastic.out(1, 0.3)',
  BOUNCE: 'bounce.out',
  BACK: 'back.out(1.7)'
};

/**
 * 相机动画控制器
 * @class
 */
export class CameraAnimator {
  /**
   * @param {THREE.Camera} camera
   * @param {object} controls - OrbitControls 实例
   */
  constructor(camera, controls) {
    /** @type {THREE.Camera} */
    this.camera = camera;
    
    /** @type {object} */
    this.controls = controls;
    
    /** @type {gsap.core.Timeline|null} */
    this.timeline = null;
    
    /** @type {boolean} */
    this.isPlaying = false;
    
    /** @type {number} */
    this.duration = 5;
    
    /** @type {Function[]} */
    this._onUpdateCallbacks = [];
    
    /** @type {Function[]} */
    this._onCompleteCallbacks = [];
    
    /** @private */
    this._initialState = null;
    
    this._saveInitialState();
  }

  /**
   * 保存初始状态
   * @private
   */
  _saveInitialState() {
    this._initialState = {
      position: this.camera.position.clone(),
      rotation: this.camera.rotation.clone(),
      target: this.controls?.target?.clone() || new THREE.Vector3()
    };
  }

  /**
   * 添加更新回调
   * @param {Function} callback
   */
  onUpdate(callback) {
    this._onUpdateCallbacks.push(callback);
  }

  /**
   * 添加完成回调
   * @param {Function} callback
   */
  onComplete(callback) {
    this._onCompleteCallbacks.push(callback);
  }

  /**
   * 播放预设动画
   * @param {string} type - 动画类型
   * @param {object} options - 动画选项
   */
  playPreset(type, options = {}) {
    const {
      duration = this.duration,
      easing = EasingType.EASE_IN_OUT,
      repeat = 0,
      yoyo = false
    } = options;

    // 停止现有动画
    this.stop();

    // 创建新时间线
    this.timeline = gsap.timeline({
      repeat,
      yoyo,
      onUpdate: () => this._triggerUpdate(),
      onComplete: () => this._triggerComplete()
    });

    switch (type) {
      case AnimationType.ORBIT:
        this._createOrbitAnimation(duration, easing, options);
        break;
      case AnimationType.DOLLY:
        this._createDollyAnimation(duration, easing, options);
        break;
      case AnimationType.PAN:
        this._createPanAnimation(duration, easing, options);
        break;
      case AnimationType.ZOOM:
        this._createZoomAnimation(duration, easing, options);
        break;
      case AnimationType.SHAKE:
        this._createShakeAnimation(duration, options);
        break;
      case AnimationType.PARALLAX:
        this._createParallaxAnimation(duration, easing, options);
        break;
      case AnimationType.SPIRAL:
        this._createSpiralAnimation(duration, easing, options);
        break;
      case AnimationType.BOUNCE:
        this._createBounceAnimation(duration, options);
        break;
      default:
        console.warn(`未知动画类型: ${type}`);
        return;
    }

    this.isPlaying = true;
    console.log(`🎬 播放动画: ${type}`);
  }

  /**
   * 创建环绕动画
   * @private
   */
  _createOrbitAnimation(duration, easing, options = {}) {
    const { angle = Math.PI * 2, radius } = options;
    const startPos = this.camera.position.clone();
    const target = this.controls?.target || new THREE.Vector3();
    const r = radius || startPos.distanceTo(target);
    const startAngle = Math.atan2(startPos.z - target.z, startPos.x - target.x);

    const proxy = { angle: 0 };
    
    this.timeline.to(proxy, {
      angle,
      duration,
      ease: easing,
      onUpdate: () => {
        const currentAngle = startAngle + proxy.angle;
        this.camera.position.x = target.x + r * Math.cos(currentAngle);
        this.camera.position.z = target.z + r * Math.sin(currentAngle);
        this.camera.lookAt(target);
        this.controls?.update?.();
      }
    });
  }

  /**
   * 创建推拉动画
   * @private
   */
  _createDollyAnimation(duration, easing, options = {}) {
    const { distance = 2, direction = 'in' } = options;
    const target = this.controls?.target || new THREE.Vector3();
    const dir = this.camera.position.clone().sub(target).normalize();
    
    const endPos = this.camera.position.clone();
    if (direction === 'in') {
      endPos.sub(dir.multiplyScalar(distance));
    } else {
      endPos.add(dir.multiplyScalar(distance));
    }

    this.timeline.to(this.camera.position, {
      x: endPos.x,
      y: endPos.y,
      z: endPos.z,
      duration,
      ease: easing,
      onUpdate: () => this.controls?.update?.()
    });
  }

  /**
   * 创建平移动画
   * @private
   */
  _createPanAnimation(duration, easing, options = {}) {
    const { x = 0, y = 0 } = options;
    const target = this.controls?.target || new THREE.Vector3();
    
    this.timeline.to(this.camera.position, {
      x: this.camera.position.x + x,
      y: this.camera.position.y + y,
      duration,
      ease: easing
    }, 0);

    if (this.controls?.target) {
      this.timeline.to(this.controls.target, {
        x: target.x + x,
        y: target.y + y,
        duration,
        ease: easing,
        onUpdate: () => this.controls?.update?.()
      }, 0);
    }
  }

  /**
   * 创建缩放动画
   * @private
   */
  _createZoomAnimation(duration, easing, options = {}) {
    const { factor = 1.5 } = options;
    
    if (this.camera.isPerspectiveCamera) {
      this.timeline.to(this.camera, {
        fov: this.camera.fov / factor,
        duration,
        ease: easing,
        onUpdate: () => this.camera.updateProjectionMatrix()
      });
    }
  }

  /**
   * 创建晃动动画
   * @private
   */
  _createShakeAnimation(duration, options = {}) {
    const { intensity = 0.1, frequency = 20 } = options;
    const startPos = this.camera.position.clone();
    const iterations = Math.floor(frequency * duration);

    for (let i = 0; i < iterations; i++) {
      const t = (i + 1) / iterations;
      const decay = 1 - t; // 衰减
      
      this.timeline.to(this.camera.position, {
        x: startPos.x + (Math.random() - 0.5) * intensity * decay,
        y: startPos.y + (Math.random() - 0.5) * intensity * decay,
        z: startPos.z + (Math.random() - 0.5) * intensity * decay,
        duration: duration / iterations,
        ease: 'none'
      });
    }

    // 恢复原位
    this.timeline.to(this.camera.position, {
      x: startPos.x,
      y: startPos.y,
      z: startPos.z,
      duration: 0.1,
      ease: 'power2.out'
    });
  }

  /**
   * 创建视差动画
   * @private
   */
  _createParallaxAnimation(duration, easing, options = {}) {
    const { range = 0.5 } = options;
    const startX = this.camera.position.x;

    this.timeline.to(this.camera.position, {
      x: startX - range,
      duration: duration / 2,
      ease: easing
    }).to(this.camera.position, {
      x: startX + range,
      duration: duration,
      ease: easing
    }).to(this.camera.position, {
      x: startX,
      duration: duration / 2,
      ease: easing
    });
  }

  /**
   * 创建螺旋动画
   * @private
   */
  _createSpiralAnimation(duration, easing, options = {}) {
    const { revolutions = 2, heightChange = 1 } = options;
    const target = this.controls?.target || new THREE.Vector3();
    const startPos = this.camera.position.clone();
    const startRadius = Math.sqrt(
      Math.pow(startPos.x - target.x, 2) + Math.pow(startPos.z - target.z, 2)
    );
    const startAngle = Math.atan2(startPos.z - target.z, startPos.x - target.x);
    const startY = startPos.y;

    const proxy = { progress: 0 };

    this.timeline.to(proxy, {
      progress: 1,
      duration,
      ease: easing,
      onUpdate: () => {
        const angle = startAngle + proxy.progress * Math.PI * 2 * revolutions;
        const radius = startRadius * (1 - proxy.progress * 0.3);
        
        this.camera.position.x = target.x + radius * Math.cos(angle);
        this.camera.position.z = target.z + radius * Math.sin(angle);
        this.camera.position.y = startY + proxy.progress * heightChange;
        this.camera.lookAt(target);
        this.controls?.update?.();
      }
    });
  }

  /**
   * 创建弹跳动画
   * @private
   */
  _createBounceAnimation(duration, options = {}) {
    const { height = 1 } = options;
    const startY = this.camera.position.y;

    this.timeline.to(this.camera.position, {
      y: startY + height,
      duration: duration * 0.3,
      ease: 'power2.out'
    }).to(this.camera.position, {
      y: startY,
      duration: duration * 0.7,
      ease: 'bounce.out'
    });
  }

  /**
   * 触发更新回调
   * @private
   */
  _triggerUpdate() {
    for (const cb of this._onUpdateCallbacks) {
      cb(this.getProgress());
    }
  }

  /**
   * 触发完成回调
   * @private
   */
  _triggerComplete() {
    this.isPlaying = false;
    for (const cb of this._onCompleteCallbacks) {
      cb();
    }
  }

  /**
   * 获取当前进度
   * @returns {number} 0-1
   */
  getProgress() {
    return this.timeline ? this.timeline.progress() : 0;
  }

  /**
   * 设置进度
   * @param {number} progress - 0-1
   */
  setProgress(progress) {
    if (this.timeline) {
      this.timeline.progress(progress);
    }
  }

  /**
   * 暂停动画
   */
  pause() {
    if (this.timeline) {
      this.timeline.pause();
      this.isPlaying = false;
      console.log('⏸️ 动画已暂停');
    }
  }

  /**
   * 继续播放
   */
  resume() {
    if (this.timeline) {
      this.timeline.resume();
      this.isPlaying = true;
      console.log('▶️ 动画继续播放');
    }
  }

  /**
   * 停止动画
   */
  stop() {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
      this.isPlaying = false;
    }
  }

  /**
   * 重置到初始状态
   */
  reset() {
    this.stop();
    
    if (this._initialState) {
      this.camera.position.copy(this._initialState.position);
      this.camera.rotation.copy(this._initialState.rotation);
      if (this.controls?.target) {
        this.controls.target.copy(this._initialState.target);
      }
      this.controls?.update?.();
    }
    
    console.log('🔄 相机已重置');
  }

  /**
   * 设置默认动画时长
   * @param {number} duration - 秒
   */
  setDuration(duration) {
    this.duration = duration;
  }

  /**
   * 获取可用动画类型
   * @returns {string[]}
   */
  static getAnimationTypes() {
    return Object.values(AnimationType);
  }

  /**
   * 获取可用缓动类型
   * @returns {string[]}
   */
  static getEasingTypes() {
    return Object.values(EasingType);
  }

  /**
   * 销毁
   */
  dispose() {
    this.stop();
    this._onUpdateCallbacks = [];
    this._onCompleteCallbacks = [];
    console.log('🗑️ CameraAnimator 已销毁');
  }
}

export default CameraAnimator;
