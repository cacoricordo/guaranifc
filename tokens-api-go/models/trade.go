package models

type MarketTrade struct {
	ID        string
	ItemID    string
	BuyerID   string
	SellerID  string
	Price     int64
}
