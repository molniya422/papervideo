# 多行打字（Multi Typewriter）· `text-typewriter-multi`

多行文字依次打字输入,循环切换。

- 分类: text · 难度: ★★ · 标签: multi, text

## 参数
- `speed` (速度): 30–200（步长 10）ms，默认 `80`

## HTML
```html
<span id="multi-tw"></span>
```

## CSS
```css
#multi-tw { font-family: monospace; font-weight: 800; }
#multi-tw::after { content: "▌"; animation: blink 0.8s step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }
```

## JS
```javascript
const el = document.getElementById('multi-tw');
const lines = ['Hello.', 'I am Motion.', 'Built for effects.'];
let li = 0, ci = 0, del = false;
setInterval(() => {
  const t = lines[li];
  ci += del ? -1 : 1;
  el.textContent = t.slice(0, ci);
  if (!del && ci >= t.length) { del = true; setTimeout(() => {}, 800); }
  else if (del && ci <= 0) { del = false; li = (li + 1) % lines.length; }
}, 90);
```
