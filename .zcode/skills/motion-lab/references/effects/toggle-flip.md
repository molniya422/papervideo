# 滑动开关（Toggle Flip）· `toggle-flip`

可点击切换的左右滑动 toggle。

- 分类: interaction · 难度: ★★ · 标签: toggle, interaction

## 参数
- `duration` (滑动时长): 0.2–0.8（步长 0.05）s，默认 `0.35`

## HTML
```html
<div class="toggle" data-on="false"><div class="knob"></div></div>
```

## CSS
```css
.toggle { position: relative; width: 64px; height: 32px; background: #ccc; border-radius: 999px; cursor: pointer; transition: background var(--duration, 0.35s); }
.toggle .knob { position: absolute; top: 4px; left: 4px; width: 24px; height: 24px; background: white; border-radius: 50%; transition: transform var(--duration, 0.35s) cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
.toggle.on { background: hsl(140 80% 50%); }
.toggle.on .knob { transform: translateX(32px); }
```

## JS
```javascript
const tg = document.querySelector('.toggle');
tg.addEventListener('click', () => { const on = tg.classList.toggle('on'); tg.dataset.on = String(on); });
```
