// The summit register's rules, shared by the page (so the form can say them)
// and the server (which enforces them).
export const NOTE = {
  text: 180, // characters in a note
  name: 24,
  from: 32,
}
// how many notes one visitor, and one network, may pin in a day; enough for
// anyone, too few for a script to bury the board
export const NOTES_PER_DAY = 3
export const NOTES_PER_NETWORK_PER_DAY = 12
// the lever counts each browser once; this caps one network's pulls in a day
// (a school or an office shares one address, so it is generous)
export const PULLS_PER_NETWORK_PER_DAY = 40
// notes the board shows (the newest)
export const BOARD_SIZE = 60
