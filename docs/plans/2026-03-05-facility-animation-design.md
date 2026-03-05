# Facility Animation System Design

## Goal

Add animation capabilities to facility module: GLB embedded animations + keyframe path animations, with in-scene timeline editor.

## Data Model

```
FacilityAnimation (new table, 1:N from FacilityModel)
  - id, modelId, name, type('keyframe'|'gltf'), trigger('auto'|'manual')
  - loop, duration, easing, gltfClipName?, keyframes(JSON)
  - keyframe: [{ time, position, rotation, scale }]
```

## API

- GET/POST `/api/facility/models/:id/animations`
- PUT/DELETE `/api/facility/animations/:animId`

## UI

- Animation mode button in sidebar (alongside edit mode)
- Bottom timeline panel with play/pause/stop, keyframe markers, scrubber
- Left floating panel: animation list per model
- Right floating panel: animation properties (name, trigger, loop, easing)
- TransformControls for positioning at each keyframe

## Playback

- `useFrame`: interpolate keyframes (lerp/slerp) + mixer.update() for GLB
- Auto-trigger animations start on scene enter
- Manual-trigger animations wait for user click
