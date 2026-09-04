import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  ArrowDownUp,
  FileText,
  Bell,
  LogOut,
  Menu,
  X,
  MessageCircle,
  PieChart,
  Sparkles,
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
import SidebarMarketRates from '@/components/dashboard/SidebarMarketRates';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';

interface DashboardLayoutProps {
  children: ReactNode;
}

const LABELS: { code: string; color: string }[] = [
  { code: 'BTC', color: 'bg-amber-400' },
  { code: 'ETH', color: 'bg-neutral-300' },
  { code: 'USDT', color: 'bg-emerald-400' },
  { code: 'SOL', color: 'bg-violet-400' },
];

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut } = useAuth();
  const { profile } = useCustomerData();
  const { messages: unreadMessages, notifications: unreadNotifications } = useUnreadCounts();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: t('nav.overview'), icon: LayoutDashboard, count: undefined as number | undefined },
    { path: '/portfolio', label: t('nav.portfolio'), icon: PieChart, count: undefined },
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
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
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
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <WindowChrome title="BlackStone Recovery — Case Center" className="lg:overflow-clip">
          <div className="flex min-h-[calc(100vh-11rem)] items-stretch">
            {/* Sidebar */}
            <div className="hidden w-56 shrink-0 border-r border-white/5 bg-white/[0.015] lg:block xl:w-64">
              <aside className="themed-scrollbar sticky top-20 flex h-[calc(100dvh-12.25rem)] min-h-[36rem] flex-col gap-3 overflow-y-auto overscroll-contain p-3">
              <button
                onClick={() => navigate('/dashboard/case')}
                className="group inline-flex items-center gap-2 justify-center w-full rounded-full bg-white text-black text-[13px] font-medium py-2.5 px-4 transition-all hover:bg-white/90 active:scale-[0.98] shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_10px_30px_-10px_rgba(255,255,255,0.25)]"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('nav.newCase') || 'New recovery case'}</span>
              </button>

              <nav className="mt-1 space-y-0.5">
                {navItems.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-md transition-colors group',
                        active
                          ? 'bg-white/5 text-foreground'
                          : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground',
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-primary" />
                      )}
                      <item.icon className={cn('h-4 w-4', active && 'text-primary')} />
                      <span className="text-[13px] font-medium flex-1">{item.label}</span>
                      {item.count ? (
                        <span className="text-[11px] text-muted-foreground/80 tabular-nums">
                          {item.count}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </nav>

              {/* Labels */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="px-4 mb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/70">
                  LABELS
                </div>
                <div className="space-y-0.5">
                  {LABELS.map((l) => (
                    <div
                      key={l.code}
                      className="flex items-center gap-3 px-4 py-1.5 rounded-md text-[13px] text-muted-foreground"
                    >
                      <span className={cn('h-2 w-2 rounded-full', l.color)} />
                      <span>{l.code}</span>
                    </div>
                  ))}
                </div>
              </div>

                <SidebarMarketRates />
              </aside>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
              <div className="fixed inset-0 z-40 lg:hidden">
                <div
                  className="fixed inset-0 bg-background/80 backdrop-blur"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <aside className="themed-scrollbar fixed left-0 top-16 bottom-0 w-64 overflow-y-auto border-r border-border bg-card p-3">
                  <button
                    onClick={() => {
                      navigate('/dashboard/case');
                      setMobileMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-2 justify-center w-full rounded-full bg-white text-black text-[13px] font-medium py-2.5 px-4 mb-3"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{t('nav.newCase') || 'New recovery case'}</span>
                  </button>
                  <nav className="space-y-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 rounded-md text-sm',
                          location.pathname === item.path
                            ? 'bg-white/10 text-foreground'
                            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                  <SidebarMarketRates />
                </aside>
              </div>
            )}

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
