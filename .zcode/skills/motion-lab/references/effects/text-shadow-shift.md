# 阴影偏移（Shadow Shift）· `text-shadow-shift`

文字阴影循环偏移,产生霓虹闪烁感。

- 分类: text · 难度: ★★ · 标签: shadow, text

## 参数
- `duration` (周期): 1–4（步长 0.1）s，默认 `2`
- `intensity` (强度): 2–12（步长 1）px，默认 `6`

## HTML
```html
<h1 class="tss">SHADOW</h1>
```

## CSS
```css
.tss { font-size: 36px; font-weight: 900; color: white; text-shadow: var(--intensity, 6px) 0 hsl(320 90% 60%); animation: tss var(--duration, 2s) ease-in-out infinite alternate; }
@keyframes tss { from { text-shadow: var(--intensity, 6px) 0 hsl(320 90% 60%); } to { text-shadow: calc(var(--intensity, 6px) * -1) 0 hsl(180 90% 60%); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
