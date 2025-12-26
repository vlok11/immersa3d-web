/**
 * @fileoverview 后处理效果栈 - 统一管理所有视觉效果
 * @module modules/PostProcessing/EffectsStack
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// ========================================
// 自定义着色器
// ========================================

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
 * 色差着色器
 */
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.003 },
    angle: { value: 0.0 },
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
    uniform float amount;
    uniform float angle;
    varying vec2 vUv;
    
    void main() {
      vec2 offset = amount * vec2(cos(angle), sin(angle));
      
      vec4 cr = texture2D(tDiffuse, vUv + offset);
      vec4 cg = texture2D(tDiffuse, vUv);
      vec4 cb = texture2D(tDiffuse, vUv - offset);
      
      gl_FragColor = vec4(cr.r, cg.g, cb.b, cg.a);
    }
  `,
};

/**
 * 胶片颗粒着色器
 */
const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },
    intensity: { value: 0.1 },
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
    uniform float time;
    uniform float intensity;
    varying vec2 vUv;
    
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float noise = rand(vUv + time) * 2.0 - 1.0;
      color.rgb += noise * intensity;
      gl_FragColor = color;
    }
  `,
};

/**
 * 色调映射着色器
 */
const TonemappingShader = {
  uniforms: {
    tDiffuse: { value: null },
    exposure: { value: 1.0 },
    gamma: { value: 2.2 },
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
    uniform float exposure;
    uniform float gamma;
    varying vec2 vUv;
    
    // ACES Filmic Tonemapping
    vec3 ACESFilm(vec3 x) {
      float a = 2.51;
      float b = 0.03;
      float c = 2.43;
      float d = 0.59;
      float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      color.rgb *= exposure;
      color.rgb = ACESFilm(color.rgb);
      color.rgb = pow(color.rgb, vec3(1.0 / gamma));
      gl_FragColor = color;
    }
  `,
};

// ========================================
// 效果栈类
// ========================================

/**
 * 可用效果枚举
 * @enum {string}
 */
export const EffectType = {
  BLOOM: 'bloom',
  BOKEH: 'bokeh',
  VIGNETTE: 'vignette',
  CHROMATIC_ABERRATION: 'chromaticAberration',
  FILM_GRAIN: 'filmGrain',
  TONEMAPPING: 'tonemapping',
  FXAA: 'fxaa',
};

/**
 * 后处理效果栈
 * @class
 */
export class EffectsStack {
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

    /** @type {Map<string, any>} */
    this.passes = new Map();

    /** @type {Set<string>} */
    this.enabledEffects = new Set();

    /** @private */
    this._time = 0;

    this._init();
  }

  /**
   * 初始化效果栈
   * @private
   */
  _init() {
    const size = this.renderer.getSize(new THREE.Vector2());

    // 创建效果合成器
    this.composer = new EffectComposer(this.renderer);

    // 1. 基础渲染通道
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.passes.set('render', renderPass);

    // 2. 辉光效果
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.4, 0.85);
    bloomPass.enabled = false;
    this.composer.addPass(bloomPass);
    this.passes.set(EffectType.BLOOM, bloomPass);

    // 3. 景深效果
    const bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 1.0,
      aperture: 0.025,
      maxblur: 0.01,
    });
    bokehPass.enabled = false;
    this.composer.addPass(bokehPass);
    this.passes.set(EffectType.BOKEH, bokehPass);

    // 4. 色差效果
    const chromaticPass = new ShaderPass(ChromaticAberrationShader);
    chromaticPass.enabled = false;
    this.composer.addPass(chromaticPass);
    this.passes.set(EffectType.CHROMATIC_ABERRATION, chromaticPass);

    // 5. 暗角效果
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms.offset.value = 1.5;
    vignettePass.uniforms.darkness.value = 1.2;
    vignettePass.enabled = false;
    this.composer.addPass(vignettePass);
    this.passes.set(EffectType.VIGNETTE, vignettePass);

    // 6. 胶片颗粒
    const filmGrainPass = new ShaderPass(FilmGrainShader);
    filmGrainPass.enabled = false;
    this.composer.addPass(filmGrainPass);
    this.passes.set(EffectType.FILM_GRAIN, filmGrainPass);

    // 7. 色调映射
    const tonemappingPass = new ShaderPass(TonemappingShader);
    tonemappingPass.enabled = false;
    this.composer.addPass(tonemappingPass);
    this.passes.set(EffectType.TONEMAPPING, tonemappingPass);

    // 8. FXAA 抗锯齿 (最后一个)
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(1 / size.x, 1 / size.y);
    fxaaPass.enabled = false;
    this.composer.addPass(fxaaPass);
    this.passes.set(EffectType.FXAA, fxaaPass);

    console.log('✅ EffectsStack 初始化完成');
  }

  /**
   * 启用/禁用效果
   * @param {string} effectType
   * @param {boolean} enabled
   */
  setEffect(effectType, enabled) {
    const pass = this.passes.get(effectType);
    if (pass && pass !== this.passes.get('render')) {
      pass.enabled = enabled;

      if (enabled) {
        this.enabledEffects.add(effectType);
      } else {
        this.enabledEffects.delete(effectType);
      }

      console.log(`✨ ${effectType}: ${enabled ? '开启' : '关闭'}`);
    }
  }

  /**
   * 切换效果
   * @param {string} effectType
   */
  toggleEffect(effectType) {
    const isEnabled = this.enabledEffects.has(effectType);
    this.setEffect(effectType, !isEnabled);
  }

  /**
   * 设置辉光参数
   */
  setBloomParams({ strength, radius, threshold }) {
    const pass = this.passes.get(EffectType.BLOOM);
    if (pass) {
      if (strength !== undefined) pass.strength = strength;
      if (radius !== undefined) pass.radius = radius;
      if (threshold !== undefined) pass.threshold = threshold;
    }
  }

  /**
   * 设置景深参数
   */
  setBokehParams({ focus, aperture, maxblur }) {
    const pass = this.passes.get(EffectType.BOKEH);
    if (pass && pass.uniforms) {
      if (focus !== undefined) pass.uniforms.focus.value = focus;
      if (aperture !== undefined) pass.uniforms.aperture.value = aperture;
      if (maxblur !== undefined) pass.uniforms.maxblur.value = maxblur;
    }
  }

  /**
   * 设置暗角参数
   */
  setVignetteParams({ offset, darkness }) {
    const pass = this.passes.get(EffectType.VIGNETTE);
    if (pass) {
      if (offset !== undefined) pass.uniforms.offset.value = offset;
      if (darkness !== undefined) pass.uniforms.darkness.value = darkness;
    }
  }

  /**
   * 设置色差参数
   */
  setChromaticAberrationParams({ amount, angle }) {
    const pass = this.passes.get(EffectType.CHROMATIC_ABERRATION);
    if (pass) {
      if (amount !== undefined) pass.uniforms.amount.value = amount;
      if (angle !== undefined) pass.uniforms.angle.value = angle;
    }
  }

  /**
   * 设置胶片颗粒参数
   */
  setFilmGrainParams({ intensity }) {
    const pass = this.passes.get(EffectType.FILM_GRAIN);
    if (pass && intensity !== undefined) {
      pass.uniforms.intensity.value = intensity;
    }
  }

  /**
   * 设置色调映射参数
   */
  setTonemappingParams({ exposure, gamma }) {
    const pass = this.passes.get(EffectType.TONEMAPPING);
    if (pass) {
      if (exposure !== undefined) pass.uniforms.exposure.value = exposure;
      if (gamma !== undefined) pass.uniforms.gamma.value = gamma;
    }
  }

  /**
   * 检查是否有效果启用
   * @returns {boolean}
   */
  hasEnabledEffects() {
    return this.enabledEffects.size > 0;
  }

  /**
   * 获取已启用效果列表
   * @returns {string[]}
   */
  getEnabledEffects() {
    return Array.from(this.enabledEffects);
  }

  /**
   * 更新（每帧调用）
   * @param {number} deltaTime
   */
  update(deltaTime) {
    this._time += deltaTime;

    // 更新时间相关效果
    const filmGrainPass = this.passes.get(EffectType.FILM_GRAIN);
    if (filmGrainPass && filmGrainPass.enabled) {
      filmGrainPass.uniforms.time.value = this._time;
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

    // 更新 FXAA 分辨率
    const fxaaPass = this.passes.get(EffectType.FXAA);
    if (fxaaPass) {
      fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);
    }

    // 更新辉光分辨率
    const bloomPass = this.passes.get(EffectType.BLOOM);
    if (bloomPass) {
      bloomPass.resolution.set(width, height);
    }
  }

  /**
   * 更新相机
   * @param {THREE.Camera} camera
   */
  updateCamera(camera) {
    this.camera = camera;

    const renderPass = this.passes.get('render');
    if (renderPass) renderPass.camera = camera;

    const bokehPass = this.passes.get(EffectType.BOKEH);
    if (bokehPass) bokehPass.camera = camera;
  }

  /**
   * 获取可用效果类型
   * @returns {string[]}
   */
  static getEffectTypes() {
    return Object.values(EffectType);
  }

  /**
   * 销毁
   */
  dispose() {
    this.passes.forEach((pass) => {
      if (pass.dispose) pass.dispose();
    });
    this.passes.clear();
    this.enabledEffects.clear();

    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }

    console.log('🗑️ EffectsStack 已销毁');
  }
}

// 导出着色器供外部使用
export { VignetteShader, ChromaticAberrationShader, FilmGrainShader, TonemappingShader };
export default EffectsStack;
