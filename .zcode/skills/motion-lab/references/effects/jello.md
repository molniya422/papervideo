# 果冻（Jello）· `jello`

元素呈现果冻般的扭曲抖动,俏皮可爱。

- 分类: basic · 难度: ★★ · 标签: jello, basic

## 参数
- `duration` (时长): 0.6–1.5（步长 0.1）s，默认 `0.9`

## HTML
```html
<div class="jello">JELLO</div>
```

## CSS
```css
.jello { display: inline-block; animation: jello var(--duration, 0.9s) ease-in-out infinite; transform-origin: center; }
@keyframes jello { 0%, 100% { transform: scale3d(1, 1, 1); } 30% { transform: scale3d(1.25, 0.75, 1); } 40% { transform: scale3d(0.75, 1.25, 1); } 50% { transform: scale3d(1.15, 0.85, 1); } 65% { transform: scale3d(0.95, 1.05, 1); } 75% { transform: scale3d(1.05, 0.95, 1); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
