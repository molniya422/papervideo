# 3D 翻转（Flip In 3D）· `flip-in-3d`

元素以 3D 透视翻转加缩放入场,立体感强。

- 分类: basic · 难度: ★★ · 标签: flip, basic

## 参数
- `duration` (时长): 0.4–2（步长 0.1）s，默认 `0.9`

## HTML
```html
<div class="flip-in-3d">3D</div>
```

## CSS
```css
.flip-in-3d { animation: flipIn3d var(--duration, 0.9s) ease-out both; transform-origin: center; }
@keyframes flipIn3d { from { transform: perspective(800px) rotateX(-90deg) rotateY(-30deg) scale(0.6); opacity: 0; } to { transform: perspective(800px) rotateX(0) rotateY(0) scale(1); opacity: 1; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
