---
name: lieflat-code-video-starter
description: Create and adapt a short product launch film using the included Remotion starter, camera helpers and Lens references.
---

# lieflat code video — public starter

This is the guide for the runnable public starter, not the private full production workflow. All paths below are relative to this file. Read `starter/README.md` before running commands.

## 1. Establish the story

Use the user's product description, audience, actual product interface and intended call to action. Make a short outline before editing. Use only substantiated product claims; do not present the fictional sample's data as facts about a real product.

## 2. Pick a visual mechanism

Open `lens/index.html` locally to choose a camera or transition reference. The numbered examples are a vocabulary, not automatically interchangeable production components. In particular, 16 is an anti-example, 32 is a rhythm rule, and 15 and 37 require a custom implementation.

Choose a continuous object or action that connects shots: a prompt grows into a result, a cursor leads the camera, or a word changes in place. Keep the treatment suited to this product.

## 3. Start from the runnable project

Copy `starter/` into the working project directory, install its pinned dependencies with `npm ci`, and run `npm run studio`. Keep `package-lock.json`. Use Node.js 22 or newer.

- `src/content.ts`: product name, copy, colors, optional music filename.
- `src/film.ts`: sections, beat grid, typing, click and result timings.
- `src/Video.tsx`: the fictional UI and composition.
- `src/kit/`: camera, springs, typography, surfaces, transitions and pointers.

The default film is 12 seconds, 1920 × 1080, 30 fps. Do not change the frame rate or aspect ratio without adapting its layout and frame-based helper assumptions. Do not expect private skeleton, moves, capture or mixing scripts to be available.

## 4. Build motion that renders deterministically

Drive animation from frames. Inside `Scene`, use `useG()` for timings expressed in global film frames. Use the included easing and spring helpers. Avoid CSS animations, wall-clock timing and unseeded randomness.

Use the product's own content or an explicitly fictional mock-up. Replace the Acme Notes name and sample copy when making a real product film. Use concise text, legible interface crops and deliberate camera movement. Check that the prompt finishes typing before the send action.

## 5. Verify the film

Run `npm run typecheck` and `npm run check`. Then run `npm run preview` and inspect the actual picture, including the first frame, every transition, the result state and the ending. Timing checks alone do not prove visual quality.

Check typography after replacing copy. For Chinese content, add a suitable licensed Chinese font; the bundled Latin fonts are not sufficient. Preserve readable end-card time and review the final output with motion blur enabled.

## 6. Render and deliver

Run `npm run render` for a 1080p H.264 film at `out/film.mp4`. The default sample is silent. To include music, use the user's own licensed track in `starter/public/` and set `musicFile` in `src/content.ts`. Use `npm run events` to export timing cues for an external audio editor.

Deliver the rendered video and note any remaining visual or audio limitations. The original project's advanced capture, automated verification and mixing tools are not part of this starter.

## License

The included project code and this starter guide are offered under `LICENSE.md`. Commercial use outside that license requires separate written authorization: larashero3@gmail.com. Third-party dependencies and materials retain their own licenses; see `USAGE.md` and `THIRD_PARTY_NOTICES.md`.

## 引擎检出位置

完整 Remotion Starter 项目在 `engines/lieflat-code-video/`（含 kit/ 12 个镜头工具模块）。
镜头语言参考页：本目录 `lens-reference.html`（双击打开，8 个运镜/转场演示）。
`starter/src/kit/` 12 个模块：

| 模块 | 用途 |
|------|------|
| `motion.ts` | 帧驱动动画核心（easing、spring、interpolate） |
| `springs.tsx` | 弹簧物理组件 |
| `transitions.tsx` | 转场（硬切/交叉/推拉） |
| `surfaces.tsx` | 面板/表面组件 |
| `type.tsx` | 排版组件 |
| `timeline.ts` | 时间线/beat grid |
| `clock.tsx` | 全局时钟 |
| `lens.tsx` | 镜头参照 |
| `motion-blur.tsx` | 运动模糊 |
| `fonts.ts` | 字体配置 |
| `props.tsx` | Props 类型 |
| `index.ts` | 统一导出 |

## 与其他技能的关系
- 与 `wise-motion`（论文动效）互补：lieflat 专做**产品/工具演示**的发布短片
- 与 `product-launch-motion` 互补：lieflat 提供 **Remotion Starter 代码**，product-launch 提供方法论
- 适合：产品 demo / 工具介绍 / 界面展示 / 命令行演示
