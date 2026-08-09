package api

import (
    "encoding/json"
    "net/http"
    "tokens-api-go/db"
)

type marketCreateReq struct {
	Email       string `json:"email"`
	Title       string `json:"title"`
	Description string `json:"description"`
	PriceTokens int64  `json:"price_tokens"`
}

func HandleMarketCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req marketCreateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	var fanID string
	err := db.DB.QueryRow(`SELECT id FROM fans WHERE email=$1`, req.Email).Scan(&fanID)
	if err != nil {
		http.Error(w, "fan not found", http.StatusNotFound)
		return
	}

	_, err = db.DB.Exec(`
	  INSERT INTO market_items (fan_id, title, description, price_tokens)
	  VALUES ($1, $2, $3, $4)
	`, fanID, req.Title, req.Description, req.PriceTokens)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"ok":true}`))
}
