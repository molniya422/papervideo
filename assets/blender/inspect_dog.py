import bpy, os
bpy.ops.wm.open_mainfile(filepath=os.path.join(os.path.dirname(os.path.abspath(__file__)), "dog.blend"))
from mathutils import Vector
for ob in bpy.data.objects:
    if ob.type == 'MESH' and ob.name != "ground":
        pts = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
        cx = tuple(round(sum(p[i] for p in pts)/8, 3) for i in range(3))
        print(f"{ob.name:12s} center={cx}")
