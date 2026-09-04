import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowUpRight, Building2, Loader2, Send, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCryptoPrices } from "@/services/cryptoApi";

type WithdrawMethod = "bank_transfer" | "crypto_wallet" | "wire_transfer";
type DetailRecord = Record<string, string>;

const SUPPORTED_CRYPTOS = [
  { id: "btc", symbol: "BTC", name: "Bitcoin", networks: ["Bitcoin"] },
  { id: "eth", symbol: "ETH", name: "Ethereum", networks: ["Ethereum (ERC-20)"] },
  { id: "usdt", symbol: "USDT", name: "Tether", networks: ["Ethereum (ERC-20)", "Tron (TRC-20)"] },
  { id: "sol", symbol: "SOL", name: "Solana", networks: ["Solana"] },
  { id: "xrp", symbol: "XRP", name: "XRP", networks: ["XRP Ledger"] },
] as const;

const emptyDetails = (): Record<WithdrawMethod, DetailRecord> => ({
  bank_transfer: {},
  crypto_wallet: {},
  wire_transfer: {},
});

interface HoldingRow {
  crypto_id: string;
  quantity: number;
}

type TransactionRequestInsert = Database["public"]["Tables"]["transaction_requests"]["Insert"];

export const WithdrawForm = () => {
  const { user } = useAuth();
  const { balance } = useCustomerData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<WithdrawMethod>("bank_transfer");
  const [details, setDetails] = useState(emptyDetails);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cryptoId, setCryptoId] = useState("btc");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);
  const [priceLoading, setPriceLoading] = useState(false);
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);

  const withdrawMethods = [
    { id: "bank_transfer" as const, label: t("withdraw.bankTransfer"), description: "Domestic bank account", icon: Building2 },
    { id: "crypto_wallet" as const, label: t("withdraw.cryptoWallet"), description: "Blockchain wallet address", icon: Wallet },
    { id: "wire_transfer" as const, label: t("withdraw.wireTransfer"), description: "International bank wire", icon: Send },
  ];

  const availableBalance = balance?.balance || 0;
  const balanceCurrency = (balance?.currency || "USD").toUpperCase();
  const requestedAmount = Number(amount) || 0;
  const selectedCrypto = SUPPORTED_CRYPTOS.find((crypto) => crypto.id === cryptoId) || SUPPORTED_CRYPTOS[0];
  const selectedDetails = details[method];
  const heldQty = holdings.find((holding) => holding.crypto_id === cryptoId)?.quantity || 0;
  const requestedQty = Number(quantity) || 0;
  const insufficientFunds = method !== "crypto_wallet" && requestedAmount > availableBalance;
  const insufficientCrypto = method === "crypto_wallet" && requestedQty > heldQty;
  const transactionCurrency = method === "crypto_wallet" ? "USD" : balanceCurrency;

  const availableCryptoIds = useMemo(
    () => new Set(holdings.filter((holding) => holding.quantity > 0).map((holding) => holding.crypto_id)),
    [holdings],
  );

  useEffect(() => {
    if (!user) return;
    supabase
      .from("portfolio_items")
      .select("crypto_id, quantity")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const rows = (data as HoldingRow[]) || [];
        setHoldings(rows);
        const firstAvailable = SUPPORTED_CRYPTOS.find((crypto) => rows.some((holding) => holding.crypto_id === crypto.id && holding.quantity > 0));
        if (firstAvailable) setCryptoId(firstAvailable.id);
      });
  }, [user]);

  useEffect(() => {
    if (method !== "crypto_wallet" || !cryptoId) return;
    let cancelled = false;
    setPriceLoading(true);
    getCryptoPrices([cryptoId])
      .then((prices) => {
        if (!cancelled) setUnitPrice(prices[cryptoId]?.current_price || 0);
      })
      .finally(() => {
        if (!cancelled) setPriceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [method, cryptoId]);

  useEffect(() => {
    if (method !== "crypto_wallet") return;
    setAmount(requestedQty > 0 && unitPrice > 0 ? (requestedQty * unitPrice).toFixed(2) : "");
  }, [method, requestedQty, unitPrice]);

  useEffect(() => {
    if (method !== "crypto_wallet") return;
    const currentNetwork = details.crypto_wallet.network;
    if (!(selectedCrypto.networks as readonly string[]).includes(currentNetwork)) {
      setDetails((current) => ({
        ...current,
        crypto_wallet: { ...current.crypto_wallet, network: selectedCrypto.networks[0] },
      }));
    }
  }, [cryptoId, details.crypto_wallet.network, method, selectedCrypto.networks]);

  const updateDetail = (key: string, value: string) => {
    setDetails((current) => ({
      ...current,
      [method]: { ...current[method], [key]: value },
    }));
  };

  const validate = (): string | null => {
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) return "Enter a valid withdrawal amount.";
    if (insufficientFunds) return "The requested amount exceeds your available cash balance.";

    if (method === "crypto_wallet") {
      if (!Number.isFinite(requestedQty) || requestedQty <= 0) return "Enter a valid crypto quantity.";
      if (insufficientCrypto) return `You only hold ${heldQty} ${selectedCrypto.symbol}.`;
      if (!unitPrice) return "The current asset price is unavailable. Please wait and try again.";
      if (!selectedDetails.network) return "Select the destination network.";
      if (!selectedDetails.wallet_address?.trim() || selectedDetails.wallet_address.trim().length < 10) return "Enter a valid destination wallet address.";
      if (selectedDetails.wallet_address.trim() !== selectedDetails.confirm_wallet_address?.trim()) return "The wallet addresses do not match.";
      if (!selectedDetails.recipient_type) return "Select who controls the destination wallet.";
      return null;
    }

    if (!selectedDetails.account_holder_name?.trim()) return "Enter the account holder's legal name.";
    if (!selectedDetails.bank_name?.trim()) return "Enter the receiving bank name.";
    if (!selectedDetails.bank_country?.trim()) return "Enter the receiving bank country.";
    if (!selectedDetails.account_number?.trim() && !selectedDetails.iban?.trim()) return "Enter an account number or IBAN.";
    if (method === "wire_transfer" && !selectedDetails.swift_bic?.trim()) return "Enter the receiving bank SWIFT / BIC code.";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const validationError = validate();
    if (validationError) {
      toast({ title: "Complete the withdrawal form", description: validationError, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentDetails: Record<string, string> = Object.fromEntries(
        Object.entries(selectedDetails)
          .filter(([key]) => key !== "confirm_wallet_address")
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value),
      );
      if (method === "crypto_wallet") paymentDetails.asset = selectedCrypto.symbol;

      const payload: TransactionRequestInsert = {
        customer_id: user.id,
        type: "withdraw",
        amount: requestedAmount,
        method,
        notes: notes.trim() || null,
        currency: transactionCurrency,
        status: "pending",
        payment_details: paymentDetails as Json,
      };

      if (method === "crypto_wallet") {
        payload.crypto_id = selectedCrypto.id;
        payload.crypto_symbol = selectedCrypto.symbol;
        payload.crypto_name = selectedCrypto.name;
        payload.quantity = requestedQty;
        payload.unit_price = unitPrice;
      }

      const { error } = await supabase.from("transaction_requests").insert(payload);
      if (error) throw error;

      toast({ title: t("withdraw.requestSubmitted"), description: t("withdraw.requestPending") });
      navigate("/dashboard/transactions");
    } catch (error: unknown) {
      console.error("Error submitting withdrawal:", error);
      toast({
        title: t("withdraw.error"),
        description: error instanceof Error ? error.message : t("withdraw.failedToSubmit"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <ArrowUpRight className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <CardTitle>{t("withdraw.title")}</CardTitle>
            <CardDescription>{t("withdraw.availableBalance")}: {formatCurrency(availableBalance, balanceCurrency)}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">{method === "crypto_wallet" ? "Estimated value (USD)" : `Amount (${balanceCurrency})`}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{transactionCurrency}</span>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                max={method === "crypto_wallet" ? undefined : availableBalance}
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                readOnly={method === "crypto_wallet"}
                className={cn("pl-14 text-lg", method === "crypto_wallet" && "cursor-default bg-muted/30", insufficientFunds && "border-destructive")}
                required
              />
            </div>
            {method === "crypto_wallet" && <p className="text-xs text-muted-foreground">Calculated from the selected quantity at the latest available USD market price.</p>}
            {insufficientFunds && (
              <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>The request exceeds your available balance of {formatCurrency(availableBalance, balanceCurrency)}.</AlertDescription></Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("withdraw.withdrawalMethod")}</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {withdrawMethods.map((withdrawMethod) => {
                const Icon = withdrawMethod.icon;
                const selected = method === withdrawMethod.id;
                return (
                  <button key={withdrawMethod.id} type="button" onClick={() => { setMethod(withdrawMethod.id); setAmount(""); }} className={cn("rounded-lg border-2 p-4 text-left transition-colors", selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                    <Icon className={cn("mb-3 h-6 w-6", selected ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-sm font-medium text-foreground">{withdrawMethod.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{withdrawMethod.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {method === "bank_transfer" && (
            <section className="space-y-4 rounded-lg border border-border bg-secondary/20 p-4">
              <SectionHeader title="Receiving bank account" description="Enter the beneficiary details exactly as they appear on the account." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="bank-holder" label="Account holder name" value={selectedDetails.account_holder_name} onChange={(value) => updateDetail("account_holder_name", value)} placeholder="Full legal name" autoComplete="name" required className="sm:col-span-2" />
                <Field id="bank-name" label="Bank name" value={selectedDetails.bank_name} onChange={(value) => updateDetail("bank_name", value)} placeholder="Receiving bank" required />
                <Field id="bank-country" label="Bank country" value={selectedDetails.bank_country} onChange={(value) => updateDetail("bank_country", value)} placeholder="Country" autoComplete="country-name" required />
                <Field id="bank-account" label="Account number" value={selectedDetails.account_number} onChange={(value) => updateDetail("account_number", value)} placeholder="Account number" />
                <Field id="bank-iban" label="IBAN" value={selectedDetails.iban} onChange={(value) => updateDetail("iban", value.toUpperCase())} placeholder="International Bank Account Number" mono />
                <Field id="bank-routing" label="Routing / ABA / sort code" value={selectedDetails.routing_number} onChange={(value) => updateDetail("routing_number", value)} placeholder="Routing identifier" mono />
                <div className="space-y-2">
                  <Label>Account type</Label>
                  <Select value={selectedDetails.account_type || ""} onValueChange={(value) => updateDetail("account_type", value)}>
                    <SelectTrigger><SelectValue placeholder="Select account type" /></SelectTrigger>
                    <SelectContent><SelectItem value="checking">Checking</SelectItem><SelectItem value="savings">Savings</SelectItem><SelectItem value="business">Business</SelectItem></SelectContent>
                  </Select>
                </div>
                <Field id="bank-address" label="Account holder address (optional)" value={selectedDetails.beneficiary_address} onChange={(value) => updateDetail("beneficiary_address", value)} placeholder="Street, city, postal code, country" autoComplete="street-address" className="sm:col-span-2" />
              </div>
            </section>
          )}

          {method === "crypto_wallet" && (
            <section className="space-y-5 rounded-lg border border-border bg-secondary/20 p-4">
              <SectionHeader title="Destination wallet" description="Network and address must match. Blockchain withdrawals cannot be reversed after processing." />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Asset</Label>
                  <Select value={cryptoId} onValueChange={setCryptoId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CRYPTOS.map((crypto) => <SelectItem key={crypto.id} value={crypto.id} disabled={!availableCryptoIds.has(crypto.id)}>{crypto.symbol} - {crypto.name}{!availableCryptoIds.has(crypto.id) ? " (no holdings)" : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crypto-quantity">Quantity</Label>
                  <Input id="crypto-quantity" type="number" inputMode="decimal" step="0.00000001" min="0.00000001" max={heldQty || undefined} placeholder="0.00" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={cn(insufficientCrypto && "border-destructive")} required />
                  <p className="text-xs text-muted-foreground">Available: {heldQty} {selectedCrypto.symbol}</p>
                </div>
                <div className="space-y-2">
                  <Label>Network</Label>
                  <Select value={selectedDetails.network || ""} onValueChange={(value) => updateDetail("network", value)}>
                    <SelectTrigger><SelectValue placeholder="Select network" /></SelectTrigger>
                    <SelectContent>{selectedCrypto.networks.map((network) => <SelectItem key={network} value={network}>{network}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destination type</Label>
                  <Select value={selectedDetails.recipient_type || ""} onValueChange={(value) => updateDetail("recipient_type", value)}>
                    <SelectTrigger><SelectValue placeholder="Who controls this wallet?" /></SelectTrigger>
                    <SelectContent><SelectItem value="personal_wallet">My personal wallet</SelectItem><SelectItem value="exchange_account">My exchange account</SelectItem><SelectItem value="third_party_wallet">Third-party wallet</SelectItem></SelectContent>
                  </Select>
                </div>
                <Field id="crypto-wallet" label="Wallet address" value={selectedDetails.wallet_address} onChange={(value) => updateDetail("wallet_address", value.trim())} placeholder="Paste the destination wallet address" mono required className="sm:col-span-2" />
                <Field id="crypto-wallet-confirm" label="Confirm wallet address" value={selectedDetails.confirm_wallet_address} onChange={(value) => updateDetail("confirm_wallet_address", value.trim())} placeholder="Paste the address again" mono required className="sm:col-span-2" />
                <Field id="crypto-label" label="Wallet / exchange label (optional)" value={selectedDetails.destination_label} onChange={(value) => updateDetail("destination_label", value)} placeholder="For example, Ledger or Coinbase" />
                <Field id="crypto-memo" label="Memo / destination tag (if required)" value={selectedDetails.memo} onChange={(value) => updateDetail("memo", value)} placeholder="Memo or tag" mono />
              </div>
              {insufficientCrypto && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Insufficient {selectedCrypto.symbol} balance.</AlertDescription></Alert>}
              <div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <p className="text-muted-foreground">Verify the network, full address, and any required memo before submitting. The request remains pending until reviewed by the case team.</p>
              </div>
              <p className="text-xs text-muted-foreground">{priceLoading ? "Loading market price..." : unitPrice > 0 ? `Reference price: ${formatCurrency(unitPrice, "USD")} per ${selectedCrypto.symbol}` : "Market price unavailable"}</p>
            </section>
          )}

          {method === "wire_transfer" && (
            <section className="space-y-4 rounded-lg border border-border bg-secondary/20 p-4">
              <SectionHeader title="International wire instructions" description="Provide the complete beneficiary and receiving bank information." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="wire-holder" label="Beneficiary legal name" value={selectedDetails.account_holder_name} onChange={(value) => updateDetail("account_holder_name", value)} placeholder="Full legal name or company" required className="sm:col-span-2" />
                <Field id="wire-address" label="Beneficiary address (optional)" value={selectedDetails.beneficiary_address} onChange={(value) => updateDetail("beneficiary_address", value)} placeholder="Street, city, postal code, country" className="sm:col-span-2" />
                <Field id="wire-bank" label="Receiving bank" value={selectedDetails.bank_name} onChange={(value) => updateDetail("bank_name", value)} placeholder="Bank name" required />
                <Field id="wire-country" label="Bank country" value={selectedDetails.bank_country} onChange={(value) => updateDetail("bank_country", value)} placeholder="Country" required />
                <Field id="wire-account" label="Account number" value={selectedDetails.account_number} onChange={(value) => updateDetail("account_number", value)} placeholder="Beneficiary account number" mono />
                <Field id="wire-iban" label="IBAN" value={selectedDetails.iban} onChange={(value) => updateDetail("iban", value.toUpperCase())} placeholder="International Bank Account Number" mono />
                <Field id="wire-swift" label="SWIFT / BIC" value={selectedDetails.swift_bic} onChange={(value) => updateDetail("swift_bic", value.toUpperCase())} placeholder="8 or 11 characters" mono required />
                <Field id="wire-bank-address" label="Bank address (optional)" value={selectedDetails.bank_address} onChange={(value) => updateDetail("bank_address", value)} placeholder="Branch address" />
                <Field id="wire-intermediary" label="Intermediary bank (optional)" value={selectedDetails.intermediary_bank} onChange={(value) => updateDetail("intermediary_bank", value)} placeholder="Intermediary institution" />
                <Field id="wire-intermediary-swift" label="Intermediary SWIFT / BIC (optional)" value={selectedDetails.intermediary_swift} onChange={(value) => updateDetail("intermediary_swift", value.toUpperCase())} placeholder="Intermediary code" mono />
                <Field id="wire-reference" label="Payment reference (optional)" value={selectedDetails.reference} onChange={(value) => updateDetail("reference", value)} placeholder="Reference for the beneficiary" className="sm:col-span-2" />
              </div>
            </section>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">{t("withdraw.notesLabel")}</Label>
            <Textarea id="notes" placeholder={t("withdraw.notesPlaceholder")} value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={1000} />
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <h4 className="font-medium text-foreground">Review and processing</h4>
            <p className="mt-1 text-sm text-muted-foreground">Your request will be submitted with Pending status. Your case team will review the destination details and notify you when it is approved or rejected.</p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="flex-1">{t("withdraw.cancel")}</Button>
            <Button type="submit" disabled={isSubmitting || insufficientFunds || insufficientCrypto || priceLoading || (method === "crypto_wallet" && !unitPrice)} className="flex-1">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? t("withdraw.submitting") : t("withdraw.submitRequest")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const SectionHeader = ({ title, description }: { title: string; description: string }) => (
  <div><h3 className="font-semibold">{title}</h3><p className="text-sm text-muted-foreground">{description}</p></div>
);

const Field = ({ id, label, value, onChange, placeholder, required, mono, autoComplete, className }: {
  id: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  mono?: boolean;
  autoComplete?: string;
  className?: string;
}) => (
  <div className={cn("space-y-2", className)}>
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} autoComplete={autoComplete} className={cn(mono && "font-mono")} />
  </div>
);
