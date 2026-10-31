# 垂直跑马灯（Vertical Marquee）· `vertical-marquee`

文字从下往上垂直滚动。

- 分类: text · 难度: ★★ · 标签: vertical, text

## 参数
- `duration` (周期): 5–30（步长 1）s，默认 `15`

## HTML
```html
<div class="vmarquee"><div>设计 · 设计 · 设计 · 设计</div><div>设计 · 设计 · 设计 · 设计</div></div>
```

## CSS
```css
.vmarquee { height: 60px; overflow: hidden; }
.vmarquee > div { animation: vm var(--duration, 15s) linear infinite; }
@keyframes vm { from { transform: translateY(0); } to { transform: translateY(-100%); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
