package api

import (
    "encoding/json"
    "net/http"
    "tokens-api-go/db"
)

type mintFromGoalsReq struct {
	Email      string `json:"email"`
	GoalsDelta int    `json:"goals_delta"` // saldo de gols do treino
	Source     string `json:"source"`      // ex: "training"
}

type mintFromGoalsResp struct {
	TokensMinted int64 `json:"tokens_minted"`
	NewBalance   int64 `json:"new_balance"`
}

func HandleMintFromGoals(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req mintFromGoalsReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if req.GoalsDelta <= 0 {
		http.Error(w, "no goals to convert", http.StatusBadRequest)
		return
	}

	// regra simples: 1 gol-pro = 10 GOLS tokens
	const factor = int64(10)
	tokens := int64(req.GoalsDelta) * factor

	var newBalance int64
	err := db.DB.QueryRow(`
	  UPDATE fans
	  SET gols_tokens = gols_tokens + $1,
	      goals_total = goals_total + $2
	  WHERE email = $3
	  RETURNING gols_tokens
	`, tokens, req.GoalsDelta, req.Email).Scan(&newBalance)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	_, _ = db.DB.Exec(`
	  INSERT INTO gols_mint_log (fan_id, goals_delta, tokens_minted, source)
	  SELECT id, $1, $2, $3 FROM fans WHERE email = $4
	`, req.GoalsDelta, tokens, req.Source, req.Email)

	resp := mintFromGoalsResp{
		TokensMinted: tokens,
		NewBalance:   newBalance,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
