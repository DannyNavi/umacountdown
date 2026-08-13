import { jsx, jsxs } from "react/jsx-runtime";
import { Shield, Clock, Sparkles, LogOut } from "lucide-react";
const AdminControlBar = ({
  event,
  onOpenAdminModal,
  onLogout,
  onStartQualifying,
  onSeedTournament,
  onResetEvent
}) => {
  return /* @__PURE__ */ jsx("div", { className: "bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-200 backdrop-blur-md sticky top-0 z-40", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40", children: [
        /* @__PURE__ */ jsx(Shield, { className: "w-3.5 h-3.5" }),
        "ADMIN LOGGED IN"
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "text-slate-300 hidden sm:inline", children: [
        "Stage: ",
        /* @__PURE__ */ jsx("strong", { className: "text-white uppercase", children: event.stage })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
      event.stage === "qualifying" && /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => onSeedTournament(),
          className: "px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[11px] transition-all flex items-center gap-1 shadow-sm active:scale-95",
          children: [
            /* @__PURE__ */ jsx(Sparkles, { className: "w-3.5 h-3.5 fill-white" }),
            /* @__PURE__ */ jsx("span", { children: "Lock & Seed 32 Bracket" })
          ]
        }
      ),
      event.stage !== "qualifying" && /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => onStartQualifying(24),
          className: "px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] transition-all flex items-center gap-1 shadow-sm active:scale-95",
          children: [
            /* @__PURE__ */ jsx(Clock, { className: "w-3.5 h-3.5 fill-slate-950" }),
            /* @__PURE__ */ jsx("span", { children: "Start 24h Qualifying" })
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: onOpenAdminModal,
          className: "px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-all",
          children: "Full Admin Panel"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: onLogout,
          title: "Log Out Admin",
          className: "p-1 text-slate-400 hover:text-rose-400 transition-colors",
          children: /* @__PURE__ */ jsx(LogOut, { className: "w-4 h-4" })
        }
      )
    ] })
  ] }) });
};
export {
  AdminControlBar
};
