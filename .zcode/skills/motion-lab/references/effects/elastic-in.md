# 弹性入场（Elastic In）· `elastic-in`

入场时带有明显弹性回弹,生动有趣。

- 分类: basic · 难度: ★★ · 标签: elastic, basic

## 参数
- `duration` (时长): 0.5–2.5（步长 0.1）s，默认 `1.2`

## HTML
```html
<div class="elastic-in">Elastic</div>
```

## CSS
```css
.elastic-in { animation: elasticIn var(--duration, 1.2s) cubic-bezier(0.68, -0.55, 0.265, 1.55) both; }
@keyframes elasticIn { 0% { transform: scale(0) rotate(-180deg); opacity: 0; } 100% { transform: scale(1) rotate(0); opacity: 1; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
