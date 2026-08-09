package db

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var DB *sql.DB

func Init() {
	dsn := os.Getenv("DATABASE_URL")
	var err error
	DB, err = sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal("DB init error:", err)
	}

	if err := DB.Ping(); err != nil {
		log.Fatal("DB unreachable:", err)
	}
	log.Println("🔗 DB connected")
}
