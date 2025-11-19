export const toProperCase = (str = "") =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
