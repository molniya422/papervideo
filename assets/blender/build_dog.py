# build_dog.py v2 — YOLO v7 ch03 英雄资产：高精度狗（椭球骨架场 → 体素融合 → 平滑细分）
# 运行：blender.exe --background --python build_dog.py
import bpy, math, os

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(os.path.dirname(_HERE))
BLEND = os.path.join(_HERE, "dog.blend")
GLB   = os.path.join(_ROOT, "output", "yolo-v7", "4-video", "hf", "assets", "models", "dog.glb")
PREV  = os.path.join(_HERE, "preview")
MARK  = os.path.join(_HERE, "build_dog.done")
os.makedirs(PREV, exist_ok=True)
os.makedirs(os.path.dirname(GLB), exist_ok=True)
if os.path.exists(MARK): os.remove(MARK)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(name, color, rough=0.78, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m

FUR   = mat("fur",  (0.62, 0.47, 0.33))
FUR_D = mat("furD", (0.40, 0.29, 0.20))
DARK  = mat("dark", (0.03, 0.03, 0.03), 0.4)
COLL  = mat("coll", (0.75, 0.22, 0.18), 0.5)

def blob(name, loc, r, mat=None):
    """椭球体块：几何在原点建 → 缩放烘焙 → 显式落位（次序无歧义）"""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = r
    bpy.ops.object.transform_apply(scale=True)
    for p in ob.data.polygons: p.use_smooth = True
    ob.location = loc
    if mat: ob.data.materials.append(mat)
    return ob

def crisp(name, loc, r, rot=(0,0,0), mat=None, sub=2):
    """不参与融合的清晰部件（耳/眼/鼻/项圈）：subsurf 保形"""
    ob = blob(name, (0, 0, 0), r, mat)
    ob.modifiers.clear()
    mod = ob.modifiers.new("sub", 'SUBSURF'); mod.levels = sub; mod.render_levels = sub+1
    for k, v in zip((0, 1, 2), rot): ob.rotation_euler[k] = v
    ob.location = loc
    return ob

# ───────── 体块骨架场（狗面朝 +Y 站立；肩高约 0.72）─────────
FIELD = [
    # 躯干（胸深-腰收-臀圆）
    ("chest",   (0,  0.30, 0.46), (0.185, 0.22, 0.215)),
    ("shoulder",(0,  0.17, 0.47), (0.195, 0.20, 0.215)),
    ("belly",   (0, -0.02, 0.455), (0.165, 0.21, 0.19)),
    ("hip",     (0, -0.22, 0.45), (0.19, 0.22, 0.205)),
    ("rump",    (0, -0.38, 0.435), (0.15, 0.16, 0.185)),
    ("chest2",  (0,  0.41, 0.41), (0.15, 0.13, 0.17)),
    # 颈（前上伸）
    ("neck1",   (0,  0.46, 0.60), (0.11, 0.16, 0.12)),
    ("neck2",   (0,  0.56, 0.73), (0.088, 0.13, 0.10)),
    # 头
    ("skull",   (0,  0.68, 0.87), (0.108, 0.14, 0.113)),
    ("fore",    (0,  0.79, 0.85), (0.088, 0.075, 0.088)),
    ("stop",    (0,  0.84, 0.82), (0.068, 0.05, 0.062)),
    ("muzzle",  (0,  0.90, 0.79), (0.05, 0.09, 0.055)),
    ("muzzle2", (0,  0.985, 0.785),(0.04, 0.05, 0.046)),
    # 后躯肌块
    ("haunchL", ( 0.145, -0.26, 0.42), (0.085, 0.15, 0.16)),
    ("haunchR", (-0.145, -0.26, 0.42), (0.085, 0.15, 0.16)),
    # 腿（上/下段，带前后角差）
    ("fl_up",  ( 0.115,  0.33, 0.28), (0.05, 0.10, 0.15)),
    ("fr_up",  (-0.115,  0.33, 0.28), (0.05, 0.10, 0.15)),
    ("fl_lo",  ( 0.118,  0.36, 0.10), (0.036, 0.075, 0.11)),
    ("fr_lo",  (-0.118,  0.36, 0.10), (0.036, 0.075, 0.11)),
    ("hl_up",  ( 0.125, -0.30, 0.27), (0.055, 0.10, 0.15)),
    ("hr_up",  (-0.125, -0.30, 0.27), (0.055, 0.10, 0.15)),
    ("hl_lo",  ( 0.132, -0.26, 0.10), (0.038, 0.07, 0.11)),
    ("hr_lo",  (-0.132, -0.26, 0.10), (0.038, 0.07, 0.11)),
    # 尾（上翘三节）
    ("tail1",  (0, -0.51, 0.52), (0.045, 0.08, 0.055)),
    ("tail2",  (0, -0.605, 0.575), (0.036, 0.08, 0.05)),
    ("tail3",  (0, -0.695, 0.655), (0.025, 0.062, 0.04)),
]
fuse_parts = []
for name, loc, r in FIELD:
    fuse_parts.append(blob(name, loc, r, FUR))

# 融合：Join → Voxel Remesh → Smooth → Subsurf
bpy.ops.object.select_all(action='DESELECT')
for p in fuse_parts: p.select_set(True)
bpy.context.view_layer.objects.active = fuse_parts[0]
bpy.ops.object.join()
body = bpy.context.active_object; body.name = "DogBody"
rem = body.modifiers.new("remesh", 'REMESH')
rem.mode = 'VOXEL'; rem.voxel_size = 0.022; rem.adaptivity = 0.0
sm = body.modifiers.new("smooth", 'SMOOTH')
sm.iterations = 6; sm.factor = 0.7
ss = body.modifiers.new("sub", 'SUBSURF'); ss.levels = 1; ss.render_levels = 2
body.data.materials.clear(); body.data.materials.append(FUR)

# ───────── 清晰部件（不融合） ─────────
crisp_parts = []
# 垂耳（贴头侧、向前倾）
for sx in (-1, 1):
    e = crisp("ear", (sx * 0.085, 0.635, 0.845), (0.028, 0.055, 0.115),
              rot=(math.radians(-16), math.radians(sx * 14), math.radians(sx * 8)), mat=FUR_D)
    crisp_parts.append(e)
# 口鼻端/下巴
crisp_parts.append(crisp("nose", (0, 1.02, 0.795), (0.02, 0.02, 0.018), mat=DARK))
crisp_parts.append(crisp("jaw", (0, 0.92, 0.745), (0.036, 0.055, 0.026), mat=FUR_D))
# 眼
for sx in (-1, 1):
    crisp_parts.append(crisp("eye", (sx * 0.058, 0.78, 0.885), (0.014, 0.014, 0.014), mat=DARK))
# 爪（略前伸）
for sx, y, xr in ((1, 0.41, 0.118), (-1, 0.41, 0.118), (1, -0.22, 0.132), (-1, -0.22, 0.132)):
    crisp_parts.append(crisp("paw", (sx * xr, y, 0.035), (0.05, 0.065, 0.032), mat=FUR_D))
# 项圈
bpy.ops.mesh.primitive_torus_add(major_radius=0.118, minor_radius=0.018,
                                 location=(0, 0.565, 0.685), rotation=(math.radians(52), 0, 0))
collar = bpy.context.active_object; collar.name = "collar"
m2 = collar.modifiers.new("sub", 'SUBSURF'); m2.levels = 1; m2.render_levels = 2
for p in collar.data.polygons: p.use_smooth = True
collar.data.materials.append(COLL)
crisp_parts.append(collar)

# 父级
root = bpy.data.objects.new("Dog", None)
scene.collection.objects.link(root)
for p in [body] + crisp_parts:
    p.parent = root

# ───────── 灯光 / 相机 / 预览 ─────────
def add_light(name, kind, loc, energy, rot=(0,0,0), size=None):
    ld = bpy.data.lights.new(name, kind); ld.energy = energy
    if kind == 'SUN': ld.angle = math.radians(10)
    if kind == 'AREA' and size: ld.size = size
    ob = bpy.data.objects.new(name, ld); ob.location = loc; ob.rotation_euler = rot
    scene.collection.objects.link(ob); return ob

add_light("key", 'SUN', (3, -2, 6), 3.2, rot=(math.radians(48), 0, math.radians(25)))
add_light("fill", 'AREA', (-4, -2, 3), 80, size=3)
add_light("rim", 'AREA', (2.5, 4.5, 4), 60, size=2)

bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.001))
ground = bpy.context.active_object; ground.name = "ground"
gm = bpy.data.materials.new("ground"); gm.use_nodes = True
gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.93, 0.90, 0.83, 1)
ground.data.materials.append(gm)

aim = bpy.data.objects.new("aim", None); aim.location = (0, 0.1, 0.55)
scene.collection.objects.link(aim)

def add_cam(name, loc):
    cd = bpy.data.cameras.new(name); cd.lens = 85
    ob = bpy.data.objects.new(name, cd); ob.location = loc
    scene.collection.objects.link(ob)
    c = ob.constraints.new('TRACK_TO'); c.target = aim
    return ob

cam_side = add_cam("cam_side", (-3.8, 0.15, 0.85))   # 正侧面（看轮廓）
cam_iso  = add_cam("cam_iso",  (-2.1, -2.4, 1.7))    # 3/4 前视
scene.camera = cam_side

scene.render.resolution_x = 900; scene.render.resolution_y = 720
scene.world = bpy.data.worlds.new("w"); scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.95, 0.93, 0.88, 1)

def render_to(path, cam):
    scene.camera = cam
    scene.render.filepath = path
    try: scene.render.engine = 'BLENDER_EEVEE_NEXT'
    except Exception: scene.render.engine = 'BLENDER_EEVEE'
    bpy.ops.render.render(write_still=True)

render_to(os.path.join(PREV, "dog_side.png"), cam_side)
render_to(os.path.join(PREV, "dog_iso.png"), cam_iso)

# ───────── 导出 GLB（Blender 5.2 参数名：use_selection） ─────────
bpy.ops.object.select_all(action='DESELECT')
for p in [body] + crisp_parts: p.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.export_scene.gltf(filepath=GLB, export_format='GLB', export_apply=True,
                          use_selection=True, export_yup=True, export_materials='EXPORT')

bpy.ops.wm.save_as_mainfile(filepath=BLEND)
open(MARK, "w").write("ok")
print("BUILD_DOG_DONE", GLB)
