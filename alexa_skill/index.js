const https = require("https");

exports.handler = async (handlerInput) => {
  try {
    const req = handlerInput.requestEnvelope.request;

    if (
      req.type === "IntentRequest" &&
      req.intent.name === "FormationIntent"
    ) {
      const formation = req.intent.slots.formation.value;

      // --- ENVIA PARA O BACK-END ---
      const data = JSON.stringify({ formation });
      const options = {
        hostname: "SEU_DOMAIN.onrender.com", // <- trocar!
        port: 443,
        path: "/alexa/formation",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      };

      const result = await new Promise((resolve) => {
        const postReq = https.request(options, (res) => {
          res.on("data", () => {});
          res.on("end", () => resolve(true));
        });
        postReq.write(data);
        postReq.end();
      });

      return response(handlerInput, `Formação ${formation} enviada para o treino!`);
    }

    return response(handlerInput, "Eu não entendi. Tente: montar 4-4-2");

  } catch (err) {
    return response(handlerInput, "Erro ao acionar formação.");
  }
};

// === Helper ===
function response(handlerInput, speechText) {
  return handlerInput.responseBuilder
    .speak(speechText)
    .withSimpleCard("Treinador IA", speechText)
    .getResponse();
}
