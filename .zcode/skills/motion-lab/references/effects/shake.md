# 摇晃（Shake）· `shake`

元素左右快速摇晃,常用于表单错误提示。

- 分类: basic · 难度: ★ · 标签: shake, basic

## 参数
- `duration` (时长): 0.2–1.5（步长 0.1）s，默认 `0.5`

## HTML
```html
<div class="shake">!</div>
```

## CSS
```css
.shake { animation: shake var(--duration, 0.5s); }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
