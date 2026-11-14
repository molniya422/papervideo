# 跑马灯（Marquee）· `marquee`

内容从右向左无限滚动。

- 分类: basic · 难度: ★★ · 标签: marquee, basic

## 参数
- `duration` (周期): 5–30（步长 1）s，默认 `12`
- `direction` (方向): 选项 ['left', 'right']，默认 `left`

## HTML
```html
<div class="marquee"><span>Motion.Lab · 动效实验室 · </span><span>Motion.Lab · 动效实验室 · </span></div>
```

## CSS
```css
.marquee { display: flex; gap: 32px; animation: marquee var(--duration, 12s) linear infinite; white-space: nowrap; }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
