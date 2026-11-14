# 着色器（WebGL Shader）· `webgl-shader`

自定义 GLSL 片元着色器生成动画。

- 分类: advanced · 难度: ★★★ · 标签: webgl, advanced

## 参数
- `speed` (速度): 0.1–3（步长 0.1），默认 `1`

## HTML
```html
<canvas class="shader"></canvas>
```

## CSS
```css
.shader { width: 100%; height: 100%; }
```

## JS
```javascript
const frag = `precision mediump float; uniform float u_time; uniform vec2 u_resolution; void main() { vec2 uv = gl_FragCoord.xy / u_resolution.xy; gl_FragColor = vec4(uv, 0.5 + 0.5 * sin(u_time), 1.0); }`;
```
