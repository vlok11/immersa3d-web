/**
 * @fileoverview 球面投影器
 * @module modules/ProjectionSystem/projectors/SphericalProjector
 */

import { BaseProjector } from './BaseProjector.js';

/**
 * 球面投影器
 * 将平面图像映射到球面上，适用于 360° 全景内容
 * @class
 * @extends BaseProjector
 */
export class SphericalProjector extends BaseProjector {
  constructor(options = {}) {
    super(options);
    this.name = 'spherical';

    /** @type {number} 球体半径 */
    this.radius = options.radius || 2;

    /** @type {number} 经度起始角度 */
    this.thetaStart = options.thetaStart || 0;

    /** @type {number} 经度跨度 */
    this.thetaLength = options.thetaLength || Math.PI * 2;

    /** @type {number} 纬度起始角度 */
    this.phiStart = options.phiStart || 0;

    /** @type {number} 纬度跨度 */
    this.phiLength = options.phiLength || Math.PI;
  }

  /**
   * 应用球面投影
   * @param {THREE.Mesh} mesh
   * @param {object} options
   */
  apply(mesh, options = {}) {
    this._saveOriginal(mesh);

    const radius = options.radius ?? this.radius;
    const thetaStart = options.thetaStart ?? this.thetaStart;
    const thetaLength = options.thetaLength ?? this.thetaLength;
    const phiStart = options.phiStart ?? this.phiStart;
    const phiLength = options.phiLength ?? this.phiLength;

    const newGeometry = this._createTransformedGeometry(
      this._originalGeometry,
      (x, y, z, u, v, _bounds) => {
        // 球面坐标变换
        const theta = thetaStart + u * thetaLength;
        const phi = phiStart + v * phiLength;
        const r = radius + z;

        return {
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.cos(phi),
          z: r * Math.sin(phi) * Math.sin(theta),
        };
      }
    );

    mesh.geometry.dispose();
    mesh.geometry = newGeometry;

    console.log('🌐 已应用球面投影');
  }

  /**
   * 设置球体半径
   * @param {number} radius
   */
  setRadius(radius) {
    this.radius = radius;
  }

  /**
   * 设置覆盖范围
   * @param {number} thetaLength - 经度跨度 (0 - 2π)
   * @param {number} phiLength - 纬度跨度 (0 - π)
   */
  setCoverage(thetaLength, phiLength) {
    this.thetaLength = thetaLength;
    this.phiLength = phiLength;
  }
}

export default SphericalProjector;
