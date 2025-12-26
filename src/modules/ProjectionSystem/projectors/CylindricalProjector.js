/**
 * @fileoverview 柱面投影器
 * @module modules/ProjectionSystem/projectors/CylindricalProjector
 */

import { BaseProjector } from './BaseProjector.js';

/**
 * 柱面投影器
 * 将平面图像映射到圆柱面上，适用于全景横幅
 * @class
 * @extends BaseProjector
 */
export class CylindricalProjector extends BaseProjector {
  constructor(options = {}) {
    super(options);
    this.name = 'cylindrical';

    /** @type {number} 圆柱半径 */
    this.radius = options.radius || 2;

    /** @type {number} 圆柱高度 */
    this.height = options.height || 2;

    /** @type {number} 起始角度 */
    this.thetaStart = options.thetaStart || -Math.PI / 2;

    /** @type {number} 角度跨度 */
    this.thetaLength = options.thetaLength || Math.PI;
  }

  /**
   * 应用柱面投影
   * @param {THREE.Mesh} mesh
   * @param {object} options
   */
  apply(mesh, options = {}) {
    this._saveOriginal(mesh);

    const radius = options.radius ?? this.radius;
    const height = options.height ?? this.height;
    const thetaStart = options.thetaStart ?? this.thetaStart;
    const thetaLength = options.thetaLength ?? this.thetaLength;

    const newGeometry = this._createTransformedGeometry(
      this._originalGeometry,
      (x, y, z, u, v, _bounds) => {
        // 柱面坐标变换
        const theta = thetaStart + u * thetaLength;
        const r = radius + z;

        return {
          x: r * Math.cos(theta),
          y: (v - 0.5) * height,
          z: r * Math.sin(theta),
        };
      }
    );

    mesh.geometry.dispose();
    mesh.geometry = newGeometry;

    console.log('🛢️ 已应用柱面投影');
  }

  /**
   * 设置圆柱参数
   * @param {number} radius
   * @param {number} height
   */
  setDimensions(radius, height) {
    this.radius = radius;
    this.height = height;
  }

  /**
   * 设置角度范围
   * @param {number} thetaStart
   * @param {number} thetaLength
   */
  setAngleRange(thetaStart, thetaLength) {
    this.thetaStart = thetaStart;
    this.thetaLength = thetaLength;
  }
}

export default CylindricalProjector;
