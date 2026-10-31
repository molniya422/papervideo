# 模糊呼吸（Blur Pulse）· `blur-out`

元素在清晰与模糊间循环呼吸,梦幻感。

- 分类: basic · 难度: ★★ · 标签: blur, basic

## 参数
- `duration` (周期): 1–5（步长 0.1）s，默认 `2.4`
- `blur` (模糊): 2–16（步长 1）px，默认 `8`

## HTML
```html
<div class="blur-out">Pulse</div>
```

## CSS
```css
.blur-out { animation: blurOut var(--duration, 2.4s) ease-in-out infinite; }
@keyframes blurOut { 0%, 100% { filter: blur(0); opacity: 1; } 50% { filter: blur(var(--blur, 8px)); opacity: 0.6; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
