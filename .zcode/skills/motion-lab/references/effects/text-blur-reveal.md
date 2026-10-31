# 模糊揭示（Blur Reveal）· `text-blur-reveal`

文字从模糊状态揭示为清晰,柔和神秘。

- 分类: text · 难度: ★★ · 标签: blur, text

## 参数
- `duration` (时长): 0.5–2.5（步长 0.1）s，默认 `1.2`

## HTML
```html
<h1 class="text-blur-reveal">REVEAL</h1>
```

## CSS
```css
.text-blur-reveal { animation: textBlurReveal var(--duration, 1.2s) ease-out both; }
@keyframes textBlurReveal { from { opacity: 0; filter: blur(20px); letter-spacing: 0.4em; } to { opacity: 1; filter: blur(0); letter-spacing: -0.02em; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
