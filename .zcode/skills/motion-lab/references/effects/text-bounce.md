# 弹跳文字（Bounce Text）· `text-bounce`

字符依次弹跳,活泼有趣。

- 分类: text · 难度: ★★ · 标签: bounce, text

## 参数
- `duration` (周期): 1–3（步长 0.1）s，默认 `1.6`

## HTML
```html
<h1 class="text-bounce">BOUNCE</h1>
```

## CSS
```css
.text-bounce span { display: inline-block; animation: textBounce var(--duration, 1.6s) ease-in-out infinite; }
.text-bounce span:nth-child(n) { animation-delay: calc(0.1s * n); }
@keyframes textBounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-18px); } }
```

## JS
```javascript
[...document.querySelector('.text-bounce').textContent].forEach(c => { const s = document.createElement('span'); s.textContent = c; c.replaceWith(s); });
```
