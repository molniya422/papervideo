# 脉冲（Pulse）· `pulse`

元素持续放大缩小,吸引注意。

- 分类: basic · 难度: ★ · 标签: pulse, basic

## 参数
- `duration` (周期): 0.5–3（步长 0.1）s，默认 `1.5`
- `intensity` (强度): 0.05–0.4（步长 0.05），默认 `0.15`

## HTML
```html
<div class="pulse">●</div>
```

## CSS
```css
.pulse { animation: pulse var(--duration, 1.5s) ease-in-out infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(calc(1 + var(--intensity, 0.15))); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
