/**
 * @fileoverview SceneManager 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Three.js with partial mocking
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Scene: vi.fn(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      background: null,
    })),
    PerspectiveCamera: vi.fn(() => ({
      position: { set: vi.fn(), copy: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    })),
    WebGLRenderer: vi.fn(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
      capabilities: { isWebGL2: true },
      outputColorSpace: actual.SRGBColorSpace,
      toneMapping: actual.ACESFilmicToneMapping,
      toneMappingExposure: 1.0,
      shadowMap: { enabled: false, type: null },
    })),
    Clock: vi.fn(() => ({
      getDelta: vi.fn(() => 0.016),
    })),
    AmbientLight: vi.fn(),
    DirectionalLight: vi.fn(() => ({
      position: { set: vi.fn() },
      castShadow: false,
      shadow: {
        mapSize: { width: 1024, height: 1024 },
        camera: { near: 0.1, far: 100 },
      },
    })),
    GridHelper: vi.fn(),
  };
});

// Mock OrbitControls
vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(() => ({
    enableDamping: true,
    dampingFactor: 0.05,
    update: vi.fn(),
    dispose: vi.fn(),
  })),
}));

describe('SceneManager', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should create a scene manager instance', async () => {
    const { SceneManager } = await import('../../src/core/Renderer/SceneManager.js');
    const manager = new SceneManager(container);

    expect(manager).toBeDefined();
    expect(manager.scene).toBeDefined();
    expect(manager.camera).toBeDefined();
    expect(manager.renderer).toBeDefined();
  });

  it('should add objects to the scene', async () => {
    const { SceneManager } = await import('../../src/core/Renderer/SceneManager.js');
    const manager = new SceneManager(container);

    const mockObject = { type: 'Mesh' };
    manager.add(mockObject);

    expect(manager.scene.add).toHaveBeenCalledWith(mockObject);
  });

  it('should remove objects from the scene', async () => {
    const { SceneManager } = await import('../../src/core/Renderer/SceneManager.js');
    const manager = new SceneManager(container);

    const mockObject = { type: 'Mesh' };
    manager.remove(mockObject);

    expect(manager.scene.remove).toHaveBeenCalledWith(mockObject);
  });

  it('should start and stop animation loop', async () => {
    const { SceneManager } = await import('../../src/core/Renderer/SceneManager.js');
    const manager = new SceneManager(container);

    manager.start();
    expect(manager.isRunning).toBe(true);

    manager.stop();
    expect(manager.isRunning).toBe(false);
  });

  it('should execute update callbacks', async () => {
    const { SceneManager } = await import('../../src/core/Renderer/SceneManager.js');
    const manager = new SceneManager(container);

    const callback = vi.fn();
    manager.addUpdateCallback(callback);

    // 模拟一帧更新
    manager._update();

    expect(callback).toHaveBeenCalled();
  });

  it.skip('should dispose resources properly', async () => {
    const { SceneManager } = await import('../../src/core/Renderer/SceneManager.js');
    const manager = new SceneManager(container);

    manager.dispose();

    expect(manager.renderer.dispose).toHaveBeenCalled();
    expect(manager.controls.dispose).toHaveBeenCalled();
  });
});
