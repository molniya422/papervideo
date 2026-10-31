# 倾斜入场（Skew In）· `skew-in`

元素以倾斜状态滑入归位,动感十足。

- 分类: basic · 难度: ★★ · 标签: skew, basic

## 参数
- `duration` (时长): 0.3–2（步长 0.1）s，默认 `0.7`
- `angle` (角度): 5–30（步长 1）°，默认 `15`

## HTML
```html
<div class="skew-in">Skew</div>
```

## CSS
```css
.skew-in { animation: skewIn var(--duration, 0.7s) ease-out both; }
@keyframes skewIn { from { opacity: 0; transform: skewX(calc(var(--angle, 15deg) * -1)) translateX(-30px); } to { opacity: 1; transform: skewX(0) translateX(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
