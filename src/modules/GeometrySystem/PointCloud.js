/**
 * @fileoverview 点云处理器
 * @module modules/GeometrySystem/PointCloud
 */

import * as THREE from 'three';

/**
 * 点云渲染模式
 * @enum {string}
 */
export const PointCloudMode = {
  POINTS: 'points',
  SPLATS: 'splats',
  ADAPTIVE: 'adaptive',
};

/**
 * 点云处理器
 * @class
 */
export class PointCloud {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    /** @type {THREE.Scene} */
    this.scene = scene;

    /** @type {THREE.Points|null} */
    this.points = null;

    /** @type {string} */
    this.mode = PointCloudMode.POINTS;

    /** @type {number} */
    this.pointSize = 2.0;

    /** @type {boolean} */
    this.sizeAttenuation = true;

    /** @private */
    this._geometry = null;

    /** @private */
    this._material = null;
  }

  /**
   * 从深度数据创建点云
   * @param {Float32Array} depthData
   * @param {ImageData|null} colorData
   * @param {number} width
   * @param {number} height
   * @param {object} options
   * @returns {THREE.Points}
   */
  createFromDepth(depthData, colorData, width, height, options = {}) {
    const { depthScale = 1.0, threshold = 0, subsample = 1 } = options;

    const positions = [];
    const colors = [];

    for (let y = 0; y < height; y += subsample) {
      for (let x = 0; x < width; x += subsample) {
        const idx = y * width + x;
        const depth = depthData[idx];

        // 跳过低于阈值的点
        if (depth < threshold) continue;

        // 归一化坐标
        const px = (x / width - 0.5) * 2;
        const py = (y / height - 0.5) * -2;
        const pz = depth * depthScale;

        positions.push(px, py, pz);

        // 颜色
        if (colorData) {
          const colorIdx = idx * 4;
          colors.push(
            colorData.data[colorIdx] / 255,
            colorData.data[colorIdx + 1] / 255,
            colorData.data[colorIdx + 2] / 255
          );
        } else {
          colors.push(depth, depth, depth);
        }
      }
    }

    return this._createPoints(positions, colors);
  }

  /**
   * 从位置数组创建点云
   * @param {number[]} positions - [x1, y1, z1, x2, y2, z2, ...]
   * @param {number[]|null} colors - [r1, g1, b1, r2, g2, b2, ...] (0-1)
   * @returns {THREE.Points}
   */
  _createPoints(positions, colors) {
    // 清理现有点云
    this.clear();

    this._geometry = new THREE.BufferGeometry();
    this._geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    if (colors && colors.length > 0) {
      this._geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }

    this._material = new THREE.PointsMaterial({
      size: this.pointSize,
      vertexColors: colors && colors.length > 0,
      sizeAttenuation: this.sizeAttenuation,
      transparent: true,
      opacity: 1.0,
    });

    this.points = new THREE.Points(this._geometry, this._material);
    this.points.name = 'PointCloud';
    this.scene.add(this.points);

    console.log(`✅ 点云创建: ${positions.length / 3} 个点`);
    return this.points;
  }

  /**
   * 使用着色器创建高级点云
   * @param {Float32Array} positions
   * @param {Float32Array} colors
   * @param {Float32Array} sizes
   * @returns {THREE.Points}
   */
  createWithShader(positions, colors, sizes) {
    this.clear();

    this._geometry = new THREE.BufferGeometry();
    this._geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this._geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this._material = new THREE.ShaderMaterial({
      uniforms: {
        baseSize: { value: this.pointSize },
        opacity: { value: 1.0 },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        varying vec3 vColor;
        uniform float baseSize;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * baseSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        uniform float opacity;
        
        void main() {
          // 圆形点
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // 边缘柔化
          float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * opacity);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(this._geometry, this._material);
    this.points.name = 'ShaderPointCloud';
    this.scene.add(this.points);

    console.log(`✅ 着色器点云创建: ${positions.length / 3} 个点`);
    return this.points;
  }

  /**
   * 设置点大小
   * @param {number} size
   */
  setPointSize(size) {
    this.pointSize = size;
    if (this._material) {
      if (this._material.uniforms?.baseSize) {
        this._material.uniforms.baseSize.value = size;
      } else {
        this._material.size = size;
      }
      this._material.needsUpdate = true;
    }
  }

  /**
   * 设置透明度
   * @param {number} opacity - 0-1
   */
  setOpacity(opacity) {
    if (this._material) {
      if (this._material.uniforms?.opacity) {
        this._material.uniforms.opacity.value = opacity;
      } else {
        this._material.opacity = opacity;
      }
    }
  }

  /**
   * 设置可见性
   * @param {boolean} visible
   */
  setVisible(visible) {
    if (this.points) {
      this.points.visible = visible;
    }
  }

  /**
   * 应用变换
   * @param {THREE.Matrix4} matrix
   */
  applyMatrix(matrix) {
    if (this._geometry) {
      this._geometry.applyMatrix4(matrix);
    }
  }

  /**
   * 居中点云
   */
  center() {
    if (this._geometry) {
      this._geometry.computeBoundingBox();
      this._geometry.center();
    }
  }

  /**
   * 获取点数量
   * @returns {number}
   */
  getPointCount() {
    if (this._geometry) {
      return this._geometry.attributes.position.count;
    }
    return 0;
  }

  /**
   * 获取边界框
   * @returns {THREE.Box3|null}
   */
  getBoundingBox() {
    if (this._geometry) {
      this._geometry.computeBoundingBox();
      return this._geometry.boundingBox.clone();
    }
    return null;
  }

  /**
   * 清除点云
   */
  clear() {
    if (this.points) {
      this.scene.remove(this.points);
    }
    if (this._geometry) {
      this._geometry.dispose();
      this._geometry = null;
    }
    if (this._material) {
      this._material.dispose();
      this._material = null;
    }
    this.points = null;
  }

  /**
   * 销毁
   */
  dispose() {
    this.clear();
    console.log('🗑️ PointCloud 已销毁');
  }
}

export default PointCloud;
