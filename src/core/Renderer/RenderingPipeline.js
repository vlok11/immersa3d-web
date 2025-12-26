/**
 * @fileoverview 统一渲染管线 (Rendering Pipeline)
 * @module core/Renderer/RenderingPipeline
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VignetteShader, ColorCorrectionShader } from './Shaders.js';
import { FilmGrainShader } from '../../modules/PostProcessing/EffectsStack.js';
import Logger from '../../utils/Logger.js';

export class RenderingPipeline {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.composer = null;
    this.passes = {};

    this.time = 0;

    // Config
    this.config = {
      smaa: true,
      bloom: true,
      vignette: true,
      filmGrain: false,
      colorCorrection: false,
    };

    this._init();
  }

  _init() {
    this.composer = new EffectComposer(this.renderer);

    // 1. Render Pass (Base)
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.passes.render = renderPass;

    // 2. SMAA Pass (Anti-aliasing)
    const size = this.renderer.getSize(new THREE.Vector2());
    const pixelRatio = this.renderer.getPixelRatio();
    this.passes.smaa = new SMAAPass(size.width * pixelRatio, size.height * pixelRatio);
    this.passes.smaa.enabled = this.config.smaa;
    this.composer.addPass(this.passes.smaa);

    // 3. Bloom Pass
    this.passes.bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.3, // Strength (lower for less intense glow)
      0.5, // Radius (slightly larger spread)
      0.85 // Threshold (high to only glow very bright parts)
    );
    this.passes.bloom.enabled = this.config.bloom;
    this.composer.addPass(this.passes.bloom);

    // 4. Color Correction
    this.passes.color = new ShaderPass(ColorCorrectionShader);
    this.passes.color.enabled = this.config.colorCorrection;
    this.composer.addPass(this.passes.color);

    // 5. Vignette
    this.passes.vignette = new ShaderPass(VignetteShader);
    this.passes.vignette.uniforms.offset.value = 1.2;
    this.passes.vignette.uniforms.darkness.value = 1.0;
    this.passes.vignette.enabled = this.config.vignette;
    this.composer.addPass(this.passes.vignette);

    // 6. Film Grain
    this.passes.filmGrain = new ShaderPass(FilmGrainShader);
    this.passes.filmGrain.uniforms.intensity.value = 0.15;
    this.passes.filmGrain.enabled = this.config.filmGrain;
    this.composer.addPass(this.passes.filmGrain);

    // 7. Output Pass (Color Space Conversion)
    try {
      this.passes.output = new OutputPass();
      this.composer.addPass(this.passes.output);
    } catch (error) {
      Logger.warn('OutputPass 不可用，跳过色彩空间转换', error);
    }

    Logger.log('🎨 RenderingPipeline 初始化完成 (含 SMAA + Grain)');
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
    // 更新 SMAA
    if (this.passes.smaa) {
      const pixelRatio = this.renderer.getPixelRatio();
      this.passes.smaa.setSize(width * pixelRatio, height * pixelRatio);
    }
  }

  setCamera(camera) {
    this.camera = camera;
    this.passes.render.camera = camera;
  }

  render(delta) {
    this.time += delta;

    // Update time-dependent uniforms
    if (this.passes.filmGrain && this.passes.filmGrain.enabled) {
      this.passes.filmGrain.uniforms.time.value = this.time;
    }

    this.composer.render(delta);
  }

  /**
   * 动态开关效果
   * @param {string} effectName
   * @param {boolean} enabled
   */
  setEffect(effectName, enabled) {
    if (this.passes[effectName]) {
      this.passes[effectName].enabled = enabled;
      this.config[effectName] = enabled;
      Logger.log(`✨ Pipeline: ${effectName} ${enabled ? 'ON' : 'OFF'}`);
    }
  }

  setFilmGrainIntensity(value) {
    if (this.passes.filmGrain) {
      this.passes.filmGrain.uniforms.intensity.value = value;
    }
  }

  setBloomStrength(value) {
    if (this.passes.bloom) this.passes.bloom.strength = value;
  }

  setBloomRadius(value) {
    if (this.passes.bloom) this.passes.bloom.radius = value;
  }

  setBloomThreshold(value) {
    if (this.passes.bloom) this.passes.bloom.threshold = value;
  }

  dispose() {
    // Dispose passes if they have dispose method
    Object.values(this.passes).forEach((pass) => {
      if (pass.dispose) pass.dispose();
    });
    this.composer.dispose();
  }
}
