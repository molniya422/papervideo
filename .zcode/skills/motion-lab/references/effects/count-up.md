# 数字滚动（Count Up）· `count-up`

数字从 0 滚动到目标值。

- 分类: text · 难度: ★★ · 标签: count, text

## 参数
- `target` (目标值): 10–9999（步长 1），默认 `1234`

## HTML
```html
<span id="count-up">0</span>
```

## CSS
```css
#count-up { font-variant-numeric: tabular-nums; font-weight: 900; font-size: 48px; }
```

## JS
```javascript
const el = document.getElementById('count-up');
const target = 1234;
const duration = 1500;
const start = performance.now();
const tick = (now) => {
  const t = Math.min(1, (now - start) / duration);
  el.textContent = Math.floor(target * (1 - Math.pow(1 - t, 3)));
  if (t < 1) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
```
