// === SHEEN ↓ → GHAIN ⟳ → DIAGONAL ↗️ (direita → esquerda, topo central) ===
// Representa o movimento tático coletivo (Guarani FC - Filosofia Carlos Alberto Silva)
window.generateSheenPath = function(startX = 300, startY = 50, phase = "transicao", closeAsGhain = true) {
  let amplitude, waves, length, speed;

  switch ((phase || "").toLowerCase()) {
    case "ataque":
      amplitude = 60; waves = 3; length = 220; speed = 18; break;
    case "transicao":
    case "transição":
      amplitude = 40; waves = 2; length = 200; speed = 22; break;
    default:
      amplitude = 25; waves = 1.5; length = 180; speed = 26; break;
  }

  const points = [];
  const steps = Math.round(waves * 30);
  const step = length / Math.max(1, steps);

  // === 1️⃣ CURVA SHEEN (descida ondulada)
  for (let i = 0; i <= steps; i++) {
    const y = startY + i * step;
    const x = startX + Math.sin((i / steps) * Math.PI) * amplitude;
    points.push({ x, y });
  }

  // === 2️⃣ CURVA GHAIN (fechamento girando)
  if (closeAsGhain) {
    const last = points[points.length - 1];
    const spiralRadius = amplitude * 0.8;
    const spiralTurns = 1.2;
    const spiralSteps = 32;

    for (let i = 0; i < spiralSteps; i++) {
      const angle = (i / spiralSteps) * Math.PI * 2 * spiralTurns;
      const x = last.x + Math.cos(angle) * (spiralRadius * (1 - i / spiralSteps));
      const y = last.y + Math.sin(angle) * (spiralRadius * (1 - i / spiralSteps));
      points.push({ x, y });
    }
  }

  // === 3️⃣ SUBIDA DIAGONAL (direita → esquerda, topo central)
  const lastPoint = points[points.length - 1];
  const fieldMidX = 300; // centro horizontal
  const targetY = 70;    // topo (centralizado vertical)
  const diagonalSteps = 60;
  const targetX = fieldMidX; // termina no centro do campo

  for (let i = 0; i <= diagonalSteps; i++) {
    const t = i / diagonalSteps;

    // movimento diagonal: da direita para a esquerda, subindo
    const x = lastPoint.x - t * 90 + (targetX - lastPoint.x) * t * 0.6;
    const y = lastPoint.y - (lastPoint.y - targetY) * t;

    points.push({ x, y });
  }

  return { path: points, speed };
};
