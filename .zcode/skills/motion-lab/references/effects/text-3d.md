# 3D 文字（3D Text）· `text-3d`

多层文字堆叠形成 3D 立体透视效果。

- 分类: text · 难度: ★★ · 标签: 3d, text

## 参数
- `layers` (层数): 3–12（步长 1），默认 `6`
- `depth` (深度): 1–4（步长 1）px，默认 `2`

## HTML
```html
<h1 class="t3d" data-text="3D">3D</h1>
```

## CSS
```css
.t3d { position: relative; font-size: 56px; font-weight: 900; color: white; }
.t3d::before, .t3d::after { content: attr(data-text); position: absolute; inset: 0; }
.t3d::before { color: hsl(320 90% 60%); transform: translate(var(--depth, 2px), var(--depth, 2px)); }
.t3d::after { color: hsl(200 90% 60%); transform: translate(calc(var(--depth, 2px) * -1), calc(var(--depth, 2px) * -1)); }
```

## JS
```javascript
// Pure CSS — no JS needed
```
