# 3D 圆环（3D Torus）· `3d-torus`

Three.js 圆环持续旋转,带光泽材质。

- 分类: advanced · 难度: ★★ · 标签: 3d, advanced

## 参数
- `duration` (周期): 2–12（步长 0.5）s，默认 `6`

## HTML
```html
<canvas class="torus"></canvas>
```

## CSS
```css
.torus { width: 100%; height: 100%; }
```

## JS
```javascript
import * as THREE from 'three';
const scene = new THREE.Scene();
const geom = new THREE.TorusGeometry(1.2, 0.4, 16, 60);
const mat = new THREE.MeshNormalMaterial();
scene.add(new THREE.Mesh(geom, mat));
```
