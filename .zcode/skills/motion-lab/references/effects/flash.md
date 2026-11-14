# 闪烁（Flash）· `flash`

元素透明度快速闪烁,适合新消息/警告提示。

- 分类: basic · 难度: ★ · 标签: flash, basic

## 参数
- `duration` (周期): 0.4–2（步长 0.1）s，默认 `0.8`
- `color` (颜色): 选项 ['red', 'yellow', 'blue', 'green']，默认 `red`

## HTML
```html
<div class="flash">NOTICE</div>
```

## CSS
```css
.flash { animation: flash var(--duration, 0.8s) ease-in-out infinite; padding: 12px 20px; background: hsl(0 90% 55%); color: white; border-radius: 8px; font-weight: 700; }
@keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
