# 冰霜文字（Ice Text）· `text-ice`

文字带冰霜蓝白渐变与结晶光泽,寒冷感。

- 分类: text · 难度: ★★★ · 标签: ice, text

## 参数
- `duration` (周期): 1–4（步长 0.1）s，默认 `2.5`

## HTML
```html
<h1 class="text-ice">ICE</h1>
```

## CSS
```css
.text-ice { background: linear-gradient(135deg, hsl(190 90% 80%), hsl(210 80% 95%), hsl(200 90% 70%), hsl(220 60% 85%)); background-size: 200% 200%; -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 0 0 12px hsl(200 100% 80%); animation: iceShimmer var(--duration, 2.5s) ease-in-out infinite; }
@keyframes iceShimmer { 0%, 100% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
