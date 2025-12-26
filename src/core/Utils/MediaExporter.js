/**
 * @fileoverview 媒体导出器
 * @module core/Utils/MediaExporter
 */

/**
 * 导出格式
 * @enum {string}
 */
export const ExportFormat = {
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  WEBP: 'image/webp',
  GIF: 'gif',
  WEBM: 'video/webm',
  MP4: 'video/mp4'
};

/**
 * 媒体导出器
 * @class
 */
export class MediaExporter {
  /**
   * @param {THREE.WebGLRenderer} renderer
   */
  constructor(renderer) {
    /** @type {THREE.WebGLRenderer} */
    this.renderer = renderer;
    
    /** @type {HTMLCanvasElement[]} */
    this._frames = [];
    
    /** @type {boolean} */
    this._isRecording = false;
    
    /** @private */
    this._recordingStartTime = 0;
    
    /** @private */
    this._frameInterval = null;
  }

  /**
   * 导出当前帧为图片
   * @param {object} options
   * @returns {string} Data URL
   */
  exportImage(options = {}) {
    const {
      format = ExportFormat.PNG,
      quality = 0.92,
      width,
      height,
      filename = `immersa3d-${Date.now()}`
    } = options;

    // 获取当前帧
    const canvas = this.renderer.domElement;
    let dataUrl;

    if (width && height && (width !== canvas.width || height !== canvas.height)) {
      // 需要调整大小
      const resizedCanvas = this._resizeCanvas(canvas, width, height);
      dataUrl = resizedCanvas.toDataURL(format, quality);
    } else {
      dataUrl = canvas.toDataURL(format, quality);
    }

    console.log(`📷 图片已导出: ${format}`);
    return dataUrl;
  }

  /**
   * 下载图片
   * @param {object} options
   */
  downloadImage(options = {}) {
    const {
      format = ExportFormat.PNG,
      quality = 0.92,
      filename = `immersa3d-${Date.now()}`
    } = options;

    const dataUrl = this.exportImage({ format, quality });
    const ext = format.split('/')[1] || 'png';
    
    this._downloadDataUrl(dataUrl, `${filename}.${ext}`);
  }

  /**
   * 调整画布大小
   * @private
   */
  _resizeCanvas(sourceCanvas, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
    
    return canvas;
  }

  /**
   * 开始录制帧序列
   * @param {object} options
   */
  startRecording(options = {}) {
    const {
      fps = 30,
      maxDuration = 10
    } = options;

    if (this._isRecording) {
      console.warn('⚠️ 已在录制中');
      return;
    }

    this._frames = [];
    this._isRecording = true;
    this._recordingStartTime = performance.now();

    const frameTime = 1000 / fps;
    const maxFrames = fps * maxDuration;

    this._frameInterval = setInterval(() => {
      if (this._frames.length >= maxFrames) {
        this.stopRecording();
        return;
      }

      // 捕获帧
      const canvas = this.renderer.domElement;
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = canvas.width;
      frameCanvas.height = canvas.height;
      const ctx = frameCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0);
      
      this._frames.push(frameCanvas);
    }, frameTime);

    console.log(`🔴 开始录制 (${fps} FPS, 最大 ${maxDuration}s)`);
  }

  /**
   * 停止录制
   * @returns {HTMLCanvasElement[]} 帧序列
   */
  stopRecording() {
    if (!this._isRecording) {
      return this._frames;
    }

    if (this._frameInterval) {
      clearInterval(this._frameInterval);
      this._frameInterval = null;
    }

    this._isRecording = false;
    const duration = (performance.now() - this._recordingStartTime) / 1000;
    
    console.log(`⏹️ 录制停止 (${this._frames.length} 帧, ${duration.toFixed(2)}s)`);
    return this._frames;
  }

  /**
   * 获取录制的帧数
   * @returns {number}
   */
  getFrameCount() {
    return this._frames.length;
  }

  /**
   * 检查是否正在录制
   * @returns {boolean}
   */
  isRecording() {
    return this._isRecording;
  }

  /**
   * 导出为 GIF（需要 gif.js 库 - 此处提供基础实现）
   * @param {object} options
   * @returns {Promise<Blob>}
   */
  async exportGIF(options = {}) {
    const {
      fps = 15,
      quality = 10,
      width,
      height
    } = options;

    const frames = this._frames;
    if (frames.length === 0) {
      throw new Error('没有可导出的帧');
    }

    // 创建简易 GIF（实际项目中应使用 gif.js）
    console.log(`🎞️ 准备导出 GIF (${frames.length} 帧)...`);
    
    // 返回第一帧作为静态图片的替代方案
    return new Promise((resolve) => {
      frames[0].toBlob((blob) => {
        console.log('⚠️ GIF 导出需要 gif.js 库，当前返回第一帧');
        resolve(blob);
      }, 'image/png');
    });
  }

  /**
   * 导出为 WebM 视频
   * @param {object} options
   * @returns {Promise<Blob>}
   */
  async exportVideo(options = {}) {
    const {
      fps = 30,
      bitrate = 5000000,
      mimeType = 'video/webm;codecs=vp9'
    } = options;

    const frames = this._frames;
    if (frames.length === 0) {
      throw new Error('没有可导出的帧');
    }

    // 检查 MediaRecorder 支持
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      const fallback = 'video/webm';
      if (!MediaRecorder.isTypeSupported(fallback)) {
        throw new Error('浏览器不支持视频录制');
      }
    }

    console.log(`🎬 准备导出视频 (${frames.length} 帧)...`);

    // 创建离屏 canvas 用于播放帧
    const canvas = document.createElement('canvas');
    canvas.width = frames[0].width;
    canvas.height = frames[0].height;
    const ctx = canvas.getContext('2d');

    // 使用 MediaRecorder 录制
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
      videoBitsPerSecond: bitrate
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        console.log(`✅ 视频导出完成 (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
        resolve(blob);
      };

      recorder.onerror = reject;
      recorder.start();

      // 逐帧绘制
      let frameIndex = 0;
      const frameDelay = 1000 / fps;

      const drawNextFrame = () => {
        if (frameIndex >= frames.length) {
          recorder.stop();
          return;
        }

        ctx.drawImage(frames[frameIndex], 0, 0);
        frameIndex++;
        setTimeout(drawNextFrame, frameDelay);
      };

      drawNextFrame();
    });
  }

  /**
   * 下载视频
   * @param {object} options
   */
  async downloadVideo(options = {}) {
    const { filename = `immersa3d-${Date.now()}` } = options;
    
    try {
      const blob = await this.exportVideo(options);
      this._downloadBlob(blob, `${filename}.webm`);
    } catch (error) {
      console.error('视频导出失败:', error);
      throw error;
    }
  }

  /**
   * 下载 Data URL
   * @private
   */
  _downloadDataUrl(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 下载 Blob
   * @private
   */
  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 清除帧缓存
   */
  clearFrames() {
    this._frames = [];
    console.log('🗑️ 帧缓存已清除');
  }

  /**
   * 销毁导出器
   */
  dispose() {
    this.stopRecording();
    this.clearFrames();
    console.log('🗑️ MediaExporter 已销毁');
  }
}

export default MediaExporter;
