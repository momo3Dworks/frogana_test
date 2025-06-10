# 3D Models

Place your GLB/GLTF models in this directory.

The application is currently configured to load a model named `scene.glb` from this folder.
If you use a different filename or path, please update the reference in:
`src/components/three/Scene.tsx`

**Example:**
If your model is `my_awesome_model.glb`, place it here and change the line in `Scene.tsx` from:
`loader.load('/models/scene.glb', ...)`
to:
`loader.load('/models/my_awesome_model.glb', ...)`

Ensure your 3D model is exported with its origin set appropriately in your modeling software (e.g., Blender) if you want it to appear at the world origin (0,0,0) in the scene by default.
