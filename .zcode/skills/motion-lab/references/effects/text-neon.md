# 霓虹发光（Neon Text）· `text-neon`

文字带霓虹灯发光效果,夜店招牌感。

- 分类: text · 难度: ★★ · 标签: neon, text

## 参数
- `duration` (周期): 1–4（步长 0.1）s，默认 `2`

## HTML
```html
<h1 class="text-neon">NEON</h1>
```

## CSS
```css
.text-neon { color: hsl(320 100% 70%); text-shadow: 0 0 6px hsl(320 100% 60%), 0 0 14px hsl(320 100% 55%), 0 0 28px hsl(320 100% 50%), 0 0 50px hsl(320 100% 45%); animation: neonFlicker var(--duration, 2s) ease-in-out infinite; }
@keyframes neonFlicker { 0%, 100% { opacity: 1; } 92% { opacity: 1; } 93% { opacity: 0.4; } 94% { opacity: 1; } 96% { opacity: 0.6; } 97% { opacity: 1; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
