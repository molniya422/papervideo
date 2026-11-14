export type Caption = { text: string; weight: number };

export type Shot = {
  id: string;
  audio: string;
  frames: number;
  chapter: string;
  accent: string;
  captions: Caption[];
};

// 帧长 = 旁白实测时长 × 30fps + 12 帧留白
export const SHOTS: Shot[] = [
  {
    id: "s1",
    audio: "seg1",
    frames: 536,
    chapter: "开篇 · 四个字的论文",
    accent: "#4ea8ff",
    captions: [
      { text: "2017 年，谷歌的八位研究员发了一篇论文", weight: 3 },
      { text: "标题只有四个词：Attention Is All You Need", weight: 3 },
      { text: "今天所有大模型，几乎都是它的直系后代", weight: 3 },
    ],
  },
  {
    id: "s2",
    audio: "seg2",
    frames: 689,
    chapter: "01 · RNN 的两个死结",
    accent: "#ff7a45",
    captions: [
      { text: "在此之前，机器翻译几乎都靠循环神经网络", weight: 2.6 },
      { text: "RNN 像一个逐字读书的人：读完一个词，再读下一个", weight: 2.6 },
      { text: "代价一：必须串行，GPU 的并行算力被闲置", weight: 2.5 },
      { text: "代价二：首尾相隔越远，信息衰减得越厉害", weight: 2.3 },
    ],
  },
  {
    id: "s3",
    audio: "seg3",
    frames: 511,
    chapter: "02 · 一步直达",
    accent: "#4ea8ff",
    captions: [
      { text: "Transformer 的回答简单到粗暴", weight: 1.4 },
      { text: "让每个词直接看到句子里所有其他词", weight: 2.2 },
      { text: "任意两个词之间，都只有一步之遥", weight: 2 },
    ],
  },
  {
    id: "s4",
    audio: "seg4",
    frames: 570,
    chapter: "03 · Query / Key / Value",
    accent: "#a78bfa",
    captions: [
      { text: "每个词被投影成三个向量：Q、K、V", weight: 1.6 },
      { text: "Query 是我在找什么，Key 是我的标签，Value 是我的内容", weight: 2.4 },
      { text: "Query 与所有 Key 做点积，得到关联分数", weight: 1.8 },
      { text: "分数越高，Value 就越强地流向那个词", weight: 1.8 },
    ],
  },
  {
    id: "s5",
    audio: "seg5",
    frames: 801,
    chapter: "04 · 那个除以根号 dk",
    accent: "#fbbf24",
    captions: [
      { text: "这里有个魔鬼细节：点积要除以根号 dk", weight: 1.5 },
      { text: "若 q、k 各分量方差为 1，点积的方差正好是 dk", weight: 1.9 },
      { text: "dk = 64 时，分数的标准差达到 8", weight: 1.7 },
      { text: "softmax 被推到接近 one-hot 的区域，梯度几乎消失", weight: 2.0 },
      { text: "除以 8，方差回到 1，梯度才能流动", weight: 1.6 },
    ],
  },
  {
    id: "s6",
    audio: "seg6",
    frames: 628,
    chapter: "05 · 八个头一起读",
    accent: "#a78bfa",
    captions: [
      { text: "一次注意力，只能盯住一种关系", weight: 1.3 },
      { text: "于是拆成八个头，每个头 64 维", weight: 1.6 },
      { text: "在各自的子空间里独立计算，最后拼接", weight: 1.7 },
      { text: "八位读者同时阅读：语法、指代、搭配，各司其职", weight: 1.9 },
    ],
  },
  {
    id: "s7",
    audio: "seg7",
    frames: 644,
    chapter: "06 · 位置从哪来",
    accent: "#22d3ee",
    captions: [
      { text: "可没有循环、没有卷积，模型根本不知道词序", weight: 1.8 },
      { text: "办法是叠加正弦波：波长从 2π 排到一万倍的 2π", weight: 2.0 },
      { text: "每个位置，都获得一串独一无二的波形指纹", weight: 1.8 },
      { text: "相对位置，就这样被天然编码", weight: 1.4 },
    ],
  },
  {
    id: "s8",
    audio: "seg8",
    frames: 567,
    chapter: "07 · 数字有多硬",
    accent: "#34d399",
    captions: [
      { text: "WMT 2014 英德翻译，28.4 BLEU", weight: 1.3 },
      { text: "比此前所有模型、包括集成系统，高出 2 分以上", weight: 1.9 },
      { text: "训练算力，只要对手的八分之一", weight: 1.5 },
      { text: "GPT、BERT，都沿着这条路一路长大", weight: 1.6 },
    ],
  },
  {
    id: "s9",
    audio: "seg9",
    frames: 608,
    chapter: "收尾 · 结构的胜利",
    accent: "#4ea8ff",
    captions: [
      { text: "编码器负责理解，解码器负责生成", weight: 1.4 },
      { text: "中间靠交叉注意力连接", weight: 1.2 },
      { text: "最深的启示：当硬件允许时", weight: 1.4 },
      { text: "把复杂的结构先验，换成简单而强大的算子", weight: 1.9 },
    ],
  },
];

export const SHOT_STARTS: number[] = SHOTS.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SHOTS[i - 1].frames);
  return acc;
}, []);

export const TOTAL_FRAMES = SHOTS.reduce((s, x) => s + x.frames, 0);

/** 给定镜头内进度，返回当前字幕与本地淡入淡出透明度 */
export const captionAt = (shot: Shot, local: number) => {
  const total = shot.captions.reduce((s, c) => s + c.weight, 0);
  const pos = Math.max(0, Math.min(shot.frames - 1, local));
  let acc = 0;
  for (let i = 0; i < shot.captions.length; i++) {
    const c = shot.captions[i];
    const start = (acc / total) * shot.frames;
    acc += c.weight;
    const end = (acc / total) * shot.frames;
    if (pos >= start && pos < end) {
      const fade = 8;
      const op = Math.min(1, (pos - start) / fade, (end - pos) / fade);
      return { text: c.text, opacity: Math.max(0, Math.min(1, op)) };
    }
  }
  return { text: shot.captions[shot.captions.length - 1].text, opacity: 1 };
};

export const shotAt = (frame: number) => {
  for (let i = SHOTS.length - 1; i >= 0; i--) {
    if (frame >= SHOT_STARTS[i]) {
      return { index: i, shot: SHOTS[i], local: frame - SHOT_STARTS[i] };
    }
  }
  return { index: 0, shot: SHOTS[0], local: 0 };
};
