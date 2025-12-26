/**
 * @fileoverview 后处理效果模块导出
 * @module modules/PostProcessing
 */

// EffectsManager has been deprecated and removed.
// export { EffectsManager, VignetteShader, ColorCorrectionShader } from './EffectsManager.js';
export { LUTManager, LUTPreset } from './LUTManager.js';
export {
  EffectsStack,
  EffectType,
  ChromaticAberrationShader,
  FilmGrainShader,
  TonemappingShader,
} from './EffectsStack.js';
