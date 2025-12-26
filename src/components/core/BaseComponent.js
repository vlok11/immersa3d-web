/**
 * @fileoverview Web Components 基类
 * @module components/core/BaseComponent
 */

export class BaseComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._state = {};
    this._styles = '';
  }

  /**
   * 连接回调
   */
  connectedCallback() {
    this.render();
    this.addEventListeners();
  }

  /**
   * 断开回调
   */
  disconnectedCallback() {
    this.removeEventListeners();
  }

  /**
   * 设置状态
   * @param {object} newState
   */
  setState(newState) {
    this._state = { ...this._state, ...newState };
    this.render();
  }

  /**
   * 添加事件监听器
   * @virtual
   */
  addEventListeners() {}

  /**
   * 移除事件监听器
   * @virtual
   */
  removeEventListeners() {}

  /**
   * 定义样式
   * @param {string} css
   */
  setStyles(css) {
    this._styles = css;
  }

  /**
   * 渲染组件
   * @virtual
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Inter', sans-serif;
        }
        * {
          box-sizing: border-box;
        }
        ${this._styles}
      </style>
      ${this.template()}
    `;
  }

  /**
   * 组件模板
   * @virtual
   * @returns {string}
   */
  template() {
    return '<div>Base Component</div>';
  }

  /**
   * 触发自定义事件
   * @param {string} name
   * @param {any} detail
   */
  emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true
    }));
  }

  /**
   * 获取 DOM 元素
   * @param {string} selector
   * @returns {HTMLElement}
   */
  $(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  /**
   * 获取所有 DOM 元素
   * @param {string} selector
   * @returns {NodeList}
   */
  $$(selector) {
    return this.shadowRoot.querySelectorAll(selector);
  }
}
