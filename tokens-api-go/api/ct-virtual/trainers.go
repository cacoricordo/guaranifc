package api

import (
	"encoding/json"
	"net/http"
	"os"
)

func HandleTrainers(w http.ResponseWriter, r *http.Request) {
	// Lê o arquivo JSON
	data, err := os.ReadFile("./api/ct-virtual/trainers.json")
	if err != nil {
		http.Error(w, "Erro ao ler JSON", http.StatusInternalServerError)
		return
	}

	// Cabeçalho da resposta
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}
