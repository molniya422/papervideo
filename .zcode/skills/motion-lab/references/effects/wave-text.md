# 波浪文字（Wave Text）· `wave-text`

每个字符上下波动形成波浪。

- 分类: text · 难度: ★★ · 标签: wave, text

## 参数
- `duration` (周期): 0.8–3（步长 0.1）s，默认 `1.6`

## HTML
```html
<span class="wave-text">WAVE</span>
```

## CSS
```css
.wave-text span { display: inline-block; animation: wave var(--duration, 1.6s) ease-in-out infinite; }
.wave-text span:nth-child(n) { animation-delay: calc(0.1s * n); }
@keyframes wave { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
```

## JS
```javascript
document.querySelectorAll('.wave-text').forEach(el => el.innerHTML = [...el.textContent].map(c => `<span>${c}</span>`).join(''));
```
