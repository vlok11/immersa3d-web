/**
 * @fileoverview 帧插值处理器
 * @module modules/EnhancementSystem/FrameInterpolation
 */

/**
 * 插值方法
 * @enum {string}
 */
export const InterpolationMethod = {
  LINEAR: 'linear', // 简单线性插值
  OPTICAL_FLOW: 'opticalFlow', // 光流法
  BLEND: 'blend', // 混合模式
};

/**
 * 帧插值处理器
 * 用于视频增帧（从 24fps 到 60fps 等）
 * @class
 */
export class FrameInterpolation {
  constructor() {
    /** @type {string} */
    this.method = InterpolationMethod.BLEND;

    /** @type {Function|null} */
    this.onProgress = null;

    /** @private */
    this._canvas = document.createElement('canvas');

    /** @private */
    this._ctx = this._canvas.getContext('2d', {
      willReadFrequently: true,
    });
  }

  /**
   * 在两帧之间生成插值帧
   * @param {HTMLCanvasElement|ImageData} frame1 - 第一帧
   * @param {HTMLCanvasElement|ImageData} frame2 - 第二帧
   * @param {number} t - 插值因子 (0-1)
   * @param {object} options - 选项
   * @returns {HTMLCanvasElement}
   */
  interpolate(frame1, frame2, t, options = {}) {
    const method = options.method || this.method;

    switch (method) {
      case InterpolationMethod.LINEAR:
        return this._linearInterpolate(frame1, frame2, t);
      case InterpolationMethod.OPTICAL_FLOW:
        return this._opticalFlowInterpolate(frame1, frame2, t);
      case InterpolationMethod.BLEND:
      default:
        return this._blendInterpolate(frame1, frame2, t);
    }
  }

  /**
   * 简单混合插值
   * @private
   */
  _blendInterpolate(frame1, frame2, t) {
    const canvas1 = this._ensureCanvas(frame1);
    const canvas2 = this._ensureCanvas(frame2);

    const width = canvas1.width;
    const height = canvas1.height;

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d');

    // 绘制第一帧
    ctx.globalAlpha = 1 - t;
    ctx.drawImage(canvas1, 0, 0);

    // 叠加第二帧
    ctx.globalAlpha = t;
    ctx.drawImage(canvas2, 0, 0);

    ctx.globalAlpha = 1;
    return outputCanvas;
  }

  /**
   * 线性像素插值
   * @private
   */
  _linearInterpolate(frame1, frame2, t) {
    const canvas1 = this._ensureCanvas(frame1);
    const canvas2 = this._ensureCanvas(frame2);

    const width = canvas1.width;
    const height = canvas1.height;

    // 获取像素数据
    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');
    const data1 = ctx1.getImageData(0, 0, width, height);
    const data2 = ctx2.getImageData(0, 0, width, height);

    const outputData = new ImageData(width, height);

    for (let i = 0; i < data1.data.length; i += 4) {
      outputData.data[i] = Math.round(data1.data[i] * (1 - t) + data2.data[i] * t);
      outputData.data[i + 1] = Math.round(data1.data[i + 1] * (1 - t) + data2.data[i + 1] * t);
      outputData.data[i + 2] = Math.round(data1.data[i + 2] * (1 - t) + data2.data[i + 2] * t);
      outputData.data[i + 3] = 255;
    }

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    outputCanvas.getContext('2d').putImageData(outputData, 0, 0);

    return outputCanvas;
  }

  /**
   * 简化的光流插值（基于块匹配）
   * @private
   */
  _opticalFlowInterpolate(frame1, frame2, t) {
    const canvas1 = this._ensureCanvas(frame1);
    const canvas2 = this._ensureCanvas(frame2);

    const width = canvas1.width;
    const height = canvas1.height;
    const blockSize = 8;
    const searchRange = 4;

    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');
    const data1 = ctx1.getImageData(0, 0, width, height);
    const data2 = ctx2.getImageData(0, 0, width, height);

    const outputData = new ImageData(width, height);

    // 对每个块进行运动估计
    for (let by = 0; by < height; by += blockSize) {
      for (let bx = 0; bx < width; bx += blockSize) {
        // 简单块匹配找最佳位移
        let bestDx = 0,
          bestDy = 0,
          bestSAD = Infinity;

        for (let dy = -searchRange; dy <= searchRange; dy++) {
          for (let dx = -searchRange; dx <= searchRange; dx++) {
            let sad = 0;
            for (let y = 0; y < blockSize && by + y < height; y++) {
              for (let x = 0; x < blockSize && bx + x < width; x++) {
                const x1 = bx + x,
                  y1 = by + y;
                const x2 = Math.max(0, Math.min(width - 1, x1 + dx));
                const y2 = Math.max(0, Math.min(height - 1, y1 + dy));

                const idx1 = (y1 * width + x1) * 4;
                const idx2 = (y2 * width + x2) * 4;

                sad += Math.abs(data1.data[idx1] - data2.data[idx2]);
                sad += Math.abs(data1.data[idx1 + 1] - data2.data[idx2 + 1]);
                sad += Math.abs(data1.data[idx1 + 2] - data2.data[idx2 + 2]);
              }
            }
            if (sad < bestSAD) {
              bestSAD = sad;
              bestDx = dx;
              bestDy = dy;
            }
          }
        }

        // 应用运动补偿插值
        for (let y = 0; y < blockSize && by + y < height; y++) {
          for (let x = 0; x < blockSize && bx + x < width; x++) {
            const x1 = bx + x,
              y1 = by + y;
            const xInterp = Math.round(x1 + bestDx * t);
            const yInterp = Math.round(y1 + bestDy * t);

            const xClamped = Math.max(0, Math.min(width - 1, xInterp));
            const yClamped = Math.max(0, Math.min(height - 1, yInterp));

            const idx1 = (y1 * width + x1) * 4;
            const idxInterp = (yClamped * width + xClamped) * 4;
            const idxOut = idx1;

            outputData.data[idxOut] = Math.round(
              data1.data[idx1] * (1 - t) + data2.data[idxInterp] * t
            );
            outputData.data[idxOut + 1] = Math.round(
              data1.data[idx1 + 1] * (1 - t) + data2.data[idxInterp + 1] * t
            );
            outputData.data[idxOut + 2] = Math.round(
              data1.data[idx1 + 2] * (1 - t) + data2.data[idxInterp + 2] * t
            );
            outputData.data[idxOut + 3] = 255;
          }
        }
      }
    }

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    outputCanvas.getContext('2d').putImageData(outputData, 0, 0);

    return outputCanvas;
  }

  /**
   * 批量帧插值（增加帧率）
   * @param {HTMLCanvasElement[]} frames - 原始帧序列
   * @param {number} multiplier - 帧率倍数 (2, 3, 4...)
   * @param {object} options - 选项
   * @returns {Promise<HTMLCanvasElement[]>}
   */
  async interpolateSequence(frames, multiplier = 2, options = {}) {
    if (frames.length < 2) return frames;

    const result = [];
    const total = (frames.length - 1) * multiplier + 1;
    let processed = 0;

    for (let i = 0; i < frames.length - 1; i++) {
      result.push(frames[i]);
      processed++;

      // 生成中间帧
      for (let j = 1; j < multiplier; j++) {
        const t = j / multiplier;
        const interpFrame = this.interpolate(frames[i], frames[i + 1], t, options);
        result.push(interpFrame);
        processed++;

        if (this.onProgress) {
          this.onProgress(processed / total);
        }
      }

      // 允许 UI 更新
      await new Promise((r) => setTimeout(r, 0));
    }

    // 添加最后一帧
    result.push(frames[frames.length - 1]);

    console.log(`🎬 帧插值完成: ${frames.length} → ${result.length} 帧`);
    return result;
  }

  /**
   * 确保输入是 Canvas
   * @private
   */
  _ensureCanvas(input) {
    if (input instanceof HTMLCanvasElement) {
      return input;
    }

    if (input instanceof ImageData) {
      const canvas = document.createElement('canvas');
      canvas.width = input.width;
      canvas.height = input.height;
      canvas.getContext('2d').putImageData(input, 0, 0);
      return canvas;
    }

    return input;
  }

  /**
   * 设置插值方法
   * @param {string} method
   */
  setMethod(method) {
    this.method = method;
  }

  /**
   * 获取可用方法
   * @returns {string[]}
   */
  static getMethods() {
    return Object.values(InterpolationMethod);
  }

  /**
   * 销毁
   */
  dispose() {
    this._canvas = null;
    this._ctx = null;
    console.log('🗑️ FrameInterpolation 已销毁');
  }
}

export default FrameInterpolation;
