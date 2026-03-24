(
    <div className="[font-synthesis:none] flex flex-col w-360 py-8 px-16 gap-4 antialiased text-xs/4">
      <div className="flex items-baseline gap-3">
        <div className="tracking-widest uppercase text-[#FFFFFF59] font-['DM_Sans',system-ui,sans-serif] font-semibold text-[11px]/3.5">
          Per-Ticket Cost Trend
        </div>
        <div className="text-[#FFFFFF33] font-['DM_Sans',system-ui,sans-serif] text-[11px]/3.5">
          30-day rolling median total tokens per ticket
        </div>
      </div>
      <div className="flex flex-col w-328 rounded-xl py-5 px-6 gap-2 bg-[#FFFFFF05] border border-solid border-[#FFFFFF0F]">
        <div className="flex justify-between">
          <div className="text-[#FFFFFF33] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
            60K
          </div>
          <div className="text-[#FFFFFF33] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
            tokens/ticket
          </div>
        </div>
        <svg width="1260" height="140" viewBox="0 0 1260 140">
          <line x1="0" y1="35" x2="1260" y2="35" stroke="#FFFFFF0A" />
          <line x1="0" y1="70" x2="1260" y2="70" stroke="#FFFFFF0A" />
          <line x1="0" y1="105" x2="1260" y2="105" stroke="#FFFFFF0A" />
          <polygon points="0,52 42,54 84,50 126,48 168,52 210,56 252,58 294,55 336,50 378,48 420,52 462,58 504,62 546,65 588,70 630,75 672,78 714,82 756,80 798,76 840,72 882,68 924,65 966,70 1008,75 1050,78 1092,82 1134,85 1176,88 1218,90 1260,92 1260,140 0,140" fill="#60A5FA0F" />
          <polyline points="0,52 42,54 84,50 126,48 168,52 210,56 252,58 294,55 336,50 378,48 420,52 462,58 504,62 546,65 588,70 630,75 672,78 714,82 756,80 798,76 840,72 882,68 924,65 966,70 1008,75 1050,78 1092,82 1134,85 1176,88 1218,90 1260,92" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
          <circle cx="1260" cy="92" r="4" fill="#60A5FA" />
        </svg>
        <div className="flex justify-between">
          <div className="text-[#FFFFFF33] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
            Feb 23
          </div>
          <div className="text-[#FFFFFF33] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
            Mar 9
          </div>
          <div className="text-[#FFFFFF33] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
            Mar 24
          </div>
        </div>
        <div className="flex pt-1 gap-6">
          <div className="text-[#60A5FA] font-['JetBrains_Mono',system-ui,sans-serif] text-[11px]/3.5">
            Median: 38.9K/ticket
          </div>
          <div className="text-[#FFFFFF40] font-['JetBrains_Mono',system-ui,sans-serif] text-[11px]/3.5">
            Mean: 42.8K
          </div>
          <div className="text-[#34D399] font-['JetBrains_Mono',system-ui,sans-serif] text-[11px]/3.5">
            -12.1% WoW
          </div>
        </div>
      </div>
    </div>
  )
