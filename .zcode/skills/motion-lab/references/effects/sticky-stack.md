# 堆叠翻页（Sticky Stack）· `sticky-stack`

滚动时卡片堆叠翻页效果。

- 分类: interaction · 难度: ★★★ · 标签: sticky, interaction

## 参数
- `count` (卡片数): 3–8（步长 1），默认 `4`

## HTML
```html
<div class="stack"><div class="card">1</div><div class="card">2</div><div class="card">3</div></div>
```

## CSS
```css
.stack .card { position: sticky; top: 80px; padding: 40px; background: white; border-radius: 16px; margin-bottom: 20px; }
```

## JS
```javascript
// Pure CSS — no JS needed
```
