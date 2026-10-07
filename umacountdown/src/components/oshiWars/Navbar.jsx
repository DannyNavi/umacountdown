import { RefreshCw, Download, Shield } from "lucide-react";

export function Navbar({
  isAdminLoggedIn,
  eventMode,
  onOpenAdminModal,
  onResetEvent,
  onExport,
}) {
  return (
    <header className="ow-nav">
      <div className="ow-nav-inner">
        <div className="ow-nav-brand">
          <h1>Oshi Wars{eventMode === "chaos" ? " · Chaos" : ""}</h1>
        </div>

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
