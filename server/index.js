import { globalBanners } from "./globalSchedule.js";

import express from "express";
import fs from "fs";
import cors from "cors";
const app = express();

app.use(cors());

function dateStringToUnixAt22UTC(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day, 22, 0, 0) / 1000);
}

let cachedJpWindows = [];

async function getJpWindows() {
  if (cachedJpWindows.length > 0) return cachedJpWindows;
  try {
    const response = await fetch("https://umapyoi.net/api/v1/gacha");
    const data = await response.json();
    data.sort((a, b) => a.start_date - b.start_date);
    cachedJpWindows = [...new Set(data.map(b => b.start_date))];
    return cachedJpWindows;
  } catch (err) {
    return [];
  }
}

app.get("/api/v1/gacha", async (req, res) => {
  try {
    const response = await fetch("https://umapyoi.net/api/v1/gacha");
    if (!response.ok) throw new Error(`Upstream error: ${response.status}`);

    let data = await response.json();

    data.sort((a, b) => a.start_date - b.start_date);

    const uniqueWindows = [...new Set(data.map(b => b.start_date))];

    const globalizedBanners = data.map(banner => {
      const windowIndex = uniqueWindows.indexOf(banner.start_date);

      const globalMatch = globalBanners.find(g => g.page === windowIndex);

      if (globalMatch) {
        const gStart = dateStringToUnixAt22UTC(globalMatch.globalStart);

        const gEnd =
          banner.end_date === 2147483647
            ? 2147483647
            : dateStringToUnixAt22UTC(globalMatch.globalEnd);

        return {
          ...banner,
          start_date: gStart,
          end_date: gEnd,
          is_global_mapped: true
        };
      }

      return banner;
    });

    if (req.query.page) {
      const pageIndex = parseInt(req.query.page, 10) || 0;
      const limit = parseInt(req.query.limit, 10) || 1;

      const startIndex = pageIndex * limit;
      const endIndex = startIndex + limit;

      return res.json({
        currentPage: pageIndex,
        totalPages: uniqueWindows.length,
        totalBanners: globalizedBanners.length,
        banners: globalizedBanners.slice(startIndex, endIndex)
      });
    }

    res.json(globalizedBanners);

  } catch (err) {
    console.error("Endpoint mapping error:", err);
    res.status(500).json({
      error: "Failed to compile the accelerated global timeline layout."
    });
  }
});

app.get("/api/v1/gacha/:id", async (req, res) => {
  try {
    const response = await fetch(`https://umapyoi.net/api/v1/gacha/${req.params.id}`);
    if (!response.ok) throw new Error("Upstream API error");

    const banner = await response.json();

    const windows = await getJpWindows();
    const windowIndex = windows.indexOf(banner.start_date);

    const globalMatch = globalBanners.find(g => g.page === windowIndex);

    if (globalMatch) {
      banner.start_date = dateStringToUnixAt22UTC(globalMatch.globalStart);

      if (banner.end_date !== 2147483647) {
        banner.end_date = dateStringToUnixAt22UTC(globalMatch.globalEnd);
      }
    }

    res.json(banner);
  } catch (err) {
    console.error(`Error fetching banner ${req.params.id}:`, err);
    res.status(500).json({
      error: "Failed to load individual banner details"
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});