# 音频条（Audio Wave）· `audio-wave`

模拟音频可视化的跳动条形。

- 分类: advanced · 难度: ★★ · 标签: audio, advanced

## 参数
- `bars` (条数): 16–64（步长 4），默认 `32`
- `speed` (速度): 0.05–0.3（步长 0.01），默认 `0.12`

## HTML
```html
<div class="audio"></div>
```

## CSS
```css
.audio { display: flex; align-items: center; justify-content: center; gap: 3px; width: 100%; height: 100%; }
.audio .bar { width: 6px; background: linear-gradient(180deg, hsl(280 90% 60%), hsl(200 90% 60%)); border-radius: 3px; }
```

## JS
```javascript
const wrap = document.querySelector('.audio');
const bars = [];
for (let i = 0; i < params.bars; i++) { const b = document.createElement('div'); b.className = 'bar'; wrap.appendChild(b); bars.push(b); }
let t = 0;
function tick() { t += params.speed; bars.forEach((b, i) => { const h = 30 + Math.abs(Math.sin(t + i * 0.4)) * 70; b.style.height = h + '%'; }); requestAnimationFrame(tick); } tick();
```
