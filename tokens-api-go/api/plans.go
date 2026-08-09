package api

import (
	"encoding/json"
	"net/http"
)

type Plan struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	PriceBRL    int    `json:"price_brl"`
	BonusTokens int64  `json:"bonus_tokens"`
}

func HandlePlans(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	plans := []Plan{
		{"free", "Free", 0, 0},
		{"coach", "Coach Starter", 19, 100},
		{"tactical", "Tactical Master", 39, 250},
		{"pro_manager", "Pro Manager", 79, 600},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(plans)
}
