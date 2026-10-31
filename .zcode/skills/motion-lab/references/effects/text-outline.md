# 描边文字（Outline Text）· `text-outline`

文字仅描边显示并循环呼吸,极简风格。

- 分类: text · 难度: ★★ · 标签: outline, text

## 参数
- `duration` (周期): 1–4（步长 0.1）s，默认 `2`

## HTML
```html
<h1 class="text-outline">OUTLINE</h1>
```

## CSS
```css
.text-outline { color: transparent; -webkit-text-stroke: 2px hsl(280 90% 60%); animation: outlinePulse var(--duration, 2s) ease-in-out infinite; }
@keyframes outlinePulse { 0%, 100% { -webkit-text-stroke-color: hsl(280 90% 60%); } 50% { -webkit-text-stroke-color: hsl(200 90% 60%); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
