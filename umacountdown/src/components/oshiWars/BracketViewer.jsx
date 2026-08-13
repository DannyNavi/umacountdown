import { useState } from "react";
import { VersusArena } from "./VersusArena";
import { Trophy, Crown } from "lucide-react";

export function BracketViewer({
  event,
  isAdminLoggedIn = false,
  onVoteMatchup,
  onAdvanceMatchup,
  onFetchCommentary,
}) {
  const [activeMatchup, setActiveMatchup] = useState(null);

  const matchups = Array.isArray(event?.matchups) ? event.matchups : [];
  const characters = Array.isArray(event?.characters) ? event.characters : [];

  const roundNumbers = Array.from(
    new Set(matchups.map((m) => m.round))
  ).sort((a, b) => a - b);

  const getCharacter = (id) => {
    if (!id) return null;
    return characters.find((c) => c.id === id) || null;
  };

  const champion = event.winnerId ? getCharacter(event.winnerId) : null;

  return (
    <div className="ow-bracket">
      <div className="ow-panel ow-bracket-header">
        <h2>Tournament Bracket</h2>
        <p className="ow-muted">
          Click any matchup to open the Versus Arena and cast a vote.
        </p>
      </div>

      {champion && (
        <div className="ow-champion-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ position: "relative" }}>
              <img
                src={champion.avatarUrl}
                alt={champion.name}
                referrerPolicy="no-referrer"
              />
              <Crown
                size={20}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  color: "var(--accent)",
                }}
              />
            </div>
            <div>
              <span className="ow-badge">Oshi Wars Champion</span>
              <h3 style={{ marginTop: "0.4rem" }}>{champion.name}</h3>
            </div>
          </div>
          <p className="ow-muted" style={{ fontStyle: "italic", maxWidth: 320 }}>
            “{champion.quote || "The ultimate oshi of the year!"}”
          </p>
        </div>
      )}

      <div className="ow-bracket-scroll">
        <div className="ow-bracket-rounds">
          {roundNumbers.map((roundNum) => {
            const matchesInRound = matchups.filter(
              (m) => m.round === roundNum
            );
            const isCurrentActiveRound =
              roundNum === event.currentRound && !event.winnerId;

            return (
              <div key={roundNum} className="ow-round">
                <div
                  className={`ow-round-label${isCurrentActiveRound ? " active" : ""}`}
                >
                  {matchesInRound[0]?.roundName || `Round ${roundNum}`}
                  {isCurrentActiveRound && <small>(Active Round)</small>}
                </div>

                <div className="ow-round-matches">
                  {matchesInRound.map((matchup) => {
                    const char1 = getCharacter(matchup.character1Id);
                    const char2 = getCharacter(matchup.character2Id);
                    const isWinner1 =
                      matchup.winnerId === matchup.character1Id &&
                      matchup.winnerId != null;
                    const isWinner2 =
                      matchup.winnerId === matchup.character2Id &&
                      matchup.winnerId != null;

                    return (
                      <div
                        key={matchup.id}
                        className={`ow-match${matchup.isCompleted ? " completed" : ""}${isCurrentActiveRound ? " active" : ""}`}
                        onClick={() => setActiveMatchup(matchup)}
                      >
                        <span className="ow-vs-chip">VS</span>

                        <div className={`ow-slot${isWinner1 ? " winner" : ""}`}>
                          <div className="ow-slot-left">
                            {char1 ? (
                              <>
                                <img
                                  src={char1.avatarUrl}
                                  alt={char1.name}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(char1.name)}`;
                                  }}
                                />
                                <span>{char1.name}</span>
                              </>
                            ) : (
                              <span className="ow-slot-tbd">TBD</span>
                            )}
                          </div>
                          <div className="ow-slot-votes">
                            {isWinner1 && <Trophy size={14} />}
                            {matchup.votes1}
                          </div>
                        </div>

                        <hr className="ow-match-divider" />

                        <div className={`ow-slot${isWinner2 ? " winner" : ""}`}>
                          <div className="ow-slot-left">
                            {char2 ? (
                              <>
                                <img
                                  src={char2.avatarUrl}
                                  alt={char2.name}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(char2.name)}`;
                                  }}
                                />
                                <span>{char2.name}</span>
                              </>
                            ) : (
                              <span className="ow-slot-tbd">TBD</span>
                            )}
                          </div>
                          <div className="ow-slot-votes">
                            {isWinner2 && <Trophy size={14} />}
                            {matchup.votes2}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeMatchup && (
        <VersusArena
          matchup={activeMatchup}
          characters={characters}
          isOpen={!!activeMatchup}
          isAdminLoggedIn={isAdminLoggedIn}
          onClose={() => setActiveMatchup(null)}
          onVoteMatchup={async (mId, cId, voterId) => {
            const result = await onVoteMatchup(mId, cId, voterId);
            if (result?.success) {
              setActiveMatchup((prev) =>
                prev
                  ? {
                      ...prev,
                      votes1:
                        cId === prev.character1Id
                          ? prev.votes1 + 1
                          : prev.votes1,
                      votes2:
                        cId === prev.character2Id
                          ? prev.votes2 + 1
                          : prev.votes2,
                      voters: [
                        ...(Array.isArray(prev.voters) ? prev.voters : []),
                        voterId,
                      ],
                    }
                  : null
              );
            }
            return result;
          }}
          onAdvanceMatchup={(mId, wId) => {
            onAdvanceMatchup(mId, wId);
            setActiveMatchup(null);
          }}
          onFetchCommentary={onFetchCommentary}
        />
      )}
    </div>
  );
}
