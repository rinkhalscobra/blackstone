import { useState, type ReactNode } from "react";
import { Check, Loader2, MessageSquareText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ReviewAction = "approved" | "rejected";

interface ReviewTransaction {
  id: string;
  customer_id: string;
  type: "deposit" | "withdraw";
  amount: number;
  currency: string;
}

const formatAmount = (transaction: ReviewTransaction) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: transaction.currency || "USD",
  }).format(transaction.amount);

const defaultMessage = (transaction: ReviewTransaction, action: ReviewAction) => {
  const request = transaction.type === "withdraw" ? "withdrawal" : "deposit";
  return action === "approved"
    ? `Your ${request} request for ${formatAmount(transaction)} has been approved.`
    : `Your ${request} request for ${formatAmount(transaction)} was not approved. Please contact your case specialist if you need more information.`;
};

export const TransactionReviewDialog = ({
  transaction,
  action,
  onReviewed,
  children,
}: {
  transaction: ReviewTransaction;
  action: ReviewAction;
  onReviewed?: () => void | Promise<void>;
  children: ReactNode;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isApproval = action === "approved";

  const handleReview = async () => {
    if (!user) return;
    setSubmitting(true);
    const clientMessage = message.trim() || defaultMessage(transaction, action);

    try {
      const { data, error } = await supabase
        .from("transaction_requests")
        .update({
          status: action,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          review_message: clientMessage,
        })
        .eq("id", transaction.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("This request has already been reviewed.");

      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: transaction.customer_id,
        type: isApproval ? "success" : "error",
        title: `${transaction.type === "withdraw" ? "Withdrawal" : "Deposit"} ${isApproval ? "Approved" : "Rejected"}`,
        message: clientMessage,
      });

      if (notificationError) console.error("Unable to create transaction notification:", notificationError);

      toast({
        title: `Request ${isApproval ? "approved" : "rejected"}`,
        description: "The decision and message are now visible to the client.",
      });
      setOpen(false);
      setMessage("");
      await onReviewed?.();
    } catch (error: unknown) {
      toast({
        title: "Unable to review request",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && setOpen(nextOpen)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className={cn("mb-2 flex h-11 w-11 items-center justify-center rounded-full", isApproval ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
            {isApproval ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </div>
          <DialogTitle>{isApproval ? "Approve" : "Reject"} {transaction.type} request</DialogTitle>
          <DialogDescription>
            {formatAmount(transaction)} will be marked as {action}. The message below will appear in the client's transaction history and notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor={`review-message-${transaction.id}-${action}`} className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4" /> Message to client
          </Label>
          <Textarea
            id={`review-message-${transaction.id}-${action}`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={isApproval ? "Add processing or payout information..." : "For example: Funds are currently on hold and cannot be withdrawn."}
            rows={5}
            maxLength={2000}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>If left empty, a professional default message will be sent.</span>
            <span>{message.length}/2000</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleReview}
            disabled={submitting}
            className={cn(isApproval ? "bg-green-600 text-white hover:bg-green-500" : "bg-red-600 text-white hover:bg-red-500")}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isApproval ? <Check className="mr-2 h-4 w-4" /> : <X className="mr-2 h-4 w-4" />}
            Confirm {isApproval ? "approval" : "rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
