/**
 * @fileoverview 材质编辑器 - 3D 材质实时调整
 * @module modules/GeometrySystem/MaterialEditor
 */

import * as THREE from 'three';

/**
 * 材质类型
 * @enum {string}
 */
export const MaterialType = {
  STANDARD: 'standard',
  PHYSICAL: 'physical',
  BASIC: 'basic',
  PHONG: 'phong',
  TOON: 'toon',
  MATCAP: 'matcap'
};

/**
 * 材质编辑器
 * @class
 */
export class MaterialEditor {
  constructor() {
    /** @type {THREE.Material|null} */
    this.currentMaterial = null;
    
    /** @type {THREE.Mesh|null} */
    this.targetMesh = null;
    
    /** @type {Map<string, THREE.Texture>} */
    this.textures = new Map();
  }

  /**
   * 设置目标网格
   * @param {THREE.Mesh} mesh
   */
  setTarget(mesh) {
    this.targetMesh = mesh;
    this.currentMaterial = mesh.material;
    console.log('🎨 材质编辑器目标已设置');
  }

  /**
   * 创建新材质
   * @param {string} type
   * @param {object} options
   * @returns {THREE.Material}
   */
  createMaterial(type, options = {}) {
    let material;
    
    const defaults = {
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.0,
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide
    };
    
    const params = { ...defaults, ...options };

    switch (type) {
      case MaterialType.STANDARD:
        material = new THREE.MeshStandardMaterial(params);
        break;
        
      case MaterialType.PHYSICAL:
        material = new THREE.MeshPhysicalMaterial({
          ...params,
          clearcoat: options.clearcoat || 0,
          clearcoatRoughness: options.clearcoatRoughness || 0,
          transmission: options.transmission || 0,
          ior: options.ior || 1.5
        });
        break;
        
      case MaterialType.BASIC:
        material = new THREE.MeshBasicMaterial({
          color: params.color,
          transparent: params.transparent,
          opacity: params.opacity,
          side: params.side
        });
        break;
        
      case MaterialType.PHONG:
        material = new THREE.MeshPhongMaterial({
          color: params.color,
          shininess: options.shininess || 30,
          transparent: params.transparent,
          opacity: params.opacity,
          side: params.side
        });
        break;
        
      case MaterialType.TOON:
        material = new THREE.MeshToonMaterial({
          color: params.color,
          transparent: params.transparent,
          opacity: params.opacity,
          side: params.side
        });
        break;
        
      default:
        material = new THREE.MeshStandardMaterial(params);
    }

    console.log(`✨ 创建材质: ${type}`);
    return material;
  }

  /**
   * 应用材质到目标
   * @param {THREE.Material} material
   */
  applyMaterial(material) {
    if (!this.targetMesh) {
      console.warn('未设置目标网格');
      return;
    }

    // 释放旧材质
    if (this.targetMesh.material && this.targetMesh.material !== material) {
      this.disposeMaterial(this.targetMesh.material);
    }

    this.targetMesh.material = material;
    this.currentMaterial = material;
    console.log('✅ 材质已应用');
  }

  /**
   * 设置颜色
   * @param {number|string} color
   */
  setColor(color) {
    if (this.currentMaterial && 'color' in this.currentMaterial) {
      this.currentMaterial.color.set(color);
    }
  }

  /**
   * 设置粗糙度
   * @param {number} roughness - 0-1
   */
  setRoughness(roughness) {
    if (this.currentMaterial && 'roughness' in this.currentMaterial) {
      this.currentMaterial.roughness = roughness;
    }
  }

  /**
   * 设置金属度
   * @param {number} metalness - 0-1
   */
  setMetalness(metalness) {
    if (this.currentMaterial && 'metalness' in this.currentMaterial) {
      this.currentMaterial.metalness = metalness;
    }
  }

  /**
   * 设置透明度
   * @param {number} opacity - 0-1
   */
  setOpacity(opacity) {
    if (this.currentMaterial) {
      this.currentMaterial.transparent = opacity < 1;
      this.currentMaterial.opacity = opacity;
    }
  }

  /**
   * 设置发光
   * @param {number} color
   * @param {number} intensity
   */
  setEmissive(color, intensity = 1) {
    if (this.currentMaterial && 'emissive' in this.currentMaterial) {
      this.currentMaterial.emissive.set(color);
      this.currentMaterial.emissiveIntensity = intensity;
    }
  }

  /**
   * 设置法线贴图强度
   * @param {number} scale
   */
  setNormalScale(scale) {
    if (this.currentMaterial && 'normalScale' in this.currentMaterial) {
      this.currentMaterial.normalScale.set(scale, scale);
    }
  }

  /**
   * 加载纹理
   * @param {string} name
   * @param {string|File} source
   * @returns {Promise<THREE.Texture>}
   */
  async loadTexture(name, source) {
    const loader = new THREE.TextureLoader();
    
    let url;
    if (source instanceof File) {
      url = URL.createObjectURL(source);
    } else {
      url = source;
    }

    return new Promise((resolve, reject) => {
      loader.load(url, (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        this.textures.set(name, texture);
        
        if (source instanceof File) {
          URL.revokeObjectURL(url);
        }
        
        console.log(`🖼️ 纹理加载完成: ${name}`);
        resolve(texture);
      }, undefined, reject);
    });
  }

  /**
   * 设置颜色贴图
   * @param {THREE.Texture|string} texture
   */
  async setColorMap(texture) {
    const map = typeof texture === 'string' 
      ? await this.loadTexture('colorMap', texture)
      : texture;
      
    if (this.currentMaterial && 'map' in this.currentMaterial) {
      this.currentMaterial.map = map;
      this.currentMaterial.needsUpdate = true;
    }
  }

  /**
   * 设置法线贴图
   * @param {THREE.Texture|string} texture
   */
  async setNormalMap(texture) {
    const map = typeof texture === 'string'
      ? await this.loadTexture('normalMap', texture)
      : texture;
      
    if (this.currentMaterial && 'normalMap' in this.currentMaterial) {
      this.currentMaterial.normalMap = map;
      this.currentMaterial.needsUpdate = true;
    }
  }

  /**
   * 设置粗糙度贴图
   * @param {THREE.Texture|string} texture
   */
  async setRoughnessMap(texture) {
    const map = typeof texture === 'string'
      ? await this.loadTexture('roughnessMap', texture)
      : texture;
      
    if (this.currentMaterial && 'roughnessMap' in this.currentMaterial) {
      this.currentMaterial.roughnessMap = map;
      this.currentMaterial.needsUpdate = true;
    }
  }

  /**
   * 设置金属度贴图
   * @param {THREE.Texture|string} texture
   */
  async setMetalnessMap(texture) {
    const map = typeof texture === 'string'
      ? await this.loadTexture('metalnessMap', texture)
      : texture;
      
    if (this.currentMaterial && 'metalnessMap' in this.currentMaterial) {
      this.currentMaterial.metalnessMap = map;
      this.currentMaterial.needsUpdate = true;
    }
  }

  /**
   * 设置环境光遮蔽贴图
   * @param {THREE.Texture|string} texture
   * @param {number} intensity
   */
  async setAOMap(texture, intensity = 1) {
    const map = typeof texture === 'string'
      ? await this.loadTexture('aoMap', texture)
      : texture;
      
    if (this.currentMaterial && 'aoMap' in this.currentMaterial) {
      this.currentMaterial.aoMap = map;
      this.currentMaterial.aoMapIntensity = intensity;
      this.currentMaterial.needsUpdate = true;
    }
  }

  /**
   * 设置位移贴图
   * @param {THREE.Texture|string} texture
   * @param {number} scale
   */
  async setDisplacementMap(texture, scale = 0.1) {
    const map = typeof texture === 'string'
      ? await this.loadTexture('displacementMap', texture)
      : texture;
      
    if (this.currentMaterial && 'displacementMap' in this.currentMaterial) {
      this.currentMaterial.displacementMap = map;
      this.currentMaterial.displacementScale = scale;
      this.currentMaterial.needsUpdate = true;
    }
  }

  /**
   * 设置纹理平铺
   * @param {number} repeatX
   * @param {number} repeatY
   */
  setTextureRepeat(repeatX, repeatY = repeatX) {
    this.textures.forEach(texture => {
      texture.repeat.set(repeatX, repeatY);
    });
  }

  /**
   * 设置线框模式
   * @param {boolean} enabled
   */
  setWireframe(enabled) {
    if (this.currentMaterial) {
      this.currentMaterial.wireframe = enabled;
    }
  }

  /**
   * 设置渲染面
   * @param {'front'|'back'|'double'} side
   */
  setSide(side) {
    if (!this.currentMaterial) return;
    
    switch (side) {
      case 'front':
        this.currentMaterial.side = THREE.FrontSide;
        break;
      case 'back':
        this.currentMaterial.side = THREE.BackSide;
        break;
      case 'double':
        this.currentMaterial.side = THREE.DoubleSide;
        break;
    }
  }

  /**
   * 获取材质属性
   * @returns {object}
   */
  getProperties() {
    if (!this.currentMaterial) return {};

    const props = {
      type: this.currentMaterial.type
    };

    if ('color' in this.currentMaterial) {
      props.color = '#' + this.currentMaterial.color.getHexString();
    }
    if ('roughness' in this.currentMaterial) {
      props.roughness = this.currentMaterial.roughness;
    }
    if ('metalness' in this.currentMaterial) {
      props.metalness = this.currentMaterial.metalness;
    }
    if ('opacity' in this.currentMaterial) {
      props.opacity = this.currentMaterial.opacity;
    }
    if ('emissive' in this.currentMaterial) {
      props.emissive = '#' + this.currentMaterial.emissive.getHexString();
      props.emissiveIntensity = this.currentMaterial.emissiveIntensity;
    }

    return props;
  }

  /**
   * 复制材质
   * @returns {THREE.Material}
   */
  cloneMaterial() {
    if (!this.currentMaterial) return null;
    return this.currentMaterial.clone();
  }

  /**
   * 释放材质
   * @param {THREE.Material} material
   */
  disposeMaterial(material) {
    if (material.map) material.map.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.roughnessMap) material.roughnessMap.dispose();
    if (material.metalnessMap) material.metalnessMap.dispose();
    if (material.aoMap) material.aoMap.dispose();
    if (material.displacementMap) material.displacementMap.dispose();
    material.dispose();
  }

  /**
   * 获取材质类型列表
   * @returns {string[]}
   */
  static getMaterialTypes() {
    return Object.values(MaterialType);
  }

  /**
   * 销毁
   */
  dispose() {
    this.textures.forEach(texture => texture.dispose());
    this.textures.clear();
    
    if (this.currentMaterial) {
      this.disposeMaterial(this.currentMaterial);
      this.currentMaterial = null;
    }
    
    this.targetMesh = null;
    console.log('🗑️ MaterialEditor 已销毁');
  }
}

export default MaterialEditor;
