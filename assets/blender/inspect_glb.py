import bpy, math, os, sys
_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = os.path.join(_ROOT, ".tmp-assets", "shiba.glb")
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preview")
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=src)
# 找到导入根并放大到米级（bbox 0.031 → ~1.2 长需要 ~40x）
import mathutils
def bbox(ob):
    pts = [ob.matrix_world @ mathutils.Vector(c) for c in ob.bound_box]
    return (mathutils.Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
            mathutils.Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))
roots = [o for o in scene.objects if o.parent is None and o.type in ('MESH', 'EMPTY', 'ARMATURE')]
g = bpy.data.objects.new("ScaleRoot", None)
scene.collection.objects.link(g)
for r in roots:
    if r.name in ('Camera', 'Light', 'ground'): continue
    r.parent = g
bpy.context.view_layer.update()
def scene_bbox():
    pts = []
    for o in scene.objects:
        if o.type == 'MESH':
            pts += [o.matrix_world @ mathutils.Vector(c) for c in o.bound_box]
    return (mathutils.Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
            mathutils.Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))
mn, mx = scene_bbox()
dim = mx - mn
scl = 1.2 / max(dim.x, dim.y, dim.z, 1e-6)
g.scale = (scl, scl, scl)
bpy.context.view_layer.update()
mn, mx = scene_bbox()
print("scaled bbox:", [round(v, 3) for v in mn], [round(v, 3) for v in mx])
g.location = (0, 0, -mn.z)
bpy.context.view_layer.update()
# 灯光相机
ld = bpy.data.lights.new("key", 'SUN'); ld.energy = 3.5; ld.angle = math.radians(12)
ko = bpy.data.objects.new("key", ld); ko.rotation_euler = (math.radians(50), 0, math.radians(25))
scene.collection.objects.link(ko)
fd = bpy.data.lights.new("fill", 'AREA'); fd.energy = 100; fd.size = 4
fo = bpy.data.objects.new("fill", fd); fo.location = (-4, -3, 3)
scene.collection.objects.link(fo)
cd = bpy.data.cameras.new("c"); cd.lens = 85
cam = bpy.data.objects.new("cam", cd); cam.location = (-3.4, 0.1, 0.75)
scene.collection.objects.link(cam)
c = cam.constraints.new('TRACK_TO')
t = bpy.data.objects.new("aim", None); t.location = (0, 0, 0.45)
scene.collection.objects.link(t); c.target = t
scene.camera = cam
w = bpy.data.worlds.new("w"); w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.95, 0.93, 0.88, 1)
scene.render.resolution_x = 900; scene.render.resolution_y = 720
scene.render.filepath = os.path.join(out, "shiba_side.png")
try: scene.render.engine = 'BLENDER_EEVEE_NEXT'
except Exception: scene.render.engine = 'BLENDER_EEVEE'
bpy.ops.render.render(write_still=True)
cam.location = (-1.9, -2.2, 1.4)
scene.render.filepath = os.path.join(out, "shiba_iso.png")
bpy.ops.render.render(write_still=True)
print("GLB_INSPECT_DONE")
