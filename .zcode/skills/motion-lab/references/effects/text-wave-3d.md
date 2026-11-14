# 3D 波浪（Wave 3D）· `text-wave-3d`

字符以 3D 透视上下波浪起伏,立体波浪。

- 分类: text · 难度: ★★ · 标签: wave, text

## 参数
- `duration` (周期): 1–4（步长 0.1）s，默认 `2`

## HTML
```html
<h1 class="wave-3d">WAVE</h1>
```

## CSS
```css
.wave-3d { perspective: 400px; }
.wave-3d span { display: inline-block; animation: wave3d var(--duration, 2s) ease-in-out infinite; }
.wave-3d span:nth-child(n) { animation-delay: calc(0.08s * n); }
@keyframes wave3d { 0%, 100% { transform: translateY(0) rotateX(0); } 50% { transform: translateY(-14px) rotateX(60deg); } }
```

## JS
```javascript
[...document.querySelector('.wave-3d').textContent].forEach(c => { const s = document.createElement('span'); s.textContent = c; c.replaceWith(s); });
```
