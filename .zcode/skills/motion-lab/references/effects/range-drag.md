# 滑块拖动（Range Drag）· `range-drag`

可拖动的圆形滑块,显示当前值。

- 分类: interaction · 难度: ★★ · 标签: range, interaction

## 参数
- `max` (最大值): 50–500（步长 10），默认 `200`

## HTML
```html
<div class="range"><div class="track"><div class="fill"></div><div class="knob"></div></div><div class="val">0</div></div>
```

## CSS
```css
.range { padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; width: 240px; }
.range .track { position: relative; width: 200px; height: 6px; background: rgba(0,0,0,0.1); border-radius: 999px; cursor: pointer; }
.range .fill { position: absolute; left: 0; top: 0; height: 100%; background: hsl(280 90% 60%); border-radius: 999px; width: 50%; }
.range .knob { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background: white; border: 3px solid hsl(280 90% 60%); border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.2); cursor: grab; }
.range .val { font-size: 24px; font-weight: 900; font-variant-numeric: tabular-nums; }
```

## JS
```javascript
const track = document.querySelector('.track'); const fill = document.querySelector('.fill'); const knob = document.querySelector('.knob'); const val = document.querySelector('.val');
let dragging = false;
const update = (clientX) => { const r = track.getBoundingClientRect(); let pct = (clientX - r.left) / r.width; pct = Math.max(0, Math.min(1, pct)); fill.style.width = (pct * 100) + '%'; knob.style.left = (pct * 100) + '%'; val.textContent = Math.round(pct * params.max); };
track.addEventListener('mousedown', (e) => { dragging = true; update(e.clientX); });
window.addEventListener('mousemove', (e) => { if (dragging) update(e.clientX); });
window.addEventListener('mouseup', () => dragging = false);
```
