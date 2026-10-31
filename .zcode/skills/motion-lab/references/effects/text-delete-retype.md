# 删除重打（Delete Retype）· `text-delete-retype`

文字打完后删除再重新输入,循环演示。

- 分类: text · 难度: ★★ · 标签: delete, text

## 参数
- `speed` (速度): 30–200（步长 10）ms，默认 `70`

## HTML
```html
<span id="del-retype"></span>
```

## CSS
```css
#del-retype { font-family: monospace; font-weight: 800; }
#del-retype::after { content: "▌"; animation: blink 0.8s step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }
```

## JS
```javascript
const el = document.getElementById('del-retype');
const text = 'DELETE & RETYPE';
let i = 0, del = false;
setInterval(() => { i += del ? -1 : 1; el.textContent = text.slice(0, i); if (i >= text.length) del = true; else if (i <= 0) del = false; }, 70);
```
