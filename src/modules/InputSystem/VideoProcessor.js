/**
 * @fileoverview 视频处理器 - 基于 FFmpeg.wasm 的浏览器端视频处理
 * @module modules/InputSystem/VideoProcessor
 */

/**
 * 视频处理器类
 * @class
 */
export class VideoProcessor {
  constructor() {
    /** @private */
    this._ffmpeg = null;
    
    /** @private */
    this._loaded = false;
    
    /** @type {Function|null} */
    this.onProgress = null;
    
    /** @type {Function|null} */
    this.onLog = null;
  }

  /**
   * 加载 FFmpeg.wasm
   * @returns {Promise<boolean>}
   */
  async load() {
    if (this._loaded) return true;

    try {
      // 动态导入 FFmpeg
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
      
      this._ffmpeg = new FFmpeg();
      this._fetchFile = fetchFile;
      
      // 设置日志回调
      this._ffmpeg.on('log', ({ message }) => {
        if (this.onLog) this.onLog(message);
        console.log('[FFmpeg]', message);
      });

      // 设置进度回调
      this._ffmpeg.on('progress', ({ progress, time }) => {
        if (this.onProgress) {
          this.onProgress({
            progress: Math.round(progress * 100),
            time: time / 1000000 // 转换为秒
          });
        }
      });

      // 加载 FFmpeg 核心
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await this._ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this._loaded = true;
      console.log('✅ FFmpeg.wasm 加载完成');
      return true;
      
    } catch (error) {
      console.error('❌ FFmpeg.wasm 加载失败:', error);
      return false;
    }
  }

  /**
   * 检查是否已加载
   * @returns {boolean}
   */
  isLoaded() {
    return this._loaded;
  }

  /**
   * 提取视频帧
   * @param {File} videoFile - 视频文件
   * @param {object} options - 选项
   * @returns {Promise<ImageData[]>}
   */
  async extractFrames(videoFile, options = {}) {
    const {
      fps = 10,
      startTime = 0,
      duration = null,
      maxFrames = 100,
      width = null,
      height = null
    } = options;

    if (!this._loaded) {
      await this.load();
    }

    const frames = [];
    const inputName = 'input' + this._getExtension(videoFile.name);
    const outputPattern = 'frame_%04d.png';

    try {
      // 写入视频文件
      await this._ffmpeg.writeFile(inputName, await this._fetchFile(videoFile));

      // 构建 FFmpeg 命令
      const args = ['-i', inputName];
      
      if (startTime > 0) {
        args.push('-ss', startTime.toString());
      }
      
      if (duration) {
        args.push('-t', duration.toString());
      }
      
      args.push('-vf', `fps=${fps}`);
      
      if (width && height) {
        args.push('-s', `${width}x${height}`);
      }
      
      args.push('-vframes', maxFrames.toString());
      args.push(outputPattern);

      // 执行命令
      await this._ffmpeg.exec(args);

      // 读取输出帧
      for (let i = 1; i <= maxFrames; i++) {
        const frameName = `frame_${String(i).padStart(4, '0')}.png`;
        try {
          const data = await this._ffmpeg.readFile(frameName);
          const blob = new Blob([data], { type: 'image/png' });
          const imageData = await this._blobToImageData(blob);
          frames.push(imageData);
          
          // 清理帧文件
          await this._ffmpeg.deleteFile(frameName);
        } catch {
          // 没有更多帧
          break;
        }
      }

      // 清理输入文件
      await this._ffmpeg.deleteFile(inputName);

      console.log(`📽️ 提取了 ${frames.length} 帧`);
      return frames;
      
    } catch (error) {
      console.error('帧提取失败:', error);
      throw error;
    }
  }

  /**
   * 从帧序列编码视频
   * @param {HTMLCanvasElement[]} frames - 帧序列
   * @param {object} options - 选项
   * @returns {Promise<Blob>}
   */
  async encodeVideo(frames, options = {}) {
    const {
      fps = 30,
      codec = 'libx264',
      format = 'mp4',
      crf = 23,
      preset = 'medium'
    } = options;

    if (!this._loaded) {
      await this.load();
    }

    const outputName = `output.${format}`;

    try {
      // 写入所有帧
      for (let i = 0; i < frames.length; i++) {
        const canvas = frames[i];
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/png');
        });
        const frameName = `frame_${String(i + 1).padStart(4, '0')}.png`;
        await this._ffmpeg.writeFile(frameName, await this._fetchFile(blob));
      }

      // 构建编码命令
      const args = [
        '-framerate', fps.toString(),
        '-i', 'frame_%04d.png',
        '-c:v', codec,
        '-crf', crf.toString(),
        '-preset', preset,
        '-pix_fmt', 'yuv420p',
        outputName
      ];

      // 执行编码
      await this._ffmpeg.exec(args);

      // 读取输出
      const data = await this._ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: `video/${format}` });

      // 清理文件
      await this._ffmpeg.deleteFile(outputName);
      for (let i = 0; i < frames.length; i++) {
        const frameName = `frame_${String(i + 1).padStart(4, '0')}.png`;
        try {
          await this._ffmpeg.deleteFile(frameName);
        } catch {}
      }

      console.log(`🎬 视频编码完成 (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
      return blob;
      
    } catch (error) {
      console.error('视频编码失败:', error);
      throw error;
    }
  }

  /**
   * 转换视频格式
   * @param {File} videoFile - 输入视频
   * @param {string} outputFormat - 输出格式
   * @returns {Promise<Blob>}
   */
  async convertFormat(videoFile, outputFormat = 'webm') {
    if (!this._loaded) {
      await this.load();
    }

    const inputName = 'input' + this._getExtension(videoFile.name);
    const outputName = `output.${outputFormat}`;

    try {
      await this._ffmpeg.writeFile(inputName, await this._fetchFile(videoFile));

      const args = ['-i', inputName];
      
      if (outputFormat === 'webm') {
        args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0');
      } else if (outputFormat === 'mp4') {
        args.push('-c:v', 'libx264', '-crf', '23');
      }
      
      args.push(outputName);

      await this._ffmpeg.exec(args);

      const data = await this._ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: `video/${outputFormat}` });

      await this._ffmpeg.deleteFile(inputName);
      await this._ffmpeg.deleteFile(outputName);

      console.log(`🔄 格式转换完成: ${outputFormat}`);
      return blob;
      
    } catch (error) {
      console.error('格式转换失败:', error);
      throw error;
    }
  }

  /**
   * 生成视频缩略图
   * @param {File} videoFile - 视频文件
   * @param {number} time - 时间点（秒）
   * @returns {Promise<Blob>}
   */
  async generateThumbnail(videoFile, time = 0) {
    if (!this._loaded) {
      await this.load();
    }

    const inputName = 'input' + this._getExtension(videoFile.name);
    const outputName = 'thumbnail.jpg';

    try {
      await this._ffmpeg.writeFile(inputName, await this._fetchFile(videoFile));

      await this._ffmpeg.exec([
        '-i', inputName,
        '-ss', time.toString(),
        '-vframes', '1',
        '-q:v', '2',
        outputName
      ]);

      const data = await this._ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: 'image/jpeg' });

      await this._ffmpeg.deleteFile(inputName);
      await this._ffmpeg.deleteFile(outputName);

      return blob;
      
    } catch (error) {
      console.error('缩略图生成失败:', error);
      throw error;
    }
  }

  /**
   * 获取视频信息
   * @param {File} videoFile
   * @returns {Promise<object>}
   */
  async getVideoInfo(videoFile) {
    // 使用 HTML5 Video 元素获取基本信息
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          name: videoFile.name,
          size: videoFile.size,
          type: videoFile.type
        });
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        reject(new Error('无法读取视频信息'));
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(videoFile);
    });
  }

  /**
   * Blob 转 ImageData
   * @private
   */
  async _blobToImageData(blob) {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        URL.revokeObjectURL(url);
        resolve(imageData);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图像加载失败'));
      };
      img.src = url;
    });
  }

  /**
   * 获取文件扩展名
   * @private
   */
  _getExtension(filename) {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0] : '.mp4';
  }

  /**
   * 销毁处理器
   */
  dispose() {
    if (this._ffmpeg) {
      this._ffmpeg.terminate();
      this._ffmpeg = null;
    }
    this._loaded = false;
    console.log('🗑️ VideoProcessor 已销毁');
  }
}

export default VideoProcessor;
