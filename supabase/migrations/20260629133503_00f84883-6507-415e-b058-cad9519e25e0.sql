DROP TRIGGER IF EXISTS trg_update_balance_on_transaction_approval ON public.transaction_requests;

CREATE TRIGGER trg_update_balance_on_transaction_approval
AFTER UPDATE OF status ON public.transaction_requests
FOR EACH ROW
WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
EXECUTE FUNCTION public.update_balance_on_transaction_approval();