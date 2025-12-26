/**
 * @fileoverview 全局资源管理器，防止内存泄漏
 * @module core/ResourceManager
 */

import Logger from '../utils/Logger.js';

export class ResourceManager {
  constructor() {
    this._resources = new Set();
    this._textures = new Set();
    this._geometries = new Set();
    this._materials = new Set();
  }

  /**
   * 追踪资源
   * @param {Object} resource
   */
  track(resource) {
    if (!resource) return;

    if (resource.isTexture) {
      this._textures.add(resource);
    } else if (resource.isBufferGeometry || resource.isGeometry) {
      this._geometries.add(resource);
    } else if (resource.isMaterial) {
      this._materials.add(resource);
    } else if (Array.isArray(resource)) {
      resource.forEach((r) => this.track(r));
    } else {
      // 通用 disposables
      if (typeof resource.dispose === 'function') {
        this._resources.add(resource);
      }
    }
  }

  /**
   * 递归追踪 Object3D 及其子对象的所有资源
   * @param {THREE.Object3D} object
   */
  trackObject(object) {
    if (!object) return;

    object.traverse((child) => {
      if (child.geometry) this.track(child.geometry);
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => {
            this.track(m);
            if (m.map) this.track(m.map);
            if (m.envMap) this.track(m.envMap);
            if (m.normalMap) this.track(m.normalMap);
            if (m.roughnessMap) this.track(m.roughnessMap);
            if (m.metalnessMap) this.track(m.metalnessMap);
            if (m.alphaMap) this.track(m.alphaMap);
          });
        } else {
          this.track(child.material);
          if (child.material.map) this.track(child.material.map);
          if (child.material.envMap) this.track(child.material.envMap);
          if (child.material.normalMap) this.track(child.material.normalMap);
          if (child.material.roughnessMap) this.track(child.material.roughnessMap);
          if (child.material.metalnessMap) this.track(child.material.metalnessMap);
          if (child.material.alphaMap) this.track(child.material.alphaMap);
        }
      }
    });
  }

  /**
   * 释放特定资源
   * @param {Object} resource
   */
  release(resource) {
    if (!resource) return;

    if (resource.dispose) {
      resource.dispose();
    }

    this._textures.delete(resource);
    this._geometries.delete(resource);
    this._materials.delete(resource);
    this._resources.delete(resource);
  }

  /**
   * 递归清理 Object3D 及其子对象
   * @param {THREE.Object3D} object
   */
  disposeObject(object) {
    if (!object) return;

    object.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
        this._geometries.delete(child.geometry);
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => {
            if (m.map) m.map.dispose();
            if (m.envMap) m.envMap.dispose();
            if (m.normalMap) m.normalMap.dispose();
            if (m.roughnessMap) m.roughnessMap.dispose();
            if (m.metalnessMap) m.metalnessMap.dispose();
            if (m.alphaMap) m.alphaMap.dispose();

            // 自定义 ShaderMaterial uniform 纹理清理
            if (m.uniforms) {
              Object.values(m.uniforms).forEach((uniform) => {
                if (uniform.value && uniform.value.isTexture) {
                  uniform.value.dispose();
                }
              });
            }

            m.dispose();
            this._materials.delete(m);
          });
        } else {
          const m = child.material;
          if (m.map) m.map.dispose();
          if (m.envMap) m.envMap.dispose();
          // ... 更多贴图清理
          m.dispose();
          this._materials.delete(m);
        }
      }
    });

    if (object.parent) {
      object.parent.remove(object);
    }
  }

  /**
   * 清理全部资源
   */
  disposeAll() {
    Logger.log(`🧹 开始清理资源: 
      Textures: ${this._textures.size}
      Geometries: ${this._geometries.size}
      Materials: ${this._materials.size}
      Others: ${this._resources.size}`);

    this._textures.forEach((t) => t.dispose());
    this._geometries.forEach((g) => g.dispose());
    this._materials.forEach((m) => m.dispose());
    this._resources.forEach((r) => r.dispose());

    this._textures.clear();
    this._geometries.clear();
    this._materials.clear();
    this._resources.clear();

    Logger.log('✅ 资源清理完成');
  }
}

export const resourceManager = new ResourceManager();
