/**
 * @fileoverview 网格生成器
 * @module modules/GeometrySystem/MeshGenerator
 */

import * as THREE from 'three';

/**
 * 深度图转 3D 网格生成器
 * @class
 */
export class MeshGenerator {
  constructor() {
    /** @private */
    this._disposables = [];
  }

  /**
   * 从深度图生成 3D 网格
   * @param {THREE.Texture} depthTexture - 深度纹理
   * @param {THREE.Texture} colorTexture - 颜色纹理
   * @param {object} options - 生成选项
   * @returns {THREE.Mesh}
   */
  generateFromDepthMap(depthTexture, colorTexture, options = {}) {
    const {
      resolution = 256, // 网格分辨率
      depthScale = 1.0, // 深度缩放
      width = 1, // 网格宽度
      height = 1, // 网格高度
      displacementBias = 0, // 位移偏移
    } = options;

    // 创建平面几何体
    const geometry = new THREE.PlaneGeometry(width, height, resolution, resolution);

    // 创建着色器材质
    const material = new THREE.ShaderMaterial({
      uniforms: {
        depthMap: { value: depthTexture },
        colorMap: { value: colorTexture },
        depthScale: { value: depthScale },
        displacementBias: { value: displacementBias },
      },
      vertexShader: this._getVertexShader(),
      fragmentShader: this._getFragmentShader(),
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'DepthMesh';

    this._disposables.push(geometry, material);

    console.log(`✅ 网格生成完成 (分辨率: ${resolution}x${resolution})`);
    return mesh;
  }

  /**
   * 获取顶点着色器
   * @private
   */
  _getVertexShader() {
    return /* glsl */ `
      uniform sampler2D depthMap;
      uniform float depthScale;
      uniform float displacementBias;
      
      varying vec2 vUv;
      varying float vDepth;
      
      void main() {
        vUv = uv;
        
        // 采样深度图
        float depth = texture2D(depthMap, uv).r;
        vDepth = depth;
        
        // 应用位移
        vec3 displaced = position;
        displaced.z += (depth * depthScale) + displacementBias;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `;
  }

  /**
   * 获取片段着色器
   * @private
   */
  _getFragmentShader() {
    return /* glsl */ `
      uniform sampler2D colorMap;
      
      varying vec2 vUv;
      varying float vDepth;
      
      void main() {
        vec4 color = texture2D(colorMap, vUv);
        
        // 可选：根据深度添加雾效
        // float fogFactor = smoothstep(0.0, 1.0, vDepth);
        // color.rgb = mix(color.rgb, vec3(0.1), fogFactor * 0.3);
        
        gl_FragColor = color;
      }
    `;
  }

  /**
   * 更新深度缩放
   * @param {THREE.Mesh} mesh - 目标网格
   * @param {number} scale - 新的深度缩放值
   */
  updateDepthScale(mesh, scale) {
    if (mesh.material?.uniforms?.depthScale) {
      mesh.material.uniforms.depthScale.value = scale;
    }
  }

  /**
   * 创建点云
   * @param {Float32Array} depthData - 深度数据
   * @param {THREE.Texture} colorTexture - 颜色纹理
   * @param {object} options
   * @returns {THREE.Points}
   */
  createPointCloud(depthData, colorTexture, options = {}) {
    const { width = 256, height = 256, pointSize = 2.0, depthScale = 1.0 } = options;

    const positions = [];
    const colors = [];

    // 从深度数据创建点
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const depth = depthData[idx];

        // 归一化坐标
        const px = (x / width - 0.5) * 2;
        const py = (y / height - 0.5) * -2;
        const pz = depth * depthScale;

        positions.push(px, py, pz);

        // 使用深度作为颜色（灰度）
        colors.push(depth, depth, depth);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: true,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    points.name = 'PointCloud';

    this._disposables.push(geometry, material);

    console.log(`✅ 点云生成完成 (${positions.length / 3} 个点)`);
    return points;
  }

  /**
   * 从图像创建平面网格
   * @param {THREE.Texture} texture - 纹理
   * @param {object} options
   * @returns {THREE.Mesh}
   */
  createImagePlane(texture, options = {}) {
    const { width = 1, height = 1 } = options;

    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'ImagePlane';

    this._disposables.push(geometry, material);

    return mesh;
  }

  /**
   * 销毁生成器
   */
  dispose() {
    for (const item of this._disposables) {
      item.dispose?.();
    }
    this._disposables = [];

    console.log('🗑️ MeshGenerator 已销毁');
  }
}

export default MeshGenerator;
