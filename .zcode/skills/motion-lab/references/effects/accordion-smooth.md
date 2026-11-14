# 手风琴（Accordion）· `accordion-smooth`

点击展开/收起内容,平滑过渡。

- 分类: interaction · 难度: ★★ · 标签: accordion, interaction

## 参数
- `duration` (时长): 0.2–1（步长 0.05）s，默认 `0.4`

## HTML
```html
<div class="acc"><button class="acc-h">Q: 什么是动效？</button><div class="acc-b"><p>动效是界面元素的运动,引导注意力,增强反馈。</p></div></div>
```

## CSS
```css
.acc { width: 280px; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.acc-h { width: 100%; padding: 14px 18px; background: hsl(280 90% 60%); color: white; border: none; text-align: left; font-weight: 700; cursor: pointer; font-size: 15px; }
.acc-b { max-height: 0; overflow: hidden; transition: max-height var(--duration, 0.4s) ease; }
.acc-b p { padding: 14px 18px; margin: 0; font-size: 14px; line-height: 1.6; color: #444; }
```

## JS
```javascript
const h = document.querySelector('.acc-h'); const b = document.querySelector('.acc-b');
h.addEventListener('click', () => { if (b.style.maxHeight) { b.style.maxHeight = null; } else { b.style.maxHeight = b.scrollHeight + 'px'; } });
```
