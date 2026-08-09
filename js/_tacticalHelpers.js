// === IMPORTAMOS SOMENTE AS FUNÇÕES TÁTICAS DO CORE ===
export function findGoalkeeper(players) {
  return players.reduce((gk, p) => (p.left < gk.left ? p : gk), players[0]);
}

export function analyzeFieldThirds(players) {
  const FIELD_WIDTH = 600;
  const T1 = FIELD_WIDTH * (2/8);     // defesa até 2/8
  const T2 = FIELD_WIDTH * (5/8);     // meio até 5/8

  const def = players.filter(p => p.left < T1).length;
  const mid = players.filter(p => p.left >= T1 && p.left < T2).length;
  const att = players.filter(p => p.left >= T2).length;

  return { def, mid, att, shape: `${def}-${mid}-${att}` };
}

export function detectHybridFormation(players) {
  // AQUI COPIAMOS EXATAMENTE O QUE ESTÁ NO core.js
  return detectHybridFormation(players); // reuso real!
}
