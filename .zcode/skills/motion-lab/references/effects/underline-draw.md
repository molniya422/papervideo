# 下划线（Underline Draw）· `underline-draw`

下划线从左到右逐段画出,适合链接。

- 分类: text · 难度: ★ · 标签: underline, text

## 参数
- `duration` (时长): 0.4–2（步长 0.1）s，默认 `0.8`

## HTML
```html
<a class="ul-draw">HOVER LINK</a>
```

## CSS
```css
.ul-draw { position: relative; font-size: 28px; font-weight: 700; color: inherit; text-decoration: none; }
.ul-draw::after { content: ""; position: absolute; left: 0; bottom: -4px; height: 3px; width: 0; background: currentColor; animation: ulDraw var(--duration, 0.8s) ease-out forwards; }
@keyframes ulDraw { to { width: 100%; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
