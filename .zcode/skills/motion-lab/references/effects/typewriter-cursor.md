# 光标打字（Typing Cursor）· `typewriter-cursor`

带闪烁光标的打字效果,逐字输入循环。

- 分类: basic · 难度: ★★ · 标签: typing, basic

## 参数
- `speed` (速度): 30–250（步长 10）ms，默认 `90`

## HTML
```html
<span id="tw-cursor"></span>
```

## CSS
```css
#tw-cursor { font-family: monospace; font-weight: 800; }
#tw-cursor::after { content: "▌"; margin-left: 2px; animation: blink 0.8s step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }
```

## JS
```javascript
const el = document.getElementById('tw-cursor');
const text = 'Typing...';
let i = 0;
setInterval(() => { el.textContent = text.slice(0, i++ % (text.length + 1)); }, 90);
```
