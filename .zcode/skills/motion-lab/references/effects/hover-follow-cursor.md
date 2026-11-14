# 跟随光标（Follow Cursor）· `hover-follow-cursor`

元素平滑跟随光标移动,带惯性。

- 分类: interaction · 难度: ★★ · 标签: follow, interaction

## 参数
- `speed` (速度): 0.02–0.3（步长 0.02），默认 `0.1`

## HTML
```html
<div class="follow-zone"><div class="dot"></div></div>
```

## CSS
```css
.follow-zone { position: relative; cursor: none; }
.follow-zone .dot { position: absolute; width: 24px; height: 24px; border-radius: 50%; background: hsl(280 90% 60%); pointer-events: none; transform: translate(-50%, -50%); }
```

## JS
```javascript
const zone = document.querySelector('.follow-zone'); const dot = zone.querySelector('.dot');
let tx = 0, ty = 0, x = 0, y = 0;
zone.addEventListener('mousemove', (e) => { const r = zone.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; });
function tick() { x += (tx - x) * 0.1; y += (ty - y) * 0.1; dot.style.left = x + 'px'; dot.style.top = y + 'px'; requestAnimationFrame(tick); } tick();
```
