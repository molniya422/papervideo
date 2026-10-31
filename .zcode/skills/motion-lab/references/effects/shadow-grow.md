# 阴影生长（Shadow Grow）· `shadow-grow`

元素阴影循环生长,产生悬浮呼吸感。

- 分类: basic · 难度: ★ · 标签: shadow, basic

## 参数
- `duration` (周期): 1–4（步长 0.1）s，默认 `2`

## HTML
```html
<div class="shadow-grow">Float</div>
```

## CSS
```css
.shadow-grow { animation: shadowGrow var(--duration, 2s) ease-in-out infinite; }
@keyframes shadowGrow { 0%, 100% { box-shadow: 0 4px 10px rgba(0,0,0,0.1); transform: translateY(0); } 50% { box-shadow: 0 24px 40px rgba(0,0,0,0.25); transform: translateY(-6px); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
