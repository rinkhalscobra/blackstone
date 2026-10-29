import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Cryptocurrencies = lazy(() => import("./pages/Cryptocurrencies"));
const Categories = lazy(() => import("./pages/Categories"));
const Exchanges = lazy(() => import("./pages/Exchanges"));
const News = lazy(() => import("./pages/News"));
const About = lazy(() => import("./pages/About"));
const Legal = lazy(() => import("./pages/Legal"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const RecoveryFundsPage = lazy(() => import("./pages/dashboard/funds"));
const WatchlistNew = lazy(() => import("./pages/WatchlistNew"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Admin = lazy(() => import("./pages/Admin"));
const GroupAdmin = lazy(() => import("./pages/GroupAdmin"));
const Supervisor = lazy(() => import("./pages/Supervisor"));
const Agent = lazy(() => import("./pages/Agent"));
const CustomerDetail = lazy(() => import("./pages/CustomerDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Showcase = lazy(() => import("./pages/Showcase"));

// Dashboard pages
const DashboardIndex = lazy(() => import("./pages/dashboard/index"));
const WalletPage = lazy(() => import("./pages/dashboard/wallet"));
const TransactionsPage = lazy(() => import("./pages/dashboard/transactions"));
const CasePage = lazy(() => import("./pages/dashboard/case"));
const DepositPage = lazy(() => import("./pages/dashboard/deposit"));
const WithdrawPage = lazy(() => import("./pages/dashboard/withdraw"));
const NotificationsPage = lazy(() => import("./pages/dashboard/notifications"));
const MessagesPage = lazy(() => import("./pages/dashboard/messages"));

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/cryptocurrencies" element={<Cryptocurrencies />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/exchanges" element={<Exchanges />} />
            <Route path="/news" element={<News />} />
            <Route path="/about" element={<About />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/dashboard/funds" element={<RecoveryFundsPage />} />
            <Route path="/watchlist" element={<WatchlistNew />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/group-admin" element={<GroupAdmin />} />
            <Route path="/supervisor" element={<Supervisor />} />
            <Route path="/agent" element={<Agent />} />
            <Route path="/customer/:customerId" element={<CustomerDetail />} />
            
            {/* Dashboard Routes */}
            <Route path="/dashboard" element={<DashboardIndex />} />
            <Route path="/dashboard/wallet" element={<WalletPage />} />
            <Route path="/dashboard/transactions" element={<TransactionsPage />} />
            <Route path="/dashboard/case" element={<CasePage />} />
            <Route path="/dashboard/deposit" element={<DepositPage />} />
            <Route path="/dashboard/withdraw" element={<WithdrawPage />} />
            <Route path="/dashboard/notifications" element={<NotificationsPage />} />
            <Route path="/dashboard/messages" element={<MessagesPage />} />
            
            <Route path="/showcase" element={<Showcase />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
