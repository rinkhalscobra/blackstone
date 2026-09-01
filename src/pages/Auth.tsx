import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Lock } from "lucide-react";
import Logo from "@/components/Logo";
import { MFAVerificationDialog } from "@/components/auth/MFAVerificationDialog";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showMfaDialog, setShowMfaDialog] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Helper to get role-based redirect path
  const getRoleRedirect = async (userId: string): Promise<string> => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data?.role === 'admin') return '/admin';
      if (data?.role === 'group_admin') return '/group-admin';
      if (data?.role === 'supervisor') return '/supervisor';
      if (data?.role === 'agent') return '/agent';
    } catch {}
    return '/dashboard';
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      getRoleRedirect(user.id).then(path => navigate(path));
    }
  }, [user, navigate]);

  const checkMfaRequired = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('mfa-check', {
        body: { email },
      });
      
      if (error) {
        console.error('MFA check error:', error);
        return false;
      }
      
      return data.mfaRequired === true;
    } catch (error) {
      console.error('MFA check failed:', error);
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First check if MFA is required for this user
      const mfaRequired = await checkMfaRequired(loginEmail);
      
      if (mfaRequired) {
        // Store credentials and show MFA dialog
        setPendingCredentials({ email: loginEmail, password: loginPassword });
        setShowMfaDialog(true);
        setIsLoading(false);
        return;
      }

      // No MFA required, proceed with normal login
      await performLogin(loginEmail, loginPassword);
    } catch (error: any) {
      toast({
        title: t('auth.error'),
        description: t('auth.unexpectedError'),
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const performLogin = async (email: string, password: string) => {
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: t('auth.loginFailed'),
          description: error.message || t('auth.invalidCredentials'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('auth.welcomeBack'),
          description: t('auth.loggedInSuccess'),
        });
        // Get the current user to determine role-based redirect
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const path = await getRoleRedirect(currentUser.id);
          navigate(path);
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      toast({
        title: t('auth.error'),
        description: t('auth.unexpectedError'),
        variant: "destructive",
      });
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('auth.backToHome')}
        </Link>

        <Card className="border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Logo size="lg" showText={false} linkTo={undefined} />
            </div>
            <CardTitle className="text-2xl">Blackstone Recovery</CardTitle>
            <CardDescription>
              {t('auth.accessAccount')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">{t('auth.email')}</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">{t('auth.password')}</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('auth.loggingIn') : t('auth.login')}
              </Button>
            </form>

            {/* Info message about account creation */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">
                    {t('auth.needAccount') || 'Need an account?'}
                  </p>
                  <p>
                    {t('auth.contactSpecialist') || 'Contact your case specialist to get your account credentials. Client accounts are created by our team for security purposes.'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MFA Verification Dialog */}
      <MFAVerificationDialog
        open={showMfaDialog}
        onOpenChange={setShowMfaDialog}
        email={pendingCredentials?.email || ''}
        onVerified={handleMfaVerified}
        onCancel={handleMfaCancelled}
      />
    </div>
  );
};

export default Auth;
