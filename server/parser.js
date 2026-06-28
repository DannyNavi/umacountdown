import fs from 'fs';
import { parse } from 'csv-parse/sync'; 

const csvFilePath = "./timeline.csv"; 
const outputFilePath = "./globalSchedule.js";
const UPSTREAM_API = "https://umapyoi.net/api/v1/gacha";

async function syncTimeline() {
  try {
    console.log("🌐 Fetching pristine timeline order from API...");
    const response = await fetch(UPSTREAM_API);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const apiBanners = await response.json();

    apiBanners.sort((a, b) => a.start_date - b.start_date);
    const uniqueApiWindows = [...new Set(apiBanners.map(b => b.start_date))];

    console.log(`\ud83d\udcc4 Reading and parsing ${csvFilePath}...`);
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    
    const rows = parse(fileContent, { skip_empty_lines: true, relax_column_count: true });

    const scheduleMap = [];
    let apiWindowPointer = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      

      const jpStartRaw = row[26]?.trim();
      const globalStartRaw = row[28]?.trim();
      const globalEndRaw = row[29]?.trim();

      if (/^\d{4}-\d{2}-\d{2}/.test(jpStartRaw) && /^\d{4}-\d{2}-\d{2}/.test(globalStartRaw)) {
        
        if (apiWindowPointer < uniqueApiWindows.length) {
          scheduleMap.push({
            page: apiWindowPointer,
            globalStart: globalStartRaw.split(' ')[0], 
            globalEnd: globalEndRaw ? globalEndRaw.split(' ')[0] : globalStartRaw.split(' ')[0]
          });
          apiWindowPointer++;
        }
      }
    }

    const outputContent = `// Automatically synchronized directly from CSV layout entries\nexport const globalBanners = ${JSON.stringify(scheduleMap, null, 2)};`;
    fs.writeFileSync(outputFilePath, outputContent, 'utf-8');

    console.log(`\u2705 Synchronization Complete!`);
    console.log(`\ud83d\udcca Processed ${scheduleMap.length} concurrent banner schedule windows smoothly.`);

  } catch (error) {
    console.error("❌ Synchronization failed:", error);
  }
}

syncTimeline();