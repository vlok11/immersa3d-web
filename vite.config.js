import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import glsl from 'vite-plugin-glsl';
import { imagetools } from 'vite-imagetools';
import { comlink } from 'vite-plugin-comlink';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  // 全局常量定义
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

  plugins: [
    // GLSL Shader 支持 (Three.js)
    glsl(),

    // 图片优化 (WebP/AVIF 转换)
    imagetools({
      defaultDirectives: (url) => {
        if (url.searchParams.has('texture')) {
          return new URLSearchParams({
            format: 'webp',
            quality: '85',
            width: '1024',
          });
        }
        return new URLSearchParams();
      },
    }),

    // Web Worker 支持 (AI 推理)
    comlink(),

    // Brotli 压缩 (WASM/模型文件优化)
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024, // 只压缩 > 1KB 的文件
      deleteOriginFile: false,
    }),

    // Bundle 分析
    visualizer({
      open: false, // 构建后不自动打开
      gzipSize: true,
      brotliSize: true,
      filename: 'reports/bundle-stats.html',
    }),

    // PWA 配置
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Immersa 3D',
        short_name: 'Immersa3D',
        description: 'AI驱动3D内容创作工具',
        theme_color: '#1a1a2e',
        background_color: '#0f0f1a',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:onnx|bin|json)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ai-models-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],

  server: {
    port: 5173,
    open: true,
    headers: {
      // Required for SharedArrayBuffer (FFmpeg.wasm)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    assetsInlineLimit: 8192, // 8 KB - 小资源内联优化
    chunkSizeWarningLimit: 1000, // 1 MB - 消除大 chunk 警告
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          tensorflow: ['@tensorflow/tfjs'],
          onnx: ['onnxruntime-web'],
          ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          gsap: ['gsap'],
        },
      },
    },
  },

  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },

  assetsInclude: ['**/*.onnx', '**/*.bin'],
});
