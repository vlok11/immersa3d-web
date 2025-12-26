/**
 * @fileoverview 场景分析器 - 基于 YOLO 的物体检测与场景理解
 * @module core/AIEngine/SceneAnalyzer
 */

import * as ort from 'onnxruntime-web';

/**
 * 检测到的物体的数据结构
 * @typedef {object} DetectedObject
 * @property {string} label - 类别标签
 * @property {number} confidence - 置信度 (0-1)
 * @property {number[]} bbox - 边界框 [x, y, width, height]
 * @property {number} [mask] - 分割掩码索引 (如果模型支持)
 */

/**
 * COCO 数据集标签 (YOLO 常用)
 */
const COCO_LABELS = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

/**
 * 场景分析器
 * @class
 */
export class SceneAnalyzer {
  constructor() {
    /** @private */
    this._session = null;
    
    /** @private */
    this._modelPath = null;
    
    /** @type {boolean} */
    this.isLoaded = false;
    
    /** @private */
    this._inputSize = [640, 640]; // YOLOv8 默认输入尺寸
  }

  /**
   * 加载模型
   * @param {string} modelPath - ONNX 模型路径
   * @returns {Promise<boolean>}
   */
  async loadModel(modelPath = './models/yolov8n.onnx') {
    if (this.isLoaded && this._modelPath === modelPath) {
      return true;
    }

    try {
      // 设置 ONNX Runtime Web 选项
      const options = {
        executionProviders: ['webgpu', 'wasm'], // 优先使用 WebGPU
        graphOptimizationLevel: 'all'
      };

      console.log('🧠 正在加载场景分析模型 (YOLO)...');
      this._session = await ort.InferenceSession.create(modelPath, options);
      
      this._modelPath = modelPath;
      this.isLoaded = true;
      console.log('✅ 场景分析模型加载完成');
      return true;
      
    } catch (error) {
      console.error('❌ 模型加载失败:', error);
      this.isLoaded = false;
      return false;
    }
  }

  /**
   * 分析图像
   * @param {HTMLImageElement|HTMLCanvasElement} image - 输入图像
   * @param {object} options - 选项
   * @returns {Promise<DetectedObject[]>}
   */
  async analyze(image, options = {}) {
    if (!this.isLoaded) {
      throw new Error('模型未加载');
    }

    const { confidenceThreshold = 0.25, iouThreshold = 0.45 } = options;

    try {
      // 1. 预处理
      const { tensor, scale, padding } = await this._preprocess(image);

      // 2. 推理
      const feeds = { images: tensor };
      const results = await this._session.run(feeds);
      
      // 3. 后处理 (YOLOv8 输出通常是 [1, 84, 8400])
      // 84 = 4 (bbox) + 80 (classes)
      const output = results[Object.keys(results)[0]];
      const detections = this._postprocess(output, scale, padding, confidenceThreshold, iouThreshold);

      console.log(`🔍 检测到 ${detections.length} 个物体`);
      return detections;
      
    } catch (error) {
      console.error('场景分析失败:', error);
      return [];
    }
  }

  /**
   * 预处理图像
   * @private
   */
  async _preprocess(image) {
    const [w, h] = this._inputSize;
    
    // 创建画布进行缩放和填充
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    // 计算保持纵横比的缩放
    const scale = Math.min(w / image.width, h / image.height);
    const nw = Math.round(image.width * scale);
    const nh = Math.round(image.height * scale);
    
    // 居中填充
    const tx = Math.floor((w - nw) / 2);
    const ty = Math.floor((h - nh) / 2);
    
    ctx.fillStyle = '#808080'; // YOLO 常用灰色填充
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(image, 0, 0, image.width, image.height, tx, ty, nw, nh);
    
    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, w, h);
    const { data } = imageData;
    
    // 转换为张量 [1, 3, 640, 640]
    const float32Data = new Float32Array(3 * w * h);
    
    for (let i = 0; i < w * h; i++) {
      // 归一化到 [0, 1]
      float32Data[i] = data[i * 4] / 255.0;           // R
      float32Data[i + w * h] = data[i * 4 + 1] / 255.0;   // G
      float32Data[i + 2 * w * h] = data[i * 4 + 2] / 255.0; // B
    }
    
    const tensor = new ort.Tensor('float32', float32Data, [1, 3, h, w]);
    
    return { 
      tensor, 
      scale, 
      padding: { x: tx, y: ty } 
    };
  }

  /**
   * 后处理
   * @private
   */
  _postprocess(output, scale, padding, confThresh, iouThresh) {
    const boxes = [];
    const data = output.data;
    const [batch, channels, anchors] = output.dims; // [1, 84, 8400]
    
    // 转置数据以便遍历：从 [84, 8400] 逻辑上看每个锚点
    // output.data 是平铺的一维数组
    
    for (let i = 0; i < anchors; i++) {
      // 找到该锚点的最大类别概率
      let maxScore = -Infinity;
      let maxClass = -1;
      
      // 类别分数从索引 4 开始 (0-3 是 bbox)
      for (let c = 0; c < 80; c++) {
        const score = data[(4 + c) * anchors + i];
        if (score > maxScore) {
          maxScore = score;
          maxClass = c;
        }
      }
      
      if (maxScore > confThresh) {
        // 解析边界框 (cx, cy, w, h)
        const cx = data[0 * anchors + i];
        const cy = data[1 * anchors + i];
        const w = data[2 * anchors + i];
        const h = data[3 * anchors + i];
        
        // 转换回原始图像坐标
        // 1. 减去 padding
        // 2. 除以 scale
        // 3. 转换为 x, y, w, h (左上角)
        
        const x = (cx - w / 2 - padding.x) / scale;
        const y = (cy - h / 2 - padding.y) / scale;
        const width = w / scale;
        const height = h / scale;
        
        boxes.push({
          label: COCO_LABELS[maxClass],
          confidence: maxScore,
          bbox: [x, y, width, height],
          classId: maxClass
        });
      }
    }
    
    // 非极大值抑制 (NMS)
    return this._nms(boxes, iouThresh);
  }

  /**
   * 非极大值抑制 (NMS)
   * @private
   */
  _nms(boxes, iouThresh) {
    if (boxes.length === 0) return [];
    
    // 按置信度降序排序
    boxes.sort((a, b) => b.confidence - a.confidence);
    
    const picked = [];
    const active = new Array(boxes.length).fill(true);
    
    for (let i = 0; i < boxes.length; i++) {
      if (!active[i]) continue;
      
      const boxA = boxes[i];
      picked.push(boxA);
      
      for (let j = i + 1; j < boxes.length; j++) {
        if (!active[j]) continue;
        
        const boxB = boxes[j];
        
        // 仅对同类物体进行 IOU 检查
        if (boxA.label === boxB.label) {
          const iou = this._iou(boxA.bbox, boxB.bbox);
          if (iou > iouThresh) {
            active[j] = false;
          }
        }
      }
    }
    
    return picked;
  }

  /**
   * 计算 IOU
   * @private
   */
  _iou(box1, box2) {
    const [x1, y1, w1, h1] = box1;
    const [x2, y2, w2, h2] = box2;
    
    const xi1 = Math.max(x1, x2);
    const yi1 = Math.max(y1, y2);
    const xi2 = Math.min(x1 + w1, x2 + w2);
    const yi2 = Math.min(y1 + h1, y2 + h2);
    
    const interArea = Math.max(0, xi2 - xi1) * Math.max(0, yi2 - yi1);
    const box1Area = w1 * h1;
    const box2Area = w2 * h2;
    
    return interArea / (box1Area + box2Area - interArea);
  }

  /**
   * 销毁
   */
  dispose() {
    // ONNX Runtime 似乎不需要显式销毁 Session，但可以置空
    this._session = null;
    this.isLoaded = false;
    console.log('🗑️ SceneAnalyzer 已销毁');
  }
}

export default SceneAnalyzer;
