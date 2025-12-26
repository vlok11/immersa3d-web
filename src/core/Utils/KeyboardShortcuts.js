/**
 * @fileoverview 键盘快捷键管理器
 * @module core/Utils/KeyboardShortcuts
 */

export class KeyboardShortcuts {
  constructor() {
    /** @type {Map<string, function>} */
    this.shortcuts = new Map();

    /** @type {boolean} */
    this.isEnabled = true;

    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  init() {
    window.addEventListener('keydown', this._handleKeyDown);
  }

  dispose() {
    window.removeEventListener('keydown', this._handleKeyDown);
    this.shortcuts.clear();
  }

  /**
   * 注册快捷键
   * @param {string} keys - 例如 'Ctrl+Z', 'Space', 'Shift+A'
   * @param {function} callback
   * @param {string} description
   */
  register(keys, callback, description = '') {
    // 规范化键名: lower case, sorted modifiers
    const id = this._normalizeKey(keys);
    this.shortcuts.set(id, { callback, description });
    console.log(`🎹 注册快捷键: ${keys} (${description})`);
  }

  /**
   * 解除注册
   */
  unregister(keys) {
    const id = this._normalizeKey(keys);
    this.shortcuts.delete(id);
  }

  /**
   * 处理按键按下
   * @param {KeyboardEvent} event
   */
  _handleKeyDown(event) {
    if (!this.isEnabled) return;

    // 忽略输入框中的按键
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    const parts = [];
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');

    // Key processing
    let key = event.key.toLowerCase();
    if (key === ' ') key = 'space';
    if (key === 'control' || key === 'shift' || key === 'alt' || key === 'meta') return;

    parts.push(key);

    const id = parts.join('+');

    if (this.shortcuts.has(id)) {
      event.preventDefault();
      const { callback, description } = this.shortcuts.get(id);
      console.log(`🎹 触发快捷键: ${id} (${description})`);
      callback(event);
    }
  }

  _normalizeKey(keys) {
    return keys.toLowerCase().replace(/\s+/g, '');
  }
}

export const keyboardShortcuts = new KeyboardShortcuts();
