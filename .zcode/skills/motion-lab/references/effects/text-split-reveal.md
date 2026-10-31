# 分裂揭示（Split Reveal）· `text-split-reveal`

文字从中间分裂上下展开揭示,戏剧性。

- 分类: text · 难度: ★★★ · 标签: split, text

## 参数
- `duration` (时长): 0.6–2.5（步长 0.1）s，默认 `1.2`

## HTML
```html
<h1 class="split-reveal" data-text="SPLIT">SPLIT</h1>
```

## CSS
```css
.split-reveal { position: relative; overflow: hidden; }
.split-reveal::before { content: attr(data-text); position: absolute; inset: 0; clip-path: inset(0 0 50% 0); transform: translateY(-100%); animation: splitTop var(--duration, 1.2s) cubic-bezier(0.65, 0, 0.35, 1) forwards; }
@keyframes splitTop { to { transform: translateY(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
