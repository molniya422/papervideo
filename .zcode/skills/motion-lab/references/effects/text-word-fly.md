# 词语飞入（Word Fly）· `text-word-fly`

词语依次从远处飞入,带 stagger 延迟。

- 分类: text · 难度: ★★ · 标签: word, text

## 参数
- `duration` (单项时长): 0.4–1.5（步长 0.1）s，默认 `0.7`
- `stagger` (间隔): 0.05–0.4（步长 0.05）s，默认 `0.12`

## HTML
```html
<h1 class="word-fly"><span>Motion</span> <span>Lab</span> <span>Effects</span></h1>
```

## CSS
```css
.word-fly span { display: inline-block; opacity: 0; animation: wordFly var(--duration, 0.7s) cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.word-fly span:nth-child(1) { animation-delay: 0s; }
.word-fly span:nth-child(2) { animation-delay: var(--stagger, 0.12s); }
.word-fly span:nth-child(3) { animation-delay: calc(var(--stagger, 0.12s) * 2); }
@keyframes wordFly { from { opacity: 0; transform: translateZ(-200px) rotateY(40deg); } to { opacity: 1; transform: translateZ(0) rotateY(0); } }
```

## JS
```javascript
// Pure CSS — no JS needed
```
