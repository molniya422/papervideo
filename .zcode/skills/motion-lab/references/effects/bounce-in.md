# 弹跳入场（Bounce In）· `bounce-in`

元素入场时多次反弹,有节奏感。

- 分类: basic · 难度: ★★ · 标签: bounce, basic

## 参数
- `duration` (时长): 0.5–2（步长 0.1）s，默认 `1`

## HTML
```html
<div class="bounce-in">Bounce</div>
```

## CSS
```css
.bounce-in { animation: bounceIn var(--duration, 1s) both; }
@keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.1); opacity: 1; } 70% { transform: scale(0.9); } 85% { transform: scale(1.05); } 100% { transform: scale(1); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
