# 🔧 Vite 配置深度分析报告

## 1. 当前配置概览

**文件**: `vite.config.js` (137 行)  
**Vite 版本**: 7.3.0

### 已配置项 ✅

| 类别       | 配置项                                                              | 状态    |
| ---------- | ------------------------------------------------------------------- | ------- |
| **插件**   | 7 个插件（GLSL, ImageTools, Comlink, Compression, Visualizer, PWA） | ✅ 完善 |
| **服务器** | `port`, `open`, `headers` (COOP/COEP)                               | ✅ 良好 |
| **构建**   | `target`, `minify`, `sourcemap`, `rollupOptions.manualChunks`       | ✅ 良好 |
| **优化**   | `optimizeDeps.exclude`                                              | ✅ 正确 |
| **资源**   | `assetsInclude`                                                     | ✅ 正确 |

### 未配置项（可优化）⚠️

| 类别     | 配置项                        | 建议                             |
| -------- | ----------------------------- | -------------------------------- |
| **共享** | `define`                      | 添加全局常量（版本号、API 地址） |
| **共享** | `resolve.alias`               | 简化导入路径                     |
| **构建** | `build.assetsInlineLimit`     | 优化小资源内联                   |
| **构建** | `build.chunkSizeWarningLimit` | 消除警告                         |
| **CSS**  | `css.devSourcemap`            | 开发环境调试                     |
| **JSON** | `json.stringify`              | 大型 JSON 优化                   |
| **日志** | `logLevel`                    | 生产环境静默                     |

---

## 2. 详细优化建议

### A. 添加全局常量 `define`

**用途**: 注入版本号、API 地址等全局变量

```javascript
define: {
  __APP_VERSION__: JSON.stringify('1.0.0'),
  __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
},
```

**收益**: 方便版本追踪和环境区分

---

### B. 路径别名 `resolve.alias`

**用途**: 简化 `import` 路径，避免 `../../` 地狱

```javascript
resolve: {
  alias: {
    '@': '/src',
    '@components': '/src/components',
    '@modules': '/src/modules',
    '@core': '/src/core',
  },
},
```

**使用前**: `import { App } from '../../main.js'`  
**使用后**: `import { App } from '@/main.js'`

---

### C. 小资源内联 `build.assetsInlineLimit`

**当前**: 默认 4096 (4 KB)  
**建议**: 提高到 8192 (8 KB)

```javascript
build: {
  assetsInlineLimit: 8192, // 8 KB
  // ...
},
```

**收益**: 减少小文件 HTTP 请求

---

### D. Chunk 大小警告 `build.chunkSizeWarningLimit`

**问题**: 构建时显示 `Some chunks are larger than 500 kB` 警告  
**解决**:

```javascript
build: {
  chunkSizeWarningLimit: 1000, // 1 MB
  // ...
},
```

**注意**: 这只是消除警告，大 chunk 问题仍需优化 manualChunks

---

### E. CSS 开发调试 `css.devSourcemap`

**用途**: 开发时定位 CSS 源码位置

```javascript
css: {
  devSourcemap: true,
},
```

---

### F. JSON 优化 `json.stringify`

**用途**: 大型 JSON 文件性能优化（如 AI 模型配置）

```javascript
json: {
  stringify: 'auto', // Vite 7 默认，自动优化大 JSON
},
```

---

### G. 情景配置（高级）

**用途**: 开发/生产环境使用不同配置

```javascript
export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';

  return {
    // 开发环境专属
    logLevel: isDev ? 'info' : 'warn',

    build: {
      sourcemap: isDev ? true : false,
      // ...
    },
  };
});
```

---

## 3. 优化后完整配置示例

```javascript
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import glsl from 'vite-plugin-glsl';
import { imagetools } from 'vite-imagetools';
import { comlink } from 'vite-plugin-comlink';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';

  return {
    // 全局常量
    define: {
      __APP_VERSION__: JSON.stringify('1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    // 路径别名
    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@modules': '/src/modules',
        '@core': '/src/core',
      },
    },

    // CSS
    css: {
      devSourcemap: isDev,
    },

    // 日志级别
    logLevel: isDev ? 'info' : 'warn',

    plugins: [
      // ...现有插件保持不变
    ],

    server: {
      // ...现有配置保持不变
    },

    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: isDev,
      assetsInlineLimit: 8192,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            // ...现有配置保持不变
          },
        },
      },
    },

    optimizeDeps: {
      // ...现有配置保持不变
    },

    assetsInclude: ['**/*.onnx', '**/*.bin'],
  };
});
```

---

## 4. 优化优先级

| 优先级     | 配置项                  | 影响     | 复杂度 |
| ---------- | ----------------------- | -------- | ------ |
| ⭐⭐⭐⭐⭐ | `resolve.alias`         | 开发体验 | 低     |
| ⭐⭐⭐⭐   | `define`                | 版本管理 | 低     |
| ⭐⭐⭐⭐   | `chunkSizeWarningLimit` | 消除警告 | 低     |
| ⭐⭐⭐     | `assetsInlineLimit`     | 性能     | 低     |
| ⭐⭐⭐     | 情景配置                | 灵活性   | 中     |
| ⭐⭐       | `css.devSourcemap`      | 调试     | 低     |

---

## 5. 总结

当前配置 **评分**: 🟢 **85/100**（良好）

**已做好的部分**:

- 插件生态完善
- 服务器配置正确（COOP/COEP）
- 构建优化到位（manualChunks）

**可改进的部分**:

- 缺少路径别名（开发体验）
- 未使用情景配置（灵活性）
- 警告未处理（chunkSizeWarningLimit）
