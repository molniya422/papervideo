# 3D 翻面（Flip 3D）· `text-flip-3d`

文字整体绕 Y 轴 360 度翻转,类似卡片。

- 分类: text · 难度: ★★ · 标签: flip, text

## 参数
- `duration` (周期): 1–4（步长 0.1）s，默认 `2`

## HTML
```html
<div class="flip3d-wrap"><h1 class="flip3d">FLIP</h1></div>
```

## CSS
```css
.flip3d-wrap { perspective: 600px; }
.flip3d { font-size: 40px; font-weight: 900; display: inline-block; animation: flip3d var(--duration, 2s) ease-in-out infinite; transform-style: preserve-3d; }
@keyframes flip3d { 0% { transform: rotateY(0); } 50% { transform: rotateY(360deg); } 100% { transform: rotateY(360deg); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
