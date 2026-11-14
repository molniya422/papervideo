# 乱码解码（Scramble）· `scramble`

文字先以乱码出现,逐渐解码为目标文字。

- 分类: text · 难度: ★★★ · 标签: scramble, text

## 参数
- `duration` (时长): 0.5–3（步长 0.1）s，默认 `1.5`

## HTML
```html
<span id="scramble"></span>
```

## CSS
```css
#scramble { font-family: monospace; }
```

## JS
```javascript
const el = document.getElementById('scramble');
const target = 'SCRAMBLE';
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%';
let frame = 0;
const interval = setInterval(() => {
  el.textContent = target.split('').map((c, i) => i < frame / 3 ? c : chars[Math.floor(Math.random() * chars.length)]).join('');
  if (frame++ > target.length * 3) clearInterval(interval);
}, 50);
```
