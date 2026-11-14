# 上方淡入（Fade In Down）· `fade-in-down`

元素从上方淡入下滑,通用入场动画。

- 分类: basic · 难度: ★ · 标签: fade, basic

## 参数
- `duration` (时长): 0.2–3（步长 0.1）s，默认 `0.8`
- `distance` (距离): 10–80（步长 5）px，默认 `20`

## HTML
```html
<div class="fade-in-down">Hello</div>
```

## CSS
```css
.fade-in-down { animation: fadeInDown var(--duration, 0.8s) ease-out both; }
@keyframes fadeInDown { from { opacity: 0; transform: translateY(calc(var(--distance, 20px) * -1)); } to { opacity: 1; transform: translateY(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
