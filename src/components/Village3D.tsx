import { Suspense, useMemo } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useStore } from '../store';
import { dist, type Building, type RoadType, type V2, type Village } from '../lib/geo';
import { ROAD_SPECS } from '../lib/cost';

// village (x, y) metres -> three.js (x, 0, -y)
const P = (p: V2, y = 0): [number, number, number] => [p[0], y, -p[1]];

/** Flat strip along a polyline: the cheapest way to get a road that bends. */
function ribbon(pts: V2[], half: number, y: number) {
  const n = pts.length;
  const pos = new Float32Array(n * 2 * 3);
  const nor = new Float32Array(n * 2 * 3);
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[Math.min(i + 1, n - 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const L: V2 = [pts[i][0] + nx * half, pts[i][1] + ny * half];
    const R: V2 = [pts[i][0] - nx * half, pts[i][1] - ny * half];
    pos.set(P(L, y), i * 6);
    pos.set(P(R, y), i * 6 + 3);
    nor.set([0, 1, 0, 0, 1, 0], i * 6);
    if (i < n - 1) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

interface RoadViz {
  pts: V2[];
  type: RoadType;
  width: number;
  thickness?: number;
  shoulder?: number;
  planned?: boolean;
  draft?: boolean;
}

function Layer({ geo, color, order, opacity = 1 }: { geo: THREE.BufferGeometry; color: string; order: number; opacity?: number }) {
  return (
    <mesh geometry={geo} renderOrder={order} receiveShadow>
      <meshStandardMaterial
        color={color} side={THREE.DoubleSide} roughness={1}
        transparent={opacity < 1} opacity={opacity}
        polygonOffset polygonOffsetFactor={-order} polygonOffsetUnits={-order}
      />
    </mesh>
  );
}

/** One road. Type, width, thickness and shoulder all feed the geometry, so editing any of them rebuilds the mesh. */
function RoadMesh({ pts, type, width, thickness, shoulder = 0, planned, draft }: RoadViz) {
  const spec = ROAD_SPECS[type];
  const lift = thickness ? 0.12 + (thickness / 1000) * 1.6 : 0.1; // thicker crust sits a little higher
  const { outline, shoulders, top } = useMemo(
    () => ({
      outline: planned || draft ? ribbon(pts, width / 2 + shoulder + 0.6, 0.04) : null,
      shoulders: shoulder > 0 ? ribbon(pts, width / 2 + shoulder, 0.07) : null,
      top: ribbon(pts, width / 2, lift),
    }),
    [pts, width, shoulder, planned, draft, lift],
  );
  return (
    <group>
      {outline && <Layer geo={outline} color={draft ? '#B8502F' : '#E3A81C'} order={1} opacity={draft ? 0.55 : 1} />}
      {shoulders && <Layer geo={shoulders} color="#9C8660" order={2} />}
      <Layer geo={top} color={spec.color} order={3} opacity={draft ? 0.8 : 1} />
    </group>
  );
}

const ROOF_COLOR: Record<string, string> = { RCC: '#B9B1A0', Tiled: '#B8502F', Tin: '#8C9094', Thatch: '#C9A24A' };

function Buildings({ buildings }: { buildings: Building[] }) {
  const { walls, roofs } = useMemo(() => {
    const w: THREE.BufferGeometry[] = [];
    const r: Record<string, THREE.BufferGeometry[]> = {};
    for (const b of buildings) {
      const shape = new THREE.Shape(b.ring.map(([x, y]) => new THREE.Vector2(x, y)));
      const wall = new THREE.ExtrudeGeometry(shape, { depth: b.height, bevelEnabled: false });
      wall.rotateX(-Math.PI / 2); // shape (x,y) -> (x,0,-y), extrusion -> up
      w.push(wall);
      const roof = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
      roof.rotateX(-Math.PI / 2);
      roof.translate(0, b.height, 0);
      (r[b.roof] ??= []).push(roof);
    }
    return {
      walls: w.length ? mergeGeometries(w, false) : null,
      roofs: Object.entries(r).map(([k, g]) => [k, mergeGeometries(g, false)] as const),
    };
  }, [buildings]);
  return (
    <group>
      {walls && (
        <mesh geometry={walls} castShadow receiveShadow>
          <meshStandardMaterial color="#EADFC4" roughness={0.95} />
        </mesh>
      )}
      {roofs.map(([k, g]) => g && (
        <mesh key={k} geometry={g} castShadow>
          <meshStandardMaterial color={ROOF_COLOR[k] ?? '#999'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Ground({ village, onTap }: { village: Village; onTap: (p: V2) => void }) {
  const orthoUrl = useStore((s) => s.orthoUrl);
  const { bounds } = village;
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  const tex = useMemo(() => {
    if (!orthoUrl) return null;
    const t = new THREE.TextureLoader().load(orthoUrl);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [orthoUrl]);
  const handle = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // it was a drag, not a tap
    e.stopPropagation();
    onTap([e.point.x, -e.point.z]);
  };
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow onClick={handle}>
        <planeGeometry args={[Math.max(w, h) * 3 + 400, Math.max(w, h) * 3 + 400]} />
        <meshStandardMaterial color="#D8C79B" roughness={1} />
      </mesh>
      {tex && (
        // drone orthophoto, stretched over the village bounds (optional upload)
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} raycast={() => null}>
          <planeGeometry args={[w + 40, h + 40]} />
          <meshBasicMaterial map={tex} />
        </mesh>
      )}
    </group>
  );
}

function Label({ at, children }: { at: V2; children: React.ReactNode }) {
  return (
    <Html position={P(at, 3)} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="label3d">{children}</div>
    </Html>
  );
}

function Scene() {
  const village = useStore((s) => s.village);
  const activities = useStore((s) => s.activities);
  const tool = useStore((s) => s.tool);
  const draft = useStore((s) => s.draft);
  const measure = useStore((s) => s.measure);
  const params = useStore((s) => s.roadParams);
  const tap = useStore((s) => s.tap);

  const span = Math.max(village.bounds.maxX - village.bounds.minX, village.bounds.maxY - village.bounds.minY);
  const segLabels = useMemo(
    () => draft.slice(1).map((p, i) => ({ at: [(p[0] + draft[i][0]) / 2, (p[1] + draft[i][1]) / 2] as V2, len: dist(p, draft[i]) })),
    [draft],
  );

  return (
    <>
      <color attach="background" args={['#F3E7C9']} />
      <fog attach="fog" args={['#F3E7C9', span * 1.4, span * 3.2]} />
      <PerspectiveCamera makeDefault fov={50} near={0.5} far={4000} position={[span * 0.1, span * 0.55, span * 0.7]} />
      <OrbitControls
        makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI / 2.15}
        minDistance={15} maxDistance={span * 1.6} target={[0, 0, 0]}
      />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#FFF3D6', '#C9B58A', 0.5]} />
      <directionalLight
        position={[span * 0.5, span * 0.8, span * 0.3]} intensity={1.6} castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-span} shadow-camera-right={span} shadow-camera-top={span} shadow-camera-bottom={-span}
        shadow-camera-near={1} shadow-camera-far={span * 3}
      />

      <Ground village={village} onTap={tap} />
      <Buildings buildings={village.buildings} />

      {village.roads.map((r) => (
        <RoadMesh key={r.id} pts={r.pts} type={r.type} width={r.width} />
      ))}
      {activities.map((a) => (
        <RoadMesh key={a.id} pts={a.pts} type={a.params.type} width={a.params.width} thickness={a.params.thickness} shoulder={a.params.shoulder} planned />
      ))}

      {tool === 'road' && draft.length >= 2 && (
        <RoadMesh pts={draft} type={params.type} width={params.width} thickness={params.thickness} shoulder={params.shoulder} draft />
      )}
      {tool === 'road' && draft.map((p, i) => (
        <mesh key={i} position={P(p, 0.9)}>
          <sphereGeometry args={[1, 14, 14]} />
          <meshStandardMaterial color={i === 0 ? '#4F7A38' : '#E3A81C'} />
        </mesh>
      ))}
      {tool === 'road' && segLabels.map((s, i) => (
        <Label key={i} at={s.at}>{s.len.toFixed(1)} m</Label>
      ))}

      {tool === 'measure' && measure.map((p, i) => (
        <mesh key={i} position={P(p, 0.6)}>
          <sphereGeometry args={[0.8, 12, 12]} />
          <meshStandardMaterial color="#B8502F" />
        </mesh>
      ))}
      {tool === 'measure' && measure.length === 2 && (
        <>
          <mesh geometry={ribbon(measure, 0.25, 0.4)}>
            <meshBasicMaterial color="#B8502F" side={THREE.DoubleSide} />
          </mesh>
          <Label at={[(measure[0][0] + measure[1][0]) / 2, (measure[0][1] + measure[1][1]) / 2]}>
            {dist(measure[0], measure[1]).toFixed(2)} m
          </Label>
        </>
      )}
    </>
  );
}

export default function Village3D() {
  return (
    <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: 'high-performance' }} className="touch-none">
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
