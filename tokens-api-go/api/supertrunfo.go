package api

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// ==== ESTRUTURA DO CARD NFT ====
type NFTPlay struct {
	Player string      `json:"player"`
	Room   string      `json:"room"`
	Attr   string      `json:"attr"`
	Card   TrainerNFT  `json:"card"`
}

// ==== SALAS (memória RAM) ====
var superTrunfoRooms = struct {
	sync.RWMutex
	data map[string][]NFTPlay
}{data: make(map[string][]NFTPlay)}

// ==== UPGRADER PARA WEBSOCKET ====
var Upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// ======================================================
// 🔥 WEBSOCKET HANDLER — entrada de jogada
// ======================================================
func HandleSuperTrunfoWS(w http.ResponseWriter, r *http.Request) {
	conn, err := Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WS erro upgrade:", err)
		return
	}

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("WS read erro:", err)
			return
		}

		var play NFTPlay
		if err := json.Unmarshal(msg, &play); err != nil {
			log.Println("WS JSON erro:", err)
			continue
		}

		log.Println("🎮 SuperTrunfo jogada recebida:", play.Player, play.Attr)

		resolvePlay(conn, play)
	}
}

// ======================================================
// 🔥 LÓGICA SUPER-TRUNFO (COMPARAÇÃO)
// ======================================================
func resolvePlay(conn *websocket.Conn, play NFTPlay) {

	superTrunfoRooms.Lock()
	defer superTrunfoRooms.Unlock()

	room := play.Room

	// adiciona jogada
	superTrunfoRooms.data[room] = append(superTrunfoRooms.data[room], play)

	// só resolve quando tiver 2 jogadas
	if len(superTrunfoRooms.data[room]) < 2 {
		return
	}

	// pegar jogadores
	p1 := superTrunfoRooms.data[room][0]
	p2 := superTrunfoRooms.data[room][1]

	var winner string

	switch play.Attr {
	case "major_title_year":
		if p1.Card.MajorTitleYear < p2.Card.MajorTitleYear {
			winner = p1.Player
		} else {
			winner = p2.Player
		}

	default:
		// champions OR teams
		var v1, v2 int
		switch play.Attr {
		case "champions":
			v1 = p1.Card.Champions
			v2 = p2.Card.Champions

		case "teams":
			v1 = p1.Card.Teams
			v2 = p2.Card.Teams
		}

		if v1 > v2 {
			winner = p1.Player
		} else {
			winner = p2.Player
		}
	}

	result := map[string]interface{}{
		"winner":    winner,
		"attr":      play.Attr,
		"p1":        p1,
		"p2":        p2,
		"yourCard":  p1.Card,
		"enemyCard": p2.Card,
	}

	resJson, _ := json.Marshal(result)

	// envia resultado para TODOS os jogadores da sala
	conn.WriteMessage(websocket.TextMessage, resJson)

	// limpa sala
	superTrunfoRooms.data[room] = []NFTPlay{}
}
