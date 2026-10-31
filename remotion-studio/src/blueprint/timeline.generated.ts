// ⚠️ 由 tts_build.py 自动生成，请勿手改；改旁白后重跑脚本。
export type Sentence = {text: string; audio: string; frames: number; start: number; seconds: number};
export type Shot = {
  id: string; chapter: string; accent: string; title: string; kicker: string;
  bullets: string[]; bulletAt: number[]; hero: boolean;
  sentences: Sentence[]; frames: number; start: number;
};

export const SHOTS: Shot[] = [
  {
    id: "c01", chapter: "开场 · 一张图纸", accent: "#ff8c42",
    title: "一张图纸", kicker: "BLUEPRINT No. 1706.03762",
    bullets: ["论文本身是一张架构图", "这张图换掉了最贵的零件", "六分钟，按图纸装一遍"], bulletAt: [0, 263, 413], hero: false,
    sentences: [
      {text: "这是一张设计图。", audio: "c01-1", frames: 71, start: 0, seconds: 2.11},
      {text: "二零一七年，八位研究者交上来一张图，换掉了语言模型里最贵的那个零件。", audio: "c01-2", frames: 192, start: 71, seconds: 6.14},
      {text: "这张图叫 Transformer，核心只有一句话：注意力。", audio: "c01-3", frames: 150, start: 263, seconds: 4.75},
      {text: "接下来六分钟，我们按图纸的顺序，把它一层一层装起来。", audio: "c01-4", frames: 160, start: 413, seconds: 5.09},
    ],
    frames: 595, start: 0,
  },
  {
    id: "c02", chapter: "01 · 循环的两个代价", accent: "#ff8c42",
    title: "为什么要换掉 RNN", kicker: "SECTION 01 · THE COST",
    bullets: ["并行度：几千个核心，只有一个在算", "距离：信号要穿过中间的每一个词", "两个代价，同一个原因：信息必须排队"], bulletAt: [0, 513, 990], hero: false,
    sentences: [
      {text: "先看它要替换的东西：循环神经网络。", audio: "c02-1", frames: 131, start: 0, seconds: 4.13},
      {text: "RNN 读句子，是一个词一个词往前推，每一步都要等上一步算完。", audio: "c02-2", frames: 179, start: 131, seconds: 5.71},
      {text: "第一个代价是并行度。一块 GPU 有几千个核心，此刻只有一个在工作。", audio: "c02-3", frames: 203, start: 310, seconds: 6.53},
      {text: "第二个代价是距离。句首的主语要到句尾，信号得穿过中间每一个词。", audio: "c02-4", frames: 201, start: 513, seconds: 6.46},
      {text: "每穿过一层，信息就衰减一点，梯度也跟着变弱。", audio: "c02-5", frames: 155, start: 714, seconds: 4.92},
      {text: "所以句子一长，模型就开始记不住开头。", audio: "c02-6", frames: 121, start: 869, seconds: 3.77},
      {text: "这两个代价，其实是同一个原因：信息必须沿着时间，一步一步往下传。", audio: "c02-7", frames: 194, start: 990, seconds: 6.22},
    ],
    frames: 1206, start: 595,
  },
  {
    id: "c03", chapter: "02 · 把传递换成查询", accent: "#5eead4",
    title: "查询式读取", kicker: "SECTION 02 · THE IDEA",
    bullets: ["不再排队，改为同时向全句提问", "例子：it 要找到它指代的名词", "一次查询，覆盖全句，不经过中间步骤"], bulletAt: [0, 430, 809], hero: false,
    sentences: [
      {text: "Transformer 的做法，是把传递换成查询。", audio: "c03-1", frames: 118, start: 0, seconds: 3.7},
      {text: "不再让信息排队，而是让每个词，同时向所有的词发一个问题。", audio: "c03-2", frames: 168, start: 118, seconds: 5.35},
      {text: "举个例子。句子里的 it，要知道自己在指代谁。", audio: "c03-3", frames: 144, start: 286, seconds: 4.54},
      {text: "它发出一个查询：谁是我在指代的那个名词。", audio: "c03-4", frames: 126, start: 430, seconds: 3.96},
      {text: "每个词都举着自己的标签，等待被查询。", audio: "c03-5", frames: 119, start: 556, seconds: 3.72},
      {text: "匹配度高的词，它携带的内容就会被取回来。", audio: "c03-6", frames: 134, start: 675, seconds: 4.22},
      {text: "一次查询，覆盖全句，不经过中间任何一步。", audio: "c03-7", frames: 146, start: 809, seconds: 4.63},
    ],
    frames: 977, start: 1801,
  },
  {
    id: "c04", chapter: "03 · Q K V 与点积", accent: "#5eead4",
    title: "一次注意力怎么算", kicker: "SECTION 03 · THE COMPUTATION",
    bullets: ["Query 提问，Key 挂标签，Value 带内容", "点积衡量方向一致程度", "softmax 归一，再对 Value 加权求和"], bulletAt: [0, 495, 909], hero: false,
    sentences: [
      {text: "把这件事形式化，每个词被投影成三个向量。", audio: "c04-1", frames: 135, start: 0, seconds: 4.25},
      {text: "Query 是它提出的问题，Key 是它挂出的标签，Value 是它携带的内容。", audio: "c04-2", frames: 193, start: 135, seconds: 6.19},
      {text: "查询和标签做点积。方向越一致，分数越高。", audio: "c04-3", frames: 167, start: 328, seconds: 5.33},
      {text: "把这一行的分数拿去做 softmax，变成一组加起来等于一的权重。", audio: "c04-4", frames: 172, start: 495, seconds: 5.47},
      {text: "然后按权重，把各个 Value 加权求和。", audio: "c04-5", frames: 129, start: 667, seconds: 4.06},
      {text: "得到的向量，就是这个位置的新表示。", audio: "c04-6", frames: 113, start: 796, seconds: 3.5},
      {text: "写成矩阵只有一行：softmax 括号 Q K 转置，除以根号 d k，再乘以 V。", audio: "c04-7", frames: 209, start: 909, seconds: 6.72},
    ],
    frames: 1140, start: 2778,
  },
  {
    id: "c05", chapter: "04 · 为什么除以根号 dk", accent: "#fbbf24",
    title: "一个细节决定能否训练", kicker: "SECTION 04 · STABILITY",
    bullets: ["分量独立、方差为 1 ⇒ 点积方差 = dk", "dk = 64 ⇒ 标准差 8 ⇒ softmax 饱和", "除以 8 把方差拉回 1，梯度才存在"], bulletAt: [0, 603, 1118], hero: false,
    sentences: [
      {text: "公式里那个除以根号 d k，值得单独讲。", audio: "c05-1", frames: 131, start: 0, seconds: 4.13},
      {text: "假设 q 和 k 的每个分量互相独立，均值是零，方差是一。", audio: "c05-2", frames: 173, start: 131, seconds: 5.52},
      {text: "那么它们的点积，是 d k 个独立项相加，方差正好是 d k。", audio: "c05-3", frames: 169, start: 304, seconds: 5.38},
      {text: "d k 等于六十四，点积的标准差就是八。", audio: "c05-4", frames: 130, start: 473, seconds: 4.08},
      {text: "把正负八这么大的分数喂给 softmax，输出会接近 one-hot。", audio: "c05-5", frames: 175, start: 603, seconds: 5.59},
      {text: "one-hot 意味着梯度接近零，反向传播几乎学不动。", audio: "c05-6", frames: 156, start: 778, seconds: 4.94},
      {text: "除以八，把方差拉回一，softmax 落在敏感区间，训练才稳定。", audio: "c05-7", frames: 184, start: 934, seconds: 5.88},
      {text: "这段推导，论文只写在脚注里。", audio: "c05-8", frames: 108, start: 1118, seconds: 3.34},
    ],
    frames: 1248, start: 3918,
  },
  {
    id: "c06", chapter: "05 · 加权求和", accent: "#5eead4",
    title: "可微的按内容寻址", kicker: "SECTION 05 · READOUT",
    bullets: ["权重决定读多少，Value 决定读到什么", "没有循环，没有卷积", "整句所有位置，同一时刻算完"], bulletAt: [0, 274, 628], hero: false,
    sentences: [
      {text: "softmax 之后，是一步加权求和。", audio: "c06-1", frames: 115, start: 0, seconds: 3.58},
      {text: "分数高的 Value 占大头，分数低的几乎被忽略。", audio: "c06-2", frames: 159, start: 115, seconds: 5.04},
      {text: "注意力的输出，本质上是一次可微的、按内容寻址的读取。", audio: "c06-3", frames: 169, start: 274, seconds: 5.4},
      {text: "这里没有循环，也没有卷积，只有矩阵乘法，和一次归一化。", audio: "c06-4", frames: 185, start: 443, seconds: 5.93},
      {text: "所以整句的所有位置，可以在同一时刻算完。", audio: "c06-5", frames: 147, start: 628, seconds: 4.66},
    ],
    frames: 797, start: 5166,
  },
  {
    id: "c07", chapter: "06 · 多头", accent: "#a78bfa",
    title: "八个头，八种关系", kicker: "SECTION 06 · CAPACITY",
    bullets: ["一次注意力只能表达一种关系", "8 头 × 64 维 = 512 维，计算量几乎不变", "不同头自发分工：句法、指代、搭配"], bulletAt: [0, 396, 850], hero: false,
    sentences: [
      {text: "但一次注意力，只能表达一种关系。", audio: "c07-1", frames: 110, start: 0, seconds: 3.43},
      {text: "语言里的关系有很多：主谓、指代、修饰、搭配。", audio: "c07-2", frames: 171, start: 110, seconds: 5.45},
      {text: "解决办法，是把注意力拆成多个头。", audio: "c07-3", frames: 115, start: 281, seconds: 3.6},
      {text: "每个头有自己的投影矩阵，在低维子空间里独立计算。", audio: "c07-4", frames: 155, start: 396, seconds: 4.92},
      {text: "八个头，每个六十四维，拼起来还是五百一十二维。", audio: "c07-5", frames: 146, start: 551, seconds: 4.61},
      {text: "总计算量几乎不变，但模型可以同时盯住多种关系。", audio: "c07-6", frames: 153, start: 697, seconds: 4.85},
      {text: "论文的可视化显示，不同的头确实分工不同。", audio: "c07-7", frames: 150, start: 850, seconds: 4.75},
    ],
    frames: 1022, start: 5963,
  },
  {
    id: "c08", chapter: "07 · 位置编码", accent: "#22d3ee",
    title: "把顺序写进向量", kicker: "SECTION 07 · ORDER",
    bullets: ["注意力看不见顺序", "不同频率的正弦叠加，得到唯一指纹", "任意偏移可线性表示 ⇒ 学会相对位置"], bulletAt: [0, 431, 866], hero: false,
    sentences: [
      {text: "注意力还有一个盲点：它看不见顺序。", audio: "c08-1", frames: 117, start: 0, seconds: 3.65},
      {text: "打乱输入的词序，点积的结果只是跟着重排，模型毫不知情。", audio: "c08-2", frames: 186, start: 117, seconds: 5.95},
      {text: "所以要把位置信息，直接加进词向量。", audio: "c08-3", frames: 128, start: 303, seconds: 4.03},
      {text: "做法是用不同频率的正弦和余弦。", audio: "c08-4", frames: 123, start: 431, seconds: 3.86},
      {text: "维度越高，频率越高；低维变化慢，高维变化快。", audio: "c08-5", frames: 161, start: 554, seconds: 5.11},
      {text: "这就像二进制计数器：低位翻得快，高位翻得慢。", audio: "c08-6", frames: 151, start: 715, seconds: 4.8},
      {text: "每个位置因此得到一串唯一的波形指纹，而且相对偏移可以线性表示。", audio: "c08-7", frames: 195, start: 866, seconds: 6.26},
    ],
    frames: 1083, start: 6985,
  },
  {
    id: "c09", chapter: "08 · 残差与层归一化", accent: "#34d399",
    title: "为什么能堆六层", kicker: "SECTION 08 · DEPTH",
    bullets: ["残差连接给梯度一条高速公路", "层归一化把数值稳定在可控范围", "两者合起来，深堆叠才训得动"], bulletAt: [0, 294, 588], hero: false,
    sentences: [
      {text: "有了注意力、多头和位置编码，还差一样东西：让网络能堆起来。", audio: "c09-1", frames: 177, start: 0, seconds: 5.66},
      {text: "每个子层外面，都套一条残差连接。", audio: "c09-2", frames: 117, start: 177, seconds: 3.65},
      {text: "输入直接加到输出上，梯度就有了一条高速公路。", audio: "c09-3", frames: 144, start: 294, seconds: 4.54},
      {text: "后面再接一层归一化，把数值稳定在可控范围。", audio: "c09-4", frames: 150, start: 438, seconds: 4.75},
      {text: "所以六层、十二层，甚至上百层，都能训练。", audio: "c09-5", frames: 170, start: 588, seconds: 5.42},
    ],
    frames: 780, start: 8068,
  },
  {
    id: "c10", chapter: "09 · 装配整机", accent: "#4ea8ff",
    title: "编码器 · 解码器", kicker: "SECTION 09 · ASSEMBLY",
    bullets: ["编码器 6 层：自注意力 + 前馈", "解码器多一层交叉注意力", "掩码挡住未来，保住自回归"], bulletAt: [0, 389, 870], hero: false,
    sentences: [
      {text: "最后把零件装成整机。", audio: "c10-1", frames: 90, start: 0, seconds: 2.76},
      {text: "左边是编码器，六层，每层自注意力加前馈网络。", audio: "c10-2", frames: 176, start: 90, seconds: 5.62},
      {text: "右边是解码器，多了一层交叉注意力。", audio: "c10-3", frames: 123, start: 266, seconds: 3.84},
      {text: "交叉注意力的 Query 来自解码器，Key 和 Value 来自编码器。", audio: "c10-4", frames: 170, start: 389, seconds: 5.42},
      {text: "解码器的自注意力还要加掩码，把未来的位置挡住。", audio: "c10-5", frames: 154, start: 559, seconds: 4.87},
      {text: "这样生成第 i 个词时，它只能看到前 i 减一个词。", audio: "c10-6", frames: 157, start: 713, seconds: 4.99},
      {text: "编码器理解，解码器生成，中间靠注意力连接。", audio: "c10-7", frames: 156, start: 870, seconds: 4.94},
    ],
    frames: 1048, start: 8848,
  },
  {
    id: "c11", chapter: "10 · 证据", accent: "#ff8c42",
    title: "28.4 BLEU · 1/8 算力", kicker: "SECTION 10 · EVIDENCE",
    bullets: ["英德 28.4，比此前最好集成系统高 2 分", "8 卡 P100 训 3.5 天", "英法 41.8，单模型超过所有单模型"], bulletAt: [0, 231, 560], hero: false,
    sentences: [
      {text: "效果。", audio: "c11-1", frames: 59, start: 0, seconds: 1.7},
      {text: "二零一四年 WMT 英德翻译，大模型拿到二十八点四 BLEU。", audio: "c11-2", frames: 172, start: 59, seconds: 5.47},
      {text: "此前最好的集成系统是二十六点三六，高了整整两分。", audio: "c11-3", frames: 154, start: 231, seconds: 4.9},
      {text: "训练只用了八块 P100，三天半，算力约为前人的八分之一。", audio: "c11-4", frames: 175, start: 385, seconds: 5.59},
      {text: "英法翻译四十一点八，单模型超过所有已有单模型。", audio: "c11-5", frames: 153, start: 560, seconds: 4.85},
    ],
    frames: 735, start: 9896,
  },
  {
    id: "c12", chapter: "收尾 · 方法的胜利", accent: "#ff8c42",
    title: "Attention Is All You Need", kicker: "END OF DRAWING",
    bullets: ["当硬件变了，重新检查理所当然的结构", "循环不是必须的，卷积不是必须的", "注意力，就是你所需要的一切"], bulletAt: [0, 369, 530], hero: true,
    sentences: [
      {text: "回看这张图纸，真正的贡献，不是注意力这一个算子。", audio: "c12-1", frames: 152, start: 0, seconds: 4.82},
      {text: "而是它示范了一种方法：当硬件变了，就重新检查那些被认为理所当然的结构。", audio: "c12-2", frames: 217, start: 152, seconds: 6.98},
      {text: "循环不是必须的，卷积不是必须的，位置也可以编码。", audio: "c12-3", frames: 161, start: 369, seconds: 5.11},
      {text: "注意力，就是你所需要的一切。", audio: "c12-4", frames: 100, start: 530, seconds: 3.1},
    ],
    frames: 652, start: 10631,
  },
];

export const TOTAL_FRAMES = 11283;
export const FPS = 30;
