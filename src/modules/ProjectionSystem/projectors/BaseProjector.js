/**
 * @fileoverview 投影器基类
 * @module modules/ProjectionSystem/projectors/BaseProjector
 */

import * as THREE from 'three';

/**
 * 投影器基类
 * @abstract
 * @class
 */
export class BaseProjector {
  constructor(options = {}) {
    /** @type {THREE.BufferGeometry|null} */
    this._originalGeometry = null;

    /** @type {object} */
    this.options = options;

    /** @type {string} */
    this.name = 'base';
  }

  /**
   * 应用投影
   * @abstract
   * @param {THREE.Mesh} mesh
   * @param {object} options
   */
  apply(mesh, _options = {}) {
    throw new Error('子类必须实现 apply() 方法');
  }

  /**
   * 保存原始几何体
   * @protected
   */
  _saveOriginal(mesh) {
    if (!this._originalGeometry) {
      this._originalGeometry = mesh.geometry.clone();
    }
  }

  /**
   * 恢复原始几何体
   */
  restore(mesh) {
    if (this._originalGeometry) {
      mesh.geometry.dispose();
      mesh.geometry = this._originalGeometry.clone();
    }
  }

  /**
   * 获取边界框信息
   * @protected
   */
  _getBounds(geometry) {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    return {
      min: bbox.min,
      max: bbox.max,
      width: bbox.max.x - bbox.min.x,
      height: bbox.max.y - bbox.min.y,
      depth: bbox.max.z - bbox.min.z,
      center: new THREE.Vector3(
        (bbox.max.x + bbox.min.x) / 2,
        (bbox.max.y + bbox.min.y) / 2,
        (bbox.max.z + bbox.min.z) / 2
      ),
    };
  }

  /**
   * 创建新几何体并应用变换
   * @protected
   */
  _createTransformedGeometry(originalGeometry, transformFn) {
    const originalPos = originalGeometry.attributes.position;
    const newGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(originalPos.count * 3);
    const uvs = new Float32Array(originalPos.count * 2);

    const bounds = this._getBounds(originalGeometry);

    for (let i = 0; i < originalPos.count; i++) {
      const x = originalPos.getX(i);
      const y = originalPos.getY(i);
      const z = originalPos.getZ(i);

      // 归一化 UV
      const u = (x - bounds.min.x) / bounds.width;
      const v = (y - bounds.min.y) / bounds.height;

      // 应用变换
      const result = transformFn(x, y, z, u, v, bounds);

      positions[i * 3] = result.x;
      positions[i * 3 + 1] = result.y;
      positions[i * 3 + 2] = result.z;

      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }

    newGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    newGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    if (originalGeometry.index) {
      newGeometry.setIndex(originalGeometry.index.clone());
    }

    newGeometry.computeVertexNormals();
    return newGeometry;
  }

  /**
   * 获取投影器名称
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * 销毁
   */
  dispose() {
    if (this._originalGeometry) {
      this._originalGeometry.dispose();
      this._originalGeometry = null;
    }
  }
}

export default BaseProjector;
