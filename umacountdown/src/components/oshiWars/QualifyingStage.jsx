import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import {
  Trophy,
  Flame,
  Sparkles,
  Search,
  X,
  User,
  CheckCircle2,
  Award,
  History,
  Star,
  ChevronDown
} from "lucide-react";
const RANK_CONFIGS = [
  { rank: 1, points: 5, label: "1st Choice", badge: "\u{1F947} 1st Place", color: "border-amber-500/60 bg-amber-500/10 text-amber-300 ring-amber-500/30" },
  { rank: 2, points: 4, label: "2nd Choice", badge: "\u{1F948} 2nd Place", color: "border-slate-300/60 bg-slate-300/10 text-slate-200 ring-slate-300/30" },
  { rank: 3, points: 3, label: "3rd Choice", badge: "\u{1F949} 3rd Place", color: "border-amber-700/60 bg-amber-700/10 text-amber-400 ring-amber-700/30" },
  { rank: 4, points: 2, label: "4th Choice", badge: "\u{1F3C5} 4th Place", color: "border-indigo-500/60 bg-indigo-500/10 text-indigo-300 ring-indigo-500/30" },
  { rank: 5, points: 1, label: "5th Choice", badge: "\u{1F396}\uFE0F 5th Place", color: "border-rose-500/60 bg-rose-500/10 text-rose-300 ring-rose-500/30" }
];
const QualifyingStage = ({
  characters,
  maxTournamentSize = 32,
  ballots = [],
  qualifyingEndTime,
  onSubmitBallot,
  onSeedTournament
}) => {
  const targetTournamentSize = maxTournamentSize || 32;
  const [voterId, setVoterId] = useState(() => {
    try {
      return localStorage.getItem("oshi_wars_voter_id") || "";
    } catch {
      return "";
    }
  });
  const [timeLeftStr, setTimeLeftStr] = useState("24:00:00");
  useEffect(() => {
    if (!qualifyingEndTime) return;
    const updateTimer = () => {
      const diff = new Date(qualifyingEndTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeftStr("Qualifying Closed");
        return;
      }
      const hrs = Math.floor(diff / (1e3 * 60 * 60));
      const mins = Math.floor(diff % (1e3 * 60 * 60) / (1e3 * 60));
      const secs = Math.floor(diff % (1e3 * 60) / 1e3);
      setTimeLeftStr(
        `${hrs.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1e3);
    return () => clearInterval(interval);
  }, [qualifyingEndTime]);
  const [selectedTop5, setSelectedTop5] = useState([null, null, null, null, null]);
  const [searchInputs, setSearchInputs] = useState(["", "", "", "", ""]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [viewTab, setViewTab] = useState("leaderboard");
  const [filterCategory, setFilterCategory] = useState("all");
  const containerRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenDropdownIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleVoterIdChange = (e) => {
    const val = e.target.value;
    setVoterId(val);
    try {
      localStorage.setItem("oshi_wars_voter_id", val);
    } catch {
      /* private / blocked storage */
    }
  };
  const handleSelectCharacter = (rankIdx, char) => {
    const newTop5 = [...selectedTop5];
    newTop5[rankIdx] = char;
    setSelectedTop5(newTop5);
    const newSearch = [...searchInputs];
    newSearch[rankIdx] = char.name;
    setSearchInputs(newSearch);
    setOpenDropdownIndex(null);
    setErrorMsg(null);
  };
  const handleClearSlot = (rankIdx) => {
    const newTop5 = [...selectedTop5];
    newTop5[rankIdx] = null;
    setSelectedTop5(newTop5);
    const newSearch = [...searchInputs];
    newSearch[rankIdx] = "";
    setSearchInputs(newSearch);
  };
  const existingBallot = ballots.find(
    (b) => b.voterId.toLowerCase() === voterId.trim().toLowerCase()
  );
  const handleLoadExistingBallot = () => {
    if (!existingBallot) return;
    const loadedTop5 = [null, null, null, null, null];
    const loadedSearch = ["", "", "", "", ""];
    existingBallot.choices.forEach((ch) => {
      const char = characters.find((c) => c.id === ch.characterId);
      if (char && ch.rank >= 1 && ch.rank <= 5) {
        loadedTop5[ch.rank - 1] = char;
        loadedSearch[ch.rank - 1] = char.name;
      }
    });
    setSelectedTop5(loadedTop5);
    setSearchInputs(loadedSearch);
    setErrorMsg("Already voted — your ballot is locked and cannot be changed.");
    setSubmitSuccess(null);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!voterId.trim()) {
      setErrorMsg("Please enter your allowed Voter ID.");
      return;
    }
    if (existingBallot) {
      setErrorMsg("Already voted");
      return;
    }
    const filledSelections = selectedTop5.map((char, idx) => char ? { rank: idx + 1, characterId: char.id } : null).filter((item) => item !== null);
    if (filledSelections.length === 0) {
      setErrorMsg("Please choose at least 1 Uma Musume in your top 5 rankings.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    if (onSubmitBallot) {
      const result = await onSubmitBallot(voterId.trim(), filledSelections);
      if (result?.success) {
        setSubmitSuccess(`Ballot registered for ${voterId.trim()}!`);
        setSelectedTop5([null, null, null, null, null]);
        setSearchInputs(["", "", "", "", ""]);
        setTimeout(() => setSubmitSuccess(null), 5e3);
      } else {
        setErrorMsg(result?.error || "Failed to submit ballot. Please try again.");
      }
    }
    setIsSubmitting(false);
  };
  const sortedCharacters = [...characters].sort((a, b) => {
    if ((b.qualifyingScore || 0) !== (a.qualifyingScore || 0)) {
      return (b.qualifyingScore || 0) - (a.qualifyingScore || 0);
    }
    if ((b.firstPlaceVotes || 0) !== (a.firstPlaceVotes || 0)) {
      return (b.firstPlaceVotes || 0) - (a.firstPlaceVotes || 0);
    }
    return (b.qualifyingVotesCount || 0) - (a.qualifyingVotesCount || 0);
  });
  const categories = ["all", ...Array.from(new Set(characters.map((c) => c.category).filter(Boolean)))];
  const filteredCharacters = filterCategory === "all" ? sortedCharacters : sortedCharacters.filter((c) => c.category === filterCategory);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-8 animate-fade-in", ref: containerRef, children: [
    /* @__PURE__ */ jsxs("div", { className: "relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-10 shadow-2xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative z-10 max-w-4xl space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30", children: [
            /* @__PURE__ */ jsx(Flame, { className: "w-4 h-4 text-amber-400 animate-bounce" }),
            /* @__PURE__ */ jsx("span", { children: "Phase 1: 24-Hour Qualifying Window" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm", children: [
            /* @__PURE__ */ jsx(Star, { className: "w-3.5 h-3.5 text-rose-400 animate-spin" }),
            /* @__PURE__ */ jsxs("span", { children: [
              "Time Remaining: ",
              timeLeftStr
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("h1", { className: "text-3xl sm:text-5xl font-black text-white tracking-tight", children: "QUALIFIERS" }),
        /* @__PURE__ */ jsxs("p", { className: "text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl", children: [
          //            Voter for your <strong>Top 5 Umas</strong>! Points are awarded in reverse order (Rank 1 = 5 pts down to Rank 5 = 1 pt)

          "Vote for your ",
          /* @__PURE__ */ jsx("strong", { children: "Top 5 Umas" }),
          "! Points are awarded in reverse order (Rank 1 = 5 pts down to Rank 5 = 1 pt)"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "pt-2 flex flex-wrap items-center gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-2", children: [
            /* @__PURE__ */ jsx(Trophy, { className: "w-4 h-4 text-amber-400" }),
            /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-amber-300", children: "32 Contender Playoff Seeds" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-2 text-xs text-slate-300", children: [
            /* @__PURE__ */ jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-400" }),
            /* @__PURE__ */ jsx("span", { children: "1 Ballot Per Trainer ID" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-rose-600/10 via-amber-500/10 to-transparent pointer-events-none" })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "bg-slate-900/90 rounded-3xl border border-rose-500/30 p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-rose-400 font-extrabold text-sm uppercase tracking-wider mb-1", children: [
            /* @__PURE__ */ jsx(Award, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsx("span", { children: "Cast Official Ballot" })
          ] }),
          /* @__PURE__ */ jsx("h2", { className: "text-xl sm:text-2xl font-black text-white", children: "Select Your Top 5 Contenders" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400 mt-1", children: "Start typing an Uma in each box to expand choices and autofill your ranking." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "w-full md:w-80 space-y-1.5", children: [
          /* @__PURE__ */ jsxs("label", { className: "block text-xs font-bold text-slate-300 flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(User, { className: "w-3.5 h-3.5 text-rose-400" }),
            /* @__PURE__ */ jsx("span", { children: "Trainer ID*" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: voterId,
                onChange: handleVoterIdChange,
                placeholder: "Your allowed voter ID",
                required: true,
                className: "w-full bg-slate-950/80 border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-3.5 py-2 text-sm font-semibold text-white placeholder-slate-500 transition-all outline-none"
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "absolute right-3 top-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider", children: "ID Tag" })
          ] }),
          existingBallot ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-[11px] pt-1 text-amber-400", children: [
            /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Already voted — ballot locked" }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: handleLoadExistingBallot,
                className: "font-bold underline hover:text-amber-300 transition-colors",
                children: "View My Choices"
              }
            )
          ] }) : /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500", children: "Saved in this browser after you enter it. One ballot per allowed ID." })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-4", children: RANK_CONFIGS.map((cfg, idx) => {
        const selected = selectedTop5[idx];
        const isOpen = openDropdownIndex === idx;
        const query = searchInputs[idx] || "";
        const available = characters.filter((c) => {
          const alreadyPickedInOtherSlot = selectedTop5.some((sel, sIdx) => sel && sel.id === c.id && sIdx !== idx);
          if (alreadyPickedInOtherSlot) return false;
          if (!query.trim()) return true;
          return c.name.toLowerCase().includes(query.toLowerCase()) || c.series.toLowerCase().includes(query.toLowerCase());
        });
        return /* @__PURE__ */ jsxs("div", { className: "relative flex flex-col space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
            /* @__PURE__ */ jsx("span", { className: `px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${cfg.color}`, children: cfg.badge }),
            /* @__PURE__ */ jsxs("span", { className: "font-black text-amber-400 text-xs", children: [
              "+",
              cfg.points,
              " ",
              cfg.points === 1 ? "pt" : "pts"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            selected ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-2 bg-slate-950 border border-slate-700 rounded-xl shadow-md space-x-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2.5 min-w-0", children: [
                /* @__PURE__ */ jsx(
                  "img",
                  {
                    src: selected.avatarUrl,
                    alt: selected.name,
                    className: "w-10 h-10 rounded-lg object-cover border border-slate-700 bg-slate-800 shrink-0",
                    onError: (e) => {
                      e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(selected.name)}`;
                    }
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-xs font-bold text-white truncate", children: selected.name }),
                  /* @__PURE__ */ jsx("p", { className: "text-[10px] text-rose-400 truncate", children: selected.series })
                ] })
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => handleClearSlot(idx),
                  className: "p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0",
                  title: "Remove selection",
                  children: /* @__PURE__ */ jsx(X, { className: "w-4 h-4" })
                }
              )
            ] }) : /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  value: query,
                  onFocus: () => setOpenDropdownIndex(idx),
                  onChange: (e) => {
                    const newSearch = [...searchInputs];
                    newSearch[idx] = e.target.value;
                    setSearchInputs(newSearch);
                    setOpenDropdownIndex(idx);
                  },
                  placeholder: `Search Uma...`,
                  className: "w-full bg-slate-950/90 border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl pl-8 pr-7 py-2.5 text-xs text-white placeholder-slate-500 transition-all outline-none"
                }
              ),
              /* @__PURE__ */ jsx(Search, { className: "w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" }),
              /* @__PURE__ */ jsx(ChevronDown, { className: "w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-3 pointer-events-none" })
            ] }),
            isOpen && !selected && /* @__PURE__ */ jsx("div", { className: "absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-800/60 animate-in fade-in slide-in-from-top-2 duration-150", children: available.length > 0 ? available.map((char) => /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onMouseDown: (e) => {
                  e.preventDefault();
                  handleSelectCharacter(idx, char);
                },
                className: "w-full text-left p-2.5 flex items-center space-x-2.5 hover:bg-slate-800 transition-colors group",
                children: [
                  /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: char.avatarUrl,
                      alt: char.name,
                      className: "w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0",
                      onError: (e) => {
                        e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(char.name)}`;
                      }
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsx("p", { className: "text-xs font-bold text-slate-200 group-hover:text-rose-300 truncate", children: char.name }),
                    /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-400 truncate", children: char.series })
                  ] })
                ]
              },
              char.id
            )) : /* @__PURE__ */ jsx("div", { className: "p-3 text-center text-xs text-slate-400 italic", children: "No matching Umas found" }) })
          ] })
        ] }, cfg.rank);
      }) }),
      /* @__PURE__ */ jsxs("div", { className: "pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-xs space-y-1", children: [
          submitSuccess && /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl", children: [
            /* @__PURE__ */ jsx(CheckCircle2, { className: "w-4 h-4 shrink-0" }),
            /* @__PURE__ */ jsx("span", { children: submitSuccess })
          ] }),
          errorMsg && /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 text-rose-400 font-bold bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl", children: [
            /* @__PURE__ */ jsx(X, { className: "w-4 h-4 shrink-0" }),
            /* @__PURE__ */ jsx("span", { children: errorMsg })
          ] }),
          !submitSuccess && !errorMsg && /* @__PURE__ */ jsxs("p", { className: "text-slate-400", children: [
            "Total Ballot Value: ",
            /* @__PURE__ */ jsx("strong", { className: "text-amber-400", children: "15 Points" }),
            " distributed across selected ranks."
          ] })
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "submit",
            disabled: isSubmitting || !!existingBallot,
            className: "w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-xl shadow-rose-600/25 active:scale-95 transition-all disabled:opacity-50",
            children: [
              /* @__PURE__ */ jsx(Sparkles, { className: "w-4 h-4 fill-white" }),
              /* @__PURE__ */ jsx("span", { children: isSubmitting ? "Submitting Ballot..." : "Submit Official Top 5 Ballot" })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setViewTab("leaderboard"),
            className: `inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewTab === "leaderboard" ? "bg-rose-500 text-white shadow-md" : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"}`,
            children: [
              /* @__PURE__ */ jsx(Trophy, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxs("span", { children: [
                "Points Standings Leaderboard (",
                characters.length,
                ")"
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setViewTab("ballots"),
            className: `inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewTab === "ballots" ? "bg-rose-500 text-white shadow-md" : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"}`,
            children: [
              /* @__PURE__ */ jsx(History, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxs("span", { children: [
                "Recent Ballots Cast (",
                ballots.length,
                ")"
              ] })
            ]
          }
        )
      ] }),
      viewTab === "leaderboard" && /* @__PURE__ */ jsxs("div", { className: "hidden sm:flex items-center space-x-1.5 text-xs text-slate-400", children: [
        /* @__PURE__ */ jsx("span", { children: "Filter:" }),
        categories.slice(0, 4).map((cat) => /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setFilterCategory(cat),
            className: `px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${filterCategory === cat ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"}`,
            children: cat === "all" ? "All" : cat
          },
          cat
        ))
      ] })
    ] }),
    viewTab === "leaderboard" && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-400 px-2", children: /* @__PURE__ */ jsxs("span", { children: [
          "Top ",
          /* @__PURE__ */ jsx("strong", { className: "text-amber-400 font-bold", children: targetTournamentSize }),
          " contenders qualify for tournament seeds."
        ] }) }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4", children: filteredCharacters.map((char) => {
        const rank = sortedCharacters.findIndex((c) => c.id === char.id) + 1;
        const isQualifying = rank <= targetTournamentSize;
        return /* @__PURE__ */ jsxs(
          "div",
          {
            className: `relative rounded-2xl border transition-all overflow-hidden flex flex-col justify-between p-4 ${isQualifying ? "bg-slate-900/90 border-amber-500/40 hover:border-amber-500/80 shadow-lg shadow-amber-500/5" : "bg-slate-900/40 border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-700"}`,
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between space-x-3 mb-3", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3", children: [
                  /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                    /* @__PURE__ */ jsx(
                      "img",
                      {
                        src: char.avatarUrl,
                        alt: char.name,
                        className: "w-14 h-14 rounded-xl object-cover bg-slate-800 border border-slate-700 shadow-md",
                        onError: (e) => {
                          e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(char.name)}`;
                        }
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: `absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-md ${rank === 1 ? "bg-amber-400 text-slate-950" : rank === 2 ? "bg-slate-300 text-slate-950" : rank === 3 ? "bg-amber-700 text-white" : isQualifying ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 border border-slate-700"}`,
                        children: [
                          "#",
                          rank
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                    /* @__PURE__ */ jsx("h3", { className: "font-bold text-white text-sm truncate", children: char.name }),
                    /* @__PURE__ */ jsx("p", { className: "text-[11px] text-rose-400 truncate", children: char.series }),
                    isQualifying ? /* @__PURE__ */ jsxs("span", { className: "inline-block mt-1 text-[10px] font-bold px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30", children: [
                      "Seed #",
                      rank
                    ] }) : /* @__PURE__ */ jsx("span", { className: "inline-block mt-1 text-[10px] text-slate-500", children: "Unseeded" })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400 line-clamp-2 my-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60", children: char.quote ? `"${char.quote}"` : char.bio }),
              /* @__PURE__ */ jsxs("div", { className: "pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400", children: [
                /* @__PURE__ */ jsxs("span", { children: [
                  "In ",
                  char.qualifyingVotesCount || 0,
                  " ballots"
                ] }),
                char.firstPlaceVotes ? /* @__PURE__ */ jsxs("span", { className: "text-amber-300 font-bold", children: [
                  "\u{1F947} ",
                  char.firstPlaceVotes,
                  " 1st picks"
                ] }) : null
              ] })
            ]
          },
          char.id
        );
      }) })
    ] }),
    viewTab === "ballots" && /* @__PURE__ */ jsxs("div", { className: "bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4", children: [
      /* @__PURE__ */ jsxs("h3", { className: "text-base font-bold text-white flex items-center space-x-2", children: [
        /* @__PURE__ */ jsx(History, { className: "w-5 h-5 text-rose-400" }),
        /* @__PURE__ */ jsx("span", { children: "Recent Official Top 5 Ballots Cast" })
      ] }),
      ballots.length > 0 ? /* @__PURE__ */ jsx("div", { className: "space-y-3", children: ballots.map((b) => /* @__PURE__ */ jsxs("div", { className: "p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs border-b border-slate-800 pb-2", children: [
          /* @__PURE__ */ jsxs("span", { className: "font-bold text-rose-300 flex items-center space-x-1", children: [
            /* @__PURE__ */ jsx(User, { className: "w-3.5 h-3.5" }),
            /* @__PURE__ */ jsxs("span", { children: [
              "Trainer / Voter: ",
              b.voterId
            ] })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: new Date(b.timestamp).toLocaleString() })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1", children: b.choices.map((ch) => {
          const char = characters.find((c) => c.id === ch.characterId);
          const rankCfg = RANK_CONFIGS.find((r) => r.rank === ch.rank);
          return /* @__PURE__ */ jsxs("div", { className: "p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center space-x-2", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0", children: [
              "#",
              ch.rank,
              " (",
              ch.points,
              "pt)"
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-white truncate", children: char ? char.name : "Unknown Uma" })
          ] }, ch.rank);
        }) })
      ] }, b.id)) }) : /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-400 py-8 text-center italic", children: "No ballots submitted yet. Be the first voter to cast your top 5!" })
    ] })
  ] });
};
export {
  QualifyingStage
};
