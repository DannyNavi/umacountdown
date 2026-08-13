import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { X, Copy, Download, Check, Code2, Cloud } from "lucide-react";
const ExportModal = ({
  event,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;
  const eventJson = JSON.stringify(event, null, 2);
  const handleCopy = () => {
    navigator.clipboard.writeText(eventJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  const handleDownload = () => {
    const blob = new Blob([eventJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oshi-wars-${event.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in", children: /* @__PURE__ */ jsxs("div", { className: "relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2 rounded-lg bg-indigo-500/10 text-indigo-400", children: /* @__PURE__ */ jsx(Code2, { className: "w-5 h-5" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-white", children: "Export Tournament Config" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-400", children: "JSON schema for Cloudflare Workers / KV persistence" })
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          id: "btn-close-export-modal",
          onClick: onClose,
          className: "p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors",
          children: /* @__PURE__ */ jsx(X, { className: "w-5 h-5" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4 overflow-y-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-start gap-3 text-xs text-indigo-300", children: [
        /* @__PURE__ */ jsx(Cloud, { className: "w-5 h-5 text-indigo-400 shrink-0 mt-0.5" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "font-bold", children: "Cloudflare Workers Ready!" }),
          /* @__PURE__ */ jsxs("p", { className: "mt-0.5 text-indigo-300/80", children: [
            "You can save this JSON payload directly into Cloudflare KV using ",
            /* @__PURE__ */ jsxs("code", { className: "bg-indigo-950 px-1 py-0.5 rounded text-indigo-200", children: [
              'env.OSHI_WARS_KV.put("',
              event.id,
              '", JSON.stringify(data))'
            ] }),
            " or deploy it to any server environment."
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "relative", children: /* @__PURE__ */ jsx("pre", { className: "p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono overflow-x-auto max-h-72", children: eventJson }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/50", children: [
      /* @__PURE__ */ jsxs("span", { className: "text-xs text-slate-500", children: [
        event.characters.length,
        " Nominees \u2022 ",
        event.matchups.length,
        " Bracket Matches"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleCopy,
            className: "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all",
            children: copied ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Check, { className: "w-4 h-4 text-emerald-400" }),
              /* @__PURE__ */ jsx("span", { className: "text-emerald-400", children: "Copied!" })
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Copy, { className: "w-4 h-4 text-slate-400" }),
              /* @__PURE__ */ jsx("span", { children: "Copy JSON" })
            ] })
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleDownload,
            className: "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20",
            children: [
              /* @__PURE__ */ jsx(Download, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsx("span", { children: "Download File" })
            ]
          }
        )
      ] })
    ] })
  ] }) });
};
export {
  ExportModal
};
