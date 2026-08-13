import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Shield, Lock, Play, Sparkles, RefreshCw, X, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { ManualBracketBuilder } from "./ManualBracketBuilder";
const AdminModal = ({
  isOpen,
  isAdminLoggedIn,
  event,
  onClose,
  onLogin,
  onLogout,
  onStartQualifying,
  onSeedTournament,
  onManualBracket,
  onResetEvent
}) => {
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(null);
  const [qualifyingHours, setQualifyingHours] = useState(24);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  if (!isOpen) return null;
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    const success = await onLogin(password);
    if (!success) {
      setLoginError('Incorrect password.');
    } else {
      setPassword("");
    }
  };
  const handleStartQualifyingClick = async () => {
    setActionLoading(true);
    setActionSuccess(null);
    await onStartQualifying(qualifyingHours);
    setActionLoading(false);
    setActionSuccess(`24-Hour Qualifying Stage launched! Public ballot link is active.`);
  };
  const handleSeedClick = async () => {
    setActionLoading(true);
    setActionSuccess(null);
    await onSeedTournament();
    setActionLoading(false);
    setActionSuccess(`Qualifying locked! Top 32 Umas seeded into Round 1 of 32.`);
  };
  const handleResetClick = async () => {
    if (window.confirm("Reset tournament state back to default?")) {
      setActionLoading(true);
      setActionSuccess(null);
      await onResetEvent();
      setActionLoading(false);
      setActionSuccess(`Tournament reset successfully.`);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in", children: /* @__PURE__ */ jsxs("div", { className: "bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden max-h-[92vh] overflow-y-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-4 border-b border-slate-800", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30", children: /* @__PURE__ */ jsx(Shield, { className: "w-6 h-6" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-xl font-black text-white", children: "Tournament Admin Controls" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400", children: "Manage rounds, launch qualifying, and seed brackets" })
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: onClose,
          className: "p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all",
          children: /* @__PURE__ */ jsx(X, { className: "w-5 h-5" })
        }
      )
    ] }),
    actionSuccess && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 p-3 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold", children: [
      /* @__PURE__ */ jsx(CheckCircle2, { className: "w-4 h-4 shrink-0" }),
      /* @__PURE__ */ jsx("span", { children: actionSuccess })
    ] }),
    !isAdminLoggedIn ? /* @__PURE__ */ jsxs("form", { onSubmit: handleLoginSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl text-xs text-slate-300 space-y-1", children: [
        /* @__PURE__ */ jsxs("p", { className: "font-bold text-amber-400 flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(Lock, { className: "w-3.5 h-3.5" }),
          " Admin Passcode Required"
        ] }),

      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs font-bold text-slate-300", children: "Admin Password" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            placeholder: "Enter admin password...",
            className: "w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500",
            autoFocus: true
          }
        )
      ] }),
      loginError && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs text-rose-400 font-medium", children: [
        /* @__PURE__ */ jsx(AlertCircle, { className: "w-4 h-4" }),
        /* @__PURE__ */ jsx("span", { children: loginError })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "submit",
          className: "w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95",
          children: "Log In as Tournament Admin"
        }
      )
    ] }) : (
      /* LOGGED IN: Admin Actions */
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block", children: "Current Status" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-bold text-white uppercase", children: event?.stage || "Ready" })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onLogout,
              className: "text-xs text-slate-400 hover:text-rose-400 underline",
              children: "Log Out Admin"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider", children: "Primary Admin Actions" }),
          /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsxs("h4", { className: "text-sm font-bold text-white flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx(Clock, { className: "w-4 h-4 text-amber-400" }),
                  "1. Start Qualifying Round (24h)"
                ] }),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: "Opens public Trainer ID Top 5 ballot voting with a 24-hour countdown timer." })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-xs text-slate-300 font-mono", children: [
                /* @__PURE__ */ jsx("span", { children: "Duration:" }),
                /* @__PURE__ */ jsxs(
                  "select",
                  {
                    value: qualifyingHours,
                    onChange: (e) => setQualifyingHours(Number(e.target.value)),
                    className: "bg-transparent text-amber-400 font-bold focus:outline-none",
                    children: [
                      /* @__PURE__ */ jsx("option", { value: 24, children: "24 Hours" }),
                      /* @__PURE__ */ jsx("option", { value: 12, children: "12 Hours" }),
                      /* @__PURE__ */ jsx("option", { value: 1, children: "1 Hour" })
                    ]
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: handleStartQualifyingClick,
                disabled: actionLoading,
                className: "w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2",
                children: [
                  /* @__PURE__ */ jsx(Play, { className: "w-4 h-4 fill-slate-950" }),
                  /* @__PURE__ */ jsx("span", { children: "Start Qualifying Stage" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("h4", { className: "text-sm font-bold text-white flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(Sparkles, { className: "w-4 h-4 text-rose-400" }),
                "2. Lock Qualifying & Seed 32 Bracket"
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: "Ranks candidates by Top 5 ballot points, seeds Top 32, and launches 1v1 playoff matchups." })
            ] }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: handleSeedClick,
                disabled: actionLoading,
                className: "w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2",
                children: [
                  /* @__PURE__ */ jsx(Sparkles, { className: "w-4 h-4 fill-white" }),
                  /* @__PURE__ */ jsx("span", { children: "Lock Qualifying & Launch 32 Bracket" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx(ManualBracketBuilder, {
            characters: event?.characters || [],
            targetSize: event?.maxTournamentSize || 32,
            disabled: actionLoading,
            onBuild: onManualBracket
          }),
          /* @__PURE__ */ jsx("div", { className: "pt-2", children: /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleResetClick,
              disabled: actionLoading,
              className: "w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2",
              children: [
                /* @__PURE__ */ jsx(RefreshCw, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsx("span", { children: "Reset Tournament State" })
              ]
            }
          ) })
        ] })
      ] })
    )
  ] }) });
};
export {
  AdminModal
};
