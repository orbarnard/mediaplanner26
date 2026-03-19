import { PrismaClient, PlatformType } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

const EXCEL_PATH = path.resolve(__dirname, '../../Media Plan Template (3.10.26).xlsx');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toFloat(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function toInt(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = typeof val === 'number' ? Math.round(val) : parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}

function toStr(val: unknown): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/**
 * Derive the PlatformType enum from the displayName string.
 * The displayName follows the pattern "Platform - TacticType (adLength)"
 */
function derivePlatformType(displayName: string): PlatformType {
  const lower = displayName.toLowerCase();

  if (lower.includes('tiktok')) return PlatformType.TIKTOK;
  if (lower.includes('youtube')) return PlatformType.YOUTUBE; // Covers Google, DV360, MiQ YouTube
  if (lower.includes('meta') || lower.includes('facebook') || lower.includes('instagram')) return PlatformType.META;
  if (lower.includes('ctv') || lower.includes('ott') || lower.includes('live sports')) return PlatformType.CTV_OTT;
  if (lower.includes('vod')) return PlatformType.VOD;
  if (lower.includes('audio') || lower.includes('podcast')) return PlatformType.AUDIO;

  return PlatformType.OTHER;
}

/**
 * Extract the platform name from a displayName like "The Trade Desk - CTV/OTT (0:30s)".
 */
function extractPlatform(displayName: string): string {
  const dashIdx = displayName.indexOf(' - ');
  if (dashIdx > 0) return displayName.substring(0, dashIdx).trim();
  return displayName;
}

/**
 * Extract ad length from a displayName, e.g. "(0:30s)" -> "0:30s".
 * Returns null if none found (e.g. "Display", "Search", "Live Sports").
 */
function extractAdLength(displayName: string): string | null {
  const match = displayName.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Seed: Digital Tactics
// ---------------------------------------------------------------------------

async function seedDigitalTactics(workbook: XLSX.WorkBook): Promise<number> {
  const sheet = workbook.Sheets['Digital Targeting'];
  if (!sheet) {
    console.warn('WARNING: "Digital Targeting" sheet not found. Skipping digital tactics.');
    return 0;
  }

  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // The header row for digital tactics is at row 525 (0-indexed: 524)
  // Columns: A = SEARCH KEY, B = INPUT OPTION (displayName), C = CPM (GROSS), D = CPM Modifier, E = CPM
  // Find the header row dynamically to be robust
  let headerRowIdx = -1;
  for (let i = 500; i < Math.min(data.length, 540); i++) {
    const row = data[i];
    if (toStr(row[0]) === 'SEARCH KEY' && toStr(row[1]) === 'INPUT OPTION') {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    console.warn('WARNING: Could not find digital tactics header row. Skipping.');
    return 0;
  }

  console.log(`  Found digital tactics header at row ${headerRowIdx + 1}`);

  const tactics: Array<{
    searchKey: string;
    displayName: string;
    platform: string;
    adLength: string | null;
    cpm: number;
    platformType: PlatformType;
  }> = [];

  // Read all data rows after the header until end of sheet
  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i];
    const searchKey = toStr(row[0]);
    const displayName = toStr(row[1]);

    // Skip empty rows, placeholder rows, and sub-header rows
    if (
      !searchKey ||
      searchKey === ' - ' ||
      searchKey.includes('SEARCH KEY') ||
      searchKey.includes('DRAG') ||
      !displayName
    ) {
      continue;
    }

    // Use effective CPM (col E, idx 4) which applies the modifier; fall back to gross CPM (col C, idx 2)
    const effectiveCpm = toFloat(row[4]);
    const grossCpm = toFloat(row[2]);
    const cpm = effectiveCpm ?? grossCpm ?? 0;

    tactics.push({
      searchKey,
      displayName,
      platform: extractPlatform(displayName),
      adLength: extractAdLength(displayName),
      cpm,
      platformType: derivePlatformType(displayName),
    });
  }

  if (tactics.length === 0) {
    console.warn('  WARNING: No digital tactics found to import.');
    return 0;
  }

  console.log(`  Importing ${tactics.length} digital tactics...`);

  // Delete existing records and bulk create
  await prisma.digitalTactic.deleteMany();
  await prisma.digitalTactic.createMany({
    data: tactics.map((t) => ({
      searchKey: t.searchKey,
      displayName: t.displayName,
      platform: t.platform,
      adLength: t.adLength,
      cpm: t.cpm,
      servingCpm: null, // Serving CPM is configured per-use, not in the rate card
      platformType: t.platformType,
    })),
  });

  return tactics.length;
}

// ---------------------------------------------------------------------------
// Seed: Audience Profiles
// ---------------------------------------------------------------------------

async function seedAudienceProfiles(workbook: XLSX.WorkBook): Promise<number> {
  const sheet = workbook.Sheets['Digital Targeting'];
  if (!sheet) {
    console.warn('WARNING: "Digital Targeting" sheet not found. Skipping audience profiles.');
    return 0;
  }

  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // The audience profile header is at row 21 (0-indexed: 20)
  // Columns: A = Search Key, B = Geo, C = Audience Name, D = Language,
  //          E = List Size, F = URL, G = TV Streaming, H = YouTube,
  //          I = YouTube TV, J = Meta, K = Audio, L = VOD, M = Digital
  let headerRowIdx = -1;
  for (let i = 15; i < Math.min(data.length, 30); i++) {
    const row = data[i];
    const col0 = toStr(row[0]).toLowerCase();
    if (col0.includes('search key')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    console.warn('WARNING: Could not find audience profiles header row. Skipping.');
    return 0;
  }

  console.log(`  Found audience profiles header at row ${headerRowIdx + 1}`);

  const profiles: Array<{
    searchKey: string;
    geography: string | null;
    audienceName: string;
    language: string | null;
    listSize: number | null;
    url: string | null;
    coverageTvStreaming: number | null;
    coverageYoutube: number | null;
    coverageYoutubeTV: number | null;
    coverageMeta: number | null;
    coverageAudio: number | null;
    coverageVod: number | null;
    coverageDigital: number | null;
  }> = [];

  // Find where the digital tactics section starts so we don't bleed into it.
  // The tactics header contains "SEARCH KEY DRAG" or "SEARCH KEY" + "INPUT OPTION".
  let tacticsStartIdx = data.length;
  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const cell = toStr(data[i][0]);
    if (cell.includes('DRAG') || (cell === 'SEARCH KEY' && toStr(data[i][1]) === 'INPUT OPTION')) {
      // The section marker row is typically one row before the actual header
      tacticsStartIdx = i;
      break;
    }
  }

  console.log(`  Audience profile scan range: rows ${headerRowIdx + 2} to ${tacticsStartIdx} (before tactics)`);

  // Read rows after header up to the tactics section boundary.
  for (let i = headerRowIdx + 1; i < tacticsStartIdx; i++) {
    const row = data[i];
    const searchKey = toStr(row[0]);
    const audienceName = toStr(row[2]);

    // Skip empty / placeholder rows
    if (!searchKey || searchKey === ' - ' || !audienceName) {
      continue;
    }

    const geography = toStr(row[1]) || null;
    const language = toStr(row[3]) || null;
    const listSize = toInt(row[4]);
    const url = toStr(row[5]) || null;

    profiles.push({
      searchKey,
      geography,
      audienceName,
      language,
      listSize,
      url,
      coverageTvStreaming: toFloat(row[6]),
      coverageYoutube: toFloat(row[7]),
      coverageYoutubeTV: toFloat(row[8]),
      coverageMeta: toFloat(row[9]),
      coverageAudio: toFloat(row[10]),
      coverageVod: toFloat(row[11]),
      coverageDigital: toFloat(row[12]),
    });
  }

  if (profiles.length === 0) {
    console.warn('  WARNING: No audience profiles found to import.');
    return 0;
  }

  console.log(`  Importing ${profiles.length} audience profiles...`);

  await prisma.audienceProfile.deleteMany();
  await prisma.audienceProfile.createMany({ data: profiles });

  return profiles.length;
}

// ---------------------------------------------------------------------------
// Seed: Default Rate Card (CPP tiers from Media Plan Template)
// ---------------------------------------------------------------------------

interface RateCardEntry {
  marketName: string;
  section: 'english_broadcast' | 'spanish_tv' | 'broadcast_sports';
  cppQ3OOW: number | null;
  cppQ3IW: number | null;
  cppEarlyQ4: number | null;
  cppLateQ4: number | null;
}

async function seedDefaultRateCard(workbook: XLSX.WorkBook): Promise<number> {
  const sheet = workbook.Sheets['Media Plan Template'];
  if (!sheet) {
    console.warn('WARNING: "Media Plan Template" sheet not found. Skipping rate card.');
    return 0;
  }

  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const entries: RateCardEntry[] = [];

  // English Broadcast TV section:
  // Row 8 (0-indexed: 7) is the header with CPP column labels
  // Rows 11, 13, 15, 17, 19, 21 (0-indexed: 10, 12, 14, 16, 18, 20) have market data
  // Pattern: col A = Q3 OOW A35+ CPP, col B = Q3 IW A35+ CPP,
  //          col C = Early Q4 A35+ CPP, col D = Late Q4 A35+ CPP,
  //          col E = Market Name
  console.log('  Parsing English Broadcast TV rate card...');
  for (let i = 10; i <= 21; i += 2) {
    const row = data[i];
    if (!row) continue;
    const marketName = toStr(row[4]);
    if (!marketName || marketName.includes('Subtotal')) continue;

    entries.push({
      marketName,
      section: 'english_broadcast',
      cppQ3OOW: toFloat(row[0]),
      cppQ3IW: toFloat(row[1]),
      cppEarlyQ4: toFloat(row[2]),
      cppLateQ4: toFloat(row[3]),
    });
  }

  // Spanish-Language TV section:
  // Row 24 (0-indexed: 23) is the header
  // Rows 26, 28, 30, 32, 34, 36 (0-indexed: 25, 27, 29, 31, 33, 35) have market data
  console.log('  Parsing Spanish-Language TV rate card...');
  for (let i = 25; i <= 35; i += 2) {
    const row = data[i];
    if (!row) continue;
    const marketName = toStr(row[4]);
    if (!marketName || marketName.includes('Subtotal')) continue;

    entries.push({
      marketName,
      section: 'spanish_tv',
      cppQ3OOW: toFloat(row[0]),
      cppQ3IW: toFloat(row[1]),
      cppEarlyQ4: toFloat(row[2]),
      cppLateQ4: toFloat(row[3]),
    });
  }

  // Broadcast Sports section:
  // Row 39 (0-indexed: 38) has header "CPS" in col A, "Broadcast Sports" in col E
  // Rows 41, 43, 45, 47, 49, 51 (0-indexed: 40, 42, 44, 46, 48, 50) have CPS values in col A
  console.log('  Parsing Broadcast Sports rate card...');
  for (let i = 40; i <= 50; i += 2) {
    const row = data[i];
    if (!row) continue;
    const marketName = toStr(row[4]);
    if (!marketName || marketName.includes('Subtotal')) continue;

    // Broadcast Sports uses a single CPS (Cost Per Spot) in col A
    const cps = toFloat(row[0]);
    entries.push({
      marketName,
      section: 'broadcast_sports',
      cppQ3OOW: cps,
      cppQ3IW: cps,
      cppEarlyQ4: cps,
      cppLateQ4: cps,
    });
  }

  if (entries.length === 0) {
    console.warn('  WARNING: No rate card entries found.');
    return 0;
  }

  console.log(`  Found ${entries.length} rate card entries (template defaults)`);

  // Store rate card as a JSON file for reference since there's no dedicated
  // RateCard model in the schema. The CPP values are stored per-Market in
  // actual plans, but these template defaults are useful for auto-populating.
  const fs = await import('fs');
  const rateCardPath = path.resolve(__dirname, 'seed-data', 'default-rate-card.json');

  // Ensure directory exists
  const dir = path.dirname(rateCardPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(rateCardPath, JSON.stringify(entries, null, 2));
  console.log(`  Wrote default rate card to ${rateCardPath}`);

  return entries.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Tally Seed Script ===');
  console.log(`Reading Excel file: ${EXCEL_PATH}`);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(EXCEL_PATH);
  } catch (err) {
    console.error(`ERROR: Could not read Excel file at ${EXCEL_PATH}`);
    console.error(err);
    process.exit(1);
  }

  console.log(`Sheets found: ${workbook.SheetNames.join(', ')}`);
  console.log('');

  // 1. Seed Digital Tactics
  console.log('[1/3] Seeding Digital Tactics...');
  const tacticsCount = await seedDigitalTactics(workbook);
  console.log(`  Done: ${tacticsCount} digital tactics imported.\n`);

  // 2. Seed Audience Profiles
  console.log('[2/3] Seeding Audience Profiles...');
  const profilesCount = await seedAudienceProfiles(workbook);
  console.log(`  Done: ${profilesCount} audience profiles imported.\n`);

  // 3. Seed Default Rate Card
  console.log('[3/3] Seeding Default Rate Card...');
  const rateCardCount = await seedDefaultRateCard(workbook);
  console.log(`  Done: ${rateCardCount} rate card entries saved.\n`);

  console.log('=== Seed Complete ===');
  console.log(`  Digital Tactics: ${tacticsCount}`);
  console.log(`  Audience Profiles: ${profilesCount}`);
  console.log(`  Rate Card Entries: ${rateCardCount}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
