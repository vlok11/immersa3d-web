/**
 * @fileoverview ErrorHandler 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorHandler,
  AppError,
  ErrorLevel,
  ErrorType,
} from '../../src/core/Utils/ErrorHandler.js';

describe('ErrorHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new ErrorHandler();
  });

  afterEach(() => {
    handler.clearLog();
  });

  describe('AppError', () => {
    it('should create an error with correct properties', () => {
      const error = new AppError('测试错误', ErrorType.NETWORK, ErrorLevel.ERROR, {
        url: 'test.com',
      });

      expect(error.message).toBe('测试错误');
      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.level).toBe(ErrorLevel.ERROR);
      expect(error.context.url).toBe('test.com');
      expect(error.timestamp).toBeDefined();
    });

    it('should use default values', () => {
      const error = new AppError('简单错误');

      expect(error.type).toBe(ErrorType.UNKNOWN);
      expect(error.level).toBe(ErrorLevel.ERROR);
    });
  });

  describe('handle', () => {
    it('should log errors', () => {
      const error = new AppError('测试');
      handler.handle(error);

      const log = handler.getErrorLog();
      expect(log.length).toBe(1);
      expect(log[0].message).toBe('测试');
    });

    it('should convert regular errors to AppError', () => {
      const regularError = new Error('普通错误');
      handler.handle(regularError);

      const log = handler.getErrorLog();
      expect(log[0]).toBeInstanceOf(AppError);
    });

    it('should limit log size', () => {
      handler._maxLogSize = 5;

      for (let i = 0; i < 10; i++) {
        handler.handle(new AppError(`错误 ${i}`));
      }

      const log = handler.getErrorLog();
      expect(log.length).toBe(5);
      expect(log[0].message).toBe('错误 5'); // 最早的被移除
    });
  });

  describe('listeners', () => {
    it('should notify listeners when error occurs', () => {
      const listener = vi.fn();
      handler.addListener(listener);

      const error = new AppError('测试');
      handler.handle(error);

      expect(listener).toHaveBeenCalledWith(error);
    });

    it('should remove listeners', () => {
      const listener = vi.fn();
      handler.addListener(listener);
      handler.removeListener(listener);

      handler.handle(new AppError('测试'));

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clearLog', () => {
    it('should clear all errors', () => {
      handler.handle(new AppError('错误1'));
      handler.handle(new AppError('错误2'));

      handler.clearLog();

      expect(handler.getErrorLog().length).toBe(0);
    });
  });
});
