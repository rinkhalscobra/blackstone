import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MFAVerificationDialog } from "@/components/auth/MFAVerificationDialog";
import Logo from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "signup">(() =>
    new URLSearchParams(window.location.search).get("mode") === "signup" ? "signup" : "login",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showMfaDialog, setShowMfaDialog] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const getRoleRedirect = async (userId: string): Promise<string> => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (data?.role === "admin") return "/admin";
      if (data?.role === "group_admin") return "/group-admin";
      if (data?.role === "supervisor") return "/supervisor";
      if (data?.role === "agent") return "/agent";
    } catch {
      // Accounts without a staff role are customers.
    }
    return "/dashboard";
  };

  useEffect(() => {
    if (user) getRoleRedirect(user.id).then((path) => navigate(path));
  }, [user, navigate]);

  const checkMfaRequired = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("mfa-check", { body: { email } });
      if (error) {
        console.error("MFA check error:", error);
        return false;
      }
      return data.mfaRequired === true;
    } catch (error) {
      console.error("MFA check failed:", error);
      return false;
    }
  };

  const performLogin = async (email: string, password: string) => {
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: t("auth.loginFailed"),
          description: error.message || t("auth.invalidCredentials"),
          variant: "destructive",
        });
      } else {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        navigate(currentUser ? await getRoleRedirect(currentUser.id) : "/dashboard");
      }
    } catch {
      toast({ title: t("auth.error"), description: t("auth.unexpectedError"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const email = loginEmail.trim();
      if (await checkMfaRequired(email)) {
        setPendingCredentials({ email, password: loginPassword });
        setShowMfaDialog(true);
        setIsLoading(false);
        return;
      }
      await performLogin(email, loginPassword);
    } catch {
      toast({ title: t("auth.error"), description: t("auth.unexpectedError"), variant: "destructive" });
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupPassword !== confirmPassword) {
      toast({
        title: t("auth.signupFailed"),
        description: t("auth.passwordsDoNotMatch"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const email = signupEmail.trim();
      const { error, session } = await signUp(
        email,
        signupPassword,
        firstName.trim(),
        lastName.trim(),
      );
      if (error) return;

      if (session?.user) {
        navigate(await getRoleRedirect(session.user.id));
      } else {
        setMode("login");
        setLoginEmail(email);
      }
    } catch {
      toast({ title: t("auth.error"), description: t("auth.unexpectedError"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerified = () => {
    setShowMfaDialog(false);
    if (pendingCredentials) {
      setIsLoading(true);
      performLogin(pendingCredentials.email, pendingCredentials.password);
      setPendingCredentials(null);
    }
  };

  const handleMfaCancelled = () => {
    setPendingCredentials(null);
    setShowMfaDialog(false);
  };

  const modeButtonClass = (selected: boolean) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("auth.backToHome")}
        </Link>

        <Card className="border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Logo size="lg" showText={false} linkTo={undefined} />
            </div>
            <CardTitle className="text-2xl">BrightFund Recovery</CardTitle>
            <CardDescription>{t("auth.accessAccount")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1" role="tablist" aria-label="Authentication mode">
              <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")} className={modeButtonClass(mode === "login")}>
                {t("auth.login")}
              </button>
              <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => setMode("signup")} className={modeButtonClass(mode === "signup")}>
                {t("auth.signUp")}
              </button>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t("auth.email")}</Label>
                  <Input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t("auth.password")}</Label>
                  <Input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t("auth.loggingIn") : t("auth.login")}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">{t("auth.firstName")}</Label>
                    <Input id="first-name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">{t("auth.lastName")}</Label>
                    <Input id="last-name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("auth.email")}</Label>
                  <Input id="signup-email" type="email" autoComplete="email" placeholder="you@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t("auth.password")}</Label>
                  <Input id="signup-password" type="password" autoComplete="new-password" placeholder="••••••••" minLength={6} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
                  <Input id="confirm-password" type="password" autoComplete="new-password" placeholder="••••••••" minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t("auth.creatingAccount") : t("auth.createAccount")}
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "login" ? t("auth.needAccount") : t("auth.alreadyHaveAccount")}{" "}
              <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                {mode === "login" ? t("auth.signUp") : t("auth.login")}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>

      <MFAVerificationDialog
        open={showMfaDialog}
        onOpenChange={setShowMfaDialog}
        email={pendingCredentials?.email || ""}
        onVerified={handleMfaVerified}
        onCancel={handleMfaCancelled}
      />
    </div>
  );
};

export default Auth;
