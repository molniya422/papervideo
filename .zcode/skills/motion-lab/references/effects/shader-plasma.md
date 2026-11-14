# 等离子着色器（Plasma Shader）· `shader-plasma`

GLSL 片元着色器生成等离子流动色彩。

- 分类: advanced · 难度: ★★★ · 标签: plasma, advanced

## 参数
- `speed` (速度): 0.1–3（步长 0.1），默认 `1`

## HTML
```html
<canvas class="plasma"></canvas>
```

## CSS
```css
.plasma { width: 100%; height: 100%; }
```

## JS
```javascript
const frag = `precision mediump float; uniform float u_time; uniform vec2 u_resolution; void main() { vec2 uv = gl_FragCoord.xy / u_resolution; float v = sin(uv.x*10.0 + u_time) + sin(uv.y*10.0 + u_time*1.3) + sin((uv.x+uv.y)*8.0); v = v / 3.0; gl_FragColor = vec4(0.5+0.5*sin(v*3.14), 0.5+0.5*sin(v*3.14+2.0), 0.5+0.5*sin(v*3.14+4.0), 1.0); }`;
```
