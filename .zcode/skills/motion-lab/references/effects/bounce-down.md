# 向下弹跳（Bounce Down）· `bounce-down`

元素从上方弹跳落下,带多次反弹。

- 分类: basic · 难度: ★★ · 标签: bounce, basic

## 参数
- `duration` (时长): 0.6–2（步长 0.1）s，默认 `1`
- `distance` (距离): 20–120（步长 5）px，默认 `60`

## HTML
```html
<div class="bounce-down">Bounce</div>
```

## CSS
```css
.bounce-down { animation: bounceDown var(--duration, 1s) cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes bounceDown { 0% { transform: translateY(calc(var(--distance, 60px) * -1)); opacity: 0; } 60% { transform: translateY(8px); opacity: 1; } 80% { transform: translateY(-4px); } 100% { transform: translateY(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
