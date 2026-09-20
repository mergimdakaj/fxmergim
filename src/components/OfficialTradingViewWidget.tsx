import React, { memo, useMemo } from 'react';

interface OfficialTradingViewWidgetProps {
  symbol?: string; // e.g., "OANDA:XAUUSD", "FOREXCOM:XAUUSD", "TVC:GOLD"
  interval?: string; // e.g., "5", "15", "60", "240", "D"
  theme?: 'dark' | 'light';
  height?: number | string;
}

export const OfficialTradingViewWidget: React.FC<OfficialTradingViewWidgetProps> = memo(({
  symbol = 'OANDA:XAUUSD',
  interval = '5',
  theme = 'dark',
  height = 540,
}) => {
  const iframeSrc = useMemo(() => {
    const config = {
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      hide_side_toolbar: false,
      withdateranges: true,
      details: true,
      hotlist: false,
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
    };
    return `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#${encodeURIComponent(JSON.stringify(config))}`;
  }, [symbol, interval, theme]);

  return (
    <div
      className="tradingview-widget-container rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-[#131722] relative w-full"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <iframe
        id="tradingview-advanced-chart-iframe"
        title="Official TradingView Advanced Chart"
        src={iframeSrc}
        className="w-full h-full border-0 block"
        allow="clipboard-write; fullscreen"
        loading="lazy"
      />
    </div>
  );
});
OfficialTradingViewWidget.displayName = 'OfficialTradingViewWidget';

