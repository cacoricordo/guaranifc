package api

import (
    "encoding/json"
    "log"
    "net/http"
    "tokens-api-go/db"
)

type MarketBuyReq struct {
    Email  string `json:"email"`
    ItemID string `json:"item_id"`
}

func HandleMarketBuy(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var req MarketBuyReq
    _ = json.NewDecoder(r.Body).Decode(&req)

    // 1) Verificar torcedor
    var fanID string
    var balance int64

    err := db.DB.QueryRow(`
        SELECT id, gols_tokens
        FROM fans 
        WHERE email = $1
    `, req.Email).Scan(&fanID, &balance)

    if err != nil {
        log.Println("❌ Fan not found:", req.Email)
        http.Error(w, "fan not found", http.StatusNotFound)
        return
    }

    // 2) Verificar item
    var price int64
    err = db.DB.QueryRow(`
        SELECT price_tokens 
        FROM market_items
        WHERE id = $1 AND status='active'
    `, req.ItemID).Scan(&price)
    if err != nil {
        http.Error(w, "item not found or inactive", http.StatusNotFound)
        return
    }

    // 3) Verificar saldo
    if balance < price {
        http.Error(w, "not enough tokens", http.StatusForbidden)
        return
    }

    // 4) Descontar saldo
    _, err = db.DB.Exec(`
        UPDATE fans
        SET gols_tokens = gols_tokens - $2
        WHERE id = $1
    `, fanID, price)

    if err != nil {
        log.Println("❌ Error updating balance:", err)
        http.Error(w, "error updating balance", http.StatusInternalServerError)
        return
    }

    // 5) Log de compra
    _, err = db.DB.Exec(`
        INSERT INTO market_trades (buyer_id, item_id, price_tokens)
        VALUES ($1, $2, $3)
    `, fanID, req.ItemID, price)

    if err != nil {
        log.Println("❌ Error inserting trade:", err)
        http.Error(w, "trade log failed", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write([]byte(`{"ok": true}`))
}
