/**
 * @fileoverview 投影系统 - 多种 3D 投影模式
 * @module modules/ProjectionSystem/ProjectionManager
 */

import * as THREE from 'three';

/**
 * 投影模式枚举
 * @enum {string}
 */
export const ProjectionMode = {
  PERSPECTIVE: 'perspective',
  ORTHOGRAPHIC: 'orthographic',
  SPHERICAL: 'spherical',
  CYLINDRICAL: 'cylindrical',
  FISHEYE: 'fisheye',
  STEREOGRAPHIC: 'stereographic',
  EQUIRECTANGULAR: 'equirectangular',
  CUBEMAP: 'cubemap'
};

/**
 * 投影管理器
 * @class
 */
export class ProjectionManager {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  constructor(scene, camera) {
    /** @type {THREE.Scene} */
    this.scene = scene;
    
    /** @type {THREE.Camera} */
    this.camera = camera;
    
    /** @type {string} */
    this.currentMode = ProjectionMode.PERSPECTIVE;
    
    /** @private */
    this._projectedMesh = null;
    
    /** @private */
    this._originalGeometry = null;
  }

  /**
   * 设置投影模式
   * @param {string} mode - 投影模式
   * @param {THREE.Mesh} mesh - 要投影的网格
   * @param {object} options - 投影选项
   */
  setProjectionMode(mode, mesh, options = {}) {
    if (!mesh || !mesh.geometry) {
      console.warn('⚠️ 无效的网格');
      return;
    }

    // 保存原始几何体
    if (!this._originalGeometry) {
      this._originalGeometry = mesh.geometry.clone();
    }

    this.currentMode = mode;
    this._projectedMesh = mesh;

    switch (mode) {
      case ProjectionMode.PERSPECTIVE:
        this._applyPerspective(mesh, options);
        break;
      case ProjectionMode.ORTHOGRAPHIC:
        this._applyOrthographic(mesh, options);
        break;
      case ProjectionMode.SPHERICAL:
        this._applySpherical(mesh, options);
        break;
      case ProjectionMode.CYLINDRICAL:
        this._applyCylindrical(mesh, options);
        break;
      case ProjectionMode.FISHEYE:
        this._applyFisheye(mesh, options);
        break;
      default:
        console.log(`📐 投影模式 ${mode} 开发中...`);
        this._applyPerspective(mesh, options);
    }

    console.log(`📐 已切换到 ${mode} 投影模式`);
  }

  /**
   * 应用透视投影（默认平面）
   * @private
   */
  _applyPerspective(mesh, options = {}) {
    // 恢复原始几何体
    if (this._originalGeometry) {
      mesh.geometry.dispose();
      mesh.geometry = this._originalGeometry.clone();
    }
  }

  /**
   * 应用正交投影
   * @private
   */
  _applyOrthographic(mesh, options = {}) {
    // 正交投影主要通过相机实现，几何体保持不变
    this._applyPerspective(mesh, options);
  }

  /**
   * 应用球面投影
   * @private
   */
  _applySpherical(mesh, options = {}) {
    const {
      radius = 2,
      phiStart = 0,
      phiLength = Math.PI,
      thetaStart = 0,
      thetaLength = Math.PI * 2
    } = options;

    if (!this._originalGeometry) return;

    const originalPos = this._originalGeometry.attributes.position;
    const newGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(originalPos.count * 3);
    const uvs = new Float32Array(originalPos.count * 2);

    // 获取原始几何体的边界
    this._originalGeometry.computeBoundingBox();
    const bbox = this._originalGeometry.boundingBox;
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y;

    for (let i = 0; i < originalPos.count; i++) {
      const x = originalPos.getX(i);
      const y = originalPos.getY(i);
      const z = originalPos.getZ(i);

      // 归一化 UV 坐标
      const u = (x - bbox.min.x) / width;
      const v = (y - bbox.min.y) / height;

      // 球面坐标
      const theta = thetaStart + u * thetaLength;
      const phi = phiStart + v * phiLength;

      // 考虑深度
      const r = radius + z;

      // 转换为笛卡尔坐标
      const newX = r * Math.sin(phi) * Math.cos(theta);
      const newY = r * Math.cos(phi);
      const newZ = r * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = newX;
      positions[i * 3 + 1] = newY;
      positions[i * 3 + 2] = newZ;

      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }

    newGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    newGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    
    if (this._originalGeometry.index) {
      newGeometry.setIndex(this._originalGeometry.index.clone());
    }
    
    newGeometry.computeVertexNormals();

    mesh.geometry.dispose();
    mesh.geometry = newGeometry;
  }

  /**
   * 应用柱面投影
   * @private
   */
  _applyCylindrical(mesh, options = {}) {
    const {
      radius = 2,
      height = 2,
      thetaStart = -Math.PI / 2,
      thetaLength = Math.PI
    } = options;

    if (!this._originalGeometry) return;

    const originalPos = this._originalGeometry.attributes.position;
    const newGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(originalPos.count * 3);
    const uvs = new Float32Array(originalPos.count * 2);

    this._originalGeometry.computeBoundingBox();
    const bbox = this._originalGeometry.boundingBox;
    const width = bbox.max.x - bbox.min.x;
    const geoHeight = bbox.max.y - bbox.min.y;

    for (let i = 0; i < originalPos.count; i++) {
      const x = originalPos.getX(i);
      const y = originalPos.getY(i);
      const z = originalPos.getZ(i);

      // 归一化坐标
      const u = (x - bbox.min.x) / width;
      const v = (y - bbox.min.y) / geoHeight;

      // 柱面坐标
      const theta = thetaStart + u * thetaLength;
      const r = radius + z;

      // 转换为笛卡尔坐标
      const newX = r * Math.cos(theta);
      const newY = (v - 0.5) * height;
      const newZ = r * Math.sin(theta);

      positions[i * 3] = newX;
      positions[i * 3 + 1] = newY;
      positions[i * 3 + 2] = newZ;

      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }

    newGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    newGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    
    if (this._originalGeometry.index) {
      newGeometry.setIndex(this._originalGeometry.index.clone());
    }
    
    newGeometry.computeVertexNormals();

    mesh.geometry.dispose();
    mesh.geometry = newGeometry;
  }

  /**
   * 应用鱼眼投影
   * @private
   */
  _applyFisheye(mesh, options = {}) {
    const { strength = 1.0, radius = 2 } = options;

    if (!this._originalGeometry) return;

    const originalPos = this._originalGeometry.attributes.position;
    const newGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(originalPos.count * 3);
    const uvs = new Float32Array(originalPos.count * 2);

    this._originalGeometry.computeBoundingBox();
    const bbox = this._originalGeometry.boundingBox;
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y;
    const centerX = (bbox.max.x + bbox.min.x) / 2;
    const centerY = (bbox.max.y + bbox.min.y) / 2;
    const maxRadius = Math.max(width, height) / 2;

    for (let i = 0; i < originalPos.count; i++) {
      const x = originalPos.getX(i);
      const y = originalPos.getY(i);
      const z = originalPos.getZ(i);

      // 相对于中心的距离
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normalizedDist = dist / maxRadius;

      // 鱼眼变形
      const distortedDist = Math.pow(normalizedDist, strength);
      const scale = normalizedDist > 0 ? distortedDist / normalizedDist : 1;

      const newX = centerX + dx * scale;
      const newY = centerY + dy * scale;
      
      // 添加曲率
      const curveAmount = (1 - distortedDist) * radius * 0.5;
      const newZ = z + curveAmount;

      positions[i * 3] = newX;
      positions[i * 3 + 1] = newY;
      positions[i * 3 + 2] = newZ;

      uvs[i * 2] = (x - bbox.min.x) / width;
      uvs[i * 2 + 1] = (y - bbox.min.y) / height;
    }

    newGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    newGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    
    if (this._originalGeometry.index) {
      newGeometry.setIndex(this._originalGeometry.index.clone());
    }
    
    newGeometry.computeVertexNormals();

    mesh.geometry.dispose();
    mesh.geometry = newGeometry;
  }

  /**
   * 重置到原始几何体
   */
  reset() {
    if (this._projectedMesh && this._originalGeometry) {
      this._projectedMesh.geometry.dispose();
      this._projectedMesh.geometry = this._originalGeometry.clone();
      this.currentMode = ProjectionMode.PERSPECTIVE;
      console.log('🔄 已重置投影');
    }
  }

  /**
   * 获取当前投影模式
   * @returns {string}
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * 获取可用的投影模式列表
   * @returns {string[]}
   */
  static getAvailableModes() {
    return Object.values(ProjectionMode);
  }

  /**
   * 销毁投影管理器
   */
  dispose() {
    if (this._originalGeometry) {
      this._originalGeometry.dispose();
      this._originalGeometry = null;
    }
    this._projectedMesh = null;
    console.log('🗑️ ProjectionManager 已销毁');
  }
}

export default ProjectionManager;
