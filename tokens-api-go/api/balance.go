package api

import (
	"encoding/json"
	"net/http"
	"tokens-api-go/db"
)

type balanceResponse struct {
	Email       string `json:"email"`
	GolsTokens  int64  `json:"gols_tokens"`
	GoalsTotal  int64  `json:"goals_total"`
	Plan        string `json:"plan"`
	Wallet      string `json:"wallet_address"`
}

func HandleMyBalance(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	email := r.URL.Query().Get("email")
	if email == "" {
		http.Error(w, "missing email", http.StatusBadRequest)
		return
	}

	fan, err := db.GetFanByEmail(email)
	if err != nil {
		http.Error(w, "fan not found", http.StatusNotFound)
		return
	}

	resp := balanceResponse{
		Email:      fan.Email,
		GolsTokens: fan.GolsTokens,
		GoalsTotal: fan.GoalsTotal,
		Plan:       fan.Plan,
		Wallet:     fan.Wallet,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
