import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Json } from "@/integrations/supabase/types";

const LABELS: Record<string, string> = {
  sender_name: "Sending account name",
  sender_bank: "Sending bank",
  originating_country: "Originating country",
  expected_date: "Expected transfer date",
  confirmation_number: "Confirmation number",
  sender_wallet: "Sending wallet / exchange",
  transaction_hash: "Transaction hash / TXID",
  cardholder_name: "Cardholder name",
  billing_country: "Billing country",
  card_brand: "Card type",
  beneficiary_name: "Beneficiary",
  account_holder_name: "Account holder / beneficiary",
  beneficiary_address: "Beneficiary address",
  bank_name: "Bank name",
  bank_address: "Bank address",
  bank_country: "Bank country",
  currency: "Currency",
  iban: "IBAN",
  account_number: "Account number",
  routing_number: "Routing / ABA number",
  account_type: "Account type",
  sort_code: "Sort code",
  swift_bic: "SWIFT / BIC",
  intermediary_bank: "Intermediary bank",
  intermediary_swift: "Intermediary SWIFT / BIC",
  reference: "Payment reference",
  asset: "Crypto asset",
  network: "Network",
  wallet_address: "Destination wallet",
  recipient_type: "Destination type",
  destination_label: "Wallet / exchange label",
  memo: "Memo / destination tag",
  provider: "Payment provider",
  merchant_reference: "Merchant reference",
  payment_url: "Secure payment URL",
  instructions: "Additional instructions",
};

const toEntries = (value: Json | null): Array<[string, string]> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value)
    .filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim())
    .map(([key, fieldValue]) => [key, String(fieldValue)]);
};

const DetailSection = ({ title, entries }: { title: string; entries: Array<[string, string]> }) => (
  <section className="space-y-3">
    <h3 className="text-sm font-semibold">{title}</h3>
    {entries.length === 0 ? (
      <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">No details recorded.</p>
    ) : (
      <dl className="grid gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className={`rounded-md border border-border bg-muted/30 p-3 ${["wallet_address", "bank_address", "instructions", "payment_url"].includes(key) ? "sm:col-span-2" : ""}`}>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{LABELS[key] || key.replace(/_/g, " ")}</dt>
            <dd className="mt-1 break-all whitespace-pre-wrap text-sm font-medium">
              {key === "payment_url" ? (
                <a href={value} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">{value}</a>
              ) : value}
            </dd>
          </div>
        ))}
      </dl>
    )}
  </section>
);

export const TransactionPaymentDetailsDialog = ({
  transactionType = "deposit",
  method,
  paymentDetails,
  instructionSnapshot,
}: {
  transactionType?: "deposit" | "withdraw";
  method: string;
  paymentDetails: Json | null;
  instructionSnapshot: Json | null;
}) => {
  const submittedEntries = toEntries(paymentDetails);
  const instructionEntries = toEntries(instructionSnapshot);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={!submittedEntries.length && !instructionEntries.length}>
          <Eye className="h-3.5 w-3.5" /> View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transactionType === "withdraw" ? "Withdrawal destination details" : "Deposit payment details"}</DialogTitle>
          <DialogDescription className="capitalize">{method.replace(/_/g, " ")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          <DetailSection title={transactionType === "withdraw" ? "Client-submitted destination" : "Client-submitted information"} entries={submittedEntries} />
          {transactionType === "deposit" && <DetailSection title="Instructions shown at submission" entries={instructionEntries} />}
        </div>
      </DialogContent>
    </Dialog>
  );
};
