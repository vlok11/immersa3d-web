import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  // 基础推荐配置
  js.configs.recommended,

  // 全局配置
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prettier/prettier': ['warn', { endOfLine: 'auto' }],
    },
  },

  // Prettier 配置（禁用冲突规则）
  prettierConfig,

  // 忽略文件
  {
    ignores: ['dist/**', 'node_modules/**', 'reports/**'],
  },
];
