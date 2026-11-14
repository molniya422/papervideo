# 心跳（Heartbeat）· `heartbeat`

双拍心跳节奏,模拟真实心跳。

- 分类: basic · 难度: ★ · 标签: heartbeat, basic

## 参数
- `duration` (周期): 0.5–3（步长 0.1）s，默认 `1.2`

## HTML
```html
<div class="heartbeat">♥</div>
```

## CSS
```css
.heartbeat { animation: heartbeat var(--duration, 1.2s) ease-in-out infinite; }
@keyframes heartbeat { 0%, 100% { transform: scale(1); } 14% { transform: scale(1.3); } 28% { transform: scale(1); } 42% { transform: scale(1.3); } 70% { transform: scale(1); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
