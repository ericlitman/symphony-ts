(
    <div className="[font-synthesis:none] flex flex-col w-360 pt-8 gap-4 antialiased text-xs/4 px-16">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <div className="tracking-widest uppercase text-[#FFFFFF59] font-['DM_Sans',system-ui,sans-serif] font-semibold text-[11px]/3.5">
            Per-Stage Utilization Trend
          </div>
          <div className="text-[#FFFFFF33] font-['DM_Sans',system-ui,sans-serif] text-[11px]/3.5">
            30-day avg tokens per stage execution
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.75 rounded-xs bg-[#60A5FA] shrink-0" />
            <div className="text-[#FFFFFF66] font-['DM_Sans',system-ui,sans-serif] text-[10px]/3">
              Investigate
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.75 rounded-xs bg-[#F59E0B] shrink-0" />
            <div className="text-[#FFFFFF66] font-['DM_Sans',system-ui,sans-serif] text-[10px]/3">
              Implement
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.75 rounded-xs bg-[#A78BFA] shrink-0" />
            <div className="text-[#FFFFFF66] font-['DM_Sans',system-ui,sans-serif] text-[10px]/3">
              Review
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.75 rounded-xs bg-[#34D399] shrink-0" />
            <div className="text-[#FFFFFF66] font-['DM_Sans',system-ui,sans-serif] text-[10px]/3">
              Merge
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col w-328 rounded-xl py-5 px-6 gap-2 bg-[#FFFFFF05] border border-solid border-[#FFFFFF0F]">
        <div className="flex justify-between">
          <div className="text-[#FFFFFF33] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
            80K
          </div>
          <div className="text-[#FFFFFF33] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
            tokens/execution
          </div>
        </div>
        <svg width="1260" height="220" viewBox="0 0 1260 220">
          <line x1="0" y1="55" x2="1260" y2="55" stroke="#FFFFFF0A" />
          <line x1="0" y1="110" x2="1260" y2="110" stroke="#FFFFFF0A" />
          <line x1="0" y1="165" x2="1260" y2="165" stroke="#FFFFFF0A" />
          <line x1="756" y1="0" x2="756" y2="220" stroke="#F59E0B4D" strokeDasharray="4,4" />
          <rect x="720" y="2" width="72" height="16" rx="3" fill="#F59E0B26" />
          <text x="756" y="13" textAnchor="middle" fill="#F59E0B" fontFamily="JetBrains Mono" fontSize="9">
            SKILL.md
          </text>
          <polyline points="0,88 42,90 84,85 126,82 168,80 210,78 252,75 294,72 336,68 378,64 420,58 462,52 504,45 546,40 588,35 630,32 672,38 714,42 756,48 798,52 840,55 882,52 924,50 966,48 1008,45 1050,42 1092,40 1134,38 1176,35 1218,33 1260,30" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <polyline points="0,148 42,150 84,146 126,148 168,145 210,142 252,144 294,140 336,138 378,136 420,134 462,132 504,130 546,128 588,126 630,124 672,126 714,128 756,130 798,128 840,126 882,124 924,122 966,120 1008,118 1050,116 1092,114 1134,112 1176,110 1218,108 1260,106" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
          <polyline points="0,120 42,122 84,118 126,120 168,116 210,118 252,114 294,112 336,110 378,108 420,106 462,104 504,102 546,100 588,98 630,96 672,100 714,105 756,110 798,125 840,135 882,140 924,142 966,144 1008,146 1050,148 1092,150 1134,152 1176,154 1218,156 1260,158" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
          <polyline points="0,190 42,192 84,188 126,190 168,188 210,186 252,188 294,184 336,182 378,180 420,178 462,176 504,174 546,172 588,170 630,168 672,170 714,172 756,174 798,172 840,170 882,168 924,166 966,164 1008,162 1050,160 1092,158 1134,156 1176,154 1218,152 1260,150" fill="none" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="588" cy="35" r="4" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
          <text x="588" y="28" textAnchor="middle" fill="#F59E0B99" fontFamily="JetBrains Mono" fontSize="8">
            INFLECTION
          </text>
        </svg>
        <div className="flex justify-between">
          <div className="text-[#FFFFFF33] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
            Feb 23
          </div>
          <div className="text-[#FFFFFF33] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
            Mar 2
          </div>
          <div className="text-[#FFFFFF33] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
            Mar 9
          </div>
          <div className="text-[#FFFFFF33] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
            Mar 16
          </div>
          <div className="text-[#FFFFFF33] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
            Mar 24
          </div>
        </div>
      </div>
    </div>
  )
