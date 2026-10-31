# 拖动揭示（Drag Reveal）· `drag-to-reveal`

拖动遮罩揭示下方内容,刮刮卡感。

- 分类: interaction · 难度: ★★ · 标签: drag, interaction

## 参数
- `duration` (过渡): 0.1–0.6（步长 0.05）s，默认 `0.2`

## HTML
```html
<div class="drag-reveal"><div class="cover">DRAG ME</div><div class="under">REVEALED</div></div>
```

## CSS
```css
.drag-reveal { position: relative; cursor: ew-resize; user-select: none; }
.drag-reveal .under { display: flex; align-items: center; justify-content: center; }
.drag-reveal .cover { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transition: clip-path var(--duration, 0.2s); clip-path: inset(0 0 0 0); }
```

## JS
```javascript
const el = document.querySelector('.drag-reveal'); const cover = el.querySelector('.cover');
let dragging = false, startX = 0, startPct = 0;
const pct = () => { const m = cover.style.clipPath.match(/inset\(0 (\d+)%/); return m ? +m[1] : 0; };
el.addEventListener('mousedown', (e) => { dragging = true; startX = e.clientX; startPct = pct(); });
window.addEventListener('mousemove', (e) => { if (!dragging) return; const w = el.offsetWidth; let p = startPct + ((e.clientX - startX) / w) * 100; p = Math.max(0, Math.min(100, p)); cover.style.clipPath = `inset(0 ${p}% 0 0)`; });
window.addEventListener('mouseup', () => dragging = false);
```
