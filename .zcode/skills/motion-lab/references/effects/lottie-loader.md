# Lottie 加载（Lottie Loader）· `lottie-loader`

使用 Lottie 动画作为加载器。

- 分类: advanced · 难度: ★★ · 标签: lottie, advanced

## 参数
- `style` (风格): 选项 ['pulse', 'orbit', 'wave']，默认 `pulse`

## HTML
```html
<div class="lottie"></div>
```

## CSS
```css
.lottie { width: 200px; height: 200px; }
```

## JS
```javascript
import lottie from 'lottie-web';
lottie.loadAnimation({ container: document.querySelector('.lottie'), renderer: 'svg', loop: true, autoplay: true, path: '/animation.json' });
```
