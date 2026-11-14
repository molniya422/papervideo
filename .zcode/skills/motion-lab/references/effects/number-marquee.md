# 数字翻牌（Number Marquee）· `number-marquee`

类似时钟翻页的数字滚动效果。

- 分类: text · 难度: ★★★ · 标签: number, text

## 参数
- `speed` (速度): 200–1500（步长 100）ms，默认 `600`

## HTML
```html
<div class="nmarquee"><span class="num" data-num="0"></span></div>
```

## CSS
```css
.nmarquee { display: flex; gap: 8px; font-family: monospace; font-size: 48px; font-weight: 900; height: 60px; overflow: hidden; }
.nmarquee .num { position: relative; height: 60px; min-width: 40px; text-align: center; }
.nmarquee .num-track { position: absolute; left: 0; right: 0; transition: transform 0.5s ease; }
```

## JS
```javascript
const numEl = document.querySelector('.num');
let cur = 0;
function render() {
  let track = '';
  for (let i = 0; i < 10; i++) track += `<div>${i}</div>`;
  numEl.innerHTML = `<div class="num-track" style="transform:translateY(-${cur * 60}px)">${track}</div>`;
  cur = (cur + 1) % 10;
}
render();
setInterval(render, params.speed);
```
