# 文字揭示（Text Reveal）· `hover-text-reveal`

悬停时隐藏文字从下方滑入揭示。

- 分类: interaction · 难度: ★★ · 标签: text, interaction

## 参数
- `duration` (时长): 0.2–1（步长 0.05）s，默认 `0.4`

## HTML
```html
<div class="text-reveal"><span class="label">HOVER</span><span class="hidden">REVEALED</span></div>
```

## CSS
```css
.text-reveal { position: relative; overflow: hidden; cursor: pointer; }
.text-reveal .hidden { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transform: translateY(100%); transition: transform var(--duration, 0.4s) cubic-bezier(0.2, 0.8, 0.2, 1); }
.text-reveal:hover .hidden { transform: translateY(0); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
