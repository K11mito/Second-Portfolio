// A Tibetan border for the site's cards, after the corner pieces of the
// original site, redrawn as vectors. Each corner is a pair of interlaced
// square links (over-under, like the endless knot) where a double rule turns,
// with a cloud-collar scallop hanging from each arm; the rules run on along
// the edges and fade toward the middle. Hover (or focus) a card and the whole
// border warms to white and glows, and the rules reach out until they meet,
// where a small jewel appears.
//
// Drop it inside any `relative` element with the `orn-host` class (the element
// whose hover lights it). Purely decorative: hidden from assistive tech, and it
// never takes the pointer.

// One corner, drawn for the top-left in a 48 x 48 box; the others are mirrors.
// Coordinates sit on whole pixels and the drawing is offset half a pixel, so
// the 1px lines land crisply on the pixel grid.
function Corner({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={`orn-corner ${className}`} aria-hidden="true">
      <g transform="translate(.5 .5)" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke">
        {/* the double rule turning the corner: the outer square link's top and left bands */}
        <path d="M48 3H3v45" />
        <path d="M19 6h29M6 19v29" />
        {/* the outer link: its inner edge, and its right and bottom bands (broken
            where the inner link passes over them) */}
        <path d="M6 16V6h10v10H13.9M9.1 16H6" />
        <path d="M19 6v13H13.9M9.1 19H6" />
        {/* the inner link: under the outer one at the top, over it at the left */}
        <path d="M19.9 10H26v16H10V10h5.1" />
        <path d="M19.9 13H23v10H13V13h2.1" />
        {/* cloud collars hanging from the two arms */}
        <path d="M27 6a3 3 0 0 0 3 3a4 4 0 0 0 8 0a3 3 0 0 0 3-3" />
        <path d="M32.6 8.4a1.4 1.4 0 0 1 2.8 0" />
        <path d="M6 27a3 3 0 0 1 3 3a4 4 0 0 1 0 8a3 3 0 0 1-3 3" />
        <path d="M8.4 32.6a1.4 1.4 0 0 0 0 2.8" />
      </g>
      {/* a jewel on the corner itself */}
      <path d="M3.5 .9 6.1 3.5 3.5 6.1 .9 3.5z" fill="currentColor" className="orn-gem" />
    </svg>
  )
}

export default function Ornament({ tone = 'snow', className = '' }) {
  return (
    <span className={`orn orn--${tone} ${className}`} aria-hidden="true">
      <Corner className="orn-tl" />
      <Corner className="orn-tr" />
      <Corner className="orn-bl" />
      <Corner className="orn-br" />
      {/* each edge's rule in two halves, each running from its corner to the middle */}
      <span className="orn-rail orn-rail--h orn-rail--top orn-rail--a" />
      <span className="orn-rail orn-rail--h orn-rail--top orn-rail--b" />
      <span className="orn-rail orn-rail--h orn-rail--bottom orn-rail--a" />
      <span className="orn-rail orn-rail--h orn-rail--bottom orn-rail--b" />
      <span className="orn-rail orn-rail--v orn-rail--left orn-rail--a" />
      <span className="orn-rail orn-rail--v orn-rail--left orn-rail--b" />
      <span className="orn-rail orn-rail--v orn-rail--right orn-rail--a" />
      <span className="orn-rail orn-rail--v orn-rail--right orn-rail--b" />
      <span className="orn-jewel orn-jewel--top" />
      <span className="orn-jewel orn-jewel--bottom" />
    </span>
  )
}
