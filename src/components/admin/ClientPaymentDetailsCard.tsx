import { useEffect, useMemo, useState } from "react";
import { Building2, CreditCard, Landmark, Loader2, Save, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type DepositPaymentMethod = "bank_transfer" | "crypto_wallet" | "credit_card" | "wire_transfer";
export type PaymentDetails = Record<string, string>;

type FieldDefinition = {
  key: string;
  label: string;
  placeholder?: string;
  fullWidth?: boolean;
  multiline?: boolean;
};

const METHODS: Array<{
  id: DepositPaymentMethod;
  label: string;
  description: string;
  icon: typeof Wallet;
  fields: FieldDefinition[];
}> = [
  {
    id: "crypto_wallet",
    label: "Crypto wallet",
    description: "Set the destination asset, network, and wallet assigned to this client.",
    icon: Wallet,
    fields: [
      { key: "asset", label: "Asset", placeholder: "USDT" },
      { key: "network", label: "Network", placeholder: "TRC-20" },
      { key: "wallet_address", label: "Destination wallet address", placeholder: "Enter the receiving wallet address", fullWidth: true },
      { key: "memo", label: "Memo / destination tag", placeholder: "Only if required", fullWidth: true },
      { key: "instructions", label: "Additional instructions", placeholder: "Minimum confirmations, amount limits, or other guidance", fullWidth: true, multiline: true },
    ],
  },
  {
    id: "bank_transfer",
    label: "Bank transfer",
    description: "Configure the domestic or SEPA account details shown to this client.",
    icon: Building2,
    fields: [
      { key: "beneficiary_name", label: "Beneficiary / account holder", placeholder: "Legal account name", fullWidth: true },
      { key: "bank_name", label: "Bank name", placeholder: "Receiving bank" },
      { key: "bank_country", label: "Bank country", placeholder: "Germany" },
      { key: "bank_address", label: "Bank address", placeholder: "Street, city, postal code", fullWidth: true },
      { key: "currency", label: "Account currency", placeholder: "EUR" },
      { key: "iban", label: "IBAN", placeholder: "DE00 0000 0000 0000 0000 00" },
      { key: "account_number", label: "Account number", placeholder: "For non-IBAN transfers" },
      { key: "routing_number", label: "Routing / ABA number", placeholder: "If applicable" },
      { key: "sort_code", label: "Sort code", placeholder: "If applicable" },
      { key: "swift_bic", label: "SWIFT / BIC", placeholder: "If applicable" },
      { key: "reference", label: "Required payment reference", placeholder: "Client-specific reference", fullWidth: true },
      { key: "instructions", label: "Additional instructions", placeholder: "Transfer guidance shown to the client", fullWidth: true, multiline: true },
    ],
  },
  {
    id: "wire_transfer",
    label: "Wire transfer",
    description: "Configure international wire and optional intermediary-bank details.",
    icon: Landmark,
    fields: [
      { key: "beneficiary_name", label: "Beneficiary / account holder", placeholder: "Legal account name", fullWidth: true },
      { key: "bank_name", label: "Receiving bank", placeholder: "Bank name" },
      { key: "bank_country", label: "Bank country", placeholder: "Country" },
      { key: "bank_address", label: "Receiving bank address", placeholder: "Street, city, postal code", fullWidth: true },
      { key: "currency", label: "Wire currency", placeholder: "USD" },
      { key: "swift_bic", label: "SWIFT / BIC", placeholder: "Required for international wires" },
      { key: "iban", label: "IBAN", placeholder: "If applicable" },
      { key: "account_number", label: "Account number", placeholder: "Beneficiary account number" },
      { key: "routing_number", label: "Routing / ABA number", placeholder: "If applicable" },
      { key: "intermediary_bank", label: "Intermediary bank", placeholder: "Optional" },
      { key: "intermediary_swift", label: "Intermediary SWIFT / BIC", placeholder: "Optional" },
      { key: "reference", label: "Required payment reference", placeholder: "Client-specific reference", fullWidth: true },
      { key: "instructions", label: "Additional instructions", placeholder: "Fee handling or correspondent-bank guidance", fullWidth: true, multiline: true },
    ],
  },
  {
    id: "credit_card",
    label: "Credit card",
    description: "Use a PCI-compliant hosted checkout; card numbers and CVVs are never stored here.",
    icon: CreditCard,
    fields: [
      { key: "provider", label: "Payment provider", placeholder: "Stripe, Adyen, Checkout.com…" },
      { key: "merchant_reference", label: "Merchant reference", placeholder: "Client-specific reference" },
      { key: "payment_url", label: "Secure payment link", placeholder: "https://…", fullWidth: true },
      { key: "instructions", label: "Additional instructions", placeholder: "Payment limits or billing guidance", fullWidth: true, multiline: true },
    ],
  },
];

const emptyDetails = (): Record<DepositPaymentMethod, PaymentDetails> => ({
  bank_transfer: {},
  crypto_wallet: {},
  credit_card: {},
  wire_transfer: {},
});

const emptyActive = (): Record<DepositPaymentMethod, boolean> => ({
  bank_transfer: true,
  crypto_wallet: true,
  credit_card: true,
  wire_transfer: true,
});

const jsonToDetails = (value: Json): PaymentDetails => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [key, fieldValue == null ? "" : String(fieldValue)]),
  );
};

const cleanDetails = (details: PaymentDetails): PaymentDetails =>
  Object.fromEntries(Object.entries(details).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value));

export const ClientPaymentDetailsCard = ({ customerId }: { customerId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<DepositPaymentMethod>("crypto_wallet");
  const [detailsByMethod, setDetailsByMethod] = useState(emptyDetails);
  const [activeByMethod, setActiveByMethod] = useState(emptyActive);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<DepositPaymentMethod | null>(null);

  const selectedConfig = useMemo(
    () => METHODS.find((method) => method.id === selectedMethod) ?? METHODS[0],
    [selectedMethod],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("client_payment_details")
        .select("method, details, is_active")
        .eq("customer_id", customerId);

      if (cancelled) return;
      if (error) {
        toast({ title: "Could not load payment details", description: error.message, variant: "destructive" });
      } else {
        const nextDetails = emptyDetails();
        const nextActive = emptyActive();
        data?.forEach((row) => {
          nextDetails[row.method] = jsonToDetails(row.details);
          nextActive[row.method] = row.is_active;
        });
        setDetailsByMethod(nextDetails);
        setActiveByMethod(nextActive);
      }
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [customerId, toast]);

  const updateField = (method: DepositPaymentMethod, key: string, value: string) => {
    setDetailsByMethod((current) => ({
      ...current,
      [method]: { ...current[method], [key]: value },
    }));
  };

  const validate = (method: DepositPaymentMethod, details: PaymentDetails): string | null => {
    if (method === "crypto_wallet" && (!details.asset || !details.network || !details.wallet_address)) {
      return "Asset, network, and destination wallet address are required.";
    }
    if ((method === "bank_transfer" || method === "wire_transfer") &&
      (!details.beneficiary_name || !details.bank_name || (!details.iban && !details.account_number))) {
      return "Beneficiary, bank name, and either an IBAN or account number are required.";
    }
    if (method === "wire_transfer" && !details.swift_bic) {
      return "A SWIFT / BIC code is required for international wires.";
    }
    if (method === "credit_card") {
      try {
        const url = new URL(details.payment_url || "");
        if (url.protocol !== "https:") throw new Error();
      } catch {
        return "Enter a valid HTTPS secure payment link.";
      }
    }
    return null;
  };

  const saveMethod = async (method: DepositPaymentMethod) => {
    const details = cleanDetails(detailsByMethod[method]);
    if (activeByMethod[method]) {
      const validationError = validate(method, details);
      if (validationError) {
        toast({ title: "Check payment details", description: validationError, variant: "destructive" });
        return;
      }
    }

    setSaving(method);
    const { error } = await supabase
      .from("client_payment_details")
      .upsert({
        customer_id: customerId,
        method,
        details: details as Json,
        is_active: activeByMethod[method],
        updated_by: user?.id ?? null,
      }, { onConflict: "customer_id,method" });

    if (error) {
      toast({ title: "Could not save payment details", description: error.message, variant: "destructive" });
    } else {
      setDetailsByMethod((current) => ({ ...current, [method]: details }));
      toast({ title: "Payment details saved", description: `${selectedConfig.label} instructions are now available to this client.` });
    }
    setSaving(null);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Client deposit instructions</CardTitle>
        <CardDescription>
          Configure the destination wallet, bank accounts, and secure card link shown only to this client.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading payment details…
          </div>
        ) : (
          <Tabs value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as DepositPaymentMethod)}>
            <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-1 lg:grid-cols-4">
              {METHODS.map(({ id, label, icon: Icon }) => (
                <TabsTrigger key={id} value={id} className="gap-2">
                  <Icon className="h-4 w-4" /> {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {METHODS.map((config) => (
              <TabsContent key={config.id} value={config.id} className="space-y-5">
                <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-medium">{config.label}</p>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${config.id}-active`}>Available to client</Label>
                    <Switch
                      id={`${config.id}-active`}
                      checked={activeByMethod[config.id]}
                      onCheckedChange={(checked) => setActiveByMethod((current) => ({ ...current, [config.id]: checked }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {config.fields.map((field) => (
                    <div key={field.key} className={`space-y-2 ${field.fullWidth ? "md:col-span-2" : ""}`}>
                      <Label htmlFor={`${config.id}-${field.key}`}>{field.label}</Label>
                      {field.multiline ? (
                        <Textarea
                          id={`${config.id}-${field.key}`}
                          value={detailsByMethod[config.id][field.key] || ""}
                          onChange={(event) => updateField(config.id, field.key, event.target.value)}
                          placeholder={field.placeholder}
                          rows={3}
                        />
                      ) : (
                        <Input
                          id={`${config.id}-${field.key}`}
                          type={field.key === "payment_url" ? "url" : "text"}
                          value={detailsByMethod[config.id][field.key] || ""}
                          onChange={(event) => updateField(config.id, field.key, event.target.value)}
                          placeholder={field.placeholder}
                          autoComplete="off"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => saveMethod(config.id)} disabled={saving !== null}>
                    {saving === config.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save {config.label.toLowerCase()}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
