# GSAP 错落（GSAP Stagger）· `gsap-stagger`

GSAP stagger 让多个元素错落入场。

- 分类: advanced · 难度: ★★ · 标签: gsap, advanced

## 参数
- `stagger` (间隔): 0.05–0.5（步长 0.05）s，默认 `0.15`

## HTML
```html
<div class="gsap-st"><div class="item">A</div><div class="item">B</div><div class="item">C</div><div class="item">D</div><div class="item">E</div></div>
```

## CSS
```css
.gsap-st { display: flex; gap: 8px; }
.gsap-st .item { width: 40px; height: 40px; border-radius: 8px; background: linear-gradient(135deg, hsl(280 90% 60%), hsl(200 90% 60%)); color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; }
```

## JS
```javascript
gsap.from('.gsap-st .item', { y: 40, opacity: 0, duration: 0.6, stagger: 0.15, repeat: -1, repeatDelay: 1 });
```
