import { Trophy, Flame, RefreshCw, Download, Shield } from "lucide-react";

export function Navbar({
  stage,
  currentRoundName,
  isAdminLoggedIn,
  onOpenAdminModal,
  onResetEvent,
  onExport,
}) {
  const stageLabel = (() => {
    switch (stage) {
      case "qualifying":
        return "24h Top 5 Qualifying";
      case "completed":
        return "Tournament Crowned";
      default:
        return `Bracket · ${currentRoundName || "Live Rounds"}`;
    }
  })();

  return (
    <header className="ow-nav">
      <div className="ow-nav-inner">
        <div className="ow-nav-brand">
          <h1>Oshi Wars</h1>
          <p>Uma Musume 1v1 single-elimination turf battles</p>
        </div>

        <span className="ow-badge">
          {stage === "completed" ? (
            <Trophy size={14} />
          ) : (
            <Flame size={14} />
          )}
          {stageLabel}
        </span>

        <div className="ow-nav-actions">
          {onOpenAdminModal && (
            <button
              type="button"
              className={`ow-btn${isAdminLoggedIn ? " ow-btn-accent" : ""}`}
              onClick={onOpenAdminModal}
              title="Tournament Admin Controls"
            >
              <Shield size={14} />
              {isAdminLoggedIn ? "Admin Panel" : "Admin Login"}
            </button>
          )}
          <button
            type="button"
            className="ow-btn"
            onClick={onExport}
            title="Export Tournament JSON"
          >
            <Download size={14} />
            Export
          </button>
          {isAdminLoggedIn && (
            <button
              type="button"
              className="ow-btn"
              onClick={onResetEvent}
              title="Reset Tournament"
            >
              <RefreshCw size={14} />
              Reset
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
