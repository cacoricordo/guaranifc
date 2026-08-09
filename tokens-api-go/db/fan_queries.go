package db

import (
	"tokens-api-go/models"
)

func GetFanByEmail(email string) (*models.Fan, error) {
	row := DB.QueryRow(`
	  SELECT id, email, name, wallet_address, plan, goals_total, gols_tokens
	  FROM fans
	  WHERE email = $1
	`, email)

	var f models.Fan
	err := row.Scan(&f.ID, &f.Email, &f.Name, &f.Wallet, &f.Plan, &f.GoalsTotal, &f.GolsTokens)
	if err != nil {
		return nil, err
	}
	return &f, nil
}
