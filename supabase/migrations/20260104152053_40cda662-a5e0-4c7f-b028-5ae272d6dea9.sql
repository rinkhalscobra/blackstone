-- Update customer_balances currency from USD to EUR
UPDATE customer_balances 
SET currency = 'EUR' 
WHERE currency = 'USD';

-- Update transaction_requests currency from USD to EUR
UPDATE transaction_requests 
SET currency = 'EUR' 
WHERE currency = 'USD';