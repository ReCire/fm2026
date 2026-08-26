// Module screens are resolved from the registry at runtime, so there is no
// fixed list of paths to prerender. adapter-static's index.html fallback serves
// them; the client router takes over from there.
export const prerender = false;
