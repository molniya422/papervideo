# 字距呼吸（Letter Spacing）· `letter-spacing-wave`

字间距循环变化,产生呼吸节奏。

- 分类: text · 难度: ★ · 标签: letter, text

## 参数
- `duration` (周期): 1–5（步长 0.1）s，默认 `2.5`
- `max` (最大间距): 4–24（步长 1）px，默认 `12`

## HTML
```html
<h1 class="lsw">BREATHE</h1>
```

## CSS
```css
.lsw { font-size: 32px; font-weight: 900; letter-spacing: 0; animation: lsw var(--duration, 2.5s) ease-in-out infinite; }
@keyframes lsw { 0%, 100% { letter-spacing: 0; } 50% { letter-spacing: var(--max, 12px); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
