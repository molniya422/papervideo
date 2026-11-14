# 流体畸变（Fluid Distort）· `fluid-distort`

使用 feTurbulence + feDisplacementMap 实现流体畸变。

- 分类: advanced · 难度: ★★★ · 标签: fluid, advanced

## 参数
- `amount` (畸变强度): 0–60（步长 2），默认 `24`
- `speed` (速度): 0–1（步长 0.05），默认 `0.3`

## HTML
```html
<svg width="0" height="0"><filter id="fd"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3"><animate attributeName="baseFrequency" dur="6s" values="0.02;0.04;0.02" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" scale="24" /></filter></svg><div class="fluid">FLUID</div>
```

## CSS
```css
.fluid { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 900; color: white; background: linear-gradient(135deg, hsl(280 90% 60%), hsl(200 90% 60%)); border-radius: 12px; filter: url(#fd); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
