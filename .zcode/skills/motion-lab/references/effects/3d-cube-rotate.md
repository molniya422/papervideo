# 立方体（3D Cube）· `3d-cube-rotate`

纯 CSS 3D 立方体持续旋转。

- 分类: advanced · 难度: ★★ · 标签: 3d, advanced

## 参数
- `duration` (周期): 2–10（步长 0.5）s，默认 `5`

## HTML
```html
<div class="cube-wrap"><div class="cube"><div class="face f1">1</div><div class="face f2">2</div><div class="face f3">3</div><div class="face f4">4</div><div class="face f5">5</div><div class="face f6">6</div></div></div>
```

## CSS
```css
.cube-wrap { perspective: 600px; width: 100px; height: 100px; }
.cube { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; animation: cubeRot var(--duration, 5s) linear infinite; }
.cube .face { position: absolute; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; color: white; background: hsl(280 90% 60%); border: 2px solid white; box-sizing: border-box; opacity: 0.85; }
.cube .f2 { transform: rotateY(180deg); background: hsl(0 90% 60%); }
.cube .f3 { transform: rotateY(90deg) translateZ(50px); background: hsl(60 90% 60%); }
.cube .f4 { transform: rotateY(-90deg) translateZ(50px); background: hsl(120 80% 55%); }
.cube .f5 { transform: rotateX(90deg) translateZ(50px); background: hsl(200 90% 60%); }
.cube .f6 { transform: rotateX(-90deg) translateZ(50px); background: hsl(320 80% 60%); }
.cube .f1 { transform: translateZ(50px); }
@keyframes cubeRot { to { transform: rotateY(360deg) rotateX(360deg); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
