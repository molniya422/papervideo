# 火球着色器（Fireball Shader）· `shader-fireball`

GLSL 着色器生成燃烧火球纹理。

- 分类: advanced · 难度: ★★★ · 标签: fireball, advanced

## 参数
- `speed` (速度): 0.1–3（步长 0.1），默认 `1`

## HTML
```html
<canvas class="fireball"></canvas>
```

## CSS
```css
.fireball { width: 100%; height: 100%; }
```

## JS
```javascript
const frag = `precision mediump float; uniform float u_time; uniform vec2 u_resolution; float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); } void main() { vec2 uv = gl_FragCoord.xy/u_resolution; float n = hash(uv*10.0 + u_time); vec3 col = mix(vec3(1.0,0.8,0.1), vec3(0.8,0.1,0.0), uv.y); gl_FragColor = vec4(col*n*1.5, 1.0); }`;
```
