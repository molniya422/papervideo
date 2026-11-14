# 粘性光标（Blob Cursor）· `blob-cursor`

光标变成一个跟随的彩色 blob。

- 分类: interaction · 难度: ★★ · 标签: blob, interaction

## 参数
- `size` (尺寸): 20–80（步长 4）px，默认 `40`

## HTML
```html
<div class="blob"></div>
```

## CSS
```css
.blob { position: fixed; width: 40px; height: 40px; border-radius: 50%; background: hsl(280 90% 60%); mix-blend-mode: difference; pointer-events: none; transition: transform 0.15s; }
```

## JS
```javascript
const blob = document.querySelector('.blob');
document.addEventListener('mousemove', (e) => {
  blob.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`;
});
```
