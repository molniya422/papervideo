# 错落淡入（Stagger Fade）· `stagger-fade`

多个文字依次淡入,带 stagger 延迟。

- 分类: text · 难度: ★★ · 标签: stagger, text

## 参数
- `duration` (单项时长): 0.2–1.5（步长 0.1）s，默认 `0.5`
- `stagger` (间隔): 0.05–0.5（步长 0.05）s，默认 `0.1`

## HTML
```html
<ul class="stagger"><li>一</li><li>二</li><li>三</li><li>四</li></ul>
```

## CSS
```css
.stagger li { opacity: 0; animation: fadeIn var(--duration, 0.5s) ease-out forwards; }
.stagger li:nth-child(1) { animation-delay: 0s; }
.stagger li:nth-child(2) { animation-delay: var(--stagger, 0.1s); }
.stagger li:nth-child(3) { animation-delay: calc(var(--stagger, 0.1s) * 2); }
.stagger li:nth-child(4) { animation-delay: calc(var(--stagger, 0.1s) * 3); }
@keyframes fadeIn { to { opacity: 1; transform: translateY(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
