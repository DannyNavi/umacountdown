import "./oshiWars/oshiWars.css";
import { useEffect, useState } from "react";
import { Navbar } from "./oshiWars/Navbar";
import { QualifyingStage } from "./oshiWars/QualifyingStage";
import { BracketViewer } from "./oshiWars/BracketViewer";
import { ChampionPodium } from "./oshiWars/ChampionPodium";
import { ExportModal } from "./oshiWars/ExportModal";
import { AdminModal } from "./oshiWars/AdminModal";
import { AdminControlBar } from "./oshiWars/AdminControlBar";
import { Loader2, Flame } from "lucide-react";

export default function OshiWars() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    try {
      const session = localStorage.getItem("oshi_admin_session") === "true";
      const token = localStorage.getItem("oshi_admin_token");
      if (session && !token) {
        localStorage.removeItem("oshi_admin_session");
        return false;
      }
      return session && !!token;
    } catch {
      return false;
    }
  });

  const EVENT_ID = "oshi-wars-2026";

  const fetchEvent = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`/api/events/${EVENT_ID}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(
          `Server returned ${res.status}. If this only fails on one network, try phone hotspot.`
        );
      }
      const data = await res.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Invalid tournament data from server");
      }
      setEvent(data);
      if (silent) setLoadError(null);
    } catch (err) {
      console.error("Error fetching event:", err);
      // Keep the current UI on background refreshes; only hard-fail initial loads.
      if (silent) return;
      if (err?.name === "AbortError") {
        setLoadError(
          "Request timed out. Desktop Wi‑Fi or a filter may be blocking the API — try phone data or another network."
        );
      } else if (
        typeof err?.message === "string" &&
        /Failed to fetch|NetworkError|Load failed/i.test(err.message)
      ) {
        setLoadError(
          "Network blocked the tournament API. Common on PC Wi‑Fi with firewalls/ad‑blockers — try disabling extensions or using phone hotspot."
        );
      } else {
        setLoadError(err?.message || "Failed to load tournament");
      }
      setEvent(null);
    } finally {
      clearTimeout(timeoutId);
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, []);

  // Chaos round clocks: refresh often enough to auto-resolve when a 24h window ends.
  useEffect(() => {
    if (event?.stage !== "bracket" || !event?.roundEndTime) return undefined;
    const id = setInterval(() => {
      fetchEvent({ silent: true });
    }, 60_000);
    const endMs = new Date(event.roundEndTime).getTime();
    const untilEnd = endMs - Date.now();
    let endTimer;
    if (untilEnd > 0 && untilEnd < 24 * 60 * 60 * 1000 + 5_000) {
      endTimer = setTimeout(() => fetchEvent({ silent: true }), untilEnd + 500);
    }
    return () => {
      clearInterval(id);
      if (endTimer) clearTimeout(endTimer);
    };
  }, [event?.stage, event?.roundEndTime, event?.currentRound]);

  const handleAdminLogin = async (password) => {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data?.token) {
          console.error("Admin login succeeded without a token");
          return false;
        }
        setIsAdminLoggedIn(true);
        try {
          localStorage.setItem("oshi_admin_session", "true");
          localStorage.setItem("oshi_admin_token", data.token);
        } catch {
          /* private / blocked storage */
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Admin login error:", err);
      return false;
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    try {
      localStorage.removeItem("oshi_admin_session");
      localStorage.removeItem("oshi_admin_token");
    } catch {
      /* private / blocked storage */
    }
  };

  const handleStartQualifying = async (durationHours = 24) => {
    try {
      const token = localStorage.getItem("oshi_admin_token");
      if (!token) {
        alert("Admin login required to start qualifying.");
        return;
      }
      const res = await fetch(`/api/events/${EVENT_ID}/start-qualifying`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ durationHours }),
      });
      if (res.ok) {
        setEvent(await res.json());
      } else if (res.status === 401) {
        handleAdminLogout();
        alert("Admin session expired — log in again to start qualifying.");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to start qualifying.");
      }
    } catch (err) {
      console.error("Error starting qualifying:", err);
      alert("Failed to start qualifying.");
    }
  };

  const handleSubmitBallot = async (voterId, rankings) => {
    try {
      const res = await fetch(`/api/events/${EVENT_ID}/submit-ballot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId, rankings }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        try {
          localStorage.setItem("oshi_wars_voter_id", voterId);
        } catch {
          /* private / blocked storage */
        }
        if (data?.event) {
          setEvent(data.event);
        } else {
          await fetchEvent({ silent: true });
        }
        return { success: true };
      }
      return { success: false, error: data.error || "Failed to submit ballot." };
    } catch (err) {
      console.error("Error submitting ballot:", err);
      return { success: false, error: "Failed to submit ballot." };
    }
  };

  const handleSeedTournament = async (targetSize = 32) => {
    try {
      const res = await fetch(`/api/events/${EVENT_ID}/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxTournamentSize: targetSize }),
      });
      if (res.ok) {
        setEvent(await res.json());
      }
    } catch (err) {
      console.error("Error seeding tournament:", err);
    }
  };

  const handleChaosSeed = async () => {
    try {
      const token = localStorage.getItem("oshi_admin_token");
      if (!token) {
        return {
          success: false,
          error: "Admin session missing a token — log out and log in again.",
        };
      }
      const res = await fetch(`/api/events/${EVENT_ID}/chaos-seed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEvent(data);
        return { success: true };
      }
      // Do not force-logout on failure — a 401/5xx here was kicking admins
      // out of the panel whenever Chaos Mode failed to launch.
      return {
        success: false,
        error:
          data.error ||
          (res.status === 401
            ? "Admin auth rejected — try logging out and back in."
            : `Failed to start Chaos Mode (${res.status}).`),
      };
    } catch (err) {
      console.error("Error starting Chaos Mode:", err);
      return { success: false, error: "Failed to start Chaos Mode." };
    }
  };

  const handleManualBracket = async (characterIds, targetSize = 32) => {
    try {
      const token = localStorage.getItem("oshi_admin_token");
      if (!token) {
        return { success: false, error: "Admin session expired — log in again." };
      }
      const res = await fetch(`/api/events/${EVENT_ID}/manual-bracket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ characterIds, maxTournamentSize: targetSize }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) handleAdminLogout();
        return { success: false, error: data.error || "Failed to build bracket." };
      }
      setEvent(data);
      return { success: true };
    } catch (err) {
      console.error("Error building manual bracket:", err);
      return { success: false, error: "Failed to build bracket." };
    }
  };

  const handleVoteMatchup = async (matchupId, characterId, voterId) => {
    try {
      const res = await fetch(`/api/events/${EVENT_ID}/vote-matchup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchupId, characterId, voterId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        try {
          localStorage.setItem("oshi_wars_voter_id", voterId);
        } catch {
          /* private / blocked storage */
        }
        // Patch the voted matchup in place so the arena doesn't remount/flash.
        if (data?.matchup) {
          setEvent((prev) => {
            if (!prev?.matchups) return prev;
            return {
              ...prev,
              matchups: prev.matchups.map((m) =>
                m.id === data.matchup.id ? data.matchup : m
              ),
            };
          });
        } else {
          await fetchEvent({ silent: true });
        }
        return { success: true, matchup: data?.matchup || null };
      }
      return { success: false, error: data.error || "Failed to vote." };
    } catch (err) {
      console.error("Error voting matchup:", err);
      return { success: false, error: "Failed to vote." };
    }
  };

  const handleAdvanceMatchup = async (matchupId, winnerId) => {
    try {
      const token = localStorage.getItem("oshi_admin_token");
      if (!token) {
        console.error("Admin token required to declare a winner");
        return;
      }
      const res = await fetch(`/api/events/${EVENT_ID}/advance-matchup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ matchupId, winnerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data?.event) {
          setEvent(data.event);
        } else {
          await fetchEvent({ silent: true });
        }
      } else if (res.status === 401) {
        handleAdminLogout();
      }
    } catch (err) {
      console.error("Error advancing matchup:", err);
    }
  };

  const handleFetchCommentary = async (char1, char2, roundName) => {
    try {
      const res = await fetch("/api/ai/matchup-commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ char1, char2, roundName }),
      });
      const data = await res.json();
      return data.commentary || "An epic duel is underway!";
    } catch (err) {
      console.error("Error fetching commentary:", err);
      return "An epic duel is underway!";
    }
  };

  const handleResetEvent = async () => {
    try {
      const token = localStorage.getItem("oshi_admin_token");
      if (!token) {
        console.error("Admin login required to reset the tournament");
        alert("Admin login required to reset the tournament.");
        return;
      }
      const res = await fetch(`/api/events/${EVENT_ID}/reset`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setEvent(await res.json());
        return;
      }
      if (res.status === 401) {
        handleAdminLogout();
        alert("Admin session expired — log in again to reset.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to reset tournament.");
    } catch (err) {
      console.error("Error resetting event:", err);
      alert("Failed to reset tournament.");
    }
  };

  if (loading) {
    return (
      <div className="oshi-wars-root oshi-wars-loading">
        <Loader2 className="ow-icon-spin" size={36} color="var(--accent)" />
        <p>Loading Oshi Wars Arena...</p>
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div className="oshi-wars-root oshi-wars-loading">
        <Flame size={36} color="var(--accent)" />
        <p>Couldn&apos;t load the tournament.</p>
        <p className="ow-muted" style={{ maxWidth: "22rem" }}>
          {loadError || "Tournament data unavailable. Check your connection and try again."}
        </p>
        <button type="button" className="ow-btn ow-btn-accent" onClick={fetchEvent}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="oshi-wars-root" style={{ display: "flex", flexDirection: "column" }}>
      {isAdminLoggedIn && (
        <AdminControlBar
          event={event}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
          onLogout={handleAdminLogout}
          onStartQualifying={handleStartQualifying}
          onSeedTournament={handleSeedTournament}
          onResetEvent={handleResetEvent}
        />
      )}

      <Navbar
        isAdminLoggedIn={isAdminLoggedIn}
        eventMode={event.mode}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onResetEvent={handleResetEvent}
        onExport={() => setIsExportOpen(true)}
      />

      <main className="oshi-wars-main">
        {event.stage === "qualifying" && (
          <QualifyingStage
            characters={event.characters || []}
            maxTournamentSize={event.maxTournamentSize}
            ballots={event.ballots || []}
            qualifyingEndTime={event.qualifyingEndTime}
            onSubmitBallot={handleSubmitBallot}
            onSeedTournament={handleSeedTournament}
          />
        )}

        {event.stage !== "qualifying" && event.stage !== "completed" && (
          <BracketViewer
            event={event}
            isAdminLoggedIn={isAdminLoggedIn}
            onVoteMatchup={handleVoteMatchup}
            onAdvanceMatchup={handleAdvanceMatchup}
            onFetchCommentary={handleFetchCommentary}
          />
        )}

        {event.stage === "completed" && (
          <ChampionPodium event={event} onReset={handleResetEvent} />
        )}
      </main>

      <footer className="oshi-wars-footer">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            marginBottom: "0.25rem",
          }}
        >
          <Flame size={14} color="var(--accent)" />
          <strong>
            Oshi Wars ·{" "}
            {event.mode === "chaos" ? "Chaos Mode" : "32-Uma Tournament"}
          </strong>
        </div>
        <p>Part of Uma Countdown</p>
      </footer>

      <AdminModal
        isOpen={isAdminModalOpen}
        isAdminLoggedIn={isAdminLoggedIn}
        event={event}
        onClose={() => setIsAdminModalOpen(false)}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
        onStartQualifying={handleStartQualifying}
        onSeedTournament={() => handleSeedTournament(32)}
        onChaosSeed={handleChaosSeed}
        onManualBracket={handleManualBracket}
        onResetEvent={handleResetEvent}
      />

      <ExportModal
        event={event}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
