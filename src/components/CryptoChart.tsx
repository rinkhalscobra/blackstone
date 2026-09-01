import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { getTimeSeries, formatPrice, TimeSeriesData } from "@/services/marketDataApi";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

interface CryptoChartProps {
  symbol?: string;
  title?: string;
}

const CryptoChart = ({ symbol = "BTC/USD", title = "Bitcoin" }: CryptoChartProps) => {
  const [data, setData] = useState<{ date: string; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState("1day");
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const { t } = useLanguage();

  const intervals = [
    { value: "1h", label: "1H" },
    { value: "4h", label: "4H" },
    { value: "1day", label: "1D" },
    { value: "1week", label: "1W" },
    { value: "1month", label: "1M" },
  ];

  useEffect(() => {
    fetchChartData();
    // Reduce refresh frequency to avoid API rate limits (120 seconds)
    const refreshInterval = window.setInterval(fetchChartData, 120000);
    return () => window.clearInterval(refreshInterval);
  }, [symbol, interval]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const outputsize = interval === "1h" || interval === "4h" ? "48" : "30";
      const timeSeries = await getTimeSeries(symbol, interval, outputsize);
      
      if (timeSeries.length > 0) {
        const chartData = timeSeries
          .map((item: TimeSeriesData) => ({
            date: item.datetime,
            price: parseFloat(item.close)
          }))
          .reverse();
        
        setData(chartData);
        
        const latest = chartData[chartData.length - 1]?.price || 0;
        const first = chartData[0]?.price || 0;
        setCurrentPrice(latest);
        setPriceChange(first > 0 ? ((latest - first) / first) * 100 : 0);
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isPositive = priceChange >= 0;

  return (
    <Card className="bg-card border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{formatPrice(currentPrice)}</span>
            <span className={`text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        </div>
        <Select value={interval} onValueChange={setInterval}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {intervals.map((int) => (
              <SelectItem key={int.value} value={int.value}>
                {int.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-64">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="5%" 
                    stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
                    stopOpacity={0.3}
                  />
                  <stop 
                    offset="95%" 
                    stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return interval.includes('h') ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis 
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(value) => formatPrice(value)}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number) => [formatPrice(value), t('crypto.price')]}
                labelFormatter={(label) => new Date(label).toLocaleString()}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                strokeWidth={2}
                fill={`url(#gradient-${symbol})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

export default CryptoChart;
