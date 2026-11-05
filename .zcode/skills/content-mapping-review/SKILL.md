---
name: content-mapping-review
description: >
  内容验收：数据组件的数值→几何映射与轴刻度同基准核对。
  ch18 教训——75 的柱按 75 归一顶满高度，轴却按 80 刻度，几何高度撒了谎。
  每个图表/数据组件入片后逐个核对，落 receipts/skills/qa-content-mapping-review-*.json。
---

# Content Mapping Review（数值→图形映射核对）

**为什么**：图表撒谎比文字撒谎更隐蔽。柱高/弧长/点位必须与轴刻度、图例、字幕三方一致。

## 核对清单（每个数据组件过一遍）

1. **归一基准**：柱高按**轴满量程**归一，不是按数据最大值。
   `h = value / axis_max × axis_height`（ch18 教训：75 在 0-80 轴 = 0.9375 × 轴高，
   而不是 75/75 = 满高）。diff/差值标注同样用换算后的几何高度。
2. **轴刻度与 tick 位置一致**：tick 文本、tick 几何位置、柱高三者同一公式生成。
3. **图例/标签与数值一致**：label 文本里的数字 = 数据源数字（从 deep-read 数字核对表取）。
4. **教学示意标注**：非论文实测的数值必须标"示意"，不冒充实测。
5. **单位与量级**：百分比/秒数/像素不混用；小数位与原文一致。

## 执行方式

- 输入：`enriched_spec.json` 的 data_overlays 数值 + `dataviz_spec.json` + deep-read 数字核对表 + 章节 HTML 源码
- 方法：读代码里的归一公式与轴公式（不要只看渲染结果——两套公式同基准才算过）
- 产出：`receipts/skills/qa-content-mapping-review-*.json`
  （用 `paperpipe.receipts.write_skill_receipt(ctx, "qa", "content-mapping-review", "charts_rendered", [...], evidence=[逐组件结论])`）

## 反模式

- ❌ 只看渲染截图"看着没毛病"——两套归一公式肉眼难辨
- ❌ 只核对最大值那根柱（次高柱的偏差更隐蔽）
- ❌ 漏掉 diff/差值/增量这类派生图形
