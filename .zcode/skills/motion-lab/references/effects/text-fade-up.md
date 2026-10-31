# 文字上滑（Text Fade Up）· `text-fade-up`

文字从下方淡入上滑,优雅入场。

- 分类: text · 难度: ★ · 标签: fade, text

## 参数
- `duration` (时长): 0.4–2（步长 0.1）s，默认 `0.9`
- `distance` (距离): 10–60（步长 5）px，默认 `24`

## HTML
```html
<h1 class="text-fade-up">MOTION</h1>
```

## CSS
```css
.text-fade-up { animation: textFadeUp var(--duration, 0.9s) cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes textFadeUp { from { opacity: 0; transform: translateY(var(--distance, 24px)); } to { opacity: 1; transform: translateY(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
