/**
 * @fileoverview 后处理效果管理器
 * @module modules/PostProcessing/EffectsManager
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * 暗角着色器
 */
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      float vignette = 1.0 - dot(uv, uv);
      texel.rgb *= mix(1.0, smoothstep(0.0, 1.0, vignette), darkness);
      gl_FragColor = texel;
    }
  `,
};

/**
 * 色彩校正着色器
 */
const ColorCorrectionShader = {
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 0.0 },
    contrast: { value: 1.0 },
    saturation: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    varying vec2 vUv;
    
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      
      // 亮度
      texel.rgb += brightness;
      
      // 对比度
      texel.rgb = (texel.rgb - 0.5) * contrast + 0.5;
      
      // 饱和度
      float gray = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
      texel.rgb = mix(vec3(gray), texel.rgb, saturation);
      
      gl_FragColor = texel;
    }
  `,
};

/**
 * 后处理效果管理器
 * @class
 */
export class EffectsManager {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  constructor(renderer, scene, camera) {
    /** @type {THREE.WebGLRenderer} */
    this.renderer = renderer;

    /** @type {THREE.Scene} */
    this.scene = scene;

    /** @type {THREE.Camera} */
    this.camera = camera;

    /** @type {EffectComposer} */
    this.composer = null;

    /** @type {Map<string, ShaderPass>} */
    this.effects = new Map();

    /** @type {object} */
    this.enabledEffects = {
      bloom: false,
      vignette: false,
      colorCorrection: false,
    };

    this._init();
  }

  /**
   * 初始化后处理管线
   * @private
   */
  _init() {
    // 创建效果合成器
    this.composer = new EffectComposer(this.renderer);

    // 添加渲染通道
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // 创建辉光效果
    this._createBloomPass();

    // 创建暗角效果
    this._createVignettePass();

    // 创建色彩校正效果
    this._createColorCorrectionPass();

    console.log('✅ EffectsManager 初始化完成');
  }

  /**
   * 创建辉光效果
   * @private
   */
  _createBloomPass() {
    const size = this.renderer.getSize(new THREE.Vector2());
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      0.5, // 强度
      0.4, // 半径
      0.85 // 阈值
    );
    bloomPass.enabled = false;

    this.composer.addPass(bloomPass);
    this.effects.set('bloom', bloomPass);
  }

  /**
   * 创建暗角效果
   * @private
   */
  _createVignettePass() {
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms.offset.value = 1.5;
    vignettePass.uniforms.darkness.value = 1.2;
    vignettePass.enabled = false;

    this.composer.addPass(vignettePass);
    this.effects.set('vignette', vignettePass);
  }

  /**
   * 创建色彩校正效果
   * @private
   */
  _createColorCorrectionPass() {
    const colorPass = new ShaderPass(ColorCorrectionShader);
    colorPass.uniforms.brightness.value = 0.0;
    colorPass.uniforms.contrast.value = 1.0;
    colorPass.uniforms.saturation.value = 1.0;
    colorPass.enabled = false;

    this.composer.addPass(colorPass);
    this.effects.set('colorCorrection', colorPass);
  }

  /**
   * 启用/禁用效果
   * @param {string} effectName
   * @param {boolean} enabled
   */
  setEffectEnabled(effectName, enabled) {
    const effect = this.effects.get(effectName);
    if (effect) {
      effect.enabled = enabled;
      this.enabledEffects[effectName] = enabled;
      console.log(`✨ ${effectName}: ${enabled ? '开启' : '关闭'}`);
    }
  }

  /**
   * 检查是否有效果启用
   * @returns {boolean}
   */
  hasEnabledEffects() {
    return Object.values(this.enabledEffects).some((v) => v);
  }

  /**
   * 设置辉光参数
   * @param {object} params
   */
  setBloomParams(params) {
    const bloom = this.effects.get('bloom');
    if (bloom) {
      if (params.strength !== undefined) bloom.strength = params.strength;
      if (params.radius !== undefined) bloom.radius = params.radius;
      if (params.threshold !== undefined) bloom.threshold = params.threshold;
    }
  }

  /**
   * 设置暗角参数
   * @param {object} params
   */
  setVignetteParams(params) {
    const vignette = this.effects.get('vignette');
    if (vignette) {
      if (params.offset !== undefined) vignette.uniforms.offset.value = params.offset;
      if (params.darkness !== undefined) vignette.uniforms.darkness.value = params.darkness;
    }
  }

  /**
   * 设置色彩校正参数
   * @param {object} params
   */
  setColorCorrectionParams(params) {
    const colorPass = this.effects.get('colorCorrection');
    if (colorPass) {
      if (params.brightness !== undefined) colorPass.uniforms.brightness.value = params.brightness;
      if (params.contrast !== undefined) colorPass.uniforms.contrast.value = params.contrast;
      if (params.saturation !== undefined) colorPass.uniforms.saturation.value = params.saturation;
    }
  }

  /**
   * 渲染
   */
  render() {
    if (this.hasEnabledEffects()) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * 调整大小
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    this.composer.setSize(width, height);

    // 更新辉光效果分辨率
    const bloom = this.effects.get('bloom');
    if (bloom) {
      bloom.resolution.set(width, height);
    }
  }

  /**
   * 更新相机
   * @param {THREE.Camera} camera
   */
  updateCamera(camera) {
    this.camera = camera;

    // 更新渲染通道
    const passes = this.composer.passes;
    if (passes[0] instanceof RenderPass) {
      passes[0].camera = camera;
    }
  }

  /**
   * 销毁效果管理器
   */
  dispose() {
    this.effects.forEach((effect) => {
      if (effect.dispose) effect.dispose();
    });
    this.effects.clear();

    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }

    console.log('🗑️ EffectsManager 已销毁');
  }
}

export { VignetteShader, ColorCorrectionShader };
export default EffectsManager;
