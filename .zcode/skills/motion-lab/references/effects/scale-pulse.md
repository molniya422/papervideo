# 缩放呼吸（Scale Pulse）· `scale-pulse`

元素持续缩放形成呼吸效果,比 pulse 更夸张。

- 分类: basic · 难度: ★ · 标签: scale, basic

## 参数
- `duration` (周期): 0.6–3（步长 0.1）s，默认 `1.4`
- `min` (最小): 0.4–0.95（步长 0.05），默认 `0.7`
- `max` (最大): 1.05–1.6（步长 0.05），默认 `1.15`

## HTML
```html
<div class="scale-pulse">●</div>
```

## CSS
```css
.scale-pulse { animation: sp var(--duration, 1.4s) ease-in-out infinite; }
@keyframes sp { 0%, 100% { transform: scale(var(--min, 0.7)); } 50% { transform: scale(var(--max, 1.15)); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
