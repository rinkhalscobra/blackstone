import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Cryptocurrencies from "./pages/Cryptocurrencies";
import Categories from "./pages/Categories";
import Exchanges from "./pages/Exchanges";
import News from "./pages/News";
import About from "./pages/About";
import Legal from "./pages/Legal";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import PortfolioNew from "./pages/PortfolioNew";
import WatchlistNew from "./pages/WatchlistNew";
import Disclaimer from "./pages/Disclaimer";
import Privacy from "./pages/Privacy";
import Admin from "./pages/Admin";
import GroupAdmin from "./pages/GroupAdmin";
import Supervisor from "./pages/Supervisor";
import Agent from "./pages/Agent";
import CustomerDetail from "./pages/CustomerDetail";
import NotFound from "./pages/NotFound";
import Showcase from "./pages/Showcase";

// Dashboard pages
import DashboardIndex from "./pages/dashboard/index";
import WalletPage from "./pages/dashboard/wallet";
import TransactionsPage from "./pages/dashboard/transactions";
import CasePage from "./pages/dashboard/case";
import DepositPage from "./pages/dashboard/deposit";
import WithdrawPage from "./pages/dashboard/withdraw";
import NotificationsPage from "./pages/dashboard/notifications";
import MessagesPage from "./pages/dashboard/messages";

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="/portfolio" element={<PortfolioNew />} />
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
