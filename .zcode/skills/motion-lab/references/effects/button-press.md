# 按钮按下（Button Press）· `button-press`

鼠标按下时按钮缩放反馈,有手感。

- 分类: interaction · 难度: ★ · 标签: button, interaction

## 参数
- `scale` (缩放): 0.85–0.98（步长 0.01），默认 `0.92`

## HTML
```html
<button class="press">CLICK</button>
```

## CSS
```css
.press { padding: 14px 28px; border: none; background: hsl(280 90% 60%); color: white; font-weight: 700; font-size: 18px; border-radius: 10px; cursor: pointer; transition: transform 0.1s, box-shadow 0.1s; box-shadow: 0 6px 0 hsl(280 90% 35%); }
.press:active { transform: scale(var(--scale, 0.92)) translateY(4px); box-shadow: 0 2px 0 hsl(280 90% 35%); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
