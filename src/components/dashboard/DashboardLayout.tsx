import { ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  ArrowDownUp,
  FileText,
  Bell,
  LogOut,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Archive,
  Trash2,
  MoreHorizontal,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerData } from '@/hooks/useCustomerData';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import CryptoTicker from '@/components/CryptoTicker';
import Logo from '@/components/Logo';
import { Backdrop } from '@/components/design/Backdrop';
import { WindowChrome } from '@/components/dashboard/WindowChrome';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut } = useAuth();
  const { profile } = useCustomerData();
  const { messages: unreadMessages, notifications: unreadNotifications } = useUnreadCounts();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', label: t('nav.overview'), icon: LayoutDashboard, count: undefined as number | undefined },
    { path: '/dashboard/wallet', label: t('nav.wallet'), icon: Wallet, count: undefined },
    { path: '/dashboard/transactions', label: t('nav.transactions'), icon: ArrowDownUp, count: undefined },
    { path: '/dashboard/case', label: t('nav.myCase'), icon: FileText, count: undefined },
    { path: '/dashboard/messages', label: t('nav.messages'), icon: MessageCircle, count: unreadMessages || undefined },
  ];

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  if (!user) return null;

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user.email;

  return (
    <div className="min-h-screen bg-transparent relative">
      <Backdrop video />

      {/* Ticker */}
      <div className="border-b border-white/5 bg-background/40 backdrop-blur-xl">
        <CryptoTicker />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-background/50 backdrop-blur-xl">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" linkTo="/dashboard" />
            </div>

            <div className="flex items-center gap-4">
              <Link to="/dashboard/notifications" className="relative">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-xs flex items-center justify-center text-destructive-foreground">
                      {unreadNotifications}
                    </span>
                  )}
                </Button>
              </Link>
              <div className="hidden md:block text-sm text-muted-foreground">{displayName}</div>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Windowed shell */}
      <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
        <WindowChrome title="BrightFund Recovery — Case Center" className="lg:overflow-clip">
          <div className="flex min-h-[calc(100vh-11rem)] flex-col">
            <nav
              aria-label="Dashboard navigation"
              className="themed-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/5 bg-white/[0.015] px-3 py-2"
            >
              {navItems.map((item) => {
                const active = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex shrink-0 items-center gap-2.5 rounded-lg px-4 py-2.5 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                      active
                        ? 'bg-white text-black shadow-sm'
                        : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    {item.count ? (
                      <span
                        className={cn(
                          'min-w-4 rounded-full px-1 text-center text-[10px] tabular-nums',
                          active ? 'bg-black/10 text-black' : 'bg-white/10 text-foreground',
                        )}
                      >
                        {item.count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            {/* Main column */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Toolbar */}
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/5 bg-white/[0.01] px-4">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <button
                    onClick={() => window.history.back()}
                    className="p-1.5 rounded-md hover:bg-white/5 hover:text-foreground transition-colors"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => window.history.forward()}
                    className="p-1.5 rounded-md hover:bg-white/5 hover:text-foreground transition-colors"
                    aria-label="Forward"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <span className="mx-1 h-4 w-px bg-white/10" />
                  <button
                    className="p-1.5 rounded-md hover:bg-white/5 hover:text-foreground transition-colors"
                    aria-label="Archive"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1.5 rounded-md hover:bg-white/5 hover:text-foreground transition-colors"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Eye className="h-4 w-4 opacity-0" />
                  <button
                    className="p-1.5 rounded-md hover:bg-white/5 hover:text-foreground transition-colors"
                    aria-label="More"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-5 xl:p-6">
                {children}
              </main>
            </div>
          </div>
        </WindowChrome>
      </div>
    </div>
  );
};
