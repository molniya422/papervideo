# 打字机（Typewriter）· `typewriter`

字符逐个出现,模拟键盘输入。

- 分类: text · 难度: ★ · 标签: typewriter, text

## 参数
- `speed` (速度): 20–200（步长 10）ms，默认 `80`

## HTML
```html
<div id="typewriter"></div>
```

## CSS
```css
#typewriter { font-family: monospace; border-right: 2px solid currentColor; padding-right: 4px; animation: caret 0.8s step-end infinite; }
@keyframes caret { 50% { border-color: transparent; } }
```

## JS
```javascript
const el = document.getElementById('typewriter');
const text = 'Hello, Motion.Lab!';
let i = 0;
setInterval(() => { el.textContent = text.slice(0, i++ % (text.length + 1)); }, 80);
```
