/**
 * @fileoverview 鱼眼投影器
 * @module modules/ProjectionSystem/projectors/FisheyeProjector
 */

import { BaseProjector } from './BaseProjector.js';

/**
 * 鱼眼投影器
 * 创建类似广角镜头的鱼眼变形效果
 * @class
 * @extends BaseProjector
 */
export class FisheyeProjector extends BaseProjector {
  constructor(options = {}) {
    super(options);
    this.name = 'fisheye';

    /** @type {number} 变形强度 (0-2, 1=标准鱼眼) */
    this.strength = options.strength || 1.0;

    /** @type {number} 曲率半径 */
    this.radius = options.radius || 2;

    /** @type {boolean} 是否反转效果 */
    this.invert = options.invert || false;
  }

  /**
   * 应用鱼眼投影
   * @param {THREE.Mesh} mesh
   * @param {object} options
   */
  apply(mesh, options = {}) {
    this._saveOriginal(mesh);

    const strength = options.strength ?? this.strength;
    const radius = options.radius ?? this.radius;
    const invert = options.invert ?? this.invert;

    const newGeometry = this._createTransformedGeometry(
      this._originalGeometry,
      (x, y, z, u, v, bounds) => {
        // 相对于中心的距离
        const dx = x - bounds.center.x;
        const dy = y - bounds.center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxRadius = Math.max(bounds.width, bounds.height) / 2;
        const normalizedDist = dist / maxRadius;

        // 鱼眼变形
        const power = invert ? 1 / strength : strength;
        const distortedDist = Math.pow(normalizedDist, power);
        const scale = normalizedDist > 0 ? distortedDist / normalizedDist : 1;

        const newX = bounds.center.x + dx * scale;
        const newY = bounds.center.y + dy * scale;

        // 添加曲率（中心凸起）
        const curveAmount = (1 - distortedDist) * radius * 0.5;
        const newZ = z + curveAmount;

        return { x: newX, y: newY, z: newZ };
      }
    );

    mesh.geometry.dispose();
    mesh.geometry = newGeometry;

    console.log('👁️ 已应用鱼眼投影');
  }

  /**
   * 设置变形强度
   * @param {number} strength - 0-2, 1=标准
   */
  setStrength(strength) {
    this.strength = Math.max(0.1, Math.min(2, strength));
  }

  /**
   * 切换反转模式
   * @param {boolean} invert
   */
  setInvert(invert) {
    this.invert = invert;
  }
}

export default FisheyeProjector;
