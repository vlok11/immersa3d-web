/**
 * @fileoverview 相机路径动画 - 基于关键帧的相机运动
 * @module modules/CameraSystem/CameraPath
 */

import * as THREE from 'three';
import gsap from 'gsap';

/**
 * 关键帧类型
 * @typedef {object} Keyframe
 * @property {number} time - 时间点（秒）
 * @property {THREE.Vector3} position - 相机位置
 * @property {THREE.Vector3} target - 看向目标
 * @property {number} [fov] - 视野角度
 * @property {string} [easing] - 缓动函数
 */

/**
 * 路径预设
 * @enum {string}
 */
export const PathPreset = {
  FLYTHROUGH: 'flythrough', // 穿越
  ORBIT_SLOW: 'orbitSlow', // 慢速环绕
  ZOOM_IN: 'zoomIn', // 推进
  PAN_LEFT: 'panLeft', // 左平移
  CRANE_UP: 'craneUp', // 摇臂上升
  DOLLY_ZOOM: 'dollyZoom', // 希区柯克变焦
};

/**
 * 相机路径动画系统
 * @class
 */
export class CameraPath {
  /**
   * @param {THREE.Camera} camera
   * @param {object} controls - OrbitControls
   */
  constructor(camera, controls) {
    /** @type {THREE.Camera} */
    this.camera = camera;

    /** @type {object} */
    this.controls = controls;

    /** @type {Keyframe[]} */
    this.keyframes = [];

    /** @type {gsap.core.Timeline|null} */
    this.timeline = null;

    /** @type {boolean} */
    this.isPlaying = false;

    /** @type {THREE.CatmullRomCurve3|null} */
    this.pathCurve = null;

    /** @type {THREE.Line|null} */
    this.pathHelper = null;

    /** @type {THREE.Scene|null} */
    this._scene = null;

    /** @private */
    this._onUpdateCallbacks = [];

    /** @private */
    this._onCompleteCallbacks = [];
  }

  /**
   * 设置场景（用于显示路径辅助线）
   * @param {THREE.Scene} scene
   */
  setScene(scene) {
    this._scene = scene;
  }

  /**
   * 添加关键帧
   * @param {Keyframe} keyframe
   */
  addKeyframe(keyframe) {
    this.keyframes.push({
      time: keyframe.time,
      position: keyframe.position.clone(),
      target: keyframe.target.clone(),
      fov: keyframe.fov || this.camera.fov,
      easing: keyframe.easing || 'power2.inOut',
    });

    // 按时间排序
    this.keyframes.sort((a, b) => a.time - b.time);

    // 更新路径曲线
    this._updatePathCurve();
  }

  /**
   * 清除所有关键帧
   */
  clearKeyframes() {
    this.keyframes = [];
    this._updatePathCurve();
  }

  /**
   * 从当前相机状态创建关键帧
   * @param {number} time - 时间点
   */
  captureKeyframe(time) {
    this.addKeyframe({
      time,
      position: this.camera.position.clone(),
      target: this.controls?.target?.clone() || new THREE.Vector3(),
      fov: this.camera.fov,
    });
    console.log(`📍 捕获关键帧 @ ${time}s`);
  }

  /**
   * 应用路径预设
   * @param {string} preset
   * @param {object} options
   */
  applyPreset(preset, options = {}) {
    const { duration = 5, center = new THREE.Vector3(0, 0, 0), radius = 5, height = 2 } = options;

    this.clearKeyframes();

    switch (preset) {
      case PathPreset.FLYTHROUGH:
        this._createFlythroughPath(duration, center, radius, height);
        break;
      case PathPreset.ORBIT_SLOW:
        this._createOrbitPath(duration, center, radius, height);
        break;
      case PathPreset.ZOOM_IN:
        this._createZoomPath(duration, center, 'in');
        break;
      case PathPreset.PAN_LEFT:
        this._createPanPath(duration, center, 'left');
        break;
      case PathPreset.CRANE_UP:
        this._createCranePath(duration, center, height);
        break;
      case PathPreset.DOLLY_ZOOM:
        this._createDollyZoomPath(duration, center);
        break;
    }

    console.log(`🎬 应用路径预设: ${preset}`);
  }

  /**
   * 创建穿越路径
   * @private
   */
  _createFlythroughPath(duration, center, radius, height) {
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI;

      this.addKeyframe({
        time: t * duration,
        position: new THREE.Vector3(
          center.x + radius * Math.cos(angle),
          center.y + height * Math.sin(t * Math.PI),
          center.z + radius * Math.sin(angle) - radius
        ),
        target: center.clone(),
      });
    }
  }

  /**
   * 创建环绕路径
   * @private
   */
  _createOrbitPath(duration, center, radius, height) {
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 2;

      this.addKeyframe({
        time: t * duration,
        position: new THREE.Vector3(
          center.x + radius * Math.cos(angle),
          center.y + height,
          center.z + radius * Math.sin(angle)
        ),
        target: center.clone(),
      });
    }
  }

  /**
   * 创建推拉路径
   * @private
   */
  _createZoomPath(duration, center, direction) {
    const startDist = direction === 'in' ? 10 : 3;
    const endDist = direction === 'in' ? 3 : 10;

    const dir = this.camera.position.clone().sub(center).normalize();

    this.addKeyframe({
      time: 0,
      position: center.clone().add(dir.clone().multiplyScalar(startDist)),
      target: center.clone(),
    });

    this.addKeyframe({
      time: duration,
      position: center.clone().add(dir.clone().multiplyScalar(endDist)),
      target: center.clone(),
    });
  }

  /**
   * 创建平移路径
   * @private
   */
  _createPanPath(duration, center, direction) {
    const offset = direction === 'left' ? -3 : 3;
    const startPos = this.camera.position.clone();

    this.addKeyframe({
      time: 0,
      position: startPos.clone(),
      target: center.clone(),
    });

    this.addKeyframe({
      time: duration,
      position: new THREE.Vector3(startPos.x + offset, startPos.y, startPos.z),
      target: new THREE.Vector3(center.x + offset, center.y, center.z),
    });
  }

  /**
   * 创建摇臂路径
   * @private
   */
  _createCranePath(duration, center, height) {
    const startPos = this.camera.position.clone();

    this.addKeyframe({
      time: 0,
      position: startPos.clone(),
      target: center.clone(),
    });

    this.addKeyframe({
      time: duration,
      position: new THREE.Vector3(startPos.x, startPos.y + height, startPos.z),
      target: center.clone(),
    });
  }

  /**
   * 创建希区柯克变焦路径
   * @private
   */
  _createDollyZoomPath(duration, center) {
    const startPos = this.camera.position.clone();
    const dist = startPos.distanceTo(center);
    const dir = startPos.clone().sub(center).normalize();

    // 开始：远处 + 窄 FOV
    this.addKeyframe({
      time: 0,
      position: center.clone().add(dir.clone().multiplyScalar(dist * 1.5)),
      target: center.clone(),
      fov: 30,
    });

    // 结束：近处 + 宽 FOV
    this.addKeyframe({
      time: duration,
      position: center.clone().add(dir.clone().multiplyScalar(dist * 0.5)),
      target: center.clone(),
      fov: 90,
    });
  }

  /**
   * 更新路径曲线
   * @private
   */
  _updatePathCurve() {
    if (this.keyframes.length < 2) {
      this.pathCurve = null;
      this._removePathHelper();
      return;
    }

    const points = this.keyframes.map((kf) => kf.position);
    this.pathCurve = new THREE.CatmullRomCurve3(points);
  }

  /**
   * 显示路径辅助线
   */
  showPathHelper() {
    if (!this._scene || !this.pathCurve) return;

    this._removePathHelper();

    const points = this.pathCurve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 2,
    });

    this.pathHelper = new THREE.Line(geometry, material);
    this._scene.add(this.pathHelper);
  }

  /**
   * 隐藏路径辅助线
   */
  hidePathHelper() {
    this._removePathHelper();
  }

  /**
   * @private
   */
  _removePathHelper() {
    if (this.pathHelper && this._scene) {
      this._scene.remove(this.pathHelper);
      this.pathHelper.geometry.dispose();
      this.pathHelper.material.dispose();
      this.pathHelper = null;
    }
  }

  /**
   * 播放路径动画
   * @param {object} options
   */
  play(options = {}) {
    const { loop = false, pingPong = false } = options;

    if (this.keyframes.length < 2) {
      console.warn('需要至少 2 个关键帧');
      return;
    }

    this.stop();

    this.timeline = gsap.timeline({
      repeat: loop ? -1 : 0,
      yoyo: pingPong,
      onUpdate: () => this._triggerUpdate(),
      onComplete: () => this._triggerComplete(),
    });

    // 添加关键帧动画
    for (let i = 0; i < this.keyframes.length - 1; i++) {
      const current = this.keyframes[i];
      const next = this.keyframes[i + 1];
      const segmentDuration = next.time - current.time;

      // 位置动画
      this.timeline.to(
        this.camera.position,
        {
          x: next.position.x,
          y: next.position.y,
          z: next.position.z,
          duration: segmentDuration,
          ease: next.easing,
          onUpdate: () => {
            if (this.controls?.target) {
              this.camera.lookAt(this.controls.target);
            }
            this.controls?.update?.();
          },
        },
        current.time
      );

      // 目标点动画
      if (this.controls?.target) {
        this.timeline.to(
          this.controls.target,
          {
            x: next.target.x,
            y: next.target.y,
            z: next.target.z,
            duration: segmentDuration,
            ease: next.easing,
          },
          current.time
        );
      }

      // FOV 动画
      if (next.fov !== current.fov) {
        this.timeline.to(
          this.camera,
          {
            fov: next.fov,
            duration: segmentDuration,
            ease: next.easing,
            onUpdate: () => this.camera.updateProjectionMatrix(),
          },
          current.time
        );
      }
    }

    this.isPlaying = true;
    console.log(`▶️ 播放路径动画 (${this.keyframes.length} 关键帧)`);
  }

  /**
   * 暂停
   */
  pause() {
    if (this.timeline) {
      this.timeline.pause();
      this.isPlaying = false;
    }
  }

  /**
   * 继续
   */
  resume() {
    if (this.timeline) {
      this.timeline.resume();
      this.isPlaying = true;
    }
  }

  /**
   * 停止
   */
  stop() {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    this.isPlaying = false;
  }

  /**
   * 跳转到指定时间
   * @param {number} time - 秒
   */
  seek(time) {
    if (this.timeline) {
      this.timeline.seek(time);
    }
  }

  /**
   * 获取总时长
   * @returns {number}
   */
  getDuration() {
    if (this.keyframes.length === 0) return 0;
    return this.keyframes[this.keyframes.length - 1].time;
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
   * @private
   */
  _triggerUpdate() {
    const progress = this.timeline ? this.timeline.progress() : 0;
    for (const cb of this._onUpdateCallbacks) {
      cb(progress);
    }
  }

  /**
   * @private
   */
  _triggerComplete() {
    this.isPlaying = false;
    for (const cb of this._onCompleteCallbacks) {
      cb();
    }
  }

  /**
   * 导出路径数据
   * @returns {object}
   */
  exportPath() {
    return {
      keyframes: this.keyframes.map((kf) => ({
        time: kf.time,
        position: kf.position.toArray(),
        target: kf.target.toArray(),
        fov: kf.fov,
        easing: kf.easing,
      })),
    };
  }

  /**
   * 导入路径数据
   * @param {object} data
   */
  importPath(data) {
    this.clearKeyframes();

    if (data.keyframes) {
      for (const kf of data.keyframes) {
        this.addKeyframe({
          time: kf.time,
          position: new THREE.Vector3().fromArray(kf.position),
          target: new THREE.Vector3().fromArray(kf.target),
          fov: kf.fov,
          easing: kf.easing,
        });
      }
    }
  }

  /**
   * 获取可用预设
   * @returns {string[]}
   */
  static getPresets() {
    return Object.values(PathPreset);
  }

  /**
   * 销毁
   */
  dispose() {
    this.stop();
    this._removePathHelper();
    this.keyframes = [];
    this._onUpdateCallbacks = [];
    this._onCompleteCallbacks = [];
    console.log('🗑️ CameraPath 已销毁');
  }
}

export default CameraPath;
