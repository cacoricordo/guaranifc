// lambda/index.js — Alexa -> server.js -> Socket.IO
const https = require("https");

exports.handler = async (handlerInput) => {
  try {
    const req = handlerInput.requestEnvelope.request;

    // 🔎 VERIFICA SE O INTENT É O CERTO
    if (
      req.type === "IntentRequest" &&
      req.intent.name === "FormationIntent"
    ) {
      // SLOT RECONHECIDO (ex: "4-3-3")
      const formation = req.intent.slots.formation.value;

      // ===== POST PARA O SEU BACKEND (Render/ngrok) ===== //
      const data = JSON.stringify({ formation });

      const options = {
        hostname: "03149bfc79ab.ngrok-free.app",
        port: 443,
        path: "/alexa/formation",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      };

      await new Promise((resolve, reject) => {
        const postReq = https.request(options, (res) => {
          res.on("data", d => {}); // resposta silenciosa
          res.on("end", resolve);
        });
        postReq.on("error", reject);
        postReq.write(data);
        postReq.end();
      });

      // 🔈 RESPOSTA DE FALA PARA O USUÁRIO
      return respond(handlerInput, `Formação ${formation} enviada para o treino!`);
    }

    // Se não reconheceu…
    return respond(handlerInput, "Não entendi a formação. Tente dizer 4-3-3.");

  } catch (err) {
    console.error(err);
    return respond(handlerInput, "Erro ao acionar a formação.");
  }
};

// ===== HELPER DE RESPOSTA =====
function respond(handlerInput, speechText) {
  return handlerInput.responseBuilder
    .speak(speechText)
    .withSimpleCard("Treinador IA", speechText)
    .getResponse();
}

