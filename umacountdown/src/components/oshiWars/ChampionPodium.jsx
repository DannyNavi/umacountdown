import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Crown, RotateCcw, Award } from "lucide-react";
const ChampionPodium = ({ event, onReset }) => {
  const champion = event.characters.find((c) => c.id === event.winnerId) || null;
  useEffect(() => {
    const duration = 3 * 1e3;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#f43f5e", "#8b5cf6", "#fbbf24"]
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#f43f5e", "#8b5cf6", "#fbbf24"]
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);
  if (!champion) return null;
  const championVictories = event.matchups.filter((m) => m.winnerId === champion.id);
  return /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto space-y-8 animate-fade-in text-center py-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "relative rounded-3xl overflow-hidden bg-gradient-to-b from-rose-950 via-slate-900 to-slate-950 border-2 border-amber-400/60 p-8 sm:p-12 shadow-2xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-amber-400 text-slate-950 shadow-lg mb-6", children: [
        /* @__PURE__ */ jsx(Crown, { className: "w-4 h-4 fill-slate-950" }),
        /* @__PURE__ */ jsx("span", { children: "OSHI WARS CHAMPION CROWNED" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative inline-block my-4", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute -inset-4 rounded-3xl bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 blur-lg opacity-70 animate-pulse" }),
        /* @__PURE__ */ jsx(
          "img",
          {
            src: champion.avatarUrl,
            alt: champion.name,
            referrerPolicy: "no-referrer",
            onError: (e) => {
              e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(champion.name)}`;
            },
            className: "relative w-40 h-40 sm:w-48 sm:h-48 rounded-3xl object-cover border-4 border-amber-400 shadow-2xl mx-auto"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("h1", { className: "text-3xl sm:text-5xl font-black text-white tracking-tight mt-4", children: champion.name }),
      champion.quote && /* @__PURE__ */ jsxs("p", { className: "text-sm sm:text-base text-amber-200 italic max-w-xl mx-auto mt-4 bg-slate-950/60 p-4 rounded-2xl border border-amber-500/30", children: [
        '"',
        champion.quote,
        '"'
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl mx-auto mt-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-slate-900/80 p-3 rounded-2xl border border-slate-800", children: [
          /* @__PURE__ */ jsx("span", { className: "text-[11px] text-slate-400 block", children: "Qualification Rank" }),
          /* @__PURE__ */ jsxs("span", { className: "text-lg font-black text-amber-400", children: [
            "Seed #",
            champion.seed || 1
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-slate-900/80 p-3 rounded-2xl border border-slate-800", children: [
          /* @__PURE__ */ jsx("span", { className: "text-[11px] text-slate-400 block", children: "Tournament Rounds Won" }),
          /* @__PURE__ */ jsxs("span", { className: "text-lg font-black text-rose-400", children: [
            championVictories.length,
            " Wins"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-slate-900/80 p-3 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1", children: [
          /* @__PURE__ */ jsx("span", { className: "text-[11px] text-slate-400 block", children: "Qualifying Score" }),
          /* @__PURE__ */ jsxs("span", { className: "text-lg font-black text-indigo-400", children: [
            champion.averageRating.toFixed(1),
            " \u2605"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-8 pt-6 border-t border-slate-800/80 flex justify-center", children: /* @__PURE__ */ jsxs(
        "button",
        {
          id: "btn-start-new-tournament",
          onClick: onReset,
          className: "inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 shadow-xl transition-all active:scale-95",
          children: [
            /* @__PURE__ */ jsx(RotateCcw, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsx("span", { children: "Launch New Oshi Wars Tournament" })
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-slate-900/60 rounded-3xl border border-slate-800 p-6 text-left space-y-4", children: [
      /* @__PURE__ */ jsxs("h3", { className: "text-lg font-bold text-white flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Award, { className: "w-5 h-5 text-amber-400" }),
        /* @__PURE__ */ jsx("span", { children: "Road to the Crown (Tournament Match Path)" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-3", children: championVictories.map((match, idx) => {
        const opponentId = match.character1Id === champion.id ? match.character2Id : match.character1Id;
        const opponent = event.characters.find((c) => c.id === opponentId);
        return /* @__PURE__ */ jsxs(
          "div",
          {
            className: "flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsx("span", { className: "text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30", children: match.roundName }),
                /* @__PURE__ */ jsxs("span", { className: "text-sm font-semibold text-white", children: [
                  "Defeated ",
                  /* @__PURE__ */ jsx("strong", { className: "text-rose-400", children: opponent?.name || "Opponent" })
                ] })
              ] }),
              /* @__PURE__ */ jsx("span", { className: "text-xs font-mono text-slate-400 font-bold", children: match.character1Id === champion.id ? `${match.votes1} - ${match.votes2}` : `${match.votes2} - ${match.votes1}` })
            ]
          },
          match.id
        );
      }) })
    ] })
  ] });
};
export {
  ChampionPodium
};
