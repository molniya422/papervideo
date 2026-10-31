# 粒子系统（Three.js Particles）· `three-particles`

Three.js 渲染的几何粒子系统。

- 分类: advanced · 难度: ★★★ · 标签: three.js, advanced

## 参数
- `count` (粒子数): 100–5000（步长 100），默认 `1500`

## HTML
```html
<canvas class="three"></canvas>
```

## CSS
```css
.three { width: 100%; height: 100%; }
```

## JS
```javascript
import * as THREE from 'three';
const scene = new THREE.Scene();
const geom = new THREE.BufferGeometry();
const positions = new Float32Array(1500 * 3);
for (let i = 0; i < 1500 * 3; i++) positions[i] = (Math.random() - 0.5) * 10;
geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const mat = new THREE.PointsMaterial({ color: 0xff00ff, size: 0.05 });
scene.add(new THREE.Points(geom, mat));
```
