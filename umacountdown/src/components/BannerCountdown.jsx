import { useEffect, useState, useMemo } from "react";
import GachaCard from "./GachaCard";
import CountdownTimer from "./CountdownTimer";
import "../App.css"

const PAGE_SIZE = 1; 

export default function Countdown() {
  const [allIds, setAllIds] = useState([]);
  const [gachas, setGachas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(65); 
  const [inputPage, setInputPage] = useState("66"); 
  const [viewMode, setViewMode] = useState("umas");

  useEffect(() => {
    async function fetchAllIds() {
      try {
        const response = await fetch("/api/v1/gacha");
        const ids = await response.json();
        setAllIds(ids);
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

  useEffect(() => {
    setInputPage((page + 1).toString());
  }, [page]);

  useEffect(() => {
    if(viewMode=="umas"){
      setPage(66)
    }
    else
    setPage(63);
  }, [viewMode]);

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
          acc[key] = { start_date: gacha.start_date, banners: [] };
        }
        acc[key].banners.push(gacha);
        return acc;
      }, {})
    );
  }, [gachas]);

  return (
    <div>
      <div className="view-modes">
        <button className={viewMode === "umas" ? "active" : ""} onClick={() => setViewMode("umas")}>
          Characters
        </button>
        <button className={viewMode === "supports" ? "active" : ""} onClick={() => setViewMode("supports")}>
          Supports
        </button>
      </div>

      <div className="pagination-controls" style={{ marginTop: "10px", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
        <button disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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
          style={{
            width: "55px",
            textAlign: "center",
            fontSize: "1rem",
            padding: "2px",
            borderRadius: "4px",
            border: "1px solid #ccc"
          }}
        />
          <span>of {totalPages}</span>
        </div>

        <button disabled={page >= totalPages - 1 || loading} onClick={() => setPage(page + 1)}>
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
              <CountdownTimer targetDate={group.start_date * 1000} eventName="Banner"/>
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