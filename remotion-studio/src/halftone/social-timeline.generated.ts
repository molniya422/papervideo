// ⚠️ 由 tts_build.py 自动生成，请勿手改；改旁白后重跑脚本。
export type Sentence = {text: string; audio: string; frames: number; start: number; seconds: number};
export type Shot = {
  id: string; chapter: string; accent: string; title: string; kicker: string;
  bullets: string[]; bulletAt: number[]; hero: boolean;
  sentences: Sentence[]; frames: number; start: number;
};

export const SHOTS: Shot[] = [
  {
    id: "k1", chapter: "钩子", accent: "#ff3d00",
    title: "为什么能同时看懂所有词？", kicker: "钩子",
    bullets: [], bulletAt: [], hero: false,
    sentences: [
      {text: "Transformer，为什么能同时看懂一句话里的所有词？", audio: "k1-1", frames: 149, start: 0, seconds: 4.73},
    ],
    frames: 171, start: 0,
  },
  {
    id: "k2", chapter: "例句", accent: "#ffd21e",
    title: "先把每个词变成向量", kicker: "例句",
    bullets: ["The cat sat · it 指代谁？"], bulletAt: [0], hero: false,
    sentences: [
      {text: "先把每个词变成向量，再让其中一个词发出提问。", audio: "k2-1", frames: 140, start: 0, seconds: 4.42},
    ],
    frames: 162, start: 171,
  },
  {
    id: "k3", chapter: "Q K V", accent: "#4ea8ff",
    title: "三个角色：Q · K · V", kicker: "Q K V",
    bullets: ["Q 提问", "K 挂标签", "V 带内容"], bulletAt: [0, 0, 0], hero: false,
    sentences: [
      {text: "每个词派生三个角色：提问的 Q，挂标签的 K，带内容的 V。", audio: "k3-1", frames: 174, start: 0, seconds: 5.54},
    ],
    frames: 196, start: 333,
  },
  {
    id: "k4", chapter: "先找相关性", accent: "#ff3d00",
    title: "先找相关性", kicker: "先找相关性",
    bullets: ["Q 和每个 K 做点积", "分数越高，关系越强"], bulletAt: [0, 0], hero: false,
    sentences: [
      {text: "拿 Q 和每个 K 做点积：分数越高，关系越强。", audio: "k4-1", frames: 146, start: 0, seconds: 4.63},
    ],
    frames: 168, start: 529,
  },
  {
    id: "k5", chapter: "再把分数变成权重", accent: "#a78bfa",
    title: "再把分数变成权重", kicker: "再把分数变成权重",
    bullets: ["softmax 归一", "加起来等于一"], bulletAt: [0, 0], hero: false,
    sentences: [
      {text: "softmax 把分数变成权重：加起来等于一。", audio: "k5-1", frames: 140, start: 0, seconds: 4.42},
    ],
    frames: 162, start: 697,
  },
  {
    id: "k6", chapter: "最后加权求和", accent: "#34d399",
    title: "最后加权求和", kicker: "最后加权求和",
    bullets: ["按权重取回 V", "得到新表示"], bulletAt: [0, 0], hero: false,
    sentences: [
      {text: "再按权重把 V 加起来，这个词就有了新的表示。", audio: "k6-1", frames: 141, start: 0, seconds: 4.44},
    ],
    frames: 163, start: 859,
  },
  {
    id: "k7", chapter: "再往上堆", accent: "#22d3ee",
    title: "多头 · 位置", kicker: "再往上堆",
    bullets: ["8 个头盯不同关系", "位置编码补词序"], bulletAt: [0, 0], hero: false,
    sentences: [
      {text: "拆成八个头同时盯不同关系，再用位置编码补上词序。", audio: "k7-1", frames: 170, start: 0, seconds: 5.42},
    ],
    frames: 192, start: 1022,
  },
  {
    id: "k8", chapter: "结论", accent: "#ff8c42",
    title: "Attention 的核心", kicker: "结论",
    bullets: ["下一集：Multi-Head Attention", "收藏，之后复习 Transformer"], bulletAt: [0, 0], hero: false,
    sentences: [
      {text: "这就是注意力：根据上下文，重新计算每个词的表示。", audio: "k8-1", frames: 154, start: 0, seconds: 4.9},
    ],
    frames: 176, start: 1214,
  },
];

export const TOTAL_FRAMES = 1390;
export const FPS = 30;
