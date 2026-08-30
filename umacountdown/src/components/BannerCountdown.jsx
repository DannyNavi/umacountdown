import { useEffect, useState, useMemo } from "react";
import GachaCard from "./GachaCard";
import CountdownTimer from "./CountdownTimer";
import "../App.css"

const PAGE_SIZE = 1;

/** Pick the present banner by start date only (end dates in the schedule are unreliable). */
function findPresentPageIndex(banners) {
  if (!banners.length) return 0;
  const now = Math.floor(Date.now() / 1000);

  let latestStarted = -1;
  for (let i = 0; i < banners.length; i++) {
    if (banners[i].start_date <= now) {
      if (
        latestStarted < 0 ||
        banners[i].start_date >= banners[latestStarted].start_date
      ) {
        latestStarted = i;
      }
    }
  }
  if (latestStarted >= 0) return latestStarted;

  const upcoming = banners.findIndex((b) => b.start_date > now);
  if (upcoming >= 0) return upcoming;

  return banners.length - 1;
}

export default function Countdown() {
  const [allIds, setAllIds] = useState([]);
  const [gachas, setGachas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [inputPage, setInputPage] = useState("1");
  const [viewMode, setViewMode] = useState("umas");

  useEffect(() => {
    async function fetchAllIds() {
      try {
        const response = await fetch("/api/v1/gacha");
        const ids = await response.json();
        setAllIds(Array.isArray(ids) ? ids : []);
      } catch (error) {
        console.error("Failed to fetch gacha IDs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAllIds();
  }, []);

  const filteredIds = useMemo(() => {
    return allIds.filter((gacha) => {
      const isCharacter = gacha.card_type === "Outfit" || gacha.type === 1;
      return viewMode === "umas" ? isCharacter : !isCharacter;
    });
  }, [allIds, viewMode]);

  const totalPages = Math.ceil(filteredIds.length / PAGE_SIZE);

  // Jump to the present (or next) banner whenever the list / mode is ready
  useEffect(() => {
    if (filteredIds.length === 0) return;
    setPage(findPresentPageIndex(filteredIds));
  }, [filteredIds, viewMode]);

  useEffect(() => {
    setInputPage((page + 1).toString());
  }, [page]);

  useEffect(() => {
    if (filteredIds.length === 0) {
      setGachas([]);
      return;
    }

    let active = true;
    async function fetchPageDetails() {
      setLoading(true);
      try {
        const pageIds = filteredIds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
        const details = await Promise.all(
          pageIds.map(async (gacha) => {
            const res = await fetch(`/api/v1/gacha/${gacha.id}`);
            return res.json();
          })
        );

        if (active) setGachas(details);
      } catch (error) {
        console.error("Failed to fetch gacha details:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchPageDetails();
    return () => { active = false; };
  }, [page, filteredIds]);

  const handlePageInputChange = (e) => {
    setInputPage(e.target.value);
  };

  const commitPageChange = () => {
    const targetPage = parseInt(inputPage, 10);
    
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
      setPage(targetPage - 1); 
    } else {
      setInputPage((page + 1).toString());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      commitPageChange();
      e.target.blur(); 
    }
  };

  const grouped = useMemo(() => {
    return Object.values(
      gachas.reduce((acc, gacha) => {
        const key = gacha.start_date;
        if (!acc[key]) {
          acc[key] = {
            start_date: gacha.start_date,
            banners: [],
          };
        }
        acc[key].banners.push(gacha);
        return acc;
      }, {})
    );
  }, [gachas]);

  return (
    <div>
      <div className="view-modes">
        <button
          type="button"
          className={viewMode === "umas" ? "active" : ""}
          onClick={() => setViewMode("umas")}
        >
          Characters
        </button>
        <button
          type="button"
          className={viewMode === "supports" ? "active" : ""}
          onClick={() => setViewMode("supports")}
        >
          Supports
        </button>
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          disabled={page === 0 || loading}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        
        <div className="pagination-page">
          <span>Page</span>
         <input
          type="number"
          min="1"
          max={totalPages || 1}
          value={inputPage}
          onChange={handlePageInputChange}
          onKeyDown={handleKeyDown}
          onBlur={commitPageChange}
          disabled={totalPages === 0 || loading}
        />
          <span>of {totalPages}</span>
        </div>

        <button
          type="button"
          disabled={page >= totalPages - 1 || loading}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filteredIds.length === 0 ? (
        <p>No banners found for this category.</p>
      ) : (
        <div className="gacha-grid">
          {grouped.map((group) => (
              <div key={group.start_date}>
                <CountdownTimer
                  targetDate={group.start_date * 1000}
                  eventName="Banner"
                />
                <div className="banner-grid">
                  {group.banners.map((banner) => (
                    <div key={banner.id} className="banner-wrapper">
                      {banner.image_url && <img className="banner-image" src={banner.image_url} alt="Gacha Banner Visual" />}
                      <GachaCard key={banner.id} banner={banner} viewMode={viewMode} />
                    </div>
                  ))}
                </div>
              </div>
          ))}
        </div>
      )}
    </div>
  );
}
