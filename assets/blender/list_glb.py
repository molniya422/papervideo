import bpy, os
bpy.ops.wm.read_factory_settings(use_empty=True)
_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
bpy.ops.import_scene.gltf(filepath=os.path.join(_ROOT, ".tmp-assets", "shiba.glb"))
for o in bpy.data.objects:
    print(f"{o.type:10s} {o.name:24s} parent={o.parent.name if o.parent else '-'}")
