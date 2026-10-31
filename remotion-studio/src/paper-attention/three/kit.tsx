import React, {useMemo} from "react";
import * as THREE from "three";
import {useThree} from "@react-three/fiber";
import {useCurrentFrame} from "remotion";
import {C, rnd} from "../theme";

/* ───────────────────────── 相机运镜 ───────────────────────── */

export const CameraRig: React.FC<{
  position: [number, number, number];
  lookAt?: [number, number, number];
}> = ({position, lookAt = [0, 0, 0]}) => {
  const {camera} = useThree();
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
  return null;
};

/* ───────────────────────── 星空 ───────────────────────── */

export const Starfield: React.FC<{count?: number; radius?: number; opacity?: number}> = ({
  count = 900,
  radius = 60,
  opacity = 0.8,
}) => {
  const frame = useCurrentFrame();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rnd(i * 3.1);
      const v = rnd(i * 7.7);
      const r = radius * (0.35 + 0.65 * rnd(i * 1.3));
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi) * 0.65;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, [count, radius]);

  const twinkle = opacity * (0.82 + 0.18 * Math.sin(frame * 0.07));

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.11}
        color="#9dc4ff"
        transparent
        opacity={twinkle}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

/* ───────────────────────── 地面网格 ───────────────────────── */

export const FloorGrid: React.FC<{y?: number; size?: number}> = ({y = -3.4, size = 70}) => (
  <gridHelper args={[size, 70, "#1b2a52", "#0c1428"]} position={[0, y, 0]} />
);

/* ───────────────────────── 发光球 ───────────────────────── */

export const GlowSphere: React.FC<{
  position: [number, number, number];
  radius?: number;
  color?: string;
  intensity?: number;
  opacity?: number;
  halo?: number;
}> = ({position, radius = 0.42, color = C.blue, intensity = 1.4, opacity = 1, halo = 1}) => (
  <group position={position}>
    <mesh>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        roughness={0.32}
        metalness={0.15}
        transparent
        opacity={opacity}
      />
    </mesh>
    {halo > 0 ? (
      <mesh>
        <sphereGeometry args={[radius * (1.55 + 0.25 * halo), 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.075 * opacity} depthWrite={false} />
      </mesh>
    ) : null}
  </group>
);

/* ───────────────────────── 曲线弧（固定几何 + 动画透明度） ───────────────────────── */

export const Arc: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  lift?: number;
  color?: string;
  opacity?: number;
  radius?: number;
  head?: number; // 0..1 沿曲线行进的光点；<0 不显示
}> = ({from, to, lift = 1.6, color = C.blue, opacity = 0.6, radius = 0.028, head = -1}) => {
  const curve = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y += lift;
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }, [from[0], from[1], from[2], to[0], to[1], to[2], lift]);

  const geom = useMemo(() => new THREE.TubeGeometry(curve, 36, radius, 6, false), [curve, radius]);
  const p = head >= 0 && head <= 1 ? curve.getPointAt(head) : null;

  return (
    <group>
      <mesh geometry={geom}>
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      {p ? (
        <mesh position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[radius * 3.4, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
};

/* ───────────────────────── 沿曲线流动的正弦丝带 ───────────────────────── */

export const SineRibbon: React.FC<{
  y: number;
  freq: number;
  amp: number;
  speed: number;
  phase?: number;
  color?: string;
  opacity?: number;
  span?: number;
}> = ({y, freq, amp, speed, phase = 0, color = C.cyan, opacity = 0.9, span = 9}) => {
  const frame = useCurrentFrame();
  const SEG = 220;

  const line = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SEG * 3), 3));
    const m = new THREE.LineBasicMaterial({color, transparent: true, opacity});
    return new THREE.Line(g, m);
  }, [color]);

  const arr = line.geometry.attributes.position.array as Float32Array;
  for (let i = 0; i < SEG; i++) {
    const x = -span + (2 * span * i) / (SEG - 1);
    const env = Math.sin((Math.PI * i) / (SEG - 1)); // 两端收口，避免生硬截断
    arr[i * 3] = x;
    arr[i * 3 + 1] = y + Math.sin(x * freq + frame * speed + phase) * amp * env;
    arr[i * 3 + 2] = 0;
  }
  line.geometry.attributes.position.needsUpdate = true;
  line.geometry.computeBoundingSphere();
  (line.material as THREE.LineBasicMaterial).opacity = opacity;

  return <primitive object={line} />;
};

/* ───────────────────────── 竖直柱（高度动画） ───────────────────────── */

export const Bar: React.FC<{
  x: number;
  z?: number;
  height: number;
  width?: number;
  depth?: number;
  color?: string;
  emissive?: number;
  opacity?: number;
}> = ({x, z = 0, height, width = 0.9, depth = 0.9, color = C.blue, emissive = 0.55, opacity = 1}) => {
  const h = Math.max(0.001, height);
  return (
    <mesh position={[x, h / 2 - 2.2, z]} scale={[1, h, 1]}>
      <boxGeometry args={[width, 1, depth]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissive}
        roughness={0.28}
        metalness={0.35}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
};

/* ───────────────────────── 场景通用灯光 ───────────────────────── */

export const SceneLights: React.FC<{accent?: string}> = ({accent = C.blue}) => (
  <>
    <ambientLight intensity={0.35} />
    <directionalLight position={[6, 9, 6]} intensity={1.5} color="#cfe0ff" />
    <directionalLight position={[-7, 4, -5]} intensity={0.9} color={accent} />
    <pointLight position={[0, 2, 6]} intensity={22} distance={22} color={accent} />
    <fog attach="fog" args={[C.bg, 14, 52]} />
  </>
);
