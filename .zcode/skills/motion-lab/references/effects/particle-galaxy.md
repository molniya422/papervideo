# 粒子星系（Particle Galaxy）· `particle-galaxy`

Three.js 螺旋星系粒子,缓慢自转。

- 分类: advanced · 难度: ★★★ · 标签: particle, advanced

## 参数
- `count` (粒子数): 500–8000（步长 500），默认 `3000`

## HTML
```html
<canvas class="galaxy"></canvas>
```

## CSS
```css
.galaxy { width: 100%; height: 100%; }
```

## JS
```javascript
import * as THREE from 'three';
const scene = new THREE.Scene();
const geom = new THREE.BufferGeometry();
const pos = new Float32Array(3000 * 3); const col = new Float32Array(3000 * 3);
for (let i = 0; i < 3000; i++) { const r = Math.random() * 5; const a = i * 0.3; pos[i*3] = Math.cos(a) * r; pos[i*3+1] = (Math.random()-0.5)*0.5; pos[i*3+2] = Math.sin(a) * r; }
geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const mat = new THREE.PointsMaterial({ color: 0xff66ff, size: 0.04 });
scene.add(new THREE.Points(geom, mat));
```
