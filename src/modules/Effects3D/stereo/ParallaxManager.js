/**
 * @fileoverview 视差管理器 - 处理立体渲染中的视差效果
 * @module modules/Effects3D/stereo/ParallaxManager
 */

import * as THREE from 'three';

/**
 * 视差管理器
 * @class
 */
export class ParallaxManager {
  /**
   * @param {THREE.Camera} camera
   */
  constructor(camera) {
    /** @type {THREE.Camera} */
    this.camera = camera;

    /** @type {number} */
    this.focalLength = 10; // 聚焦平面距离

    /** @type {number} */
    this.eyeSeparation = 0.064; // 瞳距

    /** @type {number} */
    this.stereoStrength = 1.0;

    /** @type {THREE.Camera} */
    this.cameraL = new THREE.PerspectiveCamera();
    this.cameraL.layers.enable(1);
    this.cameraL.matrixAutoUpdate = false;

    /** @type {THREE.Camera} */
    this.cameraR = new THREE.PerspectiveCamera();
    this.cameraR.layers.enable(2);
    this.cameraR.matrixAutoUpdate = false;

    /** @private */
    this._cache = {
      projectionMatrix: new THREE.Matrix4(),
      viewMatrix: new THREE.Matrix4(),
    };
  }

  /**
   * 更新视差相机
   */
  update() {
    this.camera.updateMatrixWorld();

    const eyeSep = this.eyeSeparation * this.stereoStrength;
    const focalLength = this.focalLength;
    const near = this.camera.near;
    const far = this.camera.far;
    const fov = this.camera.fov;
    const aspect = this.camera.aspect;

    // 更新子相机的参数以匹配主相机
    this.cameraL.fov = fov;
    this.cameraL.near = near;
    this.cameraL.far = far;
    this.cameraL.aspect = aspect;

    this.cameraR.fov = fov;
    this.cameraR.near = near;
    this.cameraR.far = far;
    this.cameraR.aspect = aspect;

    // 1. 设置视图矩阵 (View Matrix)
    // 左眼向左偏移 (-eyeSep/2)
    const eyeLeft = new THREE.Matrix4();
    eyeLeft.elements[12] = -eyeSep / 2;

    // 右眼向右偏移 (+eyeSep/2)
    const eyeRight = new THREE.Matrix4();
    eyeRight.elements[12] = eyeSep / 2;

    this.cameraL.matrixWorld.copy(this.camera.matrixWorld).multiply(eyeLeft);
    this.cameraR.matrixWorld.copy(this.camera.matrixWorld).multiply(eyeRight);

    // 2. 设置投影矩阵 (Projection Matrix) - 离轴投影 (Off-axis Projection)
    // 这对于在屏幕平面上正确汇聚视线至关重要

    const top = near * Math.tan(THREE.MathUtils.degToRad(fov * 0.5));
    const bottom = -top;

    const a = aspect * Math.tan(THREE.MathUtils.degToRad(fov * 0.5));

    const b = a - ((eyeSep / 2) * near) / focalLength;
    const c = a + ((eyeSep / 2) * near) / focalLength;

    // 左眼投影: 右移视锥体
    // left, right, top, bottom, near, far
    this.cameraL.projectionMatrix.makePerspective(-b, c, top, bottom, near, far);

    // 右眼投影: 左移视锥体
    this.cameraR.projectionMatrix.makePerspective(-c, b, top, bottom, near, far);
  }

  /**
   * 设置聚焦平面距离
   * 该距离处的物体将具有零视差（看起来在屏幕平面上）
   * @param {number} distance
   */
  setFocalLength(distance) {
    this.focalLength = Math.max(0.1, distance);
  }

  /**
   * 设置瞳距
   * @param {number} separation
   */
  setEyeSeparation(separation) {
    this.eyeSeparation = separation;
  }

  /**
   * 设置立体强度
   * @param {number} strength
   */
  setStereoStrength(strength) {
    this.stereoStrength = strength;
  }

  /**
   * 自动聚焦到中心物体
   * @param {THREE.Scene} scene
   */
  autoFocus(scene) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      this.setFocalLength(intersects[0].distance);
      console.log(`🎯 自动聚焦: ${intersects[0].distance.toFixed(2)}m`);
    }
  }
}

export default ParallaxManager;
