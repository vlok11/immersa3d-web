# 🎓 四大核心开源项目深度掌握报告

**研究日期**: 2025-12-26  
**目标**: 全面理解并掌握 Spark、Depth Anything V2、4DGaussians、Open-DiffusionGS

---

## 一、Spark - Three.js 3DGS 渲染器

### 1.1 项目概览

| 信息         | 内容                                                    |
| ------------ | ------------------------------------------------------- |
| **仓库**     | [sparkjsdev/spark](https://github.com/sparkjsdev/spark) |
| **版本**     | v0.1.10                                                 |
| **许可**     | MIT                                                     |
| **官网**     | [sparkjs.dev](https://sparkjs.dev/)                     |
| **设备支持** | 98%+ WebGL2 设备，包括低端手机                          |

### 1.2 核心架构

```
src/
├── SparkRenderer.ts      # 核心渲染器 (38KB)
├── PackedSplats.ts       # 压缩 Splat 数据结构 (25KB)
├── SplatLoader.ts        # 多格式加载器
├── SplatMesh.ts          # Three.js Mesh 集成
├── worker.ts             # Web Worker 并行处理 (19KB)
├── utils.ts              # 工具函数 (44KB)
├── spz.ts                # SPZ 格式解析
├── ply.ts                # PLY 格式解析
├── controls.ts           # 相机控制
├── vrButton.ts           # VR 支持
└── hands.ts              # 手部追踪
```

### 1.3 核心 API

```typescript
// 导入
import {
  SparkRenderer, // 渲染器
  SplatLoader, // 加载器
  PackedSplats, // 数据结构
  SplatMesh, // Three.js 集成
  SparkControls, // 控制器
  VRButton, // VR 支持
} from '@sparkjsdev/spark';

// 支持的文件格式
enum SplatFileType {
  PLY, // 原版高斯格式
  SPLAT, // 轻量格式
  KSPLAT, // 压缩格式
  SPZ, // Niantic 压缩格式
}
```

### 1.4 集成示例

```typescript
import * as THREE from 'three';
import { SparkRenderer, SplatLoader, SplatMesh } from '@sparkjsdev/spark';

// 创建 Three.js 场景
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight);
const renderer = new THREE.WebGLRenderer();

// 创建 Spark 渲染器
const sparkRenderer = new SparkRenderer(renderer);

// 加载 3DGS 文件
const loader = new SplatLoader();
const packedSplats = await loader.load('/path/to/scene.splat');

// 创建 SplatMesh 并添加到场景
const splatMesh = new SplatMesh(packedSplats);
scene.add(splatMesh);

// 渲染循环
function animate() {
  requestAnimationFrame(animate);
  sparkRenderer.render(scene, camera);
}
animate();
```

### 1.5 关键特性

- ✅ **Three.js 原生集成** - 可与普通 Mesh 混合渲染
- ✅ **多格式支持** - PLY, SPLAT, KSPLAT, SPZ
- ✅ **VR/WebXR 支持** - 内置 VRButton
- ✅ **手部追踪** - 支持 WebXR 手势
- ✅ **Web Worker** - 异步加载和排序

---

## 二、Depth Anything V2 - 浏览器深度估计

### 2.1 项目概览

| 信息          | 内容                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------- |
| **仓库**      | [akbartus/DepthAnything-on-Browser](https://github.com/akbartus/DepthAnything-on-Browser) |
| **模型来源**  | [Depth-Anything-ONNX](https://github.com/fabio-sim/Depth-Anything-ONNX)                   |
| **在线 Demo** | [depthanything.glitch.me](https://depthanything.glitch.me/)                               |

### 2.2 可用模型

| 模型                                | 大小      | 精度       | 推荐度     |
| ----------------------------------- | --------- | ---------- | ---------- |
| `model_q4f16.onnx`                  | **18 MB** | 4-bit 量化 | ⭐⭐⭐⭐⭐ |
| `depthanythingv2-vits.onnx`         | 97 MB     | 完整精度   | ⭐⭐⭐⭐   |
| `depthanythingv2-vits-dynamic.onnx` | 97 MB     | 动态输入   | ⭐⭐⭐⭐   |

### 2.3 核心推理流程

```javascript
// 1. 加载 ONNX 模型
const session = await ort.InferenceSession.create('https://cdn.glitch.global/.../model_q4f16.onnx');

// 2. 预处理图像 (RGB → Float32 NCHW)
const preprocess = (imageData, width, height) => {
  const floatArr = new Float32Array(width * height * 3);
  let j = 0;
  for (let i = 0; i < imageData.data.length; i++) {
    if ((i + 1) % 4 !== 0) {
      // 跳过 Alpha 通道
      floatArr[j++] = imageData.data[i] / 255;
    }
  }
  // 重排为 CHW 格式 (通道优先)
  return rearrangeToChw(floatArr, width, height);
};

// 3. 运行推理
const inputTensor = new ort.Tensor('float32', preprocessed, [1, 3, 518, 518]);
const results = await session.run({ image: inputTensor });
const depthTensor = results.depth;

// 4. 后处理 (归一化深度值)
const postprocess = (tensor) => {
  const data = tensor.data;
  const min = Math.min(...data);
  const max = Math.max(...data);
  return data.map((v) => (v - min) / (max - min));
};
```

### 2.4 与 MiDaS 对比

| 维度     | MiDaS (当前) | Depth Anything V2 |
| -------- | ------------ | ----------------- |
| 发布年份 | 2020         | 2024              |
| 模型大小 | ~20 MB       | **18 MB** (量化)  |
| 输入尺寸 | 256×256      | **518×518**       |
| 边缘质量 | 一般         | **更清晰**        |
| 细节保留 | 一般         | **更丰富**        |

### 2.5 WebGPU 加速

项目还提供 WebGPU 版本，在支持的浏览器上速度更快：

- `webgpu-example.html` - 基础 WebGPU 示例
- `webgpu-sliders.html` - 带参数调节的 WebGPU 版本

---

## 三、4DGaussians - 动态场景 3DGS

### 3.1 项目概览

| 信息           | 内容                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **仓库**       | [hustvl/4DGaussians](https://github.com/hustvl/4DGaussians)                                                                                             |
| **论文**       | [CVPR 2024](https://arxiv.org/abs/2310.08528)                                                                                                           |
| **项目主页**   | [guanjunwu.github.io/4dgs](https://guanjunwu.github.io/4dgs/index.html)                                                                                 |
| **Colab Demo** | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/drive/1wz0D5Y9egAlcxXy8YO9UmpQ9oH51R7OW) |

### 3.2 核心思想

```
3D 高斯 → 4D 时空高斯
       ↓
时间 t 处的高斯参数 = f(基础高斯, 变形场, t)
```

**关键技术**：

1. **HexPlane 变形场** - 高效的时空特征存储
2. **可微分渲染** - 端到端训练
3. **实时渲染** - 动态场景也能达到 >100 FPS

### 3.3 训练流程

```bash
# 1. 准备数据
# 需要多视角视频序列

# 2. 训练 4D 高斯模型
python train.py -s <数据路径> --exp_name <实验名>

# 3. 渲染
python render.py --model_path <模型路径>

# 4. 评估
python metrics.py --model_path <模型路径>
```

### 3.4 与原版 3DGS 对比

| 维度     | 3DGS (静态) | 4DGS (动态) |
| -------- | ----------- | ----------- |
| 时间维度 | ❌ 不支持   | ✅ 支持     |
| 输入数据 | 多视角图片  | 多视角视频  |
| 变形建模 | ❌          | ✅ HexPlane |
| 渲染速度 | >100 FPS    | >100 FPS    |

### 3.5 对 Immersa 3D 的启示

> [!NOTE]
> 4DGaussians 需要 CUDA GPU 训练，但其**思想**可以指导我们：
>
> - 如何表示随时间变化的 3D 场景
> - 如何高效存储时空特征
> - 未来可能出现浏览器端的 4D 查看器

---

## 四、Open-DiffusionGS - 单图生成 3D

### 4.1 项目概览

| 信息             | 内容                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| **仓库**         | [caiyuanhao1998/Open-DiffusionGS](https://github.com/caiyuanhao1998/Open-DiffusionGS)                 |
| **论文**         | [ICCV 2025](https://arxiv.org/abs/2411.14384)                                                         |
| **项目主页**     | [caiyuanhao1998.github.io/project/DiffusionGS](https://caiyuanhao1998.github.io/project/DiffusionGS/) |
| **Hugging Face** | [CaiYuanhao/DiffusionGS](https://huggingface.co/datasets/CaiYuanhao/DiffusionGS)                      |

### 4.2 核心思想

```
传统方法: 图片 → 深度图 → Mesh/NeRF → 优化 → 3D
DiffusionGS: 图片 → 扩散模型 → 直接输出 3DGS 参数
```

**创新点**：

- 将 3DGS 参数"烘焙"进扩散模型的去噪器
- 单阶段端到端生成
- 比传统方法快得多

### 4.3 训练流程 (4 阶段)

```bash
# Stage 1: 物体模型 (256分辨率)
bash scripts/train_obj_stage1.py

# Stage 2: 物体模型 (512分辨率)
bash scripts/train_obj_stage2.py

# Stage 3: 场景模型 (256分辨率)
bash scripts/train_scene_stage1.py

# Stage 4: 场景模型 (512分辨率)
bash scripts/train_scene_stage2.py
```

### 4.4 与 Apple SHARP 对比

| 维度     | Apple SHARP | Open-DiffusionGS           |
| -------- | ----------- | -------------------------- |
| 发布时间 | 2025-12     | 2024-11                    |
| 会议     | arXiv       | ICCV 2025                  |
| 方法     | 前馈预测    | 扩散模型                   |
| 输入     | 单图        | 单图                       |
| 训练数据 | 未公开      | RealEstate10K + Gobjaverse |
| 代码开源 | ✅          | ✅                         |

### 4.5 对 Immersa 3D 的启示

> [!IMPORTANT]
> Open-DiffusionGS 代表了未来的方向：**单图直接生成 3DGS**。
> 虽然目前需要 GPU 服务器，但：
>
> - 模型可能被蒸馏/量化
> - 未来可能出现浏览器端版本
> - 可以作为后端 API 集成

---

## 五、技术对比总结

| 项目                  | 类型     | 浏览器可用  | 对项目价值    | 集成难度 |
| --------------------- | -------- | ----------- | ------------- | -------- |
| **Spark**             | 渲染器   | ✅          | ⭐⭐⭐⭐⭐    | 低       |
| **Depth Anything V2** | 深度模型 | ✅          | ⭐⭐⭐⭐⭐    | 低       |
| **4DGaussians**       | 训练框架 | ❌          | ⭐⭐⭐ (学习) | N/A      |
| **Open-DiffusionGS**  | 生成模型 | ❌ (需后端) | ⭐⭐⭐⭐      | 高       |

---

## 六、推荐行动计划

### 立即可做 ✅

1. **集成 Spark** - 添加 3DGS 查看能力
2. **升级到 Depth Anything V2** - 替代 MiDaS

### 中期目标 🔮

3. **研究 Open-DiffusionGS** - 探索后端 API 集成

### 长期关注 👀

4. **跟踪 4DGaussians** - 等待浏览器端实现

---

## 七、代码参考

### Spark + Three.js 完整示例

```typescript
import * as THREE from 'three';
import { SparkRenderer, SplatLoader, SplatMesh } from '@sparkjsdev/spark';

class GaussianViewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private sparkRenderer: SparkRenderer;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.sparkRenderer = new SparkRenderer(this.renderer);

    container.appendChild(this.renderer.domElement);
    this.animate();
  }

  async loadSplat(url: string): Promise<void> {
    const loader = new SplatLoader();
    const packed = await loader.load(url);
    const mesh = new SplatMesh(packed);
    this.scene.add(mesh);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.sparkRenderer.render(this.scene, this.camera);
  };
}
```

### Depth Anything V2 集成示例

```javascript
class DepthAnythingEstimator {
  constructor() {
    this.session = null;
    this.inputSize = 518;
  }

  async init() {
    this.session = await ort.InferenceSession.create(
      'https://cdn.glitch.global/.../model_q4f16.onnx'
    );
  }

  async estimate(imageElement) {
    // 绘制到 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = this.inputSize;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0, this.inputSize, this.inputSize);
    const imageData = ctx.getImageData(0, 0, this.inputSize, this.inputSize);

    // 预处理
    const input = this.preprocess(imageData);
    const tensor = new ort.Tensor('float32', input, [1, 3, this.inputSize, this.inputSize]);

    // 推理
    const results = await this.session.run({ image: tensor });
    return this.postprocess(results.depth);
  }

  preprocess(imageData) {
    // ... (见上文完整实现)
  }

  postprocess(tensor) {
    // ... (见上文完整实现)
  }
}
```
