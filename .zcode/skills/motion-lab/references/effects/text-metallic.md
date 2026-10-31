# 金属质感（Metallic Text）· `text-metallic`

文字带金属光泽渐变,质感高级。

- 分类: text · 难度: ★★★ · 标签: metallic, text

## 参数
- `duration` (周期): 1–5（步长 0.1）s，默认 `2.5`

## HTML
```html
<h1 class="text-metallic">METAL</h1>
```

## CSS
```css
.text-metallic { background: linear-gradient(180deg, hsl(0 0% 85%) 0%, hsl(0 0% 35%) 45%, hsl(0 0% 75%) 50%, hsl(0 0% 30%) 55%, hsl(0 0% 80%) 100%); background-size: 100% 200%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: metalShine var(--duration, 2.5s) ease-in-out infinite; }
@keyframes metalShine { 0%, 100% { background-position: 0% 0%; } 50% { background-position: 0% 100%; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
