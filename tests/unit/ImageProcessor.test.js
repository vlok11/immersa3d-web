/**
 * @fileoverview ImageProcessor 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ImageProcessor', () => {
  let imageProcessor;

  beforeEach(async () => {
    const { ImageProcessor } = await import('../../src/modules/InputSystem/ImageProcessor.js');
    imageProcessor = new ImageProcessor();
  });

  describe('loadImage', () => {
    it.skip('should load an image from a file', async () => {
      // 创建模拟文件
      const blob = new Blob(['fake image data'], { type: 'image/png' });
      const file = new File([blob], 'test.png', { type: 'image/png' });

      // Mock URL.createObjectURL
      const mockUrl = 'blob:test-url';
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      // Mock Image loading
      const mockImage = {
        naturalWidth: 100,
        naturalHeight: 100,
        onload: null,
        onerror: null,
        src: '',
      };

      vi.spyOn(window, 'Image').mockImplementation(() => {
        setTimeout(() => mockImage.onload?.(), 0);
        return mockImage;
      });

      const result = await imageProcessor.loadImage(file);

      expect(result).toBe(mockImage);
      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    });

    it('should reject invalid files', async () => {
      const invalidFile = new File(['not an image'], 'test.txt', { type: 'text/plain' });

      await expect(imageProcessor.loadImage(invalidFile)).rejects.toThrow();
    });
  });

  describe('resizeKeepAspect', () => {
    it('should resize image maintaining aspect ratio', () => {
      // Mock Image with specific dimensions
      const mockImage = new Image();
      Object.defineProperty(mockImage, 'naturalWidth', { value: 1920 });
      Object.defineProperty(mockImage, 'naturalHeight', { value: 1080 });

      // Mock canvas context for resize method which creates new canvas
      const mockCtx = {
        drawImage: vi.fn(),
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      };

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockCtx),
      };

      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn(() => mockCtx),
            toDataURL: vi.fn(), // needed for other tests potentially
          };
        }
        return document.createElement(tag);
      });

      const canvas = imageProcessor.resizeKeepAspect(mockImage, 960);

      expect(canvas.width).toBe(960);
      expect(canvas.height).toBe(540); // 保持 16:9 比例
    });

    it.skip('should not upscale images smaller than max size', () => {
      // Restore spy from previous test if needed, but here we just reuse/overwrite
      const mockImage = new Image();
      Object.defineProperty(mockImage, 'naturalWidth', { value: 640 });
      Object.defineProperty(mockImage, 'naturalHeight', { value: 480 });

      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn(() => ({
              drawImage: vi.fn(),
              imageSmoothingEnabled: true,
              imageSmoothingQuality: 'high',
            })),
          };
        }
        return document.createElement(tag);
      });

      const canvas = imageProcessor.resizeKeepAspect(mockImage, 1024);

      expect(canvas.width).toBe(640);
      expect(canvas.height).toBe(480);
    });
  });

  describe('getImageData', () => {
    it('should return image data from canvas', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;

      // Mock internal context to avoid JSDOM canvas issues
      imageProcessor._ctx = {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => new ImageData(100, 100)),
      };

      const imageData = imageProcessor.getImageData(canvas);

      expect(imageData).toBeInstanceOf(ImageData);
      expect(imageData.width).toBe(100);
      expect(imageData.height).toBe(100);
    });
  });
});
