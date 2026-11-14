import React, {useMemo} from "react";
import * as THREE from "three";
import {useCurrentFrame} from "remotion";
import {useThree} from "@react-three/fiber";
import {C, rnd} from "../layout";

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

/* ─────────── 灯光与氛围 ─────────── */
export const Lights: React.FC<{accent?: string}> = ({accent = C.blue}) => (
  <>
    <ambientLight intensity={0.42} />
    <directionalLight position={[6, 9, 7]} intensity={1.6} color="#d8e6ff" />
    <directionalLight position={[-8, 5, -4]} intensity={0.9} color={accent} />
    <pointLight position={[0, 3, 7]} intensity={26} distance={26} color={accent} />
    <fog attach="fog" args={[C.bg, 16, 46]} />
  </>
);

export const Stars: React.FC<{count?: number; radius?: number; opacity?: number}> = ({
  count = 700,
  radius = 55,
  opacity = 0.6,
}) => {
  const frame = useCurrentFrame();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rnd(i * 3.1), v = rnd(i * 7.7);
      const r = radius * (0.4 + 0.6 * rnd(i * 1.3));
      const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
      arr[i * 3] = r * Math.sin(ph) * Math.cos(th);
      arr[i * 3 + 1] = r * Math.cos(ph) * 0.7;
      arr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    return arr;
  }, [count, radius]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#9dc4ff"
        transparent
        opacity={opacity * (0.85 + 0.15 * Math.sin(frame * 0.06))}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

/* ─────────── 发光球 ─────────── */
export const Glow: React.FC<{
  position: [number, number, number];
  r?: number;
  color?: string;
  intensity?: number;
  opacity?: number;
  halo?: number;
}> = ({position, r = 0.3, color = C.blue, intensity = 1.4, opacity = 1, halo = 1}) => (
  <group position={position}>
    <mesh>
      <sphereGeometry args={[r, 28, 28]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        roughness={0.3}
        metalness={0.2}
        transparent
        opacity={opacity}
      />
    </mesh>
    {halo > 0 ? (
      <mesh>
        <sphereGeometry args={[r * (1.5 + 0.3 * halo), 20, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.07 * opacity * halo} depthWrite={false} />
      </mesh>
    ) : null}
  </group>
);

/* ─────────── 令牌立方 ─────────── */
export const Tokens: React.FC<{
  n: number;
  spacing?: number;
  size?: number;
  y?: number;
  z?: number;
  color?: string;
  lit?: (i: number, frame: number) => number;
  opacity?: number;
}> = ({n, spacing = 1.15, size = 0.62, y = 0, z = 0, color = C.blue, lit, opacity = 1}) => {
  const frame = useCurrentFrame();
  return (
    <group position={[0, y, z]}>
      {Array.from({length: n}).map((_, i) => {
        const level = lit ? lit(i, frame) : 0.35;
        const x = (i - (n - 1) / 2) * spacing;
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh>
              <boxGeometry args={[size, size, size]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.3 + level * 2.6}
                roughness={0.28}
                metalness={0.35}
                transparent
                opacity={opacity * (0.55 + level * 0.45)}
              />
            </mesh>
            {level > 0.45 ? (
              <mesh scale={1.5 + level * 0.6}>
                <boxGeometry args={[size, size, size]} />
                <meshBasicMaterial color={color} transparent opacity={0.045 * level} depthWrite={false} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
};

/* ─────────── 注意力矩阵（瓦片） ─────────── */
export const MatrixTiles: React.FC<{
  rows: number;
  cols: number;
  cell?: number;
  gap?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  value: (j: number, i: number, frame: number) => number;
  opacity?: number;
  maxHeight?: number;
}> = ({rows, cols, cell = 0.3, gap = 0.055, position = [0, 0, 0], rotation = [0, 0, 0], color = C.blue, value, opacity = 1, maxHeight = 0.32}) => {
  const frame = useCurrentFrame();
  return (
    <group position={position} rotation={rotation}>
      {Array.from({length: rows * cols}).map((_, k) => {
        const i = k % cols;
        const j = Math.floor(k / cols);
        const v = Math.max(0, Math.min(1, value(j, i, frame)));
        return (
          <mesh
            key={k}
            position={[(i - (cols - 1) / 2) * (cell + gap), ((rows - 1) / 2 - j) * (cell + gap), (v * maxHeight) / 2]}
          >
            <boxGeometry args={[cell, cell, Math.max(0.02, v * maxHeight)]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.18 + v * 1.9}
              roughness={0.3}
              metalness={0.4}
              transparent
              opacity={opacity * (0.28 + v * 0.68)}
            />
          </mesh>
        );
      })}
    </group>
  );
};

/* ─────────── 矩阵外框 + 刻度 ─────────── */
export const MatrixFrame: React.FC<{
  rows: number;
  cols: number;
  cell?: number;
  gap?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  opacity?: number;
}> = ({rows, cols, cell = 0.3, gap = 0.055, position = [0, 0, 0], rotation = [0, 0, 0], color = C.dim, opacity = 0.5}) => {
  const w = cols * cell + (cols - 1) * gap + 0.24;
  const h = rows * cell + (rows - 1) * gap + 0.24;
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial color={color} transparent opacity={opacity * 0.12} side={THREE.DoubleSide} />
    </mesh>
  );
};

/* ─────────── 向量列（小方块堆叠） ─────────── */
export const VectorCol: React.FC<{
  n?: number;
  position?: [number, number, number];
  color?: string;
  value?: (i: number, frame: number) => number;
  cell?: number;
  gap?: number;
  opacity?: number;
}> = ({n = 8, position = [0, 0, 0], color = C.blue, value, cell = 0.24, gap = 0.06, opacity = 1}) => {
  const frame = useCurrentFrame();
  return (
    <group position={position}>
      {Array.from({length: n}).map((_, i) => {
        const v = value ? Math.max(0, Math.min(1, value(i, frame))) : 0.5;
        return (
          <mesh key={i} position={[0, ((n - 1) / 2 - i) * (cell + gap), v * 0.12]}>
            <boxGeometry args={[cell, cell, 0.08 + v * 0.22]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.25 + v * 1.5}
              roughness={0.3}
              metalness={0.4}
              transparent
              opacity={opacity * (0.4 + v * 0.55)}
            />
          </mesh>
        );
      })}
    </group>
  );
};

/* ─────────── 条形（可水平或垂直） ─────────── */
export const Bar: React.FC<{
  position: [number, number, number];
  height: number;
  width?: number;
  depth?: number;
  color?: string;
  opacity?: number;
  intensity?: number;
}> = ({position, height, width = 0.7, depth = 0.7, color = C.blue, opacity = 1, intensity = 0.7}) => {
  const h = Math.max(0.001, height);
  return (
    <mesh position={[position[0], position[1] + h / 2, position[2]]} scale={[1, h, 1]}>
      <boxGeometry args={[width, 1, depth]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        roughness={0.28}
        metalness={0.4}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
};

/* ─────────── 曲线弧 + 行进光点 ─────────── */
export const Arc: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  lift?: number;
  color?: string;
  opacity?: number;
  radius?: number;
  head?: number;
  width?: number;
}> = ({from, to, lift = 1.4, color = C.blue, opacity = 0.5, radius = 0.026, head = -1}) => {
  const curve = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const m = a.clone().add(b).multiplyScalar(0.5);
    m.y += lift;
    return new THREE.QuadraticBezierCurve3(a, m, b);
  }, [from[0], from[1], from[2], to[0], to[1], to[2], lift]);
  const geom = useMemo(() => new THREE.TubeGeometry(curve, 40, radius, 6, false), [curve, radius]);
  const p = head >= 0 && head <= 1 ? curve.getPointAt(head) : null;

  return (
    <group>
      <mesh geometry={geom}>
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      {p ? (
        <mesh position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[radius * 3.2, 10, 10]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
};

/* ─────────── 热力图平面（DataTexture，逐帧更新） ─────────── */
export const Heatmap: React.FC<{
  cols?: number;
  rows?: number;
  width?: number;
  height?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  opacity?: number;
  fn: (u: number, v: number, frame: number) => [number, number, number];
}> = ({cols = 64, rows = 36, width = 8, height = 4.5, position = [0, 0, 0], rotation = [0, 0, 0], opacity = 0.95, fn}) => {
  const frame = useCurrentFrame();
  const {tex, data} = useMemo(() => {
    const data = new Uint8Array(cols * rows * 4);
    const tex = new THREE.DataTexture(data, cols, rows, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
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

/* ─────────── 层堆叠（架构图） ─────────── */
export const Slabs: React.FC<{
  count?: number;
  position?: [number, number, number];
  color?: string;
  size?: [number, number, number];
  gapY?: number;
  opacity?: number;
  glow?: (i: number, frame: number) => number;
}> = ({count = 6, position = [0, 0, 0], color = C.blue, size = [2.0, 0.4, 1.8], gapY = 0.78, opacity = 0.85, glow}) => {
  const frame = useCurrentFrame();
  return (
    <group position={position}>
      {Array.from({length: count}).map((_, i) => {
        const g = glow ? glow(i, frame) : 0.4;
        return (
          <mesh key={i} position={[0, (i - (count - 1) / 2) * gapY, 0]}>
            <boxGeometry args={size} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.2 + g * 1.2}
              roughness={0.25}
              metalness={0.55}
              transparent
              opacity={opacity}
            />
          </mesh>
        );
      })}
    </group>
  );
};

/* ─────────── 地面网格 ─────────── */
export const Floor: React.FC<{y?: number; size?: number; opacity?: number}> = ({y = -3.4, size = 40}) => (
  <gridHelper args={[size, 40, "#16223f", "#0a1020"]} position={[0, y, 0]} />
);

/* ─────────── 软归一化曲线（用点串成线） ─────────── */
export const CurveLine: React.FC<{
  points: number[];
  width?: number;
  height?: number;
  position?: [number, number, number];
  color?: string;
  opacity?: number;
}> = ({points, width = 6, height = 2.4, position = [0, 0, 0], color = C.amber, opacity = 0.9}) => {
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(points.length * 3), 3));
    const m = new THREE.LineBasicMaterial({color, transparent: true, opacity});
    return new THREE.Line(g, m);
  }, [color, points.length]);

  const arr = line.geometry.attributes.position.array as Float32Array;
  for (let i = 0; i < points.length; i++) {
    arr[i * 3] = (i / (points.length - 1) - 0.5) * width;
    arr[i * 3 + 1] = points[i] * height;
    arr[i * 3 + 2] = 0;
  }
  line.geometry.attributes.position.needsUpdate = true;
  line.geometry.computeBoundingSphere();
  (line.material as THREE.LineBasicMaterial).opacity = opacity;

  return <primitive object={line} position={position} />;
};
