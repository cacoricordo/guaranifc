// === SHEEN PATH (onda árabe ش) ===
// Gera uma linha ondulada horizontal que o bloco verde segue.
// js/she enpath.js
// função global geradora de path Sheen (não-module)
window.generateSheenPath = function(startX = 550, startY = 150, phase = "defesa") {
  let amplitude, waves, length, speed;

  switch ((phase || "").toLowerCase()) {
    case "ataque":
      amplitude = 40; waves = 3; length = 420; speed = 20; break;
    case "transicao":
    case "transição":
      amplitude = 28; waves = 2; length = 380; speed = 25; break;
    default: // defesa
      amplitude = 18; waves = 1.5; length = 340; speed = 30; break;
  }

  const points = [];
  const steps = Math.round(waves * 30);
  const step = length / Math.max(1, steps);
  for (let i = 0; i <= steps; i++) {
    const x = startX - i * step;
    const y = startY + Math.sin((i / steps) * Math.PI) * amplitude;
    points.push({ x, y });
  }

  return { path: points, speed };
};
