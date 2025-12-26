/**
 * @fileoverview 统一输入管理器
 * @module modules/InputSystem/InputManager
 */

import Logger from '../../utils/Logger.js';

class InputManager {
  constructor() {
    if (InputManager.instance) {
      return InputManager.instance;
    }
    InputManager.instance = this;

    this.keys = new Set();
    /**
     * 归一化后的鼠标位置 (-1到1)
     * @type {{x: number, y: number}}
     */
    this.mouse = { x: 0, y: 0 };
    /**
     * 鼠标左键是否按下
     * @type {boolean}
     */
    this.isMouseDown = false;

    /**
     * 注册的动作回调函数
     * @type {Map<string, Function>}
     */
    this.actions = new Map(); // key -> callback
  }

  /**
   * 初始化事件监听
   * @private
   */
  _init() {
    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this._onKeyUp(e));
    window.addEventListener('mousemove', (e) => this._onMouseMove(e));
    window.addEventListener('mousedown', () => (this.isMouseDown = true));
    window.addEventListener('mouseup', () => (this.isMouseDown = false));
    window.addEventListener('dblclick', (e) => this._onDoubleClick(e));

    Logger.log('🎮 InputManager 初始化完成');
  }

  /**
   * 处理键盘按下事件
   * @private
   * @param {KeyboardEvent} event
   */
  _onKeyDown(event) {
    this.keys.add(event.code);

    // Check for combinations
    // Note: Key values like 'KeyS' might need normalization to 'S' for user friendlyness if we want strict matching with 'Ctrl+S'
    // For now assuming registerAction uses "KeyF", "Space", etc. or we normalize.

    // Simple normalization for common keys
    const simpleKey = event.key.length === 1 ? event.key.toUpperCase() : event.code;

    let combo = simpleKey;
    if (event.ctrlKey) combo = 'Ctrl+' + combo;
    // ... extend as needed

    // Direct match check (support both "KeyF" and "F" styles if user registered them)
    if (this.actions.has(combo)) {
      this.actions.get(combo)(event);
    } else if (this.actions.has(event.code)) {
      this.actions.get(event.code)(event);
    }
  }

  /**
   * 处理键盘抬起事件
   * @private
   * @param {KeyboardEvent} event
   */
  _onKeyUp(event) {
    this.keys.delete(event.code);
  }

  /**
   * 处理鼠标移动事件
   * @private
   * @param {MouseEvent} event
   */
  _onMouseMove(event) {
    // Normalize mouse position (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  /**
   * 处理双击事件
   * @private
   * @param {MouseEvent} event
   */
  _onDoubleClick(event) {
    if (this.actions.has('DoubleClick')) {
      this.actions.get('DoubleClick')(event);
    }
  }

  /**
   * 注册动作回调
   * @param {string} combo - 组合键或事件名 (e.g., "Ctrl+S", "Space", "DoubleClick")
   * @param {Function} callback - 回调函数
   */
  registerAction(combo, callback) {
    this.actions.set(combo, callback);
  }

  /**
   * 注销动作回调
   * @param {string} combo
   */
  unregisterAction(combo) {
    this.actions.delete(combo);
  }

  /**
   * 检查按键是否按下
   * @param {string} code - Key code (e.g., "KeyW", "Space")
   * @returns {boolean}
   */
  isKeyPressed(code) {
    return this.keys.has(code);
  }

  /**
   * 获取归一化鼠标位置
   * @returns {{x: number, y: number}} normalized coordinates [-1, 1]
   */
  getMousePosition() {
    return this.mouse;
  }
}

export const inputManager = new InputManager();
