(
    <div className="[font-synthesis:none] flex flex-col w-360 pb-8 gap-3 antialiased px-16">
      <div className="flex gap-4">
        <div className="flex flex-col grow shrink basis-[0%] rounded-[10px] gap-3.5 bg-[#F59E0B0A] border border-solid border-[#F59E0B26] p-5">
          <div className="flex items-center gap-2">
            <div className="rounded-[50%] bg-[#F59E0B] shrink-0 size-1.5" />
            <div className="text-[#F59E0B] font-['DM_Sans',system-ui,sans-serif] font-semibold text-xs/4">
              Mar 18 — implement avg +42%
            </div>
            <div className="text-[#FFFFFF40] font-['DM_Sans',system-ui,sans-serif] text-[10px]/3">
              inflection detected
            </div>
          </div>
          <div className="flex flex-col pl-3.5 gap-2">
            <div className="flex gap-2">
              <div className="w-17.5 shrink-0 text-[#FFFFFF4D] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
                Ticket mix
              </div>
              <div className="text-[#FFFFFF99] font-['DM_Sans',system-ui,sans-serif] text-xs/4">
                3/5 tickets COMPLEX (vs baseline 30%). Specs: SYMPH-145 (webhook refactor, 5 tasks), HSUI-34 (state machine, 6 scenarios)
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-17.5 shrink-0 text-[#FFFFFF4D] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
                Config
              </div>
              <div className="text-[#FFFFFF99] font-['DM_Sans',system-ui,sans-serif] text-xs/4">
                No skill or WORKFLOW changes in +/-48h window
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-17.5 shrink-0 text-[#FFFFFF4D] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
                Attribution
              </div>
              <div className="text-[#FFFFFF80] font-['DM_Sans',system-ui,sans-serif] italic text-xs/4">
                Correlates with higher-complexity ticket mix
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col grow shrink basis-[0%] rounded-[10px] gap-3.5 bg-[#A78BFA0A] border border-solid border-[#A78BFA26] p-5">
          <div className="flex items-center gap-2">
            <div className="rounded-[50%] bg-[#A78BFA] shrink-0 size-1.5" />
            <div className="text-[#A78BFA] font-['DM_Sans',system-ui,sans-serif] font-semibold text-xs/4">
              Mar 20 — review avg -28%
            </div>
            <div className="text-[#FFFFFF40] font-['DM_Sans',system-ui,sans-serif] text-[10px]/3">
              inflection detected
            </div>
          </div>
          <div className="flex flex-col pl-3.5 gap-2">
            <div className="flex gap-2">
              <div className="w-17.5 shrink-0 text-[#FFFFFF4D] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
                Ticket mix
              </div>
              <div className="text-[#FFFFFF99] font-['DM_Sans',system-ui,sans-serif] text-xs/4">
                Similar to baseline (2 STANDARD, 1 TRIVIAL)
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-17.5 shrink-0 text-[#FFFFFF4D] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
                Config
              </div>
              <div className="text-[#FFFFFF99] font-['DM_Sans',system-ui,sans-serif] text-xs/4">
                adversarial-review/SKILL.md hash changed Mar 19 — coincides with review criteria update
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-17.5 shrink-0 text-[#FFFFFF4D] font-['JetBrains_Mono',system-ui,sans-serif] text-[10px]/3">
                Attribution
              </div>
              <div className="text-[#FFFFFF80] font-['DM_Sans',system-ui,sans-serif] italic text-xs/4">
                Coincides with skill modification; ticket mix unchanged
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
