import { useState, useEffect } from "react";
import {
  X,
  Flame,
  Sparkles,
  CheckCircle2,
  Bot,
  Trophy,
  User,
} from "lucide-react";

const VOTER_ID_KEY = "oshi_wars_voter_id";

export function VersusArena({
  matchup,
  characters,
  isOpen,
  isAdminLoggedIn = false,
  onClose,
  onVoteMatchup,
  onAdvanceMatchup,
  onFetchCommentary,
}) {
  const [voterId, setVoterId] = useState(() => {
    try {
      return localStorage.getItem(VOTER_ID_KEY) || "";
    } catch {
      return "";
    }
  });
  const [votedCharId, setVotedCharId] = useState(null);
  const [voteError, setVoteError] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [commentary, setCommentary] = useState(matchup.aiCommentary || null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const roster = Array.isArray(characters) ? characters : [];
  const char1 = roster.find((c) => c.id === matchup.character1Id) || null;
  const char2 = roster.find((c) => c.id === matchup.character2Id) || null;

  const voters = Array.isArray(matchup.voters) ? matchup.voters : [];
  const alreadyVotedServer = voters.some(
    (id) => id.toLowerCase() === voterId.trim().toLowerCase()
  );

  useEffect(() => {
    setVotedCharId(null);
    setVoteError(null);
    setCommentary(matchup.aiCommentary || null);
    try {
      setVoterId(localStorage.getItem(VOTER_ID_KEY) || "");
    } catch {
      setVoterId("");
    }
  }, [matchup.id]);

  useEffect(() => {
    if (char1 && char2 && !commentary && isOpen) {
      handleGetCommentary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, matchup.id]);

  const handleGetCommentary = async () => {
    if (!char1 || !char2) return;
    setIsLoadingAi(true);
    try {
      const text = await onFetchCommentary(char1, char2, matchup.roundName);
      setCommentary(text);
    } catch {
      setCommentary(
        `Intense matchup between ${char1.name} and ${char2.name}! Cast your votes!`
      );
    } finally {
      setIsLoadingAi(false);
    }
  };

  if (!isOpen || !char1 || !char2) return null;

  const totalVotes = matchup.votes1 + matchup.votes2;
  const pct1 =
    totalVotes > 0 ? Math.round((matchup.votes1 / totalVotes) * 100) : 50;
  const pct2 = totalVotes > 0 ? 100 - pct1 : 50;

  const handleVoterIdChange = (e) => {
    const val = e.target.value;
    setVoterId(val);
    try {
      localStorage.setItem(VOTER_ID_KEY, val);
    } catch {
      /* private / blocked storage */
    }
    setVoteError(null);
  };

  const handleVote = async (charId) => {
    const cleanId = voterId.trim();
    if (!cleanId) {
      setVoteError("Enter your allowed Voter ID before voting.");
      return;
    }
    if (matchup.isCompleted) {
      setVoteError("This matchup is already completed.");
      return;
    }
    if (alreadyVotedServer || votedCharId) {
      setVoteError("Already voted");
      return;
    }

    setIsVoting(true);
    setVoteError(null);
    const result = await onVoteMatchup(matchup.id, charId, cleanId);
    setIsVoting(false);

    if (result?.success) {
      setVotedCharId(charId);
    } else {
      setVoteError(result?.error || "Failed to vote.");
    }
  };

  const voteLocked =
    matchup.isCompleted || alreadyVotedServer || !!votedCharId || isVoting;

  const renderFighter = (char, votes, pct, isWinner) => (
    <div className={`ow-fighter${isWinner ? " won" : ""}`}>
      {char.seed && <span className="ow-seed">Seed #{char.seed}</span>}
      {isWinner && (
        <span className="ow-badge" style={{ alignSelf: "flex-end" }}>
          <Trophy size={14} /> Victor
        </span>
      )}
      <img
        src={char.avatarUrl}
        alt={char.name}
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(char.name)}`;
        }}
      />
      <h4>{char.name}</h4>
      {char.quote && (
        <p className="ow-muted" style={{ fontStyle: "italic" }}>
          “{char.quote}”
        </p>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.85rem",
          fontWeight: 700,
        }}
      >
        <span>
          {votes} vote{votes === 1 ? "" : "s"}
        </span>
        <span>{pct}%</span>
      </div>
      <button
        type="button"
        className={`ow-btn${votedCharId === char.id ? " ow-btn-accent" : ""}`}
        disabled={voteLocked}
        onClick={() => handleVote(char.id)}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {votedCharId === char.id ||
        (alreadyVotedServer && !votedCharId) ? (
          <>
            <CheckCircle2 size={14} />
            {votedCharId === char.id
              ? `Voted for ${char.name}`
              : "Already voted"}
          </>
        ) : (
          <>
            <Flame size={14} /> Vote for {char.name}
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="ow-modal-backdrop" onClick={onClose}>
      <div
        className="ow-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="ow-modal-header">
          <div>
            <p className="ow-muted" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
              {matchup.roundName} · Match #{matchup.position}
            </p>
            <h3>Head-to-Head Versus</h3>
          </div>
          <button type="button" className="ow-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ow-modal-body">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              <User size={14} /> Voter ID
            </label>
            <input
              type="text"
              className="ow-btn"
              style={{
                width: "100%",
                cursor: "text",
                fontWeight: 600,
                justifyContent: "flex-start",
              }}
              value={voterId}
              onChange={handleVoterIdChange}
              placeholder="Your allowed voter ID"
              disabled={alreadyVotedServer || !!votedCharId}
            />
            <p className="ow-muted" style={{ fontSize: "0.75rem" }}>
              Saved in this browser. One vote per allowed ID for this matchup.
            </p>
            {alreadyVotedServer && (
              <p style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem" }}>
                Already voted in this matchup.
              </p>
            )}
            {voteError && (
              <p style={{ color: "#e11d48", fontWeight: 700, fontSize: "0.85rem" }}>
                {voteError}
              </p>
            )}
          </div>

          <div className="ow-versus-grid">
            {renderFighter(
              char1,
              matchup.votes1,
              pct1,
              matchup.winnerId === char1.id
            )}
            {renderFighter(
              char2,
              matchup.votes2,
              pct2,
              matchup.winnerId === char2.id
            )}
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
                fontWeight: 600,
                marginBottom: "0.4rem",
                color: "var(--text)",
              }}
            >
              <span>
                {char1.name} ({pct1}%)
              </span>
              <span>{totalVotes} total votes</span>
              <span>
                {char2.name} ({pct2}%)
              </span>
            </div>
            <div className="ow-vote-bar">
              <span style={{ width: `${pct1}%` }} />
              <span style={{ width: `${pct2}%` }} />
            </div>
          </div>

          <div className="ow-commentary">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
                gap: "0.5rem",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                }}
              >
                <Bot size={14} /> Gemini commentary
              </span>
              <button
                type="button"
                className="ow-btn"
                onClick={handleGetCommentary}
                disabled={isLoadingAi}
              >
                <Sparkles size={12} />
                {isLoadingAi ? "Analyzing..." : "Refresh"}
              </button>
            </div>
            <p>
              {isLoadingAi
                ? "Gemini is analyzing the matchup..."
                : commentary || "Vote or refresh to get commentary."}
            </p>
          </div>

          {isAdminLoggedIn && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                justifyContent: "flex-end",
                borderTop: "1px solid var(--border)",
                paddingTop: "0.75rem",
              }}
            >
              <button
                type="button"
                className="ow-btn"
                onClick={() => onAdvanceMatchup(matchup.id, char1.id)}
              >
                Declare {char1.name}
              </button>
              <button
                type="button"
                className="ow-btn"
                onClick={() => onAdvanceMatchup(matchup.id, char2.id)}
              >
                Declare {char2.name}
              </button>
              {!matchup.isCompleted && (
                <button
                  type="button"
                  className="ow-btn ow-btn-accent"
                  onClick={() => onAdvanceMatchup(matchup.id)}
                >
                  Finalize votes
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
