# 3D 球体（3D Sphere）· `3d-sphere`

Three.js 线框球体自转,带粒子环绕。

- 分类: advanced · 难度: ★★★ · 标签: 3d, advanced

## 参数
- `detail` (细分): 8–48（步长 2），默认 `24`

## HTML
```html
<canvas class="sphere"></canvas>
```

## CSS
```css
.sphere { width: 100%; height: 100%; }
```

## JS
```javascript
import * as THREE from 'three';
const scene = new THREE.Scene();
const geom = new THREE.IcosahedronGeometry(1.5, 2);
const mat = new THREE.MeshBasicMaterial({ color: 0xaa66ff, wireframe: true });
scene.add(new THREE.Mesh(geom, mat));
```
