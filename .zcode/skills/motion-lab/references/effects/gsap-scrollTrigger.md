# 滚动驱动（GSAP ScrollTrigger）· `gsap-scrollTrigger`

使用 GSAP ScrollTrigger 绑定滚动进度。

- 分类: advanced · 难度: ★★★ · 标签: gsap, advanced

## 参数
- `distance` (位移): 50–400（步长 10）px，默认 `200`

## HTML
```html
<div class="gsap-target">SCROLL</div>
```

## CSS
```css
.gsap-target { font-size: 64px; font-weight: 900; }
```

## JS
```javascript
gsap.registerPlugin(ScrollTrigger);
gsap.to('.gsap-target', { x: 200, scrollTrigger: { trigger: '.gsap-target', start: 'top center', end: 'bottom center', scrub: true } });
```
