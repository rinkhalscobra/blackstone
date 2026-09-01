-- Delete portfolio items that are not in the allowed list (BTC, ETH, USDT, SOL, XRP)
DELETE FROM portfolio_items 
WHERE LOWER(crypto_symbol) NOT IN ('btc', 'eth', 'usdt', 'sol', 'xrp');