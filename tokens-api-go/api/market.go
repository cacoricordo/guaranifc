package api

import (
    "encoding/json"
    "log"
    "net/http"
    "tokens-api-go/db"
)

type MarketItem struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	PriceTokens int64  `json:"price_tokens"`
	Status      string `json:"status"`
	FanID       *string `json:"fan_id,omitempty"`
}

func HandleMarketList(w http.ResponseWriter, r *http.Request) {
	log.Println("➡️ /api/market endpoint accessed") // DEBUG

	rows, err := db.DB.Query(`
		SELECT id, title, description, price_tokens, status, fan_id
		FROM market_items
		ORDER BY created_at DESC
	`)
	if err != nil {
		log.Println("❌ Query error:", err) // DEBUG
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []MarketItem

	for rows.Next() {
		var it MarketItem
		if err := rows.Scan(&it.ID, &it.Title, &it.Description, &it.PriceTokens, &it.Status, &it.FanID); err != nil {
			log.Println("⚠️ Scan error:", err) // DEBUG
			continue
		}
		items = append(items, it)
	}

	if len(items) == 0 {
		log.Println("ℹ️ Nenhum item encontrado.") // DEBUG
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}
