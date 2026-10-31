# 模糊入场（Blur In）· `blur-in`

元素从模糊状态渐变到清晰,柔和入场。

- 分类: basic · 难度: ★★ · 标签: blur, basic

## 参数
- `duration` (时长): 0.3–2（步长 0.1）s，默认 `0.8`
- `blur` (模糊): 4–30（步长 1）px，默认 `14`

## HTML
```html
<div class="blur-in">Blur</div>
```

## CSS
```css
.blur-in { animation: blurIn var(--duration, 0.8s) ease-out both; }
@keyframes blurIn { from { opacity: 0; filter: blur(var(--blur, 14px)); transform: scale(1.05); } to { opacity: 1; filter: blur(0); transform: scale(1); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
