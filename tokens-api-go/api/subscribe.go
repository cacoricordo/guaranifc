package api

import (
    "encoding/json"
    "net/http"
    "tokens-api-go/db"
)

type subscribeRequest struct {
	Email string `json:"email"`
	Plan  string `json:"plan"` // 'free', 'coach', 'pro_manager'...
}

func HandleSubscribe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req subscribeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// bônus simples por plano
	var bonus int64
	switch req.Plan {
	case "coach":
		bonus = 100
	case "tactical":
		bonus = 250
	case "pro_manager":
		bonus = 600
	default:
		bonus = 0
	}

	// upsert no Supabase/Postgres
	_, err := db.DB.Exec(`
	  INSERT INTO fans (email, plan, gols_tokens)
	  VALUES ($1, $2, $3)
	  ON CONFLICT (email) DO UPDATE
	    SET plan = EXCLUDED.plan,
	        gols_tokens = fans.gols_tokens + EXCLUDED.gols_tokens
	`, req.Email, req.Plan, bonus)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}
