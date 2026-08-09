package api

import (
    "encoding/json"
    "net/http"
    "tokens-api-go/db"
)

type walletLinkReq struct {
	Email  string `json:"email"`
	Wallet string `json:"wallet"` // 0x...
}

func HandleWalletLink(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req walletLinkReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	_, err := db.DB.Exec(`
	  INSERT INTO fans (email, wallet_address)
	  VALUES ($1, $2)
	  ON CONFLICT (email) DO UPDATE
	    SET wallet_address = EXCLUDED.wallet_address
	`, req.Email, req.Wallet)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}
