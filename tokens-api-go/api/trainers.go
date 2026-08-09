package api

import (
    "net/http"
    "os"
)

// Estrutura de JSON (opcional)
type TrainersData struct {
    Levels []map[string]interface{} `json:"levels"`
}

func HandleTrainers(w http.ResponseWriter, r *http.Request) {
    // Lê o JSON da pasta api/ct-virtual/
    filePath := "./api/ct-virtual/trainers.json"

    data, err := os.ReadFile(filePath)
    if err != nil {
        http.Error(w, "Erro ao ler arquivo JSON", http.StatusInternalServerError)
        return
    }

    // Retorna JSON puro
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write(data)
}
