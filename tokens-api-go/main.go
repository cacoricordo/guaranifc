package main

import (
    "log"
    "net/http"
    "strings"

    "github.com/gorilla/mux" 
    "tokens-api-go/db"
    "tokens-api-go/api"
)

func main() {
    db.Init()

    r := mux.NewRouter()
    r.Use(corsMiddleware)

    // Rotas existentes
    r.HandleFunc("/api/subscribe", api.HandleSubscribe)
    r.HandleFunc("/api/wallet/link", api.HandleWalletLink)
    r.HandleFunc("/api/me/balance", api.HandleMyBalance)
    r.HandleFunc("/api/tokens/mint-from-goals", api.HandleMintFromGoals)

    // 🔥 ROTAS DO MARKETPLACE (que estavam faltando!!!)
    r.HandleFunc("/api/market", api.HandleMarketList).Methods("GET")
    r.HandleFunc("/api/market/create", api.HandleMarketCreate).Methods("POST")
    r.HandleFunc("/api/market/buy", api.HandleMarketBuy).Methods("POST")
    
    r.HandleFunc("/api/ct-virtual/trainers", api.HandleTrainers).Methods("GET")
    r.HandleFunc("/api/nft/trainers", api.HandleNFTTrainers).Methods("GET")
    r.HandleFunc("/ws/supertrunfo", api.HandleSuperTrunfoWS)
    
    r.PathPrefix("/").Handler(http.FileServer(http.Dir("./static")))

    log.Println("🟢 Server rodando em :8080")
    log.Println("🛒 Teste agora: http://127.0.0.1:8080/api/market")

    http.ListenAndServe(":8080", r)
}

// CORS dinâmico pronto para DEV / PROD
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        if strings.Contains(origin, "127.0.0.1") || strings.Contains(origin, "localhost") {
            w.Header().Set("Access-Control-Allow-Origin", origin)
        } else {
            w.Header().Set("Access-Control-Allow-Origin", "https://www.osinvictos.com.br")
        }

        w.Header().Set("Access-Control-Allow-Credentials", "true")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        next.ServeHTTP(w, r)
    })
}
