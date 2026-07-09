import React, { useState, useEffect, useRef } from "react";
import {
  Radio, LayoutGrid, SlidersHorizontal, Activity as ActivityIcon,
  Search, Download, Check, X, ChevronRight, ArrowLeft, Wifi,
  Server, HardDrive, Bell, AlertCircle, CalendarClock, Zap,
  Plus, RefreshCw, Film, Tv, FolderOpen, Languages, Gauge, ArrowUp, Disc3,
  Sparkles, Mic, Send, Volume2, Settings, ChevronDown, Database,
  Copy, AlertTriangle, FolderInput, LogOut, ShieldCheck,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  MediaDeck — broadcast-ops control console for a self-hosted        */
/*  Sonarr + Download Station media library. Phone-first prototype.    */
/* ------------------------------------------------------------------ */

const css = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
.md-root{
  --bg:#0B0E13;--surface:#141922;--surface2:#1B2331;--surface3:#232D3E;
  --line:#28303F;--line-soft:#1E2530;--text:#EAEFF6;--muted:#7B879B;
  --signal:#FFB443;--signal-dim:rgba(255,180,67,.16);
  --live:#37D9C4;--live-dim:rgba(55,217,196,.14);
  --alert:#FF5D6C;--alert-dim:rgba(255,93,108,.14);
  --violet:#8B7CF0;
  --upg:#4FA8FF;--upg-dim:rgba(79,168,255,.15);
  --rel:#EC6AC8;--rel-dim:rgba(236,106,200,.15);
  font-family:'Inter',-apple-system,system-ui,sans-serif;
  color:var(--text);
  background:
    radial-gradient(120% 60% at 50% -10%, #14202e 0%, rgba(20,32,46,0) 55%),
    var(--bg);
  min-height:100vh;display:flex;justify-content:center;align-items:stretch;
}
.md-phone{
  width:100%;max-width:428px;min-height:100vh;position:relative;
  display:flex;flex-direction:column;background:var(--bg);
  overflow:hidden;
}
@media(min-width:520px){
  .md-root{padding:26px 0;align-items:center;}
  .md-phone{min-height:auto;height:900px;max-height:92vh;border-radius:40px;
    border:1px solid var(--line);box-shadow:0 40px 120px rgba(0,0,0,.6),0 0 0 10px #05070a;}
}
.md-mono{font-family:'JetBrains Mono','SF Mono',ui-monospace,monospace;}
.md-disp{font-family:'Archivo','Inter',sans-serif;}

/* ---------- top status strip ---------- */
.md-top{position:sticky;top:0;z-index:20;padding:14px 18px 12px;
  background:linear-gradient(180deg, rgba(11,14,19,.96) 60%, rgba(11,14,19,0));
  backdrop-filter:blur(8px);}
.md-top-row{display:flex;align-items:center;justify-content:space-between;}
.md-brand{display:flex;align-items:center;gap:9px;}
.md-brand-dot{width:9px;height:9px;border-radius:50%;background:var(--signal);
  box-shadow:0 0 0 4px var(--signal-dim), 0 0 14px 2px rgba(255,180,67,.5);}
.md-brand-name{font-weight:800;letter-spacing:.14em;font-size:12.5px;}
.md-brand-name b{color:var(--signal);}
.md-chips{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;}
.md-chip{display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;
  padding:5px 9px;border-radius:8px;background:var(--surface);border:1px solid var(--line-soft);
  color:var(--muted);}
.md-chip .dot{width:6px;height:6px;border-radius:50%;}
.md-chip.ok .dot{background:var(--live);box-shadow:0 0 8px var(--live);}
.md-chip.path{color:var(--text);border-color:#2f3b4d;}
.md-chip.path svg{color:var(--live);}

/* ---------- scroll body ---------- */
.md-body{flex:1;overflow-y:auto;padding:2px 0 96px;scrollbar-width:none;}
.md-body::-webkit-scrollbar{display:none;}
.md-body.chat{padding-bottom:152px;}
.md-sec{padding:8px 18px 4px;}
.md-sec-head{display:flex;align-items:baseline;justify-content:space-between;margin:14px 0 12px;}
.md-sec-title{font-size:18px;font-weight:800;letter-spacing:-.02em;}
.md-sec-sub{font-size:11px;color:var(--muted);font-weight:600;}
.md-count{font-size:11px;font-weight:700;color:var(--signal);
  font-family:'JetBrains Mono',monospace;}

/* ---------- collection overview ---------- */
.md-ov{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:11px;}
.md-ovc{padding:15px 15px 13px;border-radius:16px;background:var(--surface);
  border:1px solid var(--line-soft);cursor:pointer;transition:.18s;position:relative;overflow:hidden;}
.md-ovc:active{transform:scale(.98);}
.md-ovc-ic{display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;
  letter-spacing:.08em;text-transform:uppercase;color:var(--muted);}
.md-ovc-num{font-size:32px;font-weight:800;letter-spacing:-.04em;margin:7px 0 1px;
  font-family:'Archivo','Inter',sans-serif;line-height:1;}
.md-ovc-foot{display:flex;align-items:center;justify-content:space-between;margin-top:9px;
  font-size:10.5px;color:var(--muted);font-weight:600;}
.md-ovc-chev{transition:transform .22s;}
.md-ovc.on .md-ovc-chev{transform:rotate(90deg);}
.md-bd{background:var(--surface);border:1px solid var(--line-soft);border-radius:16px;
  padding:15px 16px 8px;margin-bottom:12px;animation:bd .28s ease;}
@keyframes bd{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}
.md-bd-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;}
.md-bd-head b{font-size:13px;font-weight:700;}
.md-bd-head span{font-size:10.5px;color:var(--muted);font-family:'JetBrains Mono',monospace;}
.md-bd-row{display:flex;align-items:center;gap:11px;margin-bottom:11px;}
.md-bd-name{font-size:12px;font-weight:600;width:62px;flex-shrink:0;}
.md-bd-track{flex:1;height:7px;border-radius:4px;background:var(--surface3);overflow:hidden;}
.md-bd-fill{height:100%;border-radius:4px;animation:grow .5s ease;}
@keyframes grow{from{width:0;}}
.md-bd-n{font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;
  width:34px;text-align:right;flex-shrink:0;}

/* ---------- thai subtitles ---------- */
.md-subcov{display:flex;align-items:center;gap:12px;padding:13px 15px;border-radius:14px;
  background:var(--surface);border:1px solid var(--line-soft);margin-bottom:12px;}
.md-subcov-ic{width:36px;height:36px;border-radius:10px;background:rgba(139,124,240,.15);
  color:var(--violet);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.md-subcov-mid{flex:1;min-width:0;}
.md-subcov-top{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;}
.md-subcov-top b{font-size:13px;font-weight:700;}
.md-subcov-top span{font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;}
.md-subcov-bar{height:6px;border-radius:4px;background:var(--surface3);overflow:hidden;}
.md-subcov-bar i{display:block;height:100%;background:var(--violet);border-radius:4px;}
.md-subflag{position:absolute;bottom:7px;right:7px;z-index:2;font-family:'JetBrains Mono',monospace;
  font-size:8.5px;font-weight:800;letter-spacing:.03em;padding:2px 5px;border-radius:5px;
  background:rgba(255,93,108,.92);color:#fff;}
.md-spin{animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.md-backfill.subs{background:var(--violet);color:#fff;}
.md-backfill.subs:disabled{opacity:.6;cursor:default;}

/* ---------- category control panel ---------- */
.md-catctl{background:var(--surface);border:1px solid var(--line-soft);border-radius:16px;
  margin-bottom:16px;overflow:hidden;animation:bd .25s ease;}
.md-catctl-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;
  background:var(--surface2);}
.md-catctl-head b{font-size:14px;font-weight:800;}
.md-catctl-head span{font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace;}
.md-catrow{display:flex;align-items:center;justify-content:space-between;padding:12px 15px;
  border-top:1px solid var(--line-soft);}
.md-catrow-l{display:flex;align-items:center;gap:11px;min-width:0;}
.md-catrow-ic{width:33px;height:33px;border-radius:9px;background:var(--surface2);flex-shrink:0;
  display:flex;align-items:center;justify-content:center;color:var(--muted);transition:.2s;}
.md-catrow-tx b{font-size:13px;font-weight:700;display:block;}
.md-catrow-tx span{font-size:10.5px;color:var(--muted);}

/* quality upgrade update button */
.md-grab.upg{background:var(--upg);color:#04121f;}
.md-grab.upg-done{background:transparent;color:var(--live);padding-right:4px;}
.md-grab.rel{background:var(--rel);color:#20060f;}

/* ---------- signal cards ---------- */
.md-sig{display:flex;gap:13px;padding:13px;border-radius:16px;margin-bottom:11px;
  background:var(--surface);border:1px solid var(--line-soft);position:relative;
  transition:transform .18s ease, border-color .2s;}
.md-sig:active{transform:scale(.985);}
.md-sig.live{border-color:rgba(255,180,67,.4);
  background:linear-gradient(120deg, rgba(255,180,67,.07), var(--surface) 55%);}
.md-poster{width:58px;height:82px;border-radius:10px;flex-shrink:0;position:relative;
  display:flex;align-items:flex-end;padding:7px;overflow:hidden;
  font-weight:800;font-size:15px;color:rgba(255,255,255,.92);letter-spacing:-.03em;}
.md-poster .glass{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.45));}
.md-poster span{position:relative;z-index:1;line-height:.95;}
.md-sig-mid{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;}
.md-sig-net{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);}
.md-sig-title{font-size:15.5px;font-weight:700;letter-spacing:-.01em;margin:2px 0 5px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.md-sig-meta{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--muted);
  font-family:'JetBrains Mono',monospace;}
.md-ep{color:var(--signal);font-weight:700;}
.md-sig-right{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;}
.md-tally{width:11px;height:11px;border-radius:50%;background:var(--signal);
  box-shadow:0 0 0 4px var(--signal-dim);animation:tally 1.8s ease-in-out infinite;}
@keyframes tally{0%,100%{box-shadow:0 0 0 3px var(--signal-dim),0 0 6px 1px rgba(255,180,67,.4);}
  50%{box-shadow:0 0 0 6px rgba(255,180,67,.05),0 0 16px 3px rgba(255,180,67,.7);}}
.md-grab{border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:12px;
  padding:8px 13px;border-radius:10px;background:var(--signal);color:#1a1204;
  display:flex;align-items:center;gap:6px;transition:filter .15s,transform .1s;}
.md-grab:active{transform:scale(.94);}
.md-grab.auto{background:var(--live-dim);color:var(--live);
  border:1px solid rgba(55,217,196,.3);}
.md-grab.done{background:transparent;color:var(--live);padding-right:4px;}
.md-prog{height:4px;border-radius:3px;background:var(--surface3);overflow:hidden;margin-top:8px;width:78px;}
.md-prog i{display:block;height:100%;background:var(--signal);border-radius:3px;transition:width .3s linear;}

/* ---------- library segmented toggle ---------- */
.md-seg{display:flex;gap:3px;padding:3px;border-radius:11px;background:var(--surface2);
  border:1px solid var(--line-soft);}
.md-seg button{border:none;font-family:inherit;font-weight:700;font-size:12px;padding:7px 12px;
  border-radius:8px;background:transparent;color:var(--muted);cursor:pointer;transition:.15s;
  display:flex;align-items:center;gap:5px;}
.md-seg button.on{background:var(--text);color:#0b0e13;}

/* ---------- library grid ---------- */
.md-search{display:flex;align-items:center;gap:9px;padding:11px 13px;border-radius:12px;
  background:var(--surface);border:1px solid var(--line-soft);margin:4px 0 14px;color:var(--muted);}
.md-search input{border:none;background:none;color:var(--text);font-family:inherit;font-size:14px;
  outline:none;flex:1;}
.md-filters{display:flex;gap:7px;overflow-x:auto;padding-bottom:12px;scrollbar-width:none;}
.md-filters::-webkit-scrollbar{display:none;}
.md-filt{white-space:nowrap;font-size:12px;font-weight:700;padding:7px 13px;border-radius:9px;
  background:var(--surface);border:1px solid var(--line-soft);color:var(--muted);cursor:pointer;transition:.15s;}
.md-filt.on{background:var(--text);color:#0b0e13;border-color:var(--text);}
.md-filt.add{border-style:dashed;color:var(--live);border-color:rgba(55,217,196,.45);
  display:flex;align-items:center;gap:4px;}
.md-flabel{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;
  color:var(--muted);margin:16px 0 8px;}
.md-input{width:100%;padding:14px;border-radius:12px;background:var(--surface2);
  border:1px solid var(--line);color:var(--text);font-family:inherit;font-size:15px;outline:none;transition:.15s;}
.md-input:focus{border-color:var(--live);}
.md-folder{display:flex;align-items:center;gap:10px;padding:14px;border-radius:12px;
  background:var(--surface2);border:1px dashed var(--line);color:var(--muted);
  font-family:'JetBrains Mono',monospace;font-size:12px;overflow:hidden;white-space:nowrap;}
.md-folder svg{color:var(--live);flex-shrink:0;}
.md-save{width:100%;border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:15px;
  padding:15px;border-radius:13px;background:var(--live);color:#06201c;margin-top:22px;
  display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .1s,opacity .15s;}
.md-save:active{transform:scale(.98);}
.md-save:disabled{opacity:.35;cursor:default;}
.md-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;}
.md-cell{cursor:pointer;transition:transform .15s;}
.md-cell:active{transform:scale(.96);}
.md-cell-poster{aspect-ratio:2/3;border-radius:12px;position:relative;overflow:hidden;
  display:flex;align-items:flex-end;padding:8px;font-weight:800;font-size:14px;
  color:rgba(255,255,255,.92);letter-spacing:-.03em;}
.md-cell-poster .glass{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.55));}
.md-cell-poster span{position:relative;z-index:1;line-height:1;}
.md-ring{position:absolute;top:7px;right:7px;z-index:2;width:9px;height:9px;border-radius:50%;}
.md-ring.new{background:var(--signal);box-shadow:0 0 8px var(--signal);}
.md-ring.miss{background:var(--alert);box-shadow:0 0 8px var(--alert);}
.md-ring.ok{background:var(--live);box-shadow:0 0 8px var(--live);}
.md-cell-title{font-size:11.5px;font-weight:600;margin-top:6px;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;color:var(--text);}
.md-cell-sub{font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-top:1px;}

/* ---------- schedules ---------- */
.md-sch{padding:15px;border-radius:16px;background:var(--surface);border:1px solid var(--line-soft);
  margin-bottom:11px;}
.md-sch.on{border-color:rgba(55,217,196,.28);background:linear-gradient(120deg,rgba(55,217,196,.05),var(--surface) 55%);}
.md-sch-top{display:flex;align-items:center;justify-content:space-between;}
.md-sch-l{display:flex;align-items:center;gap:11px;}
.md-sch-ic{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;
  background:var(--surface2);color:var(--muted);}
.md-sch.on .md-sch-ic{background:var(--live-dim);color:var(--live);}
.md-sch-name{font-size:14.5px;font-weight:700;}
.md-sch-desc{font-size:11px;color:var(--muted);margin-top:2px;}
.md-sch-meta{display:flex;gap:14px;margin-top:13px;padding-top:12px;border-top:1px solid var(--line-soft);}
.md-sch-stat{display:flex;flex-direction:column;gap:2px;}
.md-sch-stat b{font-size:14px;font-family:'JetBrains Mono',monospace;font-weight:700;}
.md-sch-stat span{font-size:9.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:600;}
.md-sch-subs{margin-top:13px;padding-top:4px;border-top:1px solid var(--line-soft);
  display:flex;flex-direction:column;}
.md-sch-sub{display:flex;align-items:center;justify-content:space-between;padding:10px 2px 9px;
  border-bottom:1px solid var(--line-soft);}
.md-sch-sub:last-child{border-bottom:none;}
.md-sch-sub-l{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;}
.md-sch-sub-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.md-sch-empty{font-size:12px;color:var(--muted);padding:10px 2px;}
.md-tg.sm{width:38px;height:22px;}
.md-tg.sm i{width:16px;height:16px;}
.md-tg.sm.on i{transform:translateX(16px);}

/* toggle */
.md-tg{width:46px;height:27px;border-radius:99px;background:var(--surface3);position:relative;
  cursor:pointer;transition:background .22s;border:1px solid var(--line);flex-shrink:0;}
.md-tg.on{background:var(--live);border-color:var(--live);}
.md-tg i{position:absolute;top:2px;left:2px;width:21px;height:21px;border-radius:50%;background:#fff;
  transition:transform .22s cubic-bezier(.4,1.4,.6,1);box-shadow:0 2px 5px rgba(0,0,0,.3);}
.md-tg.on i{transform:translateX(19px);}

/* ---------- activity ---------- */
.md-act{display:flex;gap:12px;padding:13px 4px;border-bottom:1px solid var(--line-soft);}
.md-act-ic{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.md-act-body{flex:1;min-width:0;}
.md-act-title{font-size:13.5px;font-weight:600;}
.md-act-title b{font-weight:700;}
.md-act-sub{font-size:11px;color:var(--muted);margin-top:2px;font-family:'JetBrains Mono',monospace;}
.md-act-time{font-size:10.5px;color:var(--muted);font-family:'JetBrains Mono',monospace;flex-shrink:0;}

/* ---------- bottom sheet ---------- */
.md-scrim{position:absolute;inset:0;z-index:40;background:rgba(4,6,10,.6);
  backdrop-filter:blur(2px);animation:fade .2s ease;}
@keyframes fade{from{opacity:0;}to{opacity:1;}}
.md-sheet{position:absolute;left:0;right:0;bottom:0;z-index:41;max-height:88%;
  background:var(--surface);border-radius:26px 26px 0 0;border-top:1px solid var(--line);
  box-shadow:0 -20px 60px rgba(0,0,0,.5);animation:up .3s cubic-bezier(.2,.9,.3,1);
  display:flex;flex-direction:column;overflow:hidden;}
@keyframes up{from{transform:translateY(100%);}to{transform:translateY(0);}}
.md-sheet-grip{width:38px;height:4px;border-radius:3px;background:var(--surface3);margin:10px auto 4px;}
.md-sheet-scroll{overflow-y:auto;padding:6px 18px 26px;scrollbar-width:none;}
.md-sheet-scroll::-webkit-scrollbar{display:none;}
.md-sheet-hero{display:flex;gap:15px;padding:8px 0 16px;}
.md-sheet-poster{width:88px;height:126px;border-radius:14px;flex-shrink:0;position:relative;overflow:hidden;
  display:flex;align-items:flex-end;padding:9px;font-weight:800;font-size:19px;color:#fff;letter-spacing:-.03em;}
.md-sheet-info{flex:1;display:flex;flex-direction:column;justify-content:center;}
.md-sheet-title{font-size:21px;font-weight:800;letter-spacing:-.03em;line-height:1.05;}
.md-sheet-tags{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap;}
.md-tag{font-size:10px;font-weight:700;padding:4px 8px;border-radius:7px;background:var(--surface2);
  color:var(--muted);letter-spacing:.04em;}
.md-tag.live{background:var(--live-dim);color:var(--live);}
.md-tag.miss{background:var(--alert-dim);color:var(--alert);}
.md-tag.new{background:var(--signal-dim);color:var(--signal);}
.md-autobar{display:flex;align-items:center;justify-content:space-between;padding:14px 15px;
  border-radius:14px;background:var(--surface2);margin-bottom:16px;}
.md-autobar-l b{font-size:13.5px;font-weight:700;display:block;}
.md-autobar-l span{font-size:11px;color:var(--muted);}
.md-seasons{display:flex;gap:7px;overflow-x:auto;padding-bottom:12px;scrollbar-width:none;}
.md-seasons::-webkit-scrollbar{display:none;}
.md-season{white-space:nowrap;font-size:12px;font-weight:700;padding:7px 12px;border-radius:9px;
  background:var(--surface2);color:var(--muted);cursor:pointer;font-family:'JetBrains Mono',monospace;}
.md-season.on{background:var(--text);color:#0b0e13;}
.md-eps{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:6px;}
.md-epc{aspect-ratio:1;border-radius:9px;display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;position:relative;}
.md-epc.own{background:var(--live-dim);color:var(--live);border:1px solid rgba(55,217,196,.25);}
.md-epc.miss{background:transparent;color:var(--alert);border:1px dashed rgba(255,93,108,.5);}
.md-epc.new{background:var(--signal-dim);color:var(--signal);border:1px solid rgba(255,180,67,.4);}
.md-epc.soon{background:var(--surface2);color:var(--muted);border:1px solid var(--line-soft);}
.md-legend{display:flex;gap:14px;flex-wrap:wrap;margin:14px 0 18px;}
.md-leg{display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--muted);font-weight:600;}
.md-leg i{width:9px;height:9px;border-radius:3px;}
.md-backfill{width:100%;border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:14px;
  padding:15px;border-radius:13px;background:var(--alert);color:#fff;display:flex;align-items:center;
  justify-content:center;gap:8px;transition:transform .1s,filter .15s;}
.md-backfill:active{transform:scale(.98);}
.md-backfill.done{background:var(--live-dim);color:var(--live);}

/* ---------- login ---------- */
.md-login{position:absolute;inset:0;z-index:60;background:
  radial-gradient(120% 55% at 50% 8%, #16283a 0%, rgba(20,32,46,0) 55%), var(--bg);
  display:flex;flex-direction:column;justify-content:center;padding:34px 30px;}
.md-login-brand{display:flex;align-items:center;gap:11px;margin-bottom:8px;}
.md-login-dot{width:13px;height:13px;border-radius:50%;background:var(--signal);
  box-shadow:0 0 0 5px var(--signal-dim),0 0 20px 3px rgba(255,180,67,.55);}
.md-login-name{font-family:'Archivo',sans-serif;font-weight:800;letter-spacing:.14em;font-size:19px;}
.md-login-name b{color:var(--signal);}
.md-login-tag{font-size:14px;color:var(--muted);line-height:1.5;margin-bottom:40px;max-width:290px;}
.md-gbtn{display:flex;align-items:center;justify-content:center;gap:11px;width:100%;padding:15px;
  border-radius:14px;background:#fff;color:#1a1a1a;font-family:inherit;font-weight:700;font-size:15px;
  border:none;cursor:pointer;transition:transform .1s;}
.md-gbtn:active{transform:scale(.98);}
.md-gicon{width:20px;height:20px;border-radius:50%;background:conic-gradient(from -45deg,#EA4335 0deg 90deg,#FBBC05 90deg 180deg,#34A853 180deg 270deg,#4285F4 270deg 360deg);
  display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;color:#fff;}
.md-gicon span{background:#fff;width:8px;height:8px;border-radius:50%;}
.md-login-alt{text-align:center;font-size:12.5px;color:var(--muted);margin-top:18px;}
.md-login-sec{display:flex;align-items:center;gap:7px;justify-content:center;font-size:11px;
  color:var(--muted);margin-top:28px;}
.md-login-sec svg{color:var(--live);}

/* secondary ghost action (ignore) */
.md-grab.ghost{background:transparent;border:1px solid var(--line);color:var(--muted);}

/* ---------- assistant (Deck) ---------- */
.md-memline{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--muted);
  padding:2px 2px 10px;}
.md-memline svg{color:var(--violet);}
.md-memline button{margin-left:auto;background:none;border:1px solid var(--line);color:var(--muted);
  font-family:inherit;font-size:10.5px;font-weight:700;padding:5px 11px;border-radius:8px;cursor:pointer;}
.md-checked{display:flex;gap:5px;flex-wrap:wrap;margin:5px 0 6px;}
.md-checkchip{font-size:9px;font-weight:700;padding:3px 7px;border-radius:6px;background:var(--surface3);
  color:var(--muted);display:flex;align-items:center;gap:4px;text-transform:uppercase;letter-spacing:.04em;}
.md-checkchip svg{color:var(--live);}
.md-typing-note{font-size:11.5px;color:var(--muted);align-self:center;margin-left:4px;}
.md-chat{padding:14px 16px 6px;display:flex;flex-direction:column;gap:11px;}
.md-msg{max-width:84%;padding:11px 14px;border-radius:16px;font-size:14px;line-height:1.46;}
.md-msg.user{align-self:flex-end;background:var(--signal);color:#1a1204;
  border-bottom-right-radius:5px;font-weight:500;}
.md-msg.ai{align-self:flex-start;background:var(--surface2);border:1px solid var(--line-soft);
  border-bottom-left-radius:5px;}
.md-aihead{display:flex;align-items:center;gap:7px;align-self:flex-start;margin:4px 0 -3px;}
.md-aidot{width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,var(--signal),var(--rel));color:#1a1004;}
.md-ainame{font-size:10.5px;font-weight:800;letter-spacing:.07em;color:var(--muted);}
.md-msg-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
.md-msg-act{border:none;font-family:inherit;font-weight:700;font-size:12.5px;padding:9px 14px;
  border-radius:10px;background:var(--live);color:#06201c;cursor:pointer;display:flex;align-items:center;gap:6px;}
.md-msg-act:active{transform:scale(.96);}
.md-speak{background:none;border:none;color:var(--muted);cursor:pointer;padding:3px 0 0;
  align-self:flex-start;display:inline-flex;}
.md-speak.on{color:var(--signal);}
.md-typing{align-self:flex-start;display:flex;align-items:center;gap:5px;padding:14px;background:var(--surface2);
  border:1px solid var(--line-soft);border-radius:16px;border-bottom-left-radius:5px;}
.md-typing i{width:7px;height:7px;border-radius:50%;background:var(--muted);animation:blink 1.3s infinite;}
.md-typing i:nth-child(2){animation-delay:.2s;} .md-typing i:nth-child(3){animation-delay:.4s;}
@keyframes blink{0%,60%,100%{opacity:.25;} 30%{opacity:1;}}
.md-suggest{display:flex;flex-direction:column;gap:8px;padding:8px 0 2px;}
.md-sug{font-size:13px;font-weight:600;padding:11px 14px;border-radius:12px;background:var(--surface);
  border:1px solid var(--line-soft);color:var(--text);cursor:pointer;text-align:left;transition:.15s;
  display:flex;align-items:center;gap:9px;}
.md-sug:active{transform:scale(.98);}
.md-sug svg{color:var(--muted);flex-shrink:0;}

/* voice input bar */
.md-ai-input{position:absolute;left:0;right:0;bottom:78px;z-index:26;padding:10px 12px 12px;
  background:linear-gradient(180deg,rgba(11,14,19,0),var(--bg) 32%);display:flex;gap:9px;align-items:center;}
.md-ai-field{flex:1;display:flex;align-items:center;gap:9px;background:var(--surface2);
  border:1px solid var(--line);border-radius:15px;padding:11px 14px;}
.md-ai-field input{flex:1;border:none;background:none;color:var(--text);font-family:inherit;
  font-size:14.5px;outline:none;min-width:0;}
.md-icobtn{width:44px;height:44px;border-radius:14px;cursor:pointer;display:flex;align-items:center;
  justify-content:center;flex-shrink:0;background:var(--surface2);border:1px solid var(--line);color:var(--muted);}
.md-icobtn.send{background:var(--signal);color:#1a1204;border-color:var(--signal);}
.md-icobtn.mic.on{background:var(--alert);color:#fff;border-color:var(--alert);animation:micp 1.3s infinite;}
@keyframes micp{0%,100%{box-shadow:0 0 0 0 rgba(255,93,108,.5);}50%{box-shadow:0 0 0 9px rgba(255,93,108,0);}}

/* ---------- settings overlay ---------- */
.md-settings{position:absolute;inset:0;z-index:45;background:var(--bg);display:flex;flex-direction:column;
  animation:slidein .26s cubic-bezier(.2,.9,.3,1);}
@keyframes slidein{from{transform:translateX(100%);}to{transform:translateX(0);}}
.md-set-top{display:flex;align-items:center;gap:14px;padding:16px 16px 13px;border-bottom:1px solid var(--line-soft);}
.md-set-top b{font-size:19px;font-weight:800;letter-spacing:-.02em;}
.md-set-top svg{cursor:pointer;}
.md-set-body{flex:1;overflow-y:auto;padding:6px 16px 34px;scrollbar-width:none;}
.md-set-body::-webkit-scrollbar{display:none;}
.md-set-group{font-size:10.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;
  color:var(--muted);margin:22px 0 10px;}
.md-set-cat{background:var(--surface);border:1px solid var(--line-soft);border-radius:14px;
  margin-bottom:9px;overflow:hidden;}
.md-set-cathead{display:flex;align-items:center;justify-content:space-between;padding:14px 15px;cursor:pointer;}
.md-set-cathead .l{display:flex;align-items:center;gap:10px;min-width:0;}
.md-set-cathead b{font-size:14px;font-weight:700;}
.md-set-dots{display:flex;gap:4px;}
.md-set-dots i{width:7px;height:7px;border-radius:50%;}
.md-set-chev{color:var(--muted);transition:transform .22s;flex-shrink:0;}
.md-set-chev.open{transform:rotate(180deg);}

/* ---------- bottom nav ---------- */
.md-nav{position:absolute;bottom:0;left:0;right:0;z-index:30;display:flex;
  padding:9px 14px calc(9px + env(safe-area-inset-bottom,10px));
  background:linear-gradient(180deg,rgba(11,14,19,0),rgba(11,14,19,.98) 34%);
  backdrop-filter:blur(10px);border-top:1px solid var(--line-soft);}
.md-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;
  color:var(--muted);padding:6px 0;transition:color .18s;}
.md-tab.on{color:var(--signal);}
.md-tab span{font-size:10px;font-weight:700;letter-spacing:.01em;}
.md-tab-ind{width:4px;height:4px;border-radius:50%;background:var(--signal);
  opacity:0;transition:opacity .2s;box-shadow:0 0 6px var(--signal);}
.md-tab.on .md-tab-ind{opacity:1;}
.md-tab.center{color:var(--text);}
.md-tab.center .md-tab-orb{width:44px;height:44px;border-radius:14px;margin-top:-16px;
  display:flex;align-items:center;justify-content:center;color:#1a1004;
  background:linear-gradient(135deg,var(--signal),var(--rel));
  box-shadow:0 7px 20px rgba(236,106,200,.4);transition:transform .15s;}
.md-tab.center:active .md-tab-orb{transform:scale(.92);}
.md-tab.center span{margin-top:3px;}

.md-empty{text-align:center;padding:50px 30px;color:var(--muted);}
.md-empty svg{opacity:.4;margin-bottom:12px;}
.md-empty p{font-size:13px;line-height:1.5;}
`;

/* ---------------------- mock data ---------------------- */
const G = {
  simpsons: "linear-gradient(150deg,#FFD34E,#F5A623)",
  rick: "linear-gradient(150deg,#4bd0a0,#1c8b7a)",
  vikings: "linear-gradient(150deg,#5a6b7e,#2b3542)",
  friends: "linear-gradient(150deg,#e0546a,#a02a4a)",
  aot: "linear-gradient(150deg,#8a5a3a,#4a2c1e)",
  demon: "linear-gradient(150deg,#3aa5d9,#1c4a8b)",
  bb: "linear-gradient(150deg,#4f9a54,#1f5a2c)",
  severance: "linear-gradient(150deg,#3d7fd9,#1c2f6b)",
  onepiece: "linear-gradient(150deg,#e08a2a,#a04a1a)",
  arcane: "linear-gradient(150deg,#8B7CF0,#4a2c8b)",
  dune: "linear-gradient(150deg,#d9a05a,#8b5a2a)",
  bladerunner: "linear-gradient(150deg,#e05a8a,#3a2c6b)",
  batman: "linear-gradient(150deg,#3a4658,#12161d)",
  deadpool: "linear-gradient(150deg,#d63a3a,#2a0e0e)",
  oppenheimer: "linear-gradient(150deg,#e08a2a,#1a1206)",
  johnwick: "linear-gradient(150deg,#4a5560,#141821)",
  lotr: "linear-gradient(150deg,#6b8f3a,#2a3a14)",
  hereditary: "linear-gradient(150deg,#7a2c2c,#160a0a)",
  se7en: "linear-gradient(150deg,#6b7560,#20261c)",
  spirited: "linear-gradient(150deg,#3ac0a0,#1c6b5a)",
  budapest: "linear-gradient(150deg,#e07aae,#8b2c5a)",
  theboys: "linear-gradient(150deg,#c22a2a,#1a0808)",
  loki: "linear-gradient(150deg,#2f9a6a,#123a24)",
  peacemaker: "linear-gradient(150deg,#c0392b,#2a3a5a)",
  hotd: "linear-gradient(150deg,#8a2c2c,#161014)",
  policeacademy: "linear-gradient(150deg,#4a7ba6,#1e3a52)",
  rocky: "linear-gradient(150deg,#b8863a,#5a3e14)",
  badboys: "linear-gradient(150deg,#2a6bd9,#0e2a5a)",
  furiosa: "linear-gradient(150deg,#d97a2a,#5a2a0e)",
  insideout: "linear-gradient(150deg,#5ac0e0,#2a6b8b)",
  darkknight: "linear-gradient(150deg,#2a2f38,#0c0e12)",
};

const initialShows = [
  { id:"simpsons", title:"The Simpsons", net:"Disney+", cat:"Animated", grad:G.simpsons, ini:"THE\nSIM", status:"new",
    ep:"S36·E14", aired:"2h ago", auto:true, kind:"tv",
    seasons:{ "S36":[["own",1],["own",2],["own",3],["own",4],["own",5],["own",6],["own",7],["own",8],["own",9],["own",10],["own",11],["own",12],["own",13],["new",14],["soon",15],["soon",16]] } },
  { id:"severance", title:"Severance", net:"Apple TV+", cat:"Sci-Fi", grad:G.severance, ini:"SEV", status:"new",
    ep:"S02·E08", aired:"5h ago", auto:true, kind:"tv",
    seasons:{ "S02":[["own",1],["own",2],["own",3],["own",4],["own",5],["own",6],["own",7],["new",8],["soon",9],["soon",10]] } },
  { id:"aot", title:"Attack on Titan", net:"Crunchyroll", cat:"Animated", grad:G.aot, ini:"AOT", status:"new",
    ep:"S04·E29", aired:"1d ago", auto:true, kind:"tv",
    seasons:{ "S04":[["own",25],["own",26],["own",27],["own",28],["new",29],["soon",30]] } },
  { id:"onepiece", title:"One Piece", net:"Crunchyroll", cat:"Animated", grad:G.onepiece, ini:"ONE\nPCE", status:"miss",
    ep:"12 gaps", aired:"", auto:true, kind:"tv", missing:12,
    seasons:{ "S21":[["own",1],["miss",2],["own",3],["own",4],["miss",5],["own",6],["own",7],["own",8],["miss",9],["own",10],["own",11],["own",12]] } },
  { id:"theboys", title:"The Boys", net:"Prime Video", cat:"Comics", grad:G.theboys, ini:"THE\nBOYS", status:"miss",
    ep:"3 gaps", aired:"", auto:false, kind:"tv", missing:3,
    seasons:{ "S03":[["own",1],["own",2],["miss",3],["own",4],["own",5],["own",6],["own",7],["own",8]],
              "S04":[["own",1],["own",2],["own",3],["miss",4],["own",5],["own",6],["miss",7],["own",8]] } },
  { id:"vikings", title:"Vikings", net:"History", cat:"Action", grad:G.vikings, ini:"VIK", status:"ok",
    ep:"Complete", aired:"", auto:false, kind:"tv",
    seasons:{ "S06":[["own",1],["own",2],["own",3],["own",4],["own",5],["own",6],["own",7],["own",8],["own",9],["own",10]] } },
  { id:"demon", title:"Demon Slayer", net:"Crunchyroll", cat:"Animated", grad:G.demon, ini:"DEM", status:"ok",
    ep:"Monitored", aired:"", auto:true, kind:"tv",
    seasons:{ "S04":[["own",1],["own",2],["own",3],["own",4],["own",5],["own",6],["own",7],["own",8]] } },
  { id:"arcane", title:"Arcane", net:"Netflix", cat:"Animated", grad:G.arcane, ini:"ARC", status:"ok",
    ep:"Complete", aired:"", auto:false, kind:"tv",
    seasons:{ "S02":[["own",1],["own",2],["own",3],["own",4],["own",5],["own",6],["own",7],["own",8],["own",9]] } },
  { id:"bb", title:"Breaking Bad", net:"AMC", cat:"Action", grad:G.bb, ini:"BB", status:"ok",
    ep:"Complete", aired:"", auto:false, kind:"tv",
    seasons:{ "S05":[["own",1],["own",2],["own",3],["own",4],["own",5],["own",6],["own",7],["own",8],["own",9],["own",10],["own",11],["own",12],["own",13],["own",14],["own",15],["own",16]] } },
  { id:"loki", title:"Loki", net:"Disney+", cat:"Marvel", grad:G.loki, ini:"LOKI", status:"ok",
    ep:"Complete", aired:"", auto:false, kind:"tv",
    seasons:{ "S02":[["own",1],["own",2],["own",3],["own",4],["own",5],["own",6]] } },
  { id:"peacemaker", title:"Peacemaker", net:"HBO Max", cat:"DC", grad:G.peacemaker, ini:"PMK", status:"ok",
    ep:"Monitored", aired:"", auto:true, kind:"tv",
    seasons:{ "S02":[["own",1],["own",2],["own",3],["own",4],["own",5],["own",6],["own",7],["own",8]] } },
  { id:"hotd", title:"House of the Dragon", net:"HBO Max", cat:"Fantasy", grad:G.hotd, ini:"HOTD", status:"new",
    ep:"S02·E05", aired:"3h ago", auto:true, kind:"tv",
    seasons:{ "S02":[["own",1],["own",2],["own",3],["own",4],["new",5],["soon",6],["soon",7],["soon",8]] } },
  { id:"dune", title:"Dune: Part Two", net:"2160p", cat:"Sci-fi Movies", grad:G.dune, ini:"DUNE", status:"ok", ep:"2160p", auto:false, kind:"movie", seasons:{} },
  { id:"bladerunner", title:"Blade Runner 2049", net:"2160p", cat:"Sci-fi Movies", grad:G.bladerunner, ini:"BR\n2049", status:"ok", ep:"2160p", auto:false, kind:"movie", seasons:{} },
  { id:"batman", title:"The Batman", net:"2160p", cat:"DC Movies", grad:G.batman, ini:"BAT", status:"ok", ep:"2160p", auto:false, kind:"movie", seasons:{} },
  { id:"deadpool", title:"Deadpool & Wolverine", net:"1080p", cat:"Marvel Movies", grad:G.deadpool, ini:"D&W", status:"new", ep:"4K avail", auto:true, kind:"movie", seasons:{} },
  { id:"oppenheimer", title:"Oppenheimer", net:"2160p", cat:"Drama", grad:G.oppenheimer, ini:"OPP", status:"ok", ep:"2160p", auto:false, kind:"movie", seasons:{} },
  { id:"johnwick", title:"John Wick 4", net:"2160p", cat:"Action", grad:G.johnwick, ini:"JW4", status:"ok", ep:"2160p", auto:false, kind:"movie", seasons:{} },
  { id:"lotr", title:"LOTR: Fellowship", net:"2160p", cat:"Fantasy Movies", grad:G.lotr, ini:"LOTR", status:"ok", ep:"2160p", auto:false, kind:"movie", seasons:{} },
  { id:"hereditary", title:"Hereditary", net:"1080p", cat:"Horror Movies", grad:G.hereditary, ini:"HER", status:"ok", ep:"1080p", auto:false, kind:"movie", seasons:{} },
  { id:"se7en", title:"Se7en", net:"1080p", cat:"Thriller Movies", grad:G.se7en, ini:"SE7", status:"ok", ep:"1080p", auto:false, kind:"movie", seasons:{} },
  { id:"spirited", title:"Spirited Away", net:"1080p", cat:"Anime", grad:G.spirited, ini:"SPI", status:"ok", ep:"1080p", auto:false, kind:"movie", seasons:{} },
  { id:"budapest", title:"Grand Budapest Hotel", net:"1080p", cat:"Comedy", grad:G.budapest, ini:"GBH", status:"ok", ep:"1080p", auto:false, kind:"movie", seasons:{} },
];

/* the feature set: each has a master switch (general settings) AND a per-category toggle.
   key = the per-category toggle key; icon/color used across settings, schedules, signal. */
const FEATURES = [
  { key:"grab",     name:"Auto-grab new episodes", icon:Zap,           color:"var(--live)",   desc:"New episodes as they air", tvOnly:true, freq:"Every 30 min" },
  { key:"subs",     name:"Thai subtitles",         icon:Languages,     color:"var(--violet)", desc:"Find, download & rename to .th.srt", freq:"Live · daily" },
  { key:"quality",  name:"Quality upgrades",       icon:Gauge,         color:"var(--upg)",    desc:"Flag below 1080p · approve upgrades", freq:"Weekly" },
  { key:"releases", name:"New releases",           icon:Disc3,         color:"var(--rel)",    desc:"Films on DVD/digital · new seasons", freq:"Daily" },
  { key:"dup",      name:"Duplicate scan",         icon:Copy,          color:"var(--muted)",  desc:"Repeated titles across folders", freq:"Weekly" },
  { key:"corrupt",  name:"Corruption scan",        icon:AlertTriangle, color:"var(--alert)",  desc:"No-audio, broken or unplayable files", freq:"Weekly" },
  { key:"organize", name:"Organization scan",      icon:FolderInput,   color:"var(--muted)",  desc:"Misfiled titles · ignore to lock in place", freq:"Monthly" },
];
const FEATURE_KEYS = FEATURES.map(f=>f.key);

const initialActivity = [
  { id:1, type:"grab", title:"Grabbed The Simpsons", sub:"S36E14 · added to Download Station", time:"2h" },
  { id:8, type:"subs", title:"Thai subtitles placed", sub:"House of the Dragon S02E05 · renamed .th.srt", time:"2h" },
  { id:2, type:"new", title:"New episode detected", sub:"Severance S02E08 · Apple TV+", time:"5h" },
  { id:9, type:"subs", title:"Subtitle sweep complete", sub:"8 new titles · 6 found · 2 unavailable", time:"7h" },
  { id:3, type:"scan", title:"Anime watchlist scan complete", sub:"14 shows · 1 new · 0 errors", time:"6h" },
  { id:4, type:"miss", title:"Gap found: One Piece", sub:"12 missing episodes flagged", time:"9h" },
  { id:5, type:"grab", title:"Grabbed Attack on Titan", sub:"S04E29 · 1080p WEB-DL", time:"1d" },
  { id:10, type:"upg", title:"Upgraded Rocky", sub:"720p → 1080p · old moved to Recycle Bin", time:"1d" },
  { id:11, type:"rel", title:"New release available", sub:"Furiosa · now on Blu-ray · 2160p", time:"1d" },
  { id:6, type:"claude", title:"Claude Code sorted 4 files", sub:"Ambiguous names → matched via TMDB", time:"1d" },
  { id:7, type:"scan", title:"Full library index rebuilt", sub:"T:\\ + M:\\ · 1,284 titles mapped", time:"2d" },
];

const TV_CATS = ["All","Action","Animated","Comics","DC","Marvel","Sci-Fi","Fantasy"];
const MOVIE_CATS = ["All","Action","Anime","Drama","Comedy","DC Movies","Fantasy Movies","Marvel Movies","Sci-fi Movies","Horror Movies","Thriller Movies"];

/* collection overview — totals + per-category breakdown */
const COLLECTION = {
  movies: { total:847, accent:"#8B7CF0", dim:"rgba(139,124,240,.16)", cats:[
    {name:"Action",n:210},{name:"Drama",n:189},{name:"Comedy",n:156},
    {name:"Sci-Fi",n:142},{name:"Thriller",n:98},{name:"Horror",n:52},
  ]},
  tv: { total:437, accent:"#37D9C4", dim:"rgba(55,217,196,.16)", cats:[
    {name:"Animated",n:118},{name:"Action",n:76},{name:"Sci-Fi",n:71},{name:"Comics",n:58},
    {name:"Marvel",n:44},{name:"DC",n:39},{name:"Fantasy",n:31},
  ]},
};

/* items whose Thai subtitle track is missing from the folder */
const SUBS_MISSING = new Set(["severance","theboys","arcane","hotd","bladerunner","deadpool","hereditary"]);
const SUB_COVERAGE = { have:1196, total:1284 }; // 88% covered, 88 missing

/* library-health findings: duplicates, corruption, misorganization */
const HEALTH_SEED = [
  { id:"dup1", kind:"dup", title:"The Dark Knight", detail:"2 copies · 1080p + 2160p", grad:G.darkknight, ini:"TDK", mode:"movies", cat:"DC" },
  { id:"corr1", kind:"corrupt", title:"John Wick 4", detail:"No audio track detected", grad:G.johnwick, ini:"JW4", mode:"movies", cat:"Action" },
  { id:"org1", kind:"organize", title:"Deadpool & Wolverine", detail:"In DC folder · looks like Marvel", grad:G.deadpool, ini:"D&W", mode:"movies", cat:"DC" },
];

/* films finished in cinemas, now out on disc/digital in real quality */
const NEW_RELEASES = [
  { id:"badboys4", title:"Bad Boys: Ride or Die", cat:"Action", mode:"movies", grad:G.badboys, ini:"BAD\nBOYS", fmt:"digital", res:"2160p" },
  { id:"furiosa", title:"Furiosa", cat:"Action", mode:"movies", grad:G.furiosa, ini:"FUR", fmt:"Blu-ray", res:"2160p" },
  { id:"insideout2", title:"Inside Out 2", cat:"Comedy", mode:"movies", grad:G.insideout, ini:"IO2", fmt:"digital", res:"2160p" },
];

/* below-1080p titles flagged by the quality scan — surfaced, never auto-grabbed */
const QUALITY_UPGRADES = [
  { id:"pa1", title:"Police Academy", cat:"Comedy", mode:"movies", grad:G.policeacademy, ini:"PA", cur:"720p", target:"1080p" },
  { id:"pa2", title:"Police Academy 2", cat:"Comedy", mode:"movies", grad:G.policeacademy, ini:"PA2", cur:"720p", target:"1080p" },
  { id:"rocky", title:"Rocky", cat:"Action", mode:"movies", grad:G.rocky, ini:"ROC", cur:"720p", target:"1080p" },
  { id:"simps3", title:"The Simpsons · S03", cat:"Animated", mode:"tv", grad:G.simpsons, ini:"SIM\nS3", cur:"480p", target:"720p" },
];

/* ---------------------- component ---------------------- */
export default function MediaDeck(){
  const [tab,setTab] = useState("signal");
  const [health,setHealth] = useState(HEALTH_SEED);
  function resolveHealth(id){ setHealth(h=>h.filter(x=>x.id!==id)); }
  const [shows,setShows] = useState(initialShows);
  const [features,setFeatures] = useState(
    FEATURE_KEYS.reduce((o,k)=>{o[k]=false;return o;},{})
  ); // master on/off per feature
  const [filter,setFilter] = useState("All");
  const [sel,setSel] = useState(null);       // selected show id
  const [selSeason,setSelSeason] = useState(null);
  const [grabbing,setGrabbing] = useState({}); // id -> progress
  const [backfilled,setBackfilled] = useState({});
  const [query,setQuery] = useState("");
  const [overview,setOverview] = useState("movies"); // 'movies' | 'tv' | null
  const [libMode,setLibMode] = useState("tv"); // library: 'tv' | 'movies'
  const [customCats,setCustomCats] = useState({tv:[],movies:[]});
  const [addCat,setAddCat] = useState(false);
  const [catName,setCatName] = useState("");
  const [subState,setSubState] = useState({}); // id -> 'searching' | 'done'
  const [catCfg,setCatCfg] = useState({}); // 'mode:cat' -> {grab,subs,quality,releases} — all off by default
  const [upg,setUpg] = useState({});           // upgrade id -> progress 0..100
  const [settingsOpen,setSettingsOpen] = useState(false);
  const [settingsCat,setSettingsCat] = useState(null);
  const [messages,setMessages] = useState([
    {role:"ai",text:"Hi Max — I'm Deck. Ask what you've got, what's missing, or for a recommendation. I can add things to Download Station too."},
  ]);
  const [input,setInput] = useState("");
  const [typing,setTyping] = useState(false);
  const [listening,setListening] = useState(false);
  const [speakingId,setSpeakingId] = useState(null);
  const [thinkingNote,setThinkingNote] = useState("");
  const recRef = useRef(null);
  const chatEndRef = useRef(null);
  const loadedRef = useRef(false);

  function findSubs(id){
    if(subState[id]) return;
    setSubState(s=>({...s,[id]:"searching"}));
    setTimeout(()=>setSubState(s=>({...s,[id]:"done"})),1700);
  }

  function renderSubs(show){
    const missing = SUBS_MISSING.has(show.id);
    const st = subState[show.id];
    const present = !missing || st==="done";
    const text = st==="searching" ? "Searching 3 sources…"
      : st==="done" ? `Downloaded · ${show.title}.th.srt`
      : missing ? "Not found in folder"
      : `Matched · ${show.title}.th.srt`;
    return (
      <>
        <div className="md-autobar" style={{marginBottom: (missing && st!=="done") ? 10 : 16}}>
          <div className="md-autobar-l" style={{display:"flex",alignItems:"center",gap:11}}>
            <div className="md-subcov-ic" style={{width:34,height:34}}><Languages size={17}/></div>
            <div><b>Thai subtitles</b><span>{text}</span></div>
          </div>
          {present && <Check size={20} color="#37D9C4"/>}
        </div>
        {missing && st!=="done" && (
          <button className="md-backfill subs" disabled={st==="searching"}
            style={{marginBottom:16}} onClick={()=>findSubs(show.id)}>
            {st==="searching"
              ? <><RefreshCw size={16} className="md-spin"/> Searching sources…</>
              : <><Languages size={16}/> Find Thai subtitles</>}
          </button>
        )}
      </>
    );
  }

  const selShow = shows.find(s=>s.id===sel);

  /* grab animation */
  function grab(id){
    if(grabbing[id]!==undefined) return;
    setGrabbing(g=>({...g,[id]:0}));
  }
  useEffect(()=>{
    const active = Object.keys(grabbing).filter(id=>grabbing[id]<100);
    if(!active.length) return;
    const t = setTimeout(()=>{
      setGrabbing(g=>{
        const n={...g};
        active.forEach(id=>{ n[id]=Math.min(100,(n[id]||0)+ (12+Math.random()*22)); });
        return n;
      });
    },260);
    return ()=>clearTimeout(t);
  },[grabbing]);

  useEffect(()=>{
    const active = Object.keys(upg).filter(id=>upg[id]<100);
    if(!active.length) return;
    const t = setTimeout(()=>{
      setUpg(g=>{
        const n={...g};
        active.forEach(id=>{ n[id]=Math.min(100,(n[id]||0)+(14+Math.random()*20)); });
        return n;
      });
    },280);
    return ()=>clearTimeout(t);
  },[upg]);
  function startUpg(id){ if(upg[id]!==undefined) return; setUpg(g=>({...g,[id]:0})); }

  function toggleAuto(id){
    setShows(ss=>ss.map(s=>s.id===id?{...s,auto:!s.auto}:s));
  }
  function toggleFeature(k){ setFeatures(f=>({...f,[k]:!f[k]})); }
  function featScope(k){ return Object.values(catCfg).filter(v=>v[k]).length; }
  function featCats(k){
    return Object.keys(catCfg).filter(key=>catCfg[key][k]).map(key=>{
      const [mode,cat] = key.split(":");
      const label = cat==="All" ? (mode==="tv"?"All TV shows":"All movies") : `${cat} · ${mode==="tv"?"TV":"Movies"}`;
      return {key,mode,cat,label};
    });
  }
  function openShow(id){
    const s = shows.find(x=>x.id===id);
    setSel(id);
    setSelSeason(s && Object.keys(s.seasons)[0] || null);
  }

  /* ---- Deck assistant ---- */
  const SUGGESTIONS = [
    "Any old-school action I'm missing?",
    "Recommend an action movie",
    "Move The Boys to the Comics folder",
    "Any new releases out on disc?",
  ];
  function noteFor(t){
    const q = t.toLowerCase();
    if(q.includes("move")||q.includes("copy")||q.includes("folder")) return "Reading folders…";
    if(q.includes("duplicate")||q.includes("dupe")||q.includes("corrupt")||q.includes("broken")||q.includes("organiz")) return "Scanning library…";
    if(q.includes("miss")||q.includes("add")||q.includes("action")||q.includes("download")||q.includes("recommend")||q.includes("release")||q.includes("new"))
      return "Checking Download Station & memory…";
    return "Thinking…";
  }
  function replyFor(t){
    const q = t.toLowerCase();
    if(q.includes("action") && (q.includes("miss")||q.includes("old")))
      return {role:"ai", checked:["Memory","Download Station"],
        text:"Checked our history and Download Station: you queued Die Hard 1–3 two days ago — 2 finished, 1 still downloading. Old-school picks you're still missing: Commando, Predator, Cobra. Add those 3?",
        action:{label:"Add the 3",done:"Added Commando, Predator, Cobra → Download Station → Action. Skipped the Die Hards already in your queue."}};
    if(q.includes("move")||q.includes("copy"))
      return {role:"ai", checked:["Files"],
        text:"Sure — I'll move The Boys from Downloads into T:\\TV Shows\\Comics. Confirm?",
        action:{label:"Move it",done:"Moved. Video Station will re-index it shortly."}};
    if(q.includes("terminator"))
      return {role:"ai", checked:["Library index"], text:"Yes — all 6 Terminator films, up to Dark Fate (2160p). Want the list?"};
    if(q.includes("recommend")||q.includes("suggest"))
      return {role:"ai", checked:["Memory","Download Station"],
        text:"The Old Guard 2 just hit digital — action, 2160p, matches what you watch. Add it?",
        action:{label:"Add it",done:"On it — The Old Guard 2 queued → Action. I'll place Thai subs when it lands."}};
    if(q.includes("missing")||q.includes("gap"))
      return {role:"ai", checked:["Library index"],
        text:"The Boys is missing 3 episodes: S03E03, S04E04, S04E07. Backfill them?",
        action:{label:"Backfill",done:"Queued all 3 → Download Station. I'll swap them in as they finish."}};
    if(q.includes("subtitle")||q.includes("thai")||q.includes("sub"))
      return {role:"ai", checked:["Library index"],
        text:"88 titles are missing Thai subs. Run a sweep and rename to .th.srt?",
        action:{label:"Run sweep",done:"Sweep started across 88 titles. I'll notify you as subs land."}};
    if(q.includes("new")||q.includes("latest")||q.includes("release")||q.includes("disc"))
      return {role:"ai", checked:["Download Station"],
        text:"3 films just hit disc: Bad Boys: Ride or Die, Furiosa, Inside Out 2 — all 2160p. Add any?"};
    if(q.includes("duplicate")||q.includes("dupe"))
      return {role:"ai", checked:["Library index"],
        text:"Found 4 duplicates. Biggest: The Dark Knight has both a 1080p and a 2160p copy. Remove the lower ones?",
        action:{label:"Remove lower copies",done:"Removed 4 lower-quality duplicates → Recycle Bin. Kept the best of each."}};
    if(q.includes("corrupt")||q.includes("broken")||q.includes("audio")||q.includes("sound"))
      return {role:"ai", checked:["Files"],
        text:"2 files look broken: John Wick 4 (no audio) and one more. Re-download them in good quality?",
        action:{label:"Re-download",done:"Queued both for re-download. I'll swap them in once verified."}};
    if(q.includes("organiz")||q.includes("misfiled")||q.includes("misplaced")||q.includes("wrong folder"))
      return {role:"ai", checked:["Files"],
        text:"1 title looks misfiled: Deadpool & Wolverine sits in DC but reads as Marvel. Move it, or leave it?",
        action:{label:"Move to Marvel",done:"Moved → M:\\Movies\\Marvel Movies. Video Station will re-index."}};
    if(q.includes("simpson"))
      return {role:"ai", checked:["Library index"], text:"You have The Simpsons S1–S36. S36E14 aired 2h ago; auto-grab is on."};
    return {role:"ai", text:"I can check that against your library, flag what's missing, or add something to Download Station. Try a title, or 'recommend an action movie.'"};
  }
  function ask(text){
    const t = (text||"").trim(); if(!t) return;
    setMessages(m=>[...m,{role:"user",text:t}]);
    setInput(""); setThinkingNote(noteFor(t)); setTyping(true);
    setTimeout(()=>{ setTyping(false); setMessages(m=>[...m,replyFor(t)]); },1300);
  }
  function runAction(a){
    setMessages(m=>[...m,{role:"user",text:a.label}]);
    setThinkingNote("Working…"); setTyping(true);
    setTimeout(()=>{ setTyping(false); setMessages(m=>[...m,{role:"ai",text:a.done}]); },950);
  }
  async function clearMemory(){
    const g = [{role:"ai",text:"Memory cleared. Starting fresh — what do you need?"}];
    setMessages(g);
    try{ if(window.storage) await window.storage.set("deck:messages",JSON.stringify(g)); }catch(e){}
  }
  function speak(text,id){
    if(!window.speechSynthesis) return;
    if(speakingId===id){ window.speechSynthesis.cancel(); setSpeakingId(null); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02; u.onend = ()=>setSpeakingId(null);
    setSpeakingId(id); window.speechSynthesis.speak(u);
  }
  function toggleMic(){
    if(listening){ setListening(false); try{recRef.current&&recRef.current.stop();}catch(e){} return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(SR){
      const r = new SR(); r.lang="en-US"; r.interimResults=false;
      r.onresult = e=>{ const tx=e.results[0][0].transcript; setInput(tx); };
      r.onend = ()=>setListening(false);
      r.onerror = ()=>setListening(false);
      recRef.current=r; try{r.start(); setListening(true);}catch(e){setListening(false);}
    } else { setListening(true); setTimeout(()=>setListening(false),1800); }
  }
  useEffect(()=>{
    let alive = true;
    (async()=>{
      try{
        if(window.storage){
          const r = await window.storage.get("deck:messages");
          if(alive && r && r.value){
            const arr = JSON.parse(r.value);
            if(Array.isArray(arr) && arr.length) setMessages(arr);
          }
        }
      }catch(e){}
      loadedRef.current = true;
    })();
    return ()=>{ alive=false; };
  },[]);
  useEffect(()=>{
    if(!loadedRef.current) return;
    (async()=>{ try{ if(window.storage) await window.storage.set("deck:messages",JSON.stringify(messages)); }catch(e){} })();
  },[messages]);
  useEffect(()=>{
    if(tab==="assistant" && chatEndRef.current)
      chatEndRef.current.scrollIntoView({behavior:"smooth"});
  },[messages,typing,tab]);

  function renderSetCat(mode,cat){
    const key = `${mode}:${cat}`; const c = getCfg(key); const open = settingsCat===key;
    const rows = FEATURES.filter(f=> !(f.tvOnly && mode!=="tv"))
      .map(f=>({ ...f, label: f.key==="releases" && mode==="tv" ? "New seasons" : f.name }));
    const onDots = rows.filter(f=>c[f.key]);
    return (
      <div key={key} className="md-set-cat">
        <div className="md-set-cathead" onClick={()=>setSettingsCat(open?null:key)}>
          <div className="l">
            <b>{cat}</b>
            <div className="md-set-dots">{onDots.map(f=><i key={f.key} style={{background:f.color}}/>)}</div>
          </div>
          <ChevronDown size={18} className={`md-set-chev ${open?"open":""}`}/>
        </div>
        {open && rows.map(f=>{
          const Ic = f.icon; const on = c[f.key]; const pending = on && !features[f.key];
          return (
            <div key={f.key} className="md-catrow">
              <div className="md-catrow-l">
                <div className="md-catrow-ic" style={on?{color:f.color}:{}}><Ic size={16}/></div>
                <div className="md-catrow-tx">
                  <b>{f.label}</b>
                  {pending && <span style={{color:"var(--signal)"}}>Turn on {f.name} in the main settings to start</span>}
                </div>
              </div>
              <div className={`md-tg ${on?"on":""}`} onClick={()=>toggleCfgKey(key,f.key)}
                   style={on?{background:f.color,borderColor:f.color}:{}}><i/></div>
            </div>
          );
        })}
      </div>
    );
  }

  const newShows = shows.filter(s=>s.status==="new" && s.kind==="tv");
  const libCats = (libMode==="tv" ? TV_CATS : MOVIE_CATS).concat(customCats[libMode]);
  const libShows = shows.filter(s=> s.kind===(libMode==="tv"?"tv":"movie")
    && (filter==="All"||s.cat===filter)
    && (!query || s.title.toLowerCase().includes(query.toLowerCase())) );

  function switchMode(m){ setLibMode(m); setFilter("All"); }

  const cfgKey = `${libMode}:${filter}`;
  const CFG_DEFAULT = {grab:false, subs:false, quality:false, releases:false};
  function getCfg(key){ return catCfg[key] || CFG_DEFAULT; }
  function toggleCfgKey(key,k){
    setCatCfg(c=>{ const cur = c[key]||CFG_DEFAULT; return {...c,[key]:{...cur,[k]:!cur[k]}}; });
  }
  const cfg = getCfg(cfgKey);
  function toggleCfg(k){ toggleCfgKey(cfgKey,k); }
  const scopeLabel = filter==="All" ? (libMode==="tv"?"All TV shows":"All movies") : filter;

  /* --- the connective loop: schedule ON + category toggle ON => shows in Signal --- */
  function catOn(mode,cat,key){ return getCfg(`${mode}:All`)[key] || getCfg(`${mode}:${cat}`)[key]; }
  const releasesShown = features.releases ? NEW_RELEASES.filter(r=>catOn(r.mode,r.cat,"releases")) : [];
  const upgradesShown = features.quality  ? QUALITY_UPGRADES.filter(q=>catOn(q.mode,q.cat,"quality")) : [];
  const healthShown = health.filter(h=>{
    const fk = h.kind==="dup" ? "dup" : h.kind==="corrupt" ? "corrupt" : "organize";
    return features[fk] && catOn(h.mode,h.cat,fk);
  });
  function saveCat(){
    const name = catName.trim();
    if(!name) return;
    setCustomCats(c=>({...c,[libMode]:[...c[libMode],name]}));
    setFilter(name); setAddCat(false); setCatName("");
  }

  return (
    <div className="md-root">
      <style>{css}</style>
      <div className="md-phone md-app">

        {/* ---------- TOP STATUS ---------- */}
        <div className="md-top">
          <div className="md-top-row">
            <div className="md-brand">
              <div className="md-brand-dot"/>
              <div className="md-brand-name md-disp">MEDIA<b>DECK</b></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:15}}>
              <Settings size={18} color="#7B879B" style={{cursor:"pointer"}} onClick={()=>setSettingsOpen(true)}/>
              <Bell size={18} color="#7B879B"/>
            </div>
          </div>
          <div className="md-chips">
            <div className="md-chip ok"><span className="dot"/><Server size={12}/> NAS online</div>
            <div className="md-chip path"><HardDrive size={12}/> Desktop · direct</div>
            <div className="md-chip"><RefreshCw size={11}/> Scan 6m ago</div>
          </div>
        </div>

        {/* ---------- BODY ---------- */}
        <div className={`md-body ${tab==="assistant"?"chat":""}`}>

          {tab==="signal" && (
            <div className="md-sec">
              <div className="md-sec-head">
                <div>
                  <div className="md-sec-title md-disp">Collection</div>
                  <div className="md-sec-sub">Full library scan · 6m ago</div>
                </div>
                <div className="md-count">1,284 TITLES</div>
              </div>

              <div className="md-ov">
                {["movies","tv"].map(k=>{
                  const d = COLLECTION[k];
                  const on = overview===k;
                  return (
                    <div key={k} className="md-ovc" style={on?{borderColor:d.accent+"66",background:`linear-gradient(140deg, ${d.dim}, var(--surface) 60%)`}:{}}
                         onClick={()=>setOverview(on?null:k)}>
                      <div className="md-ovc-ic" style={on?{color:d.accent}:{}}>
                        {k==="movies"?<Film size={13}/>:<Tv size={13}/>} {k==="movies"?"Movies":"TV Shows"}
                      </div>
                      <div className="md-ovc-num" style={on?{color:d.accent}:{}}>{d.total}</div>
                      <div className="md-ovc-foot">
                        <span>{d.cats.length} categories</span>
                        <ChevronRight size={14} className="md-ovc-chev"/>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="md-subcov" onClick={()=>{setTab("library");}} style={{cursor:"pointer"}}>
                <div className="md-subcov-ic"><Languages size={18}/></div>
                <div className="md-subcov-mid">
                  <div className="md-subcov-top">
                    <b>Thai subtitles</b>
                    <span>{Math.round(SUB_COVERAGE.have/SUB_COVERAGE.total*100)}% · {SUB_COVERAGE.total-SUB_COVERAGE.have} missing</span>
                  </div>
                  <div className="md-subcov-bar"><i style={{width:`${SUB_COVERAGE.have/SUB_COVERAGE.total*100}%`}}/></div>
                </div>
              </div>

              {overview && (()=> {
                const d = COLLECTION[overview];
                const max = Math.max(...d.cats.map(c=>c.n));
                return (
                  <div className="md-bd">
                    <div className="md-bd-head">
                      <b>{overview==="movies"?"Movies":"TV shows"} by category</b>
                      <span>{d.total} total</span>
                    </div>
                    {d.cats.map(c=>(
                      <div key={c.name} className="md-bd-row">
                        <div className="md-bd-name">{c.name}</div>
                        <div className="md-bd-track">
                          <div className="md-bd-fill" style={{width:`${(c.n/max)*100}%`,background:d.accent}}/>
                        </div>
                        <div className="md-bd-n">{c.n}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="md-sec-head">
                <div>
                  <div className="md-sec-title md-disp">New signals</div>
                  <div className="md-sec-sub">Episodes aired &amp; ready to grab</div>
                </div>
                <div className="md-count">{newShows.length} LIVE</div>
              </div>

              {newShows.map(s=>{
                const p = grabbing[s.id];
                const done = p!==undefined && p>=100;
                return (
                  <div key={s.id} className="md-sig live" onClick={()=>openShow(s.id)}>
                    <div className="md-poster" style={{background:s.grad}}>
                      <div className="glass"/><span>{s.ini.split("\n").map((l,i)=><React.Fragment key={i}>{l}<br/></React.Fragment>)}</span>
                    </div>
                    <div className="md-sig-mid">
                      <div className="md-sig-net">{s.net}</div>
                      <div className="md-sig-title">{s.title}</div>
                      <div className="md-sig-meta">
                        <span className="md-ep">{s.ep}</span>
                        <span>·</span><span>aired {s.aired}</span>
                      </div>
                      {p!==undefined && !done &&
                        <div className="md-prog"><i style={{width:`${p}%`}}/></div>}
                    </div>
                    <div className="md-sig-right" onClick={e=>e.stopPropagation()}>
                      <div className="md-tally"/>
                      {done ? (
                        <div className="md-grab done"><Check size={15}/> Sent</div>
                      ) : p!==undefined ? (
                        <div className="md-grab auto"><Download size={13}/> {Math.round(p)}%</div>
                      ) : s.auto ? (
                        <button className="md-grab auto" onClick={()=>grab(s.id)}><Zap size={13}/> Auto</button>
                      ) : (
                        <button className="md-grab" onClick={()=>grab(s.id)}><Download size={13}/> Grab</button>
                      )}
                    </div>
                  </div>
                );
              })}

              {releasesShown.length>0 && (
                <>
                  <div className="md-sec-head" style={{marginTop:24}}>
                    <div>
                      <div className="md-sec-title md-disp">New releases</div>
                      <div className="md-sec-sub">Out of cinemas · now on disc/digital</div>
                    </div>
                    <div className="md-count" style={{color:"var(--rel)"}}>{releasesShown.length} NEW</div>
                  </div>
                  {releasesShown.map(r=>{
                    const p = grabbing[r.id]; const done = p!==undefined && p>=100;
                    return (
                      <div key={r.id} className="md-sig">
                        <div className="md-poster" style={{background:r.grad}}>
                          <div className="glass"/><span>{r.ini.split("\n").map((l,i)=><React.Fragment key={i}>{l}<br/></React.Fragment>)}</span>
                        </div>
                        <div className="md-sig-mid">
                          <div className="md-sig-net">{r.cat}</div>
                          <div className="md-sig-title">{r.title}</div>
                          {done ? (
                            <div className="md-sig-meta" style={{color:"var(--live)"}}><Check size={13}/> <span>Added to library</span></div>
                          ) : p!==undefined ? (
                            <div className="md-prog" style={{width:96}}><i style={{width:`${p}%`,background:"var(--rel)"}}/></div>
                          ) : (
                            <div className="md-sig-meta" style={{color:"var(--rel)"}}>Now on {r.fmt} · {r.res}</div>
                          )}
                        </div>
                        <div className="md-sig-right">
                          {done ? (
                            <div className="md-grab upg-done"><Check size={15}/> Added</div>
                          ) : p!==undefined ? (
                            <div className="md-grab rel"><Download size={13}/> {Math.round(p)}%</div>
                          ) : (
                            <button className="md-grab rel" onClick={()=>grab(r.id)}><Plus size={13}/> Add</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              <div className="md-sec-head" style={{marginTop:24}}>
                <div>
                  <div className="md-sec-title md-disp">Needs attention</div>
                  <div className="md-sec-sub">Gaps found in your archive</div>
                </div>
              </div>
              {shows.filter(s=>s.status==="miss").map(s=>(
                <div key={s.id} className="md-sig" onClick={()=>openShow(s.id)}>
                  <div className="md-poster" style={{background:s.grad}}>
                    <div className="glass"/><span>{s.ini.split("\n").map((l,i)=><React.Fragment key={i}>{l}<br/></React.Fragment>)}</span>
                  </div>
                  <div className="md-sig-mid">
                    <div className="md-sig-net">{s.net}</div>
                    <div className="md-sig-title">{s.title}</div>
                    <div className="md-sig-meta" style={{color:"var(--alert)"}}>
                      <AlertCircle size={13}/> <span>{s.missing} missing episodes</span>
                    </div>
                  </div>
                  <div className="md-sig-right"><ChevronRight size={18} color="#7B879B"/></div>
                </div>
              ))}
              {shows.filter(s=>SUBS_MISSING.has(s.id) && s.status!=="miss" && !subState[s.id]).map(s=>(
                <div key={s.id+"-sub"} className="md-sig" onClick={()=>openShow(s.id)}>
                  <div className="md-poster" style={{background:s.grad}}>
                    <div className="glass"/><span>{s.ini.split("\n").map((l,i)=><React.Fragment key={i}>{l}<br/></React.Fragment>)}</span>
                  </div>
                  <div className="md-sig-mid">
                    <div className="md-sig-net">{s.net}</div>
                    <div className="md-sig-title">{s.title}</div>
                    <div className="md-sig-meta" style={{color:"var(--violet)"}}>
                      <Languages size={13}/> <span>Thai subtitles missing</span>
                    </div>
                  </div>
                  <div className="md-sig-right"><ChevronRight size={18} color="#7B879B"/></div>
                </div>
              ))}

              {upgradesShown.length>0 && (
                <>
                  <div className="md-sec-head" style={{marginTop:24}}>
                    <div>
                      <div className="md-sec-title md-disp">Quality upgrades</div>
                      <div className="md-sec-sub">Below 1080p · you approve each swap</div>
                    </div>
                    <div className="md-count" style={{color:"var(--upg)"}}>{upgradesShown.length} FOUND</div>
                  </div>
                  {upgradesShown.map(q=>{
                    const p = upg[q.id]; const done = p!==undefined && p>=100;
                    return (
                      <div key={q.id} className="md-sig">
                        <div className="md-poster" style={{background:q.grad}}>
                          <div className="glass"/><span>{q.ini.split("\n").map((l,i)=><React.Fragment key={i}>{l}<br/></React.Fragment>)}</span>
                        </div>
                        <div className="md-sig-mid">
                          <div className="md-sig-net">{q.cat}</div>
                          <div className="md-sig-title">{q.title}</div>
                          {done ? (
                            <div className="md-sig-meta" style={{color:"var(--live)"}}><Check size={13}/> <span>Swapped · old → Recycle Bin</span></div>
                          ) : p!==undefined ? (
                            <div className="md-prog" style={{width:96}}><i style={{width:`${p}%`,background:"var(--upg)"}}/></div>
                          ) : (
                            <div className="md-sig-meta" style={{color:"var(--upg)"}}>{q.cur} → {q.target}</div>
                          )}
                        </div>
                        <div className="md-sig-right">
                          {done ? (
                            <div className="md-grab upg-done"><Check size={15}/> Done</div>
                          ) : p!==undefined ? (
                            <div className="md-grab upg"><Download size={13}/> {Math.round(p)}%</div>
                          ) : (
                            <button className="md-grab upg" onClick={()=>startUpg(q.id)}><ArrowUp size={13}/> Update</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {healthShown.length>0 && (
                <>
                  <div className="md-sec-head" style={{marginTop:24}}>
                    <div>
                      <div className="md-sec-title md-disp">Library health</div>
                      <div className="md-sec-sub">Duplicates · broken files · misfiled</div>
                    </div>
                    <div className="md-count">{healthShown.length} FLAGGED</div>
                  </div>
                  {healthShown.map(h=>{
                    const meta = {
                      dup:{Ic:Copy, color:"var(--muted)", label:h.detail, act:"Remove dupe"},
                      corrupt:{Ic:AlertTriangle, color:"var(--alert)", label:h.detail, act:"Re-download"},
                      organize:{Ic:FolderInput, color:"var(--muted)", label:h.detail, act:"Move"},
                    }[h.kind];
                    const Ic = meta.Ic;
                    return (
                      <div key={h.id} className="md-sig">
                        <div className="md-poster" style={{background:h.grad}}>
                          <div className="glass"/><span>{h.ini}</span>
                        </div>
                        <div className="md-sig-mid">
                          <div className="md-sig-net">{h.kind==="dup"?"Duplicate":h.kind==="corrupt"?"Broken file":"Misfiled"}</div>
                          <div className="md-sig-title">{h.title}</div>
                          <div className="md-sig-meta" style={{color:meta.color}}>
                            <Ic size={13}/> <span>{meta.label}</span>
                          </div>
                        </div>
                        <div className="md-sig-right" style={{gap:6,justifyContent:"center"}}>
                          {h.kind==="organize" && (
                            <button className="md-grab ghost" onClick={()=>resolveHealth(h.id)}>Ignore</button>
                          )}
                          <button className="md-grab" style={h.kind==="corrupt"?{background:"var(--alert)",color:"#fff"}:{}} onClick={()=>resolveHealth(h.id)}>{meta.act}</button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {tab==="library" && (
            <div className="md-sec">
              <div className="md-sec-head">
                <div><div className="md-sec-title md-disp">Library</div>
                  <div className="md-sec-sub">
                    {libMode==="tv" ? "437 shows · T:\\ 12TB" : "847 movies · M:\\ 4TB"}
                  </div></div>
                <div className="md-seg">
                  <button className={libMode==="tv"?"on":""} onClick={()=>switchMode("tv")}><Tv size={13}/> TV</button>
                  <button className={libMode==="movies"?"on":""} onClick={()=>switchMode("movies")}><Film size={13}/> Movies</button>
                </div>
              </div>
              <div className="md-search">
                <Search size={17}/>
                <input placeholder={`Search ${libMode==="tv"?"shows":"movies"}`} value={query} onChange={e=>setQuery(e.target.value)}/>
              </div>
              <div className="md-filters">
                {libCats.map(c=>(
                  <div key={c} className={`md-filt ${filter===c?"on":""}`} onClick={()=>setFilter(c)}>{c}</div>
                ))}
                <div className="md-filt add" onClick={()=>setAddCat(true)}><Plus size={12}/> Add</div>
              </div>

              <div className="md-catctl">
                <div className="md-catctl-head">
                  <b>{scopeLabel}</b>
                  <span>{libShows.length} titles</span>
                </div>
                {libMode==="tv" && (
                  <div className="md-catrow">
                    <div className="md-catrow-l">
                      <div className="md-catrow-ic" style={cfg.grab?{background:"var(--live-dim)",color:"var(--live)"}:{}}><Zap size={16}/></div>
                      <div className="md-catrow-tx"><b>Auto-grab new episodes</b><span>Whole folder, as they air</span></div>
                    </div>
                    <div className={`md-tg ${cfg.grab?"on":""}`} onClick={()=>toggleCfg("grab")}><i/></div>
                  </div>
                )}
                <div className="md-catrow">
                  <div className="md-catrow-l">
                    <div className="md-catrow-ic" style={cfg.subs?{background:"rgba(139,124,240,.15)",color:"var(--violet)"}:{}}><Languages size={16}/></div>
                    <div className="md-catrow-tx"><b>Thai subtitles</b><span>Find, download &amp; rename to .th.srt</span></div>
                  </div>
                  <div className={`md-tg ${cfg.subs?"on":""}`} onClick={()=>toggleCfg("subs")} style={cfg.subs?{background:"var(--violet)",borderColor:"var(--violet)"}:{}}><i/></div>
                </div>
                <div className="md-catrow">
                  <div className="md-catrow-l">
                    <div className="md-catrow-ic" style={cfg.quality?{background:"var(--upg-dim)",color:"var(--upg)"}:{}}><Gauge size={16}/></div>
                    <div className="md-catrow-tx"><b>Quality upgrades</b><span>Flag below 1080p · you approve each</span></div>
                  </div>
                  <div className={`md-tg ${cfg.quality?"on":""}`} onClick={()=>toggleCfg("quality")} style={cfg.quality?{background:"var(--upg)",borderColor:"var(--upg)"}:{}}><i/></div>
                </div>
                <div className="md-catrow">
                  <div className="md-catrow-l">
                    <div className="md-catrow-ic" style={cfg.releases?{background:"var(--rel-dim)",color:"var(--rel)"}:{}}><Disc3 size={16}/></div>
                    <div className="md-catrow-tx">
                      <b>{libMode==="tv"?"New shows & seasons":"New releases"}</b>
                      <span>{libMode==="tv"?"Flag when a new season drops":"Flag when out on DVD/digital"}</span>
                    </div>
                  </div>
                  <div className={`md-tg ${cfg.releases?"on":""}`} onClick={()=>toggleCfg("releases")} style={cfg.releases?{background:"var(--rel)",borderColor:"var(--rel)"}:{}}><i/></div>
                </div>
              </div>
              {libShows.length ? (
                <div className="md-grid">
                  {libShows.map(s=>(
                    <div key={s.id} className="md-cell" onClick={()=>openShow(s.id)}>
                      <div className="md-cell-poster" style={{background:s.grad}}>
                        <div className="glass"/>
                        <div className={`md-ring ${s.status}`}/>
                        {SUBS_MISSING.has(s.id) && <div className="md-subflag">TH</div>}
                        <span>{s.ini.split("\n").map((l,i)=><React.Fragment key={i}>{l}<br/></React.Fragment>)}</span>
                      </div>
                      <div className="md-cell-title">{s.title}</div>
                      <div className="md-cell-sub">
                        {s.status==="miss" ? `${s.missing} GAPS`
                          : s.kind==="movie" ? (s.status==="new" ? "4K AVAIL" : s.net.toUpperCase())
                          : s.status==="new" ? "NEW EP" : "COMPLETE"}
                      </div>
                    </div>
                  ))}
                </div>
              ):(
                <div className="md-empty"><Search size={34}/><p>No titles match that.<br/>Try another category.</p></div>
              )}
            </div>
          )}

          {tab==="schedules" && (
            <div className="md-sec">
              <div className="md-sec-head">
                <div><div className="md-sec-title md-disp">Schedules</div>
                  <div className="md-sec-sub">What's running now · set up in Settings</div></div>
              </div>
              {FEATURES.filter(f=>features[f.key]).length===0 ? (
                <div className="md-empty">
                  <SlidersHorizontal size={34}/>
                  <p>Nothing running yet.<br/>Turn features on in Settings.</p>
                </div>
              ) : FEATURES.filter(f=>features[f.key]).map(f=>{
                const Ic = f.icon; const cats = featCats(f.key);
                return (
                  <div key={f.key} className="md-sch on">
                    <div className="md-sch-top">
                      <div className="md-sch-l">
                        <div className="md-sch-ic" style={{color:f.color}}><Ic size={19}/></div>
                        <div>
                          <div className="md-sch-name">{f.name}</div>
                          <div className="md-sch-desc">{f.freq}</div>
                        </div>
                      </div>
                      <div className="md-tg on" onClick={()=>toggleFeature(f.key)} style={{background:f.color,borderColor:f.color}}><i/></div>
                    </div>
                    <div className="md-sch-subs">
                      {cats.length===0 ? (
                        <div className="md-sch-empty">No categories yet — pick some in Settings.</div>
                      ) : cats.map(x=>(
                        <div key={x.key} className="md-sch-sub">
                          <div className="md-sch-sub-l"><span className="md-sch-sub-dot" style={{background:f.color}}/> {x.label}</div>
                          <div className="md-tg sm on" onClick={()=>toggleCfgKey(x.key,f.key)} style={{background:f.color,borderColor:f.color}}><i/></div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="md-sec-sub" style={{padding:"10px 2px",lineHeight:1.5}}>
                Toggle one off to stop it. Pick which categories each runs on in Settings.
              </div>
            </div>
          )}

          {tab==="activity" && (
            <div className="md-sec">
              <div className="md-sec-head">
                <div><div className="md-sec-title md-disp">Activity</div>
                  <div className="md-sec-sub">What the system did, newest first</div></div>
              </div>
              {initialActivity.map(a=>{
                const map = {
                  grab:{c:"var(--live)",bg:"var(--live-dim)",I:Download},
                  new:{c:"var(--signal)",bg:"var(--signal-dim)",I:Zap},
                  scan:{c:"#8B7CF0",bg:"rgba(139,124,240,.14)",I:RefreshCw},
                  miss:{c:"var(--alert)",bg:"var(--alert-dim)",I:AlertCircle},
                  claude:{c:"#37D9C4",bg:"var(--live-dim)",I:Tv},
                  subs:{c:"#8B7CF0",bg:"rgba(139,124,240,.15)",I:Languages},
                  upg:{c:"#4FA8FF",bg:"rgba(79,168,255,.15)",I:ArrowUp},
                  rel:{c:"#EC6AC8",bg:"rgba(236,106,200,.15)",I:Disc3},
                };
                const m = map[a.type]; const I = m.I;
                return (
                  <div key={a.id} className="md-act">
                    <div className="md-act-ic" style={{background:m.bg,color:m.c}}><I size={16}/></div>
                    <div className="md-act-body">
                      <div className="md-act-title">{a.title}</div>
                      <div className="md-act-sub">{a.sub}</div>
                    </div>
                    <div className="md-act-time">{a.time}</div>
                  </div>
                );
              })}
            </div>
          )}

          {tab==="assistant" && (
            <div className="md-chat">
              <div className="md-memline">
                <Database size={14}/> <span>Deck remembers our past chats</span>
                <button onClick={clearMemory}>Clear</button>
              </div>
              {messages.map((m,i)=> m.role==="user" ? (
                <div key={i} className="md-msg user">{m.text}</div>
              ) : (
                <div key={i} style={{alignSelf:"flex-start",display:"flex",flexDirection:"column",alignItems:"flex-start",maxWidth:"86%"}}>
                  <div className="md-aihead"><div className="md-aidot"><Sparkles size={12}/></div><div className="md-ainame">DECK</div></div>
                  {m.checked && (
                    <div className="md-checked">
                      {m.checked.map(c=><span key={c} className="md-checkchip"><Check size={9}/> {c}</span>)}
                    </div>
                  )}
                  <div className="md-msg ai">{m.text}</div>
                  {m.action && (
                    <div className="md-msg-actions">
                      <button className="md-msg-act" onClick={()=>runAction(m.action)}><Check size={14}/> {m.action.label}</button>
                    </div>
                  )}
                  <button className={`md-speak ${speakingId===i?"on":""}`} onClick={()=>speak(m.text,i)}><Volume2 size={15}/></button>
                </div>
              ))}
              {typing && <div className="md-typing"><i/><i/><i/>{thinkingNote && <span className="md-typing-note">{thinkingNote}</span>}</div>}
              {messages.length<=1 && (
                <div className="md-suggest">
                  {SUGGESTIONS.map(s=>(
                    <button key={s} className="md-sug" onClick={()=>ask(s)}><Sparkles size={15}/> {s}</button>
                  ))}
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>
          )}

        </div>

        {/* ---------- DETAIL SHEET ---------- */}
        {selShow && (
          <>
            <div className="md-scrim" onClick={()=>setSel(null)}/>
            <div className="md-sheet">
              <div className="md-sheet-grip"/>
              <div className="md-sheet-scroll">
                <div className="md-sheet-hero">
                  <div className="md-sheet-poster" style={{background:selShow.grad}}>
                    <div className="glass" style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.4))"}}/>
                    <span style={{position:"relative",zIndex:1,lineHeight:.95}}>
                      {selShow.ini.split("\n").map((l,i)=><React.Fragment key={i}>{l}<br/></React.Fragment>)}
                    </span>
                  </div>
                  <div className="md-sheet-info">
                    <div className="md-sheet-title md-disp">{selShow.title}</div>
                    <div className="md-sheet-tags">
                      <div className="md-tag">{selShow.net}</div>
                      <div className="md-tag">{selShow.cat}</div>
                      {selShow.status==="new" && <div className="md-tag new">New episode</div>}
                      {selShow.status==="miss" && <div className="md-tag miss">{selShow.missing} gaps</div>}
                      {selShow.status==="ok" && <div className="md-tag live">Healthy</div>}
                    </div>
                  </div>
                </div>

                {selShow.kind==="tv" && (
                  <>
                    <div className="md-autobar">
                      <div className="md-autobar-l">
                        <b>Auto-grab new episodes</b>
                        <span>{selShow.auto?"Watching weekly for new airings":"Manual grabs only"}</span>
                      </div>
                      <div className={`md-tg ${selShow.auto?"on":""}`} onClick={()=>toggleAuto(selShow.id)}><i/></div>
                    </div>

                    {renderSubs(selShow)}

                    <div className="md-seasons">
                      {Object.keys(selShow.seasons).map(sn=>(
                        <div key={sn} className={`md-season ${selSeason===sn?"on":""}`} onClick={()=>setSelSeason(sn)}>{sn}</div>
                      ))}
                    </div>

                    <div className="md-eps">
                      {selSeason && selShow.seasons[selSeason].map(([st,n])=>(
                        <div key={n} className={`md-epc ${st}`}>{n}</div>
                      ))}
                    </div>

                    <div className="md-legend">
                      <div className="md-leg"><i style={{background:"var(--live-dim)",border:"1px solid rgba(55,217,196,.3)"}}/>Owned</div>
                      <div className="md-leg"><i style={{border:"1px dashed rgba(255,93,108,.6)"}}/>Missing</div>
                      <div className="md-leg"><i style={{background:"var(--signal-dim)",border:"1px solid rgba(255,180,67,.4)"}}/>New</div>
                      <div className="md-leg"><i style={{background:"var(--surface2)"}}/>Not aired</div>
                    </div>

                    {selShow.status==="miss" && (
                      backfilled[selShow.id] ? (
                        <button className="md-backfill done"><Check size={17}/> Queued {selShow.missing} to Download Station</button>
                      ) : (
                        <button className="md-backfill" onClick={()=>setBackfilled(b=>({...b,[selShow.id]:true}))}>
                          <Download size={17}/> Backfill {selShow.missing} missing
                        </button>
                      )
                    )}
                  </>
                )}

                {selShow.kind==="movie" && (
                  <>
                    <div className="md-autobar">
                      <div className="md-autobar-l">
                        <b>Watch for 4K upgrade</b>
                        <span>Currently 2160p · best available</span>
                      </div>
                      <div className={`md-tg ${selShow.auto?"on":""}`} onClick={()=>toggleAuto(selShow.id)}><i/></div>
                    </div>
                    {renderSubs(selShow)}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* ---------- ADD CATEGORY SHEET ---------- */}
        {addCat && (
          <>
            <div className="md-scrim" onClick={()=>{setAddCat(false);setCatName("");}}/>
            <div className="md-sheet">
              <div className="md-sheet-grip"/>
              <div className="md-sheet-scroll">
                <div className="md-sheet-title md-disp" style={{padding:"4px 0 6px"}}>
                  New {libMode==="tv"?"TV":"movie"} category
                </div>
                <div className="md-sec-sub" style={{lineHeight:1.5}}>
                  Name it and point it at a folder on your NAS. It gets scanned, indexed, and shown here — same as adding a library in DS Video Station.
                </div>
                <div className="md-flabel">Category name</div>
                <input className="md-input" autoFocus
                  placeholder={libMode==="tv"?"e.g. Horror TV Shows":"e.g. Documentary"}
                  value={catName} onChange={e=>setCatName(e.target.value)}/>
                <div className="md-flabel">Library folder</div>
                <div className="md-folder">
                  <FolderOpen size={16}/>
                  {(libMode==="tv"?"T:\\TV Shows\\":"M:\\Movies\\") + (catName.trim()||"…")}
                </div>
                <button className="md-save" disabled={!catName.trim()} onClick={saveCat}>
                  <Check size={17}/> Save &amp; scan folder
                </button>
              </div>
            </div>
          </>
        )}

        {/* ---------- VOICE INPUT (assistant) ---------- */}
        {tab==="assistant" && !settingsOpen && (
          <div className="md-ai-input">
            <div className="md-ai-field">
              <input placeholder={listening?"Listening…":"Ask Deck anything"} value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") ask(input); }}/>
              <button className={`md-icobtn mic ${listening?"on":""}`}
                style={{width:34,height:34,borderRadius:10}} onClick={toggleMic}><Mic size={17}/></button>
            </div>
            <button className="md-icobtn send" onClick={()=>ask(input)}><Send size={19}/></button>
          </div>
        )}

        {/* ---------- SETTINGS ---------- */}
        {settingsOpen && (
          <div className="md-settings">
            <div className="md-set-top">
              <ArrowLeft size={22} onClick={()=>{setSettingsOpen(false);setSettingsCat(null);}}/>
              <b>Settings</b>
            </div>
            <div className="md-set-body">
              <div className="md-sec-sub" style={{lineHeight:1.5,marginBottom:2}}>
                Set up what the system does here. Anything you enable shows in Schedules, then acts on the categories you switch on below.
              </div>

              <div className="md-set-group">Automations</div>
              <div className="md-set-cat">
                {FEATURES.map(f=>{
                  const Ic = f.icon; const on = features[f.key];
                  return (
                    <div key={f.key} className="md-catrow">
                      <div className="md-catrow-l">
                        <div className="md-catrow-ic" style={on?{color:f.color}:{}}><Ic size={16}/></div>
                        <div className="md-catrow-tx"><b>{f.name}</b><span>{f.desc}</span></div>
                      </div>
                      <div className={`md-tg ${on?"on":""}`} onClick={()=>toggleFeature(f.key)}
                           style={on?{background:f.color,borderColor:f.color}:{}}><i/></div>
                    </div>
                  );
                })}
              </div>
              <div className="md-sec-sub" style={{lineHeight:1.5,margin:"2px 2px 0"}}>
                Turn a feature on here, then choose which categories it runs on below. Enabled features appear in Schedules.
              </div>

              <div className="md-set-group">TV Shows</div>
              {TV_CATS.filter(c=>c!=="All").map(c=>renderSetCat("tv",c))}
              <div className="md-set-group">Movies</div>
              {MOVIE_CATS.filter(c=>c!=="All").map(c=>renderSetCat("movies",c))}
              <div className="md-set-group">System</div>
              <div className="md-chips" style={{marginTop:0}}>
                <div className="md-chip ok"><span className="dot"/>NAS 192.168.0.100</div>
                <div className="md-chip ok"><span className="dot"/>Sonarr</div>
                <div className="md-chip ok"><span className="dot"/>Download Station</div>
                <div className="md-chip ok"><span className="dot"/>TMDB</div>
                <div className="md-chip ok"><span className="dot"/>Claude API</div>
                <div className="md-chip ok"><span className="dot"/>ntfy push</div>
              </div>
              <div className="md-chips">
                <div className="md-chip">Subtitles · Thai</div>
                <div className="md-chip">T:\ 12TB · TV</div>
                <div className="md-chip">M:\ 4TB · Movies</div>
              </div>
            </div>
          </div>
        )}

        {/* ---------- BOTTOM NAV ---------- */}
        <div className="md-nav">
          {[
            {id:"signal",label:"Signal",Ic:Radio},
            {id:"library",label:"Library",Ic:LayoutGrid},
            {id:"assistant",label:"Deck",Ic:Sparkles,center:true},
            {id:"schedules",label:"Schedules",Ic:SlidersHorizontal},
            {id:"activity",label:"Activity",Ic:ActivityIcon},
          ].map(t=> t.center ? (
            <div key={t.id} className={`md-tab center ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>
              <div className="md-tab-orb"><t.Ic size={21}/></div>
              <span>{t.label}</span>
            </div>
          ) : (
            <div key={t.id} className={`md-tab ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>
              <t.Ic size={21}/>
              <span>{t.label}</span>
              <div className="md-tab-ind"/>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
