// Shared at runtime between the 3D scene and the page, with nothing from three
// in it (so the page's own bundle stays light): each destination's anchors in
// the world (set once its monastery is built), the marker elements the scene
// pins over the roofs every frame, and which destination is hovered.
export const dest = {
  anchors: {},
  els: {},
  hover: null,
}
