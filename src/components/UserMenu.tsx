import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, Eye, EyeOff, User, Calendar, CreditCard, Sun, Moon, LogOut, Shield, Ticket, UserCog, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { z } from "zod";

interface UserMenuProps {
  onClose: () => void;
}

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const UserMenu = ({ onClose }: UserMenuProps) => {
  const navigate = useNavigate();
  const { user, signIn, signUp, signOut } = useAuth();
  const { isAdmin, userRole } = useAdmin();
  const isSupervisor = userRole === 'supervisor';
  const isAgent = userRole === 'agent';
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPromocode, setSignupPromocode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const { error } = await signIn(loginEmail, loginPassword);
    if (!error) {
      setShowLoginModal(false);
      setLoginEmail("");
      setLoginPassword("");
      onClose();
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse({
      firstName: signupFirstName,
      lastName: signupLastName,
      email: signupEmail,
      password: signupPassword,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const { error } = await signUp(signupEmail, signupPassword, signupFirstName, signupLastName, signupPromocode);
    if (!error) {
      setShowSignupModal(false);
      setSignupFirstName("");
      setSignupLastName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupPromocode("");
      onClose();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <>
      <div className="w-64 bg-card border border-border rounded-lg shadow-glow overflow-hidden z-50">
        <div className="p-4 space-y-4">
          {user ? (
            <>
              <div className="pb-3 border-b border-border">
                <p className="text-xs text-muted-foreground mb-1">Signed in as</p>
                <p className="font-medium text-sm truncate">{user.email}</p>
              </div>
              {isAdmin && (
                <Button 
                  variant="outline" 
                  className="w-full border-primary text-primary hover:bg-primary/10"
                  onClick={() => {
                    navigate('/admin');
                    onClose();
                  }}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Panel
                </Button>
              )}
              {isSupervisor && (
                <Button 
                  variant="outline" 
                  className="w-full border-primary text-primary hover:bg-primary/10"
                  onClick={() => {
                    navigate('/supervisor');
                    onClose();
                  }}
                >
                  <UserCog className="h-4 w-4 mr-2" />
                  Supervisor Panel
                </Button>
              )}
              {isAgent && (
                <Button 
                  variant="outline" 
                  className="w-full border-primary text-primary hover:bg-primary/10"
                  onClick={() => {
                    navigate('/agent');
                    onClose();
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Agent Dashboard
                </Button>
              )}
              <Button
                variant="outline" 
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setShowLoginModal(true)}
              >
                LOGIN
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-primary text-primary hover:bg-primary/10"
                onClick={() => setShowSignupModal(true)}
              >
                SIGN UP
              </Button>
            </div>
          )}

          <div className="space-y-3 pt-3 border-t border-border">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Language</div>
              <Select defaultValue="en">
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🇬🇧</span>
                      <span>EN</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-[100]">
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🇬🇧</span>
                      <span>English</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="es">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🇪🇸</span>
                      <span>Español</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="fr">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🇫🇷</span>
                      <span>Français</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Currency</div>
              <Select defaultValue="eur">
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">€</span>
                      <span>EUR</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-[100]">
                  <SelectItem value="eur">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">€</span>
                      <span>EUR</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="usd">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">$</span>
                      <span>USD</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="gbp">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">£</span>
                      <span>GBP</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Theme</div>
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-2 bg-secondary border border-border rounded-md hover:bg-secondary/80"
              >
                <span className="text-sm">{theme === "dark" ? "Dark" : "Light"}</span>
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 text-primary" />
                ) : (
                  <Sun className="h-5 w-5 text-primary" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">LOGIN TO YOUR ACCOUNT</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Input 
                  type="email"
                  placeholder="Email address"
                  className="bg-secondary border-border"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="bg-secondary border-border pr-10"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                LOGIN
              </Button>
            </div>

            <div className="text-center pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">DON'T HAVE AN ACCOUNT?</p>
              <Button 
                type="button"
                variant="link" 
                className="text-primary"
                onClick={() => {
                  setShowLoginModal(false);
                  setShowSignupModal(true);
                }}
              >
                SIGN UP
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Signup Modal */}
      <Dialog open={showSignupModal} onOpenChange={setShowSignupModal}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">CREATE AN ACCOUNT</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSignup} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  type="text"
                  placeholder="First Name *"
                  className="bg-secondary border-border"
                  value={signupFirstName}
                  onChange={(e) => setSignupFirstName(e.target.value)}
                  required
                />
                {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <Input 
                  type="text"
                  placeholder="Last Name *"
                  className="bg-secondary border-border"
                  value={signupLastName}
                  onChange={(e) => setSignupLastName(e.target.value)}
                  required
                />
                {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <Input 
                type="email"
                placeholder="Email *"
                className="bg-secondary border-border"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"}
                placeholder="Password *"
                className="bg-secondary border-border pr-10"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div className="relative">
              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="text"
                placeholder="Promocode (optional)"
                className="bg-secondary border-border pl-10"
                value={signupPromocode}
                onChange={(e) => setSignupPromocode(e.target.value.toUpperCase())}
              />
            </div>

            <div className="flex items-start gap-2 pt-2">
              <Checkbox id="terms" required className="mt-1" />
              <label htmlFor="terms" className="text-xs text-muted-foreground">
                I am over 18 years of age and I accept these Legal Terms & Conditions and Privacy Policy.
              </label>
            </div>

            <Button type="submit" className="w-full bg-success hover:bg-success/90 text-white font-semibold">
              SIGN UP!
            </Button>

            <button 
              type="button"
              className="w-full text-sm text-primary hover:underline"
              onClick={() => {
                setShowSignupModal(false);
                setShowLoginModal(true);
              }}
            >
              I ALREADY HAVE AN ACCOUNT
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserMenu;