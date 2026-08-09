export const LEVEL1 = ["4-3-3","4-4-2","3-5-2"];

export function getRandomLevel1() {
  return LEVEL1[Math.floor(Math.random() * LEVEL1.length)];
}
