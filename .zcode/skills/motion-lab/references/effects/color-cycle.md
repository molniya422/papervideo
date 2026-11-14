# 色彩循环（Color Cycle）· `color-cycle`

元素背景色按 HSL 循环变化,霓虹感。

- 分类: basic · 难度: ★ · 标签: color, basic

## 参数
- `duration` (周期): 1–8（步长 0.2）s，默认 `3`

## HTML
```html
<div class="color-cycle">Cycle</div>
```

## CSS
```css
.color-cycle { animation: colorCycle var(--duration, 3s) linear infinite; }
@keyframes colorCycle { 0% { background: hsl(0 90% 60%); } 25% { background: hsl(90 90% 55%); } 50% { background: hsl(180 90% 55%); } 75% { background: hsl(270 90% 60%); } 100% { background: hsl(360 90% 60%); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
