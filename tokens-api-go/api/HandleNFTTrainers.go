package api

import (
	"encoding/json"
	"net/http"
)

// Estrutura do treinador NFT (Super-Trunfo 2026)
type TrainerNFT struct {
	ID              int    `json:"id"`
	Name            string `json:"name"`
	Champions       int    `json:"champions"`
	Teams           int    `json:"teams"`
	MajorTitleYear  int    `json:"major_title_year"`
	GLBModel        string `json:"glb_model"`
}

// === 48 TREINADORES DA COPA 2026 ===
// Preencha com os nomes reais depois — já deixei a estrutura pronta ↓↓↓
var TrainerNFTList = []TrainerNFT{
	{
		ID:             1,
		Name:           "Carlos Alberto Silva",
		Champions:      9,
		Teams:          18,
		MajorTitleYear: 1978,
		GLBModel:       "https://www.osinvictos.com.br/nft/trainers/1.glb",
	},
	// ... adicionar até 48
}

// Handler
func HandleNFTTrainers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	res := map[string]interface{}{
		"count": len(TrainerNFTList),
		"cards": TrainerNFTList,
	}

	json.NewEncoder(w).Encode(res)
}
