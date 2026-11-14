# build_person.py — YOLO v7 高模资产：人（椭球骨架场 → 体素融合 → 平滑细分）
import bpy, math, os

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(os.path.dirname(_HERE))
BLEND = os.path.join(_HERE, "person.blend")
GLB   = os.path.join(_ROOT, "output", "yolo-v7", "4-video", "hf", "assets", "models", "person.glb")
PREV  = os.path.join(_HERE, "preview")
MARK  = os.path.join(_HERE, "build_person.done")
import os as _os; _os.makedirs(PREV, exist_ok=True); _os.makedirs(_os.path.dirname(GLB), exist_ok=True)

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

FUR   = mat("cloth", (0.30, 0.36, 0.44))
FUR_D = mat("skin",  (0.78, 0.60, 0.48))
DARK  = mat("dark", (0.03, 0.03, 0.03), 0.4)
COLL  = mat("hair",  (0.13, 0.10, 0.08))

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
    ("pelvis",  (0, 0.00, 0.96), (0.135, 0.10, 0.115)),
    ("waist",   (0, 0.02, 1.14), (0.115, 0.09, 0.105)),
    ("chest",   (0, 0.03, 1.30), (0.15,  0.11, 0.125)),
    ("shoulder",(0, 0.02, 1.45), (0.165, 0.09, 0.085)),
    ("neck",    (0, 0.02, 1.55), (0.045, 0.055, 0.065)),
    ("skull",   (0, 0.04, 1.70), (0.08,  0.095, 0.095)),
    ("jaw",     (0, 0.05, 1.60), (0.055, 0.07, 0.055)),
    ("armL_up", ( 0.215, 0.00, 1.30), (0.042, 0.07, 0.055)),
    ("armR_up", (-0.215, 0.00, 1.30), (0.042, 0.07, 0.055)),
    ("armL_el", ( 0.23,  0.01, 1.14), (0.036, 0.04, 0.038)),
    ("armR_el", (-0.23,  0.01, 1.14), (0.036, 0.04, 0.038)),
    ("armL_fo", ( 0.24,  0.02, 0.98), (0.034, 0.065, 0.045)),
    ("armR_fo", (-0.24,  0.02, 0.98), (0.034, 0.065, 0.045)),
    ("handL",   ( 0.245, 0.03, 0.86), (0.028, 0.04, 0.05)),
    ("handR",   (-0.245, 0.03, 0.86), (0.028, 0.04, 0.05)),
    ("legL_th", ( 0.085, 0.00, 0.80), (0.062, 0.09, 0.10)),
    ("legR_th", (-0.085, 0.00, 0.80), (0.062, 0.09, 0.10)),
    ("legL_kn", ( 0.085, 0.01, 0.54), (0.05,  0.05, 0.055)),
    ("legR_kn", (-0.085, 0.01, 0.54), (0.05,  0.05, 0.055)),
    ("legL_sh", ( 0.085, 0.00, 0.30), (0.045, 0.07, 0.09)),
    ("legR_sh", (-0.085, 0.00, 0.30), (0.045, 0.07, 0.09)),
    ("footL",   ( 0.085, 0.05, 0.04), (0.05,  0.10, 0.035)),
    ("footR",   (-0.085, 0.05, 0.04), (0.05,  0.10, 0.035)),
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
body.data.materials.clear(); body.data.materials.append(FUR_D)

# ───────── 清晰部件（不融合） ─────────
crisp_parts = []
for sx in (-1, 1):
    crisp_parts.append(crisp("eye", (sx * 0.033, 0.085, 1.715), (0.011, 0.011, 0.011), mat=DARK))
crisp_parts.append(crisp("nose", (0, 0.105, 1.685), (0.013, 0.016, 0.012), mat=DARK))
crisp_parts.append(crisp("hair", (0, 0.015, 1.745), (0.082, 0.09, 0.07), mat=COLL))

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

aim = bpy.data.objects.new("aim", None); aim.location = (0, 0.1, 1.0)
scene.collection.objects.link(aim)

def add_cam(name, loc):
    cd = bpy.data.cameras.new(name); cd.lens = 85
    ob = bpy.data.objects.new(name, cd); ob.location = loc
    scene.collection.objects.link(ob)
    c = ob.constraints.new('TRACK_TO'); c.target = aim
    return ob

cam_side = add_cam("cam_side", (-3.6, 0.15, 1.05))   # 正侧面（看轮廓）
cam_iso  = add_cam("cam_iso",  (-2.0, -2.2, 1.8))    # 3/4 前视
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
print("BUILD_PERSON_DONE", GLB)
