# GSAP 时间线（GSAP Timeline）· `gsap-timeline`

GSAP 时间线编排多步动画序列。

- 分类: advanced · 难度: ★★★ · 标签: gsap, advanced

## 参数
- `duration` (时长): 1–6（步长 0.2）s，默认 `3`

## HTML
```html
<div class="gsap-tl"><div class="b b1">1</div><div class="b b2">2</div><div class="b b3">3</div></div>
```

## CSS
```css
.gsap-tl .b { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; }
.gsap-tl .b1 { background: hsl(280 90% 60%); }
.gsap-tl .b2 { background: hsl(200 90% 60%); }
.gsap-tl .b3 { background: hsl(320 90% 60%); }
```

## JS
```javascript
const tl = gsap.timeline({ repeat: -1 });
tl.to('.b1', { x: 60, duration: 1 }).to('.b2', { x: 60, duration: 1 }, '<0.2').to('.b3', { x: 60, duration: 1 }, '<0.2').to('.b', { x: 0, duration: 1 }, '+=0.3');
```
