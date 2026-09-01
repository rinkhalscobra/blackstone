
CREATE TRIGGER update_balance_on_transaction_approval
  AFTER UPDATE ON public.transaction_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_balance_on_transaction_approval();
