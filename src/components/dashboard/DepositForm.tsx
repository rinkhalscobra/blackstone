import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowDownRight,
  Building,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  Send,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type PaymentMethod = "bank_transfer" | "crypto_wallet" | "credit_card" | "wire_transfer";
type DetailRecord = Record<string, string>;

type ClientPaymentSetting = {
  details: DetailRecord;
  isActive: boolean;
};

const PAYMENT_METHODS: Array<{
  id: PaymentMethod;
  labelKey: string;
  descriptionKey: string;
  icon: typeof Building;
}> = [
  { id: "bank_transfer", labelKey: "deposit.bankTransfer", icon: Building, descriptionKey: "deposit.directBankWire" },
  { id: "crypto_wallet", labelKey: "deposit.cryptoWallet", icon: Wallet, descriptionKey: "deposit.cryptoDesc" },
  { id: "credit_card", labelKey: "deposit.creditCard", icon: CreditCard, descriptionKey: "deposit.creditCardDesc" },
  { id: "wire_transfer", labelKey: "deposit.wireTransfer", icon: Send, descriptionKey: "deposit.internationalWire" },
];

const CRYPTO_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  USDT: "Tether",
  SOL: "Solana",
  XRP: "XRP",
};

const DETAIL_LABELS: Record<string, string> = {
  asset: "Asset",
  network: "Network",
  wallet_address: "Destination wallet",
  memo: "Memo / destination tag",
  beneficiary_name: "Beneficiary",
  bank_name: "Bank name",
  bank_country: "Bank country",
  bank_address: "Bank address",
  currency: "Account currency",
  iban: "IBAN",
  account_number: "Account number",
  routing_number: "Routing / ABA number",
  sort_code: "Sort code",
  swift_bic: "SWIFT / BIC",
  intermediary_bank: "Intermediary bank",
  intermediary_swift: "Intermediary SWIFT / BIC",
  reference: "Payment reference",
  provider: "Payment provider",
  merchant_reference: "Merchant reference",
};

const INSTRUCTION_ORDER = [
  "beneficiary_name",
  "bank_name",
  "bank_address",
  "bank_country",
  "currency",
  "iban",
  "account_number",
  "routing_number",
  "sort_code",
  "swift_bic",
  "intermediary_bank",
  "intermediary_swift",
  "asset",
  "network",
  "wallet_address",
  "memo",
  "reference",
  "provider",
  "merchant_reference",
];

const emptySubmissions = (): Record<PaymentMethod, DetailRecord> => ({
  bank_transfer: {},
  crypto_wallet: {},
  credit_card: {},
  wire_transfer: {},
});

const jsonToDetails = (value: Json): DetailRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [key, fieldValue == null ? "" : String(fieldValue)]),
  );
};

export const DepositForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Partial<Record<PaymentMethod, ClientPaymentSetting>>>({});
  const [submissions, setSubmissions] = useState(emptySubmissions);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const selectedSetting = settings[method];
  const configuredCrypto = selectedSetting?.details.asset?.toUpperCase() || "";
  const cryptoId = configuredCrypto.toLowerCase();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadSettings = async () => {
      setSettingsLoading(true);
      setSettingsError(null);
      const { data, error } = await supabase
        .from("client_payment_details")
        .select("method, details, is_active")
        .eq("customer_id", user.id)
        .eq("is_active", true);

      if (cancelled) return;
      if (error) {
        setSettingsError(error.message);
      } else {
        const nextSettings: Partial<Record<PaymentMethod, ClientPaymentSetting>> = {};
        data?.forEach((row) => {
          nextSettings[row.method] = { details: jsonToDetails(row.details), isActive: row.is_active };
        });
        setSettings(nextSettings);
      }
      setSettingsLoading(false);
    };

    loadSettings();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const configuredCurrency = selectedSetting?.details.currency?.toUpperCase();
    setCurrency(method === "crypto_wallet" ? "USD" : configuredCurrency || "USD");
  }, [method, selectedSetting]);

  const instructionEntries = useMemo(() => {
    if (!selectedSetting) return [];
    return INSTRUCTION_ORDER
      .filter((key) => selectedSetting.details[key])
      .map((key) => [key, selectedSetting.details[key]] as const);
  }, [selectedSetting]);

  const updateSubmission = (key: string, value: string) => {
    setSubmissions((current) => ({
      ...current,
      [method]: { ...current[method], [key]: value },
    }));
  };

  const copyValue = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const validateMethodFields = (): string | null => {
    const fields = submissions[method];
    if (!selectedSetting) return "This payment method has not been configured for your account.";
    if ((method === "bank_transfer" || method === "wire_transfer") && !fields.sender_name?.trim()) {
      return "Enter the name on the sending bank account.";
    }
    if (method === "credit_card" && (!fields.cardholder_name?.trim() || !fields.billing_country?.trim() || !fields.card_brand)) {
      return "Enter the cardholder name, billing country, and card type.";
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!user || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast({ title: t("deposit.invalidAmount"), description: t("deposit.enterValidAmount"), variant: "destructive" });
      return;
    }

    const validationError = validateMethodFields();
    if (validationError) {
      toast({ title: "Complete the payment form", description: validationError, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionDetails = Object.fromEntries(
        Object.entries(submissions[method]).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value),
      );
      const { error } = await supabase.from("transaction_requests").insert({
        customer_id: user.id,
        type: "deposit",
        amount: numericAmount,
        method,
        notes: notes.trim() || null,
        currency,
        status: "pending",
        crypto_id: method === "crypto_wallet" ? cryptoId : null,
        crypto_symbol: method === "crypto_wallet" ? configuredCrypto : null,
        crypto_name: method === "crypto_wallet" ? CRYPTO_NAMES[configuredCrypto] || configuredCrypto : null,
        quantity: null,
        unit_price: null,
        payment_details: submissionDetails as Json,
        payment_instructions_snapshot: selectedSetting?.details as Json,
      });
      if (error) throw error;

      toast({ title: t("deposit.requestSubmitted"), description: t("deposit.requestPending") });
      navigate("/dashboard/transactions");
    } catch (error: unknown) {
      console.error("Error submitting deposit:", error);
      toast({
        title: t("deposit.error"),
        description: error instanceof Error ? error.message : t("deposit.failedToSubmit"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInstructionPanel = () => {
    if (settingsLoading) {
      return (
        <div className="flex items-center justify-center rounded-lg border border-border bg-secondary/30 p-8 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your payment instructions…
        </div>
      );
    }

    if (settingsError) {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Payment details unavailable</div>
          <p className="mt-1 text-muted-foreground">Please contact your account manager before submitting a deposit.</p>
        </div>
      );
    }

    if (!selectedSetting) {
      return (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-amber-400"><AlertCircle className="h-4 w-4" /> Method not yet configured</div>
          <p className="mt-1 text-muted-foreground">Your account manager must assign the payment details for this method before you can use it.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 rounded-lg border border-border bg-secondary/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-medium text-foreground">{t("deposit.paymentInstructions")}</h4>
            <p className="text-xs text-muted-foreground">Use these exact destination details for your transfer.</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-success" />
        </div>

        {instructionEntries.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {instructionEntries.map(([key, value]) => (
              <div key={key} className={cn("rounded-md border border-border bg-background/60 p-3", ["wallet_address", "bank_address", "reference"].includes(key) && "sm:col-span-2")}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{DETAIL_LABELS[key] || key.replace(/_/g, " ")}</dt>
                <dd className="mt-1 flex items-start justify-between gap-2">
                  <span className={cn("break-all text-sm font-medium", ["wallet_address", "iban", "account_number", "swift_bic"].includes(key) && "font-mono")}>{value}</span>
                  <button type="button" onClick={() => copyValue(key, value)} className="shrink-0 text-muted-foreground transition-colors hover:text-foreground" aria-label={`Copy ${DETAIL_LABELS[key] || key}`}>
                    {copiedField === key ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        )}

        {selectedSetting.details.instructions && (
          <p className="whitespace-pre-wrap rounded-md border border-border bg-background/60 p-3 text-sm text-muted-foreground">
            {selectedSetting.details.instructions}
          </p>
        )}

        {method === "credit_card" && selectedSetting.details.payment_url && (
          <Button asChild variant="outline" className="w-full">
            <a href={selectedSetting.details.payment_url} target="_blank" rel="noreferrer">
              Open secure payment page <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <ArrowDownRight className="h-6 w-6 text-success" />
          </div>
          <div>
            <CardTitle>{t("deposit.title")}</CardTitle>
            <CardDescription>{t("deposit.subtitle")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Deposit amount</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="text-lg"
                required
              />
              <Select value={currency} onValueChange={setCurrency} disabled={method === "crypto_wallet" || Boolean(selectedSetting?.details.currency)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("deposit.paymentMethod")}</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((paymentMethod) => {
                const Icon = paymentMethod.icon;
                const isConfigured = Boolean(settings[paymentMethod.id]);
                return (
                  <button
                    key={paymentMethod.id}
                    type="button"
                    onClick={() => setMethod(paymentMethod.id)}
                    className={cn(
                      "relative rounded-lg border-2 p-4 text-left transition-colors",
                      method === paymentMethod.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                    )}
                  >
                    <Icon className={cn("mb-2 h-6 w-6", method === paymentMethod.id ? "text-primary" : "text-muted-foreground")} />
                    <div className="font-medium text-foreground">{t(paymentMethod.labelKey)}</div>
                    <div className="text-xs text-muted-foreground">{t(paymentMethod.descriptionKey)}</div>
                    {!settingsLoading && (
                      <span className={cn("absolute right-3 top-3 h-2 w-2 rounded-full", isConfigured ? "bg-success" : "bg-muted-foreground/40")} title={isConfigured ? "Configured" : "Not configured"} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {renderInstructionPanel()}

          {selectedSetting && method === "bank_transfer" && (
            <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bank-sender-name">Name on sending account</Label>
                <Input id="bank-sender-name" autoComplete="name" placeholder="Full legal name" value={submissions.bank_transfer.sender_name || ""} onChange={(event) => updateSubmission("sender_name", event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-sender-bank">Sending bank</Label>
                <Input id="bank-sender-bank" placeholder="Your bank name" value={submissions.bank_transfer.sender_bank || ""} onChange={(event) => updateSubmission("sender_bank", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-transfer-date">Expected transfer date</Label>
                <Input id="bank-transfer-date" type="date" value={submissions.bank_transfer.expected_date || ""} onChange={(event) => updateSubmission("expected_date", event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bank-confirmation">Transfer confirmation / reference (optional)</Label>
                <Input id="bank-confirmation" placeholder="Your bank's confirmation number" value={submissions.bank_transfer.confirmation_number || ""} onChange={(event) => updateSubmission("confirmation_number", event.target.value)} />
              </div>
            </div>
          )}

          {selectedSetting && method === "wire_transfer" && (
            <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="wire-sender-name">Name on sending account</Label>
                <Input id="wire-sender-name" autoComplete="name" placeholder="Full legal name" value={submissions.wire_transfer.sender_name || ""} onChange={(event) => updateSubmission("sender_name", event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wire-sender-bank">Sending bank</Label>
                <Input id="wire-sender-bank" placeholder="Your bank name" value={submissions.wire_transfer.sender_bank || ""} onChange={(event) => updateSubmission("sender_bank", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wire-country">Originating country</Label>
                <Input id="wire-country" placeholder="Country" value={submissions.wire_transfer.originating_country || ""} onChange={(event) => updateSubmission("originating_country", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wire-date">Expected wire date</Label>
                <Input id="wire-date" type="date" value={submissions.wire_transfer.expected_date || ""} onChange={(event) => updateSubmission("expected_date", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wire-confirmation">Wire confirmation (optional)</Label>
                <Input id="wire-confirmation" placeholder="Bank confirmation number" value={submissions.wire_transfer.confirmation_number || ""} onChange={(event) => updateSubmission("confirmation_number", event.target.value)} />
              </div>
            </div>
          )}

          {selectedSetting && method === "credit_card" && (
            <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
              <div className="flex gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm sm:col-span-2">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-muted-foreground">For your security, enter card details only on the configured secure payment page. This form never asks for or stores your card number or CVV.</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cardholder-name">Cardholder name</Label>
                <Input id="cardholder-name" autoComplete="cc-name" placeholder="Name shown on card" value={submissions.credit_card.cardholder_name || ""} onChange={(event) => updateSubmission("cardholder_name", event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-country">Billing country</Label>
                <Input id="billing-country" autoComplete="country-name" placeholder="Country" value={submissions.credit_card.billing_country || ""} onChange={(event) => updateSubmission("billing_country", event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Card type</Label>
                <Select value={submissions.credit_card.card_brand || ""} onValueChange={(value) => updateSubmission("card_brand", value)}>
                  <SelectTrigger><SelectValue placeholder="Select card type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                    <SelectItem value="amex">American Express</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">{t("deposit.notesLabel")}</Label>
            <Textarea id="notes" placeholder={t("deposit.notesPlaceholder")} value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="flex-1">
              {t("deposit.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || settingsLoading || !selectedSetting} className="flex-1">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? t("deposit.submitting") : t("deposit.submitRequest")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
