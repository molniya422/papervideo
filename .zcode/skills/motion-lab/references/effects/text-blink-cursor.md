# 闪烁光标（Blink Cursor）· `text-blink-cursor`

模拟终端的闪烁光标,极简风格。

- 分类: text · 难度: ★ · 标签: blink, text

## 参数
- `speed` (速度): 0.3–1.5（步长 0.1）s，默认 `0.8`

## HTML
```html
<span class="cursor-t">输入中</span>
```

## CSS
```css
.cursor-t { font-family: monospace; font-size: 24px; font-weight: 700; }
.cursor-t::after { content: "_"; margin-left: 2px; animation: blink var(--speed, 0.8s) step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
