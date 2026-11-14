import React, {useMemo} from "react";
import * as THREE from "three";
import {useCurrentFrame} from "remotion";
import {useThree} from "@react-three/fiber";
import {C, rnd} from "./layout";

/* ─────────── 相机 ─────────── */
export const Rig: React.FC<{position: [number, number, number]; lookAt?: [number, number, number]}> = ({
  position,
  lookAt = [0, 0, 0],
}) => {
  const {camera} = useThree();
  camera.position.set(...position);
  camera.lookAt(...lookAt);
  return null;
};

/* ─────────── 灯光（线框不吃光，只留一点体积感） ─────────── */
export const Lights: React.FC = () => (
  <>
    <ambientLight intensity={0.55} />
    <directionalLight position={[6, 8, 7]} intensity={0.8} color="#dce9ff" />
    <fog attach="fog" args={[C.bg, 22, 60]} />
  </>
);

/* ─────────── 线框盒：干净 12 条棱 + 极淡体面 ─────────── */
export const WireBox: React.FC<{
  position?: [number, number, number];
  size?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  opacity?: number;
  fill?: number;
  scale?: [number, number, number];
}> = ({position = [0, 0, 0], size = [1, 1, 1], rotation = [0, 0, 0], color = C.line, opacity = 0.9, fill = 0.04, scale}) => {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), [size[0], size[1], size[2]]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </lineSegments>
      {fill > 0 ? (
        <mesh>
          <boxGeometry args={size} />
          <meshBasicMaterial color={color} transparent opacity={fill} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
};

/* ─────────── 线：两点之间的细长盒，可做"绘制"动画 ─────────── */
export const WireLine: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  opacity?: number;
  thickness?: number;
  progress?: number;
}> = ({from, to, color = C.lineDim, opacity = 0.7, thickness = 0.012, progress = 1}) => {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const p = Math.max(0.0001, Math.min(1, progress));
  const mid = a.clone().add(dir.clone().multiplyScalar(p * 0.5));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={q} scale={[1, len * p, 1]}>
      <boxGeometry args={[thickness, 1, thickness]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

/* ─────────── 线性刻度 ─────────── */
export const Ticks: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  count?: number;
  length?: number;
  color?: string;
  opacity?: number;
}> = ({start, end, count = 8, length = 0.18, color = C.lineFaint, opacity = 0.7}) => {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  return (
    <group>
      {Array.from({length: count + 1}).map((_, i) => {
        const t = i / count;
        const p = a.clone().lerp(b, t);
        return (
          <mesh key={i} position={[p.x, p.y, p.z]}>
            <boxGeometry args={[length, 0.012, 0.012]} />
            <meshBasicMaterial color={color} transparent opacity={i % 2 === 0 ? opacity : opacity * 0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ─────────── 矩阵：线框小格 ─────────── */
export const WireMatrix: React.FC<{
  rows: number;
  cols: number;
  cell?: number;
  gap?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  value?: (j: number, i: number, f: number) => number;
  opacity?: number;
  maxLift?: number;
}> = ({rows, cols, cell = 0.26, gap = 0.05, position = [0, 0, 0], rotation = [0, 0, 0], color = C.line, value, opacity = 0.85, maxLift = 0.22}) => {
  const frame = useCurrentFrame();
  return (
    <group position={position} rotation={rotation}>
      {Array.from({length: rows * cols}).map((_, k) => {
        const i = k % cols;
        const j = Math.floor(k / cols);
        const v = value ? Math.max(0.04, Math.min(1, value(j, i, frame))) : 0.5;
        return (
          <group key={k} position={[(i - (cols - 1) / 2) * (cell + gap), ((rows - 1) / 2 - j) * (cell + gap), 0]}>
            <mesh position={[0, 0, (v * maxLift) / 2]}>
              <boxGeometry args={[cell, cell, Math.max(0.004, v * maxLift)]} />
              <meshBasicMaterial color={color} transparent opacity={Math.pow(v, 1.7) * opacity * 0.75} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0, v * maxLift + 0.004]}>
              <boxGeometry args={[cell, cell, 0.004]} />
              <meshBasicMaterial color={color} transparent opacity={0.05 + Math.pow(v, 1.5) * opacity * 0.6} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/* ─────────── 层堆叠 ─────────── */
export const WireStack: React.FC<{
  count?: number;
  position?: [number, number, number];
  size?: [number, number, number];
  gapY?: number;
  color?: string;
  opacity?: number;
  glow?: (i: number, f: number) => number;
  scaleY?: number;
}> = ({count = 6, position = [0, 0, 0], size = [1.9, 0.3, 1.6], gapY = 0.62, color = C.line, opacity = 0.8, glow, scaleY = 1}) => {
  const frame = useCurrentFrame();
  return (
    <group position={position} scale={[1, scaleY, 1]}>
      {Array.from({length: count}).map((_, i) => {
        const g = glow ? glow(i, frame) : 0.4;
        return (
          <WireBox
            key={i}
            position={[0, (i - (count - 1) / 2) * gapY, 0]}
            size={size}
            color={g > 0.65 ? C.accent : color}
            opacity={0.45 + g * 0.5}
            fill={0.02 + g * 0.05}
          />
        );
      })}
    </group>
  );
};

/* ─────────── 柱状（线框） ─────────── */
export const WireBar: React.FC<{
  position: [number, number, number];
  height: number;
  width?: number;
  depth?: number;
  color?: string;
  opacity?: number;
  fill?: number;
}> = ({position, height, width = 0.56, depth = 0.56, color = C.line, opacity = 0.9, fill = 0.05}) => {
  const h = Math.max(0.001, height);
  return <WireBox position={[position[0], position[1] + h / 2, position[2]]} size={[width, h, depth]} color={color} opacity={opacity} fill={fill} />;
};

/* ─────────── 图纸边框与图签 ─────────── */
export const SheetFrame: React.FC<{
  w?: number;
  h?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  opacity?: number;
  progress?: number;
}> = ({w = 10, h = 6, position = [0, 0, 0], rotation = [0, 0, 0], opacity = 0.7, progress = 1}) => {
  const p = Math.min(1, progress);
  return (
    <group position={position} rotation={rotation}>
      <WireLine from={[-w / 2, h / 2, 0]} to={[w / 2, h / 2, 0]} color={C.line} opacity={opacity} progress={Math.min(1, p * 4)} />
      <WireLine from={[w / 2, h / 2, 0]} to={[w / 2, -h / 2, 0]} color={C.line} opacity={opacity} progress={Math.min(1, p * 4 - 1)} />
      <WireLine from={[w / 2, -h / 2, 0]} to={[-w / 2, -h / 2, 0]} color={C.line} opacity={opacity} progress={Math.min(1, p * 4 - 2)} />
      <WireLine from={[-w / 2, -h / 2, 0]} to={[-w / 2, h / 2, 0]} color={C.line} opacity={opacity} progress={Math.min(1, p * 4 - 3)} />
      {/* 图签框：右下角 */}
      <WireLine from={[w / 2 - 2.1, -h / 2, 0.01]} to={[w / 2, -h / 2, 0.01]} color={C.lineFaint} opacity={opacity * 0.8} />
      <WireLine from={[w / 2 - 2.1, -h / 2, 0.01]} to={[w / 2 - 2.1, -h / 2 + 0.9, 0.01]} color={C.lineFaint} opacity={opacity * 0.8} />
      <WireLine from={[w / 2 - 2.1, -h / 2 + 0.9, 0.01]} to={[w / 2, -h / 2 + 0.9, 0.01]} color={C.lineFaint} opacity={opacity * 0.8} />
    </group>
  );
};

/* ─────────── 流动点 ─────────── */
export const FlowDots: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  count?: number;
  progress?: number;
  color?: string;
  size?: number;
  arc?: number;
}> = ({from, to, count = 8, progress = 1, color = C.mint, size = 0.05, arc = 0}) => {
  const frame = useCurrentFrame();
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  return (
    <group>
      {Array.from({length: count}).map((_, i) => {
        const t = (((frame * 0.012 + i / count) % 1) * progress);
        const p = a.clone().lerp(b, t);
        p.y += Math.sin(Math.PI * t) * arc;
        return (
          <mesh key={i} position={[p.x, p.y, p.z]}>
            <sphereGeometry args={[size, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.9 - t * 0.4} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ─────────── 线框热力图（DataTexture） ─────────── */
export const HeatPlane: React.FC<{
  cols?: number;
  rows?: number;
  width?: number;
  height?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  fn: (u: number, v: number, f: number) => [number, number, number];
  opacity?: number;
}> = ({cols = 72, rows = 44, width = 8.4, height = 4.6, position = [0, 0, 0], rotation = [0, 0, 0], fn, opacity = 0.95}) => {
  const frame = useCurrentFrame();
  const {tex, data} = useMemo(() => {
    const data = new Uint8Array(cols * rows * 4);
    const tex = new THREE.DataTexture(data, cols, rows, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return {tex, data};
  }, [cols, rows]);

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const [r, g, b] = fn(i / (cols - 1), j / (rows - 1), frame);
      const k = (j * cols + i) * 4;
      data[k] = r;
      data[k + 1] = g;
      data[k + 2] = b;
      data[k + 3] = 255;
    }
  }
  tex.needsUpdate = true;

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} side={THREE.DoubleSide} />
    </mesh>
  );
};

/* ─────────── 波形族：不同频率的正弦线，蓝图式表达位置编码 ─────────── */
export const WaveFamily: React.FC<{
  rows?: number;
  cols?: number;
  width?: number;
  height?: number;
  position?: [number, number, number];
  colorA?: string;
  colorB?: string;
  opacity?: number;
}> = ({rows = 18, cols = 56, width = 8.6, height = 4.4, position = [0, 0, 0], colorA = C.mint, colorB = C.lineDim, opacity = 0.9}) => {
  const frame = useCurrentFrame();
  const obj = useMemo(() => {
    const n = rows * (cols - 1) * 2;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const m = new THREE.LineBasicMaterial({vertexColors: true, transparent: true, opacity});
    return new THREE.LineSegments(g, m);
  }, [rows, cols]);

  const pos = obj.geometry.attributes.position.array as Float32Array;
  const col = obj.geometry.attributes.color.array as Float32Array;
  const ca = new THREE.Color(colorA);
  const cb = new THREE.Color(colorB);
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const dim = r / (rows - 1);
    const freq = Math.pow(10000, -dim);
    const yBase = height / 2 - r * (height / (rows - 1));
    const amp = (height / (rows - 1)) * 0.5;
    const c = ca.clone().lerp(cb, dim);
    for (let i = 0; i < cols - 1; i++) {
      const x1 = (i / (cols - 1) - 0.5) * width;
      const x2 = ((i + 1) / (cols - 1) - 0.5) * width;
      const y1 = yBase + Math.sin(x1 * Math.PI * freq + frame * 0.01) * amp;
      const y2 = yBase + Math.sin(x2 * Math.PI * freq + frame * 0.01) * amp;
      pos[k * 3] = x1; pos[k * 3 + 1] = y1; pos[k * 3 + 2] = 0;
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; k++;
      pos[k * 3] = x2; pos[k * 3 + 1] = y2; pos[k * 3 + 2] = 0;
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; k++;
    }
  }
  obj.geometry.attributes.position.needsUpdate = true;
  obj.geometry.attributes.color.needsUpdate = true;
  obj.geometry.computeBoundingSphere();
  (obj.material as THREE.LineBasicMaterial).opacity = opacity;

  return <primitive object={obj} position={position} />;
};

/* ─────────── 点列波形（指纹） ─────────── */
export const Fingerprint: React.FC<{
  x: number;
  y: number;
  z: number;
  n?: number;
  amp?: number;
  phase?: number;
  color?: string;
  height?: number;
}> = ({x, y, z, n = 44, amp = 0.42, phase = 0, color = C.mint, height = 3.6}) => {
  const frame = useCurrentFrame();
  return (
    <group>
      {Array.from({length: n}).map((_, i) => {
        const freq = Math.pow(10000, -(i / n));
        const v = Math.sin(phase * freq + frame * 0.012);
        return (
          <mesh key={i} position={[x + v * amp, y + height / 2 - (i / n) * height, z]}>
            <boxGeometry args={[0.035, 0.035, 0.035]} />
            <meshBasicMaterial color={color} transparent opacity={0.85 - (i / n) * 0.35} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ─────────── 标注：引线 + 端点 ─────────── */
export const Leader: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  opacity?: number;
}> = ({from, to, color = C.accent, opacity = 0.85}) => (
  <group>
    <WireLine from={from} to={to} color={color} opacity={opacity} thickness={0.01} />
    <mesh position={from}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  </group>
);

/* ─────────── 漂移的细小标记（图纸上的灰尘/坐标点） ─────────── */
export const Dust: React.FC<{count?: number}> = ({count = 160}) => {
  const frame = useCurrentFrame();
  const pos = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (rnd(i * 3.7) - 0.5) * 26;
      a[i * 3 + 1] = (rnd(i * 8.1) - 0.5) * 14;
      a[i * 3 + 2] = (rnd(i * 5.3) - 0.5) * 20 - 3;
    }
    return a;
  }, [count]);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color={C.lineDim} transparent opacity={0.5 * (0.8 + 0.2 * Math.sin(frame * 0.02))} sizeAttenuation depthWrite={false} />
    </points>
  );
};
