# 悬停旋转（Icon Spin）· `hover-icon-spin`

hover 时图标旋转一周。

- 分类: interaction · 难度: ★ · 标签: icon, interaction

## 参数
- `duration` (时长): 0.3–1.5（步长 0.1）s，默认 `0.6`

## HTML
```html
<button class="spin-icon"><span>⚙</span></button>
```

## CSS
```css
.spin-icon { padding: 12px 16px; border: 2px solid currentColor; background: transparent; border-radius: 10px; cursor: pointer; font-size: 18px; color: inherit; }
.spin-icon span { display: inline-block; transition: transform var(--duration, 0.6s) ease; }
.spin-icon:hover span { transform: rotate(360deg); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
