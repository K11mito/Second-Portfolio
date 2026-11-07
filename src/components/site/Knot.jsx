// The endless knot (shrivatsa), redrawn as an exact vector from the site's
// original artwork: one closed path on a 45° grid, with the nine
// under-crossings cut by a mask. Crisp at 16px and at 600px.

const GAPS = [
  [7, 6, 2, 1], [7, 9, 2, 1], [7, 20, 2, 1], [7, 23, 2, 1], [14, 13, 2, 1], [14, 16, 2, 1],
  [21, 6, 2, 1], [21, 9, 2, 1], [21, 20, 2, 1], [21, 23, 2, 1], [6, 14, 1, 2], [9, 14, 1, 2],
  [13, 7, 1, 2], [16, 7, 1, 2], [13, 21, 1, 2], [16, 21, 1, 2], [20, 14, 1, 2], [23, 14, 1, 2],
]

export const KNOT_PATH = 'M1 1H8V29H15V1H22V29H29V22H1V15H29V8H1Z'
export const KNOT_LENGTH = 224

// `id` must be unique per instance on the page (it names the SVG mask).
export default function Knot({ id = 'knot', className = '', strokeWidth = 2, title, draw = false, style }) {
  return (
    <svg
      viewBox="-6.22 -6.22 42.44 42.44"
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="-8" y="-8" width="46" height="46">
          <rect x="-8" y="-8" width="46" height="46" fill="#fff" />
          <g fill="#000">
            {GAPS.map(([x, y, w, h]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} />
            ))}
          </g>
        </mask>
      </defs>
      <g transform="rotate(45 15 15)">
        <path
          d={KNOT_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinejoin="miter"
          strokeLinecap="square"
          mask={`url(#${id})`}
          className={draw ? 'knot-draw' : undefined}
          pathLength={draw ? KNOT_LENGTH : undefined}
        />
      </g>
    </svg>
  )
}
