const FORMATIONS = {
  // =========================
  // 4-4-2
  // =========================
"4-4-2": [
  // ====== DEFESA (4) ======
  // Lateral direito
  { id: 13, role: "lateral direito", prefferedZone:[500,  60] },

  // Zagueiro direito
  { id: 14,  role: "zagueiro central", prefferedZone:[500, 120] },

  // Zagueiro esquerdo
  { id: 15, role: "quarto zagueiro", prefferedZone:[500, 180] },

  // Lateral esquerdo
  { id: 18, role: "lateral esquerdo", prefferedZone:[500, 240] },

  // ====== MEIO CAMPO (4) ======
  // Meia direita (ponta / corredor)
  { id: 20, role: "meia direita", prefferedZone:[380,  90] },

  // Volante direito / meia central
  { id: 16, role: "volante direito", prefferedZone:[410, 150] },

  // Volante esquerdo / meia central
  { id: 17, role: "volante esquerdo", prefferedZone:[380, 150] },

  // Meia esquerda (ponta)
  { id: 21, role: "meia esquerda", prefferedZone:[380, 210] },

  // ====== ATAQUE (2) ======
  // Segundo atacante (mais móvel, flutua)
  { id: 19, role: "segundo atacante", prefferedZone:[300, 120] },

  // Centroavante (referência)
  { id: 22, role: "centroavante", prefferedZone:[270, 180] }
],

// =========================
// 4-1-4-1
// =========================
"4-1-4-1": [

  // ====== DEFESA (4) ======
  // Lateral direito
  { id: 13, role: "lateral direito", prefferedZone:[500,  60] },

  // Zagueiro direito
  { id: 14, role: "zagueiro direito", prefferedZone:[500, 120] },

  // Zagueiro esquerdo
  { id: 15, role: "zagueiro esquerdo", prefferedZone:[500, 180] },

  // Lateral esquerdo
  { id: 18, role: "lateral esquerdo", prefferedZone:[500, 240] },


  // ====== VOLANTE FIXO (1) ======
  // Primeiro volante — protege a defesa
  { id: 16, role: "primeiro volante", prefferedZone:[430, 150] },


  // ====== MEIO CAMPO (4) ======
  // Meia direita (ponta / corredor)
  { id: 20, role: "meia direita", prefferedZone:[360,  90] },

  // Meia central (camisa 10 / construção)
  { id: 19, role: "meia central", prefferedZone:[360, 150] },

  // Meia interior (equilíbrio / apoio ao volante)
  { id: 17, role: "meia interior", prefferedZone:[360, 190] },

  // Meia esquerda (ponta / amplitude)
  { id: 21, role: "meia esquerda", prefferedZone:[360, 240] },


  // ====== ATAQUE (1) ======
  // Centroavante (referência / pivô)
  { id: 22, role: "centroavante", prefferedZone:[270, 150] }
],

  // =========================
  // 4-3-3
  // =========================
"4-3-3": [
  // ====== DEFESA (4) ======
  // Lateral direito
  { id: 13, role: "lateral direito", prefferedZone:[500,  60] },

  // Zagueiro direito
  { id: 14, role: "zagueiro direito", prefferedZone:[500, 120] },

  // Zagueiro esquerdo
  { id: 15, role: "zagueiro esquerdo", prefferedZone:[500, 180] },

  // Lateral esquerdo
  { id: 18, role: "lateral esquerdo", prefferedZone:[500, 240] },

  // ====== MEIO CAMPO (3) ======
  // 1º volante — central, equilibra a saída
  { id: 16, role: "primeiro volante", prefferedZone:[430, 150] },

  // Meia interior direita — apoia construção
  { id: 20, role: "meia interior direita", prefferedZone:[390, 110] },

  // Meia interior esquerda — conecta com o ataque
  { id: 17, role: "meia interior esquerda", prefferedZone:[390, 190] },

  // ====== ATAQUE (3) ======
  // Ponta direita (velocidade / profundidade)
  { id: 19, role: "ponta direita", prefferedZone:[300,  80] },

  // Centroavante (referência)
  { id: 22, role: "centroavante", prefferedZone:[270, 150] },

  // Ponta esquerda (diagonal para dentro)
  { id: 21, role: "ponta esquerda", prefferedZone:[300, 220] }
],

  // =========================
  // 4-2-3-1
  // =========================
"4-2-3-1": [
  // ====== DEFESA (4) ======
  // Lateral direito
  { id: 13, role: "lateral direito", prefferedZone:[500,  60] },

  // Zagueiro direito
  { id: 14, role: "zagueiro direito", prefferedZone:[500, 120] },

  // Zagueiro esquerdo
  { id: 15, role: "zagueiro esquerdo", prefferedZone:[500, 180] },

  // Lateral esquerdo
  { id: 18, role: "lateral esquerdo", prefferedZone:[500, 240] },

  // ====== VOLANTES (2) ======
  // 1º volante — protege a zaga
  { id: 16, role: "primeiroo volante", prefferedZone:[430, 150] },

  // 2º volante — transição e condução
  { id: 17, role: "segundo volante", prefferedZone:[400, 150] },

  // ====== MEIAS (3) ======
  // Meia direita (ponta / corredor)
  { id: 20, role: "meia direita", prefferedZone:[330,  90] },

  // Meia central (camisa 10 — entrelinhas)
  { id: 19, role: "meia central", prefferedZone:[330, 150] },

  // Meia esquerda (ponta esquerda)
  { id: 21, role: "meia esquerda", prefferedZone:[330, 210] },

  // ====== ATAQUE (1) ======
  // Centroavante isolado (referência)
  { id: 22, role: "centroavante isolado", prefferedZone:[260, 150] }
],

"4-2-4": [
  // ====== DEFESA (4) ======
  // Lateral direito
  { id: 13, role: "lateral direito", prefferedZone:[500,  60] },

  // Zagueiro direito
  { id: 14, role: "zagueiro direito", prefferedZone:[500, 120] },

  // Zagueiro esquerdo
  { id: 15, role: "zagueiro esquerdo", prefferedZone:[500, 180] },

  // Lateral esquerdo
  { id: 18, role: "lateral esquerdo", prefferedZone:[500, 240] },

  // ====== VOLANTES (2) ======
  // Volante defensivo — protege a zaga
  { id: 16, role: "volante defensivo", prefferedZone:[420, 140] },

  // Volante construtor — faz saída e ligação
  { id: 17, role: "volante construtor", prefferedZone:[420, 180] },

  // ====== ATAQUE (4) ======
  // Extremo direito
  { id: 20, role: "extremo direito", prefferedZone:[300,  80] },

  // Segundo atacante — meia-atacante / falso 9
  { id: 19, role: "segundo atacante", prefferedZone:[300, 130] },

  // Centroavante (referência)
  { id: 22, role: "centroavante", prefferedZone:[270, 170] },

  // Extremo esquerdo
  { id: 21, role: "extremo esquerdo", prefferedZone:[300, 220] }
],

  // =========================
  // 3-5-2
  // =========================
"3-5-2": [
  // ====== DEFESA — 3 ZAGUEIROS ======
  // Zagueiro direito
  { id: 13, role: "zagueiro direito", prefferedZone:[500, 100] },

  // Zagueiro central
  { id: 14, role: "zagueiro central", prefferedZone:[500, 150] },

  // Zagueiro esquerdo
  { id: 15, role: "zagueiro esquerdo", prefferedZone:[500, 200] },

  // ====== MEIO CAMPO — 5 JOGADORES ======
  // Ala direita (camisa 7 ou 2 dependendo do modelo)
  { id: 20, role: "ala direita", prefferedZone:[400,  70] },

  // Volante (1º volante — proteção da zaga)
  { id: 16, role: "primeiro volante", prefferedZone:[420, 150] },

  // Meia central (camisa 10 — criação)
  { id: 19, role: "meia central", prefferedZone:[380, 150] },

  // Volante interno (2º volante — equilíbrio)
  { id: 17, role: "segundo volante", prefferedZone:[420, 200] },

  // Ala esquerda
  { id: 18, role: "ala esquerda", prefferedZone:[400, 230] },

  // ====== ATAQUE — DUPLA DE FRENTE ======
  // 2º atacante (mais móvel)
  { id: 21, role: "segundo atacante", prefferedZone:[300, 130] },

  // Centroavante (referência)
  { id: 22, role: "centroavante", prefferedZone:[260, 170] }
],

  // =========================
  // 5-4-1
  // =========================
"5-4-1": [
  // ====== DEFESA — LINHA DE 5 ======
  // Ala / Lateral direito (camisa 2)
  { id: 13, role: "ala lateral direito", prefferedZone:[500,  60] },

  // Zagueiro direito (camisa 3)
  { id: 14, role: "zagueiro direito", prefferedZone:[500, 120] },

  // Zagueiro central (camisa 4)
  { id: 15, role: "zagueiro central", prefferedZone:[500, 150] },

  // Zagueiro esquerdo (camisa 5 / volante recuado)
  { id: 16, role: "zagueiro esquerdo", prefferedZone:[500, 180] },

  // Ala / Lateral esquerdo (camisa 6 ou 8)
  { id: 17, role: "lateral esquerdo", prefferedZone:[500, 240] },

  // ====== MEIO CAMPO — LINHA DE 4 ======
  // Meia direita (ponta / corredor)
  { id: 20, role: "meia direita", prefferedZone:[370,  90] },

  // Volante interior (camisa 10)
  { id: 19, role: "volante interior", prefferedZone:[370, 140] },

  // Volante interior (camisa 8)
  { id: 21, role: "Volante interior", prefferedZone:[370, 190] },

  // Meia esquerda (ponta)
  { id: 18, role: "meia esquerda", prefferedZone:[370, 240] },

  // ====== ATAQUE — 1 ISOLADO ======
  // Centroavante (camisa 9)
  { id: 22, role: "centroavante", prefferedZone:[250, 150] }
],

"4-5-1": [
  // ====== DEFESA (4) ======
  // Lateral direito (camisa 2)
  { id: 13, role: "lateral direito", prefferedZone:[480,  60] },

  // Zagueiro direito (camisa 3)
  { id: 14, role: "zagueiro direito", prefferedZone:[480, 120] },

  // Zagueiro esquerdo (camisa 4)
  { id: 15, role: "zagueiro esquerdo", prefferedZone:[480, 180] },

  // Lateral esquerdo (camisa 6 / ala esquerda)
  { id: 18, role: "lateral esquerdo", prefferedZone:[480, 240] },

  // ====== MEIO CAMPO (5) ======
  // 1º volante (camisa 5) — protege a defesa
  { id: 16, role: "primeiro volante", prefferedZone:[420, 150] },

  // 2º volante (camisa 8) — transição e cobertura
  { id: 17, role: "segundo volante", prefferedZone:[390, 150] },

  // Meia direita (ponta / corredor)
  { id: 20, role: "meia direita", prefferedZone:[330,  90] },

  // Meia central (camisa 10 — armador)
  { id: 19, role: "meia central", prefferedZone:[330, 150] },

  // Meia esquerda (ponta esquerda / corredor)
  { id: 21, role: "meia esquerda", prefferedZone:[330, 210] },

  // ====== ATAQUE (1) ======
  // Centroavante (referência)
  { id: 22, role: "lateral direito", prefferedZone:[260, 150] }
],

"3-4-3": [
  // ====== DEFESA — 3 ZAGUEIROS ======
  // Zagueiro direito
  { id: 14, role: "zagueiro direito", prefferedZone:[520, 110] },

  // Zagueiro central
  { id: 15, role: "zegueiro central", prefferedZone:[520, 150] },

  // Zagueiro esquerdo
  { id: 16, role: "zagueiro esquerdo", prefferedZone:[520, 190] },

  // ====== MEIO — 4 (2 alas + 2 meias) ======
  // Ala direito (profundidade e amplitude)
  { id: 13, role: "ala direito", prefferedZone:[440,  70] },

  // Meia interior direita
  { id: 17, role: "meia interior direita", prefferedZone:[430, 130] },

  // Meia interior esquerda (camisa 10 / criação)
  { id: 19, role: "meia interior esquerda", prefferedZone:[430, 170] },

  // Ala esquerdo (profundidade e amplitude)
  { id: 18, role: "ala esquerdo", prefferedZone:[440, 230] },

  // ====== ATAQUE — TRIO ======
  // Extremo direito (ponta)
  { id: 20, role: "extremo direito", prefferedZone:[310,  90] },

  // Centroavante (referência)
  { id: 22, role: "centroavante", prefferedZone:[270, 150] },

  // Extremo esquerdo (ponta)
  { id: 21, role: "extremo esquerdo", prefferedZone:[310, 210] }
],

  // =========================
  // 5-3-2
  // =========================
"5-3-2": [
  // ====== DEFESA — LINHA DE 5 ======
  // Ala / Lateral direito
  { id: 13, role: "lateral direito", prefferedZone:[520,  70] },

  // Zagueiro direito
  { id: 14, role: "zagueiro direito", prefferedZone:[520, 120] },

  // Zagueiro central
  { id: 15, role: "zagueiro central", prefferedZone:[520, 150] },

  // Zagueiro esquerdo
  { id: 16, role: "zagueiro esquerdo", prefferedZone:[520, 180] },

  // Ala / Lateral esquerdo
  { id: 17, role: "lateral esquerdo", prefferedZone:[520, 230] },

  // ====== MEIO — TRIO CENTRAL ======
  // Meia interior direita
  { id: 20, role: "meia interior direita", prefferedZone:[400, 120] },

  // Meia central (camisa 10 — cria)
  { id: 19, role: "meia central", prefferedZone:[400, 150] },

  // Meia interior esquerda
  { id: 18, role: "meia interior esquerda", prefferedZone:[400, 180] },

  // ====== ATAQUE — DUPLA ======
  // Segundo atacante (movimenta, tabela)
  { id: 21, role: "segundo atacante", prefferedZone:[300, 130] },

  // Centroavante (referência)
  { id: 22, role: "centroavante", prefferedZone:[260, 170] }
]
};


if (typeof window !== "undefined") {
  window.FORMATIONS = FORMATIONS;

  console.log("⚽ FRONT-END FORMATIONS PRONTAS!");

  setTimeout(() => {
    dispatchEvent(new Event("formations_ready"));
  }, 10);
}
