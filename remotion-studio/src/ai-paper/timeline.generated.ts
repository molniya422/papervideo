// ⚠️ 由 tts_build.py 自动生成，请勿手改；改旁白后重跑脚本。
export type Sentence = {text: string; audio: string; frames: number; start: number; seconds: number};
export type Shot = {
  id: string; chapter: string; accent: string; title: string; kicker: string;
  bullets: string[]; bulletAt: number[]; hero: boolean;
  sentences: Sentence[]; frames: number; start: number;
};

export const SHOTS: Shot[] = [
  {
    id: "s01", chapter: "开篇 · 四个词的论文", accent: "#4ea8ff",
    title: "Attention Is All You Need", kicker: "NeurIPS 2017 · arXiv 1706.03762",
    bullets: ["没有新层，没有新技巧，只换掉了循环结构", "今天所有大模型，几乎都是它的直系后代", "这五分钟，回答三个问题：解决什么、怎么算、为什么有效"], bulletAt: [0, 362, 502], hero: true,
    sentences: [
      {text: "2017 年，八位谷歌研究员发表了一篇论文，标题只有四个词。", audio: "s01-1", frames: 178, start: 0, seconds: 5.69},
      {text: "它没有提出新的网络层，也没有新的训练技巧，只是换掉了循环结构。", audio: "s01-2", frames: 184, start: 178, seconds: 5.88},
      {text: "但今天几乎所有大语言模型，都建立在它的基础上。", audio: "s01-3", frames: 140, start: 362, seconds: 4.42},
      {text: "接下来五分钟，我们把它拆开讲清楚：它解决什么问题，核心机制是什么，为什么有效。", audio: "s01-4", frames: 231, start: 502, seconds: 7.44},
    ],
    frames: 755, start: 0,
  },
  {
    id: "s02", chapter: "01 · 循环的两个死结", accent: "#ff7a45",
    title: "RNN 为什么不够用", kicker: "SERIAL BOTTLENECK",
    bullets: ["逐词传递：GPU 几千个核心，却只能排队等", "长依赖：句首到句尾要走二十步，每步都衰减", "路径长度 O(n)：越远的关系，越学不动"], bulletAt: [0, 386, 853], hero: false,
    sentences: [
      {text: "在 Transformer 之前，机器翻译的主流是循环神经网络。", audio: "s02-1", frames: 160, start: 0, seconds: 5.09},
      {text: "它的工作方式，像一个人逐字读书：读完第一个词，把理解存进记忆，再读第二个词。", audio: "s02-2", frames: 226, start: 160, seconds: 7.3},
      {text: "问题是，这种记忆必须一步一步传递，GPU 有几千个核心，却只能排队等。", audio: "s02-3", frames: 218, start: 386, seconds: 7.03},
      {text: "更麻烦的是长距离依赖：句首的主语和句尾的动词隔了二十个词，信号就要传递二十次。", audio: "s02-4", frames: 249, start: 604, seconds: 8.06},
      {text: "每传一次都会衰减一点，所以句子一长，模型就开始遗忘。", audio: "s02-5", frames: 177, start: 853, seconds: 5.64},
    ],
    frames: 1052, start: 755,
  },
  {
    id: "s03", chapter: "02 · 注意力就是查字典", accent: "#4ea8ff",
    title: "让每个词，直接看到所有词", kicker: "SOFT LOOKUP",
    bullets: ["Query：我手里的问题", "Key：每个词条的标签", "Value：词条的内容 —— 按匹配度加权取回"], bulletAt: [0, 411, 793], hero: false,
    sentences: [
      {text: "Transformer 的想法是：与其让信息排队传递，不如让每个词直接看到所有词。", audio: "s03-1", frames: 208, start: 0, seconds: 6.67},
      {text: "可以把它想成查字典：你手里有一个问题，字典里每个词条都有标签和解释。", audio: "s03-2", frames: 203, start: 208, seconds: 6.53},
      {text: "问题叫 Query，标签叫 Key，解释叫 Value。", audio: "s03-3", frames: 141, start: 411, seconds: 4.44},
      {text: "注意力做的事，就是拿你的问题去和所有标签比对，越匹配的词条，它的解释就越重要。", audio: "s03-4", frames: 241, start: 552, seconds: 7.78},
      {text: "最后按匹配程度，把所有解释加权混合起来，作为这个位置的新表示。", audio: "s03-5", frames: 190, start: 793, seconds: 6.07},
    ],
    frames: 1005, start: 1807,
  },
  {
    id: "s04", chapter: "03 · 一步一步算一遍", accent: "#a78bfa",
    title: "点积 → softmax → 加权", kicker: "THE COMPUTATION",
    bullets: ["点积衡量方向一致程度：越一致，分数越高", "softmax 把分数变成概率：高者更大，低者趋零", "先用概率加权 Value，再汇总成新表示"], bulletAt: [0, 313, 920], hero: false,
    sentences: [
      {text: "具体怎么算？先看匹配程度。", audio: "s04-1", frames: 114, start: 0, seconds: 3.55},
      {text: "把 Query 和每个 Key 做点积：方向越一致，点积越大，说明越匹配。", audio: "s04-2", frames: 199, start: 114, seconds: 6.38},
      {text: "所有分数排成一行，再用 softmax 变成概率：分数高的占比大，分数低的接近零。", audio: "s04-3", frames: 232, start: 313, seconds: 7.49},
      {text: "然后拿这些概率，对 Value 做加权求和。", audio: "s04-4", frames: 123, start: 545, seconds: 3.84},
      {text: "这就是一次注意力。写成矩阵，就是 softmax 括号 Q K 转置，除以根号 d k，再乘以 V。", audio: "s04-5", frames: 252, start: 668, seconds: 8.16},
      {text: "整个句子的所有位置，一次矩阵乘法同时算完，这就是它能并行的原因。", audio: "s04-6", frames: 211, start: 920, seconds: 6.79},
    ],
    frames: 1153, start: 2812,
  },
  {
    id: "s05", chapter: "04 · 那个除以根号 dk", accent: "#fbbf24",
    title: "一个细节决定能否训练", kicker: "STABILITY",
    bullets: ["各分量独立、方差为 1 ⇒ 点积方差 = dk", "dk = 64 ⇒ 标准差 8 ⇒ softmax 饱和", "梯度趋零 ⇒ 除以 8 把方差拉回 1"], bulletAt: [0, 494, 961], hero: false,
    sentences: [
      {text: "公式里有一个不起眼的细节：除以根号 d k。", audio: "s05-1", frames: 133, start: 0, seconds: 4.2},
      {text: "假设 q 和 k 的每个分量互相独立，方差都是一，那么它们的点积，方差就是 d k。", audio: "s05-2", frames: 231, start: 133, seconds: 7.46},
      {text: "d k 等于六十四，点积的标准差就是八。", audio: "s05-3", frames: 130, start: 364, seconds: 4.08},
      {text: "softmax 面对正负八这么大的分数，会变得非常极端：最大的接近一，其余接近零。", audio: "s05-4", frames: 218, start: 494, seconds: 7.03},
      {text: "这时候梯度几乎消失，模型学不动。", audio: "s05-5", frames: 123, start: 712, seconds: 3.86},
      {text: "除以八，把方差拉回一，训练才稳定。", audio: "s05-6", frames: 126, start: 835, seconds: 3.94},
      {text: "论文只在脚注里写了这个推导，但它决定了模型能不能训起来。", audio: "s05-7", frames: 185, start: 961, seconds: 5.9},
    ],
    frames: 1168, start: 3965,
  },
  {
    id: "s06", chapter: "05 · 八个头，八种关系", accent: "#a78bfa",
    title: "多头注意力", kicker: "CAPACITY",
    bullets: ["8 个头 × 64 维 = 512 维，总计算量几乎不变", "不同头自发分工：句法、指代、搭配、局部", "拼接后再投影，得到最终表示"], bulletAt: [0, 297, 787], hero: false,
    sentences: [
      {text: "一次注意力，只能表达一种关系。", audio: "s06-1", frames: 107, start: 0, seconds: 3.31},
      {text: "但语言里的关系有很多种：主谓、指代、修饰、搭配。", audio: "s06-2", frames: 190, start: 107, seconds: 6.1},
      {text: "所以 Transformer 把它拆成八个头，每个头六十四维。", audio: "s06-3", frames: 149, start: 297, seconds: 4.7},
      {text: "八个头在各自的子空间里独立计算，有的学会盯句法，有的学会追踪代词指向。", audio: "s06-4", frames: 206, start: 446, seconds: 6.62},
      {text: "最后把八个结果拼接起来，再做一次线性变换。", audio: "s06-5", frames: 135, start: 652, seconds: 4.25},
      {text: "总计算量和单头全维度几乎一样，但表达能力强得多。", audio: "s06-6", frames: 166, start: 787, seconds: 5.28},
    ],
    frames: 975, start: 5133,
  },
  {
    id: "s07", chapter: "06 · 位置从哪来", accent: "#22d3ee",
    title: "正弦位置编码", kicker: "ORDER",
    bullets: ["注意力本身不知道词的顺序", "不同频率的正弦波叠加 ⇒ 每个位置独一无二的指纹", "像二进制计数器：低位翻得快，高位翻得慢"], bulletAt: [0, 295, 906], hero: false,
    sentences: [
      {text: "注意力有一个天生的缺陷：它不知道词的顺序。", audio: "s07-1", frames: 136, start: 0, seconds: 4.3},
      {text: "打乱输入顺序，输出只是跟着打乱，模型看不出区别。", audio: "s07-2", frames: 159, start: 136, seconds: 5.06},
      {text: "解决办法，是在词向量上叠加位置编码。", audio: "s07-3", frames: 132, start: 295, seconds: 4.15},
      {text: "论文用不同频率的正弦和余弦：维度越低，波长越长，从二派一直排到两万派。", audio: "s07-4", frames: 235, start: 427, seconds: 7.58},
      {text: "每个位置都会得到一串独一无二的波形指纹，就像二进制计数器，低位翻得快，高位翻得慢。", audio: "s07-5", frames: 244, start: 662, seconds: 7.87},
      {text: "而且任意固定偏移，都可以表示成线性变换，模型因此能学会相对位置。", audio: "s07-6", frames: 200, start: 906, seconds: 6.41},
    ],
    frames: 1128, start: 6108,
  },
  {
    id: "s08", chapter: "07 · 组装成完整模型", accent: "#4ea8ff",
    title: "编码器 · 解码器", kicker: "ARCHITECTURE",
    bullets: ["编码器 6 层：自注意力 + 前馈网络，各带残差与层归一化", "解码器多一层交叉注意力：Q 来自解码器，K/V 来自编码器", "解码器自注意力加掩码，禁止看到未来"], bulletAt: [0, 408, 804], hero: false,
    sentences: [
      {text: "把这些部件组装起来，就是完整的 Transformer。", audio: "s08-1", frames: 135, start: 0, seconds: 4.25},
      {text: "左边是编码器，六层堆叠，每层先做自注意力，再做前馈网络，两个子层都带残差和层归一化。", audio: "s08-2", frames: 273, start: 135, seconds: 8.86},
      {text: "右边是解码器，多了一个交叉注意力：Query 来自解码器，Key 和 Value 来自编码器。", audio: "s08-3", frames: 234, start: 408, seconds: 7.54},
      {text: "解码器的自注意力还要加掩码，防止看到未来的词。", audio: "s08-4", frames: 162, start: 642, seconds: 5.14},
      {text: "编码器负责理解，解码器负责生成，这就是今天所有大模型的骨架。", audio: "s08-5", frames: 193, start: 804, seconds: 6.19},
    ],
    frames: 1019, start: 7236,
  },
  {
    id: "s09", chapter: "08 · 数字有多硬", accent: "#34d399",
    title: "28.4 BLEU · 1/8 算力", kicker: "EVIDENCE",
    bullets: ["英德 28.4 vs 此前最好集成系统 26.36", "8 卡 P100 训 3.5 天，算力约前人的 1/8", "英法 41.8，单模型超过所有已有单模型"], bulletAt: [0, 256, 737], hero: false,
    sentences: [
      {text: "效果有多硬？", audio: "s09-1", frames: 63, start: 0, seconds: 1.85},
      {text: "2014 年 WMT 英德翻译，Transformer 大模型拿到 28.4 BLEU。", audio: "s09-2", frames: 193, start: 63, seconds: 6.17},
      {text: "此前最好的集成系统是 26.36，高出两分多。", audio: "s09-3", frames: 147, start: 256, seconds: 4.66},
      {text: "训练只用了八块 P100，三天半，算力大约是前人的八分之一。", audio: "s09-4", frames: 183, start: 403, seconds: 5.86},
      {text: "英法翻译 41.8，单模型超过所有已有单模型。", audio: "s09-5", frames: 151, start: 586, seconds: 4.8},
      {text: "更重要的是，它证明了只要算力足够，简单的算子可以替代复杂的结构先验。", audio: "s09-6", frames: 216, start: 737, seconds: 6.94},
    ],
    frames: 975, start: 8255,
  },
  {
    id: "s10", chapter: "收尾 · 结构的胜利", accent: "#4ea8ff",
    title: "Attention Is All You Need", kicker: "THE TAKEAWAY",
    bullets: ["当硬件变了，重新审视被认为理所当然的结构", "循环不是必须的，卷积不是必须的", "注意力，就是你所需要的一切"], bulletAt: [0, 367, 528], hero: true,
    sentences: [
      {text: "回看这篇论文，最深的启示不是注意力本身。", audio: "s10-1", frames: 141, start: 0, seconds: 4.44},
      {text: "而是它示范了一种研究方法：当硬件变了，就重新审视那些被认为理所当然的结构。", audio: "s10-2", frames: 226, start: 141, seconds: 7.27},
      {text: "循环不是必须的，卷积不是必须的，位置也可以编码。", audio: "s10-3", frames: 161, start: 367, seconds: 5.11},
      {text: "注意力，就是你所需要的一切。", audio: "s10-4", frames: 100, start: 528, seconds: 3.1},
    ],
    frames: 650, start: 9230,
  },
];

export const TOTAL_FRAMES = 9880;
export const FPS = 30;
