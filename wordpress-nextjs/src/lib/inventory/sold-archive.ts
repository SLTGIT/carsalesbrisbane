import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DealerVehicle } from "@/types/inventory";
import { buildVehicleSlug } from "./slug";

/*
  Sold-vehicle archive.

  The Dealer Solutions feed only lists current stock: when a car sells it simply
  disappears. To show a sold car as SOLD (with "find me something similar")
  instead of retiring its page, the site keeps its own record of every vehicle
  it has seen and when each one left the feed.

  Stored as one JSON file under <app>/data/, which is gitignored and outside
  .next, so deploys (git reset --hard, rm -rf .next) leave it alone.

  SAFETY: a feed outage must never mark the whole yard as sold. See
  `isSuspiciousDrop` — an empty feed, one that halves, or one that loses more
  than 30% of cars in a single export does not mark anything sold, and the
  healthy baseline is kept. Only if the lower count persists for 24 hours is it
  accepted as real.
*/

/** How long a sold vehicle stays visible as SOLD. */
export const SOLD_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
/** A sustained lower count is accepted after this long. */
const SUSPICIOUS_ACCEPT_AFTER_MS = DAY_MS;
/** At most this share of the previous stock may vanish in one export. */
const MAX_DROP_SHARE = 0.3;
/** ...but a small yard can always lose this many at once. */
const MIN_DROP_ALLOWANCE = 5;

const ARCHIVE_DIR = path.join(process.cwd(), "data");
const ARCHIVE_FILE = path.join(ARCHIVE_DIR, "vehicle-archive.json");

export type ArchivedVehicle = {
  slug: string;
  vehicle: DealerVehicle;
  firstSeenAt: string;
  lastSeenAt: string;
  /** ISO time the vehicle was first missing from the feed; null while in stock. */
  soldAt: string | null;
};

type Archive = {
  version: 1;
  /** DataFeed.CreationDate of the last export processed. */
  lastFeedStamp: string | null;
  /** In-stock count from the last export accepted as healthy. */
  baselineCount: number;
  /** Set while exports look like an outage; cleared when they recover. */
  suspiciousSince: string | null;
  updatedAt: string;
  /** Keyed by ItemID. */
  vehicles: Record<string, ArchivedVehicle>;
};

function emptyArchive(): Archive {
  return {
    version: 1,
    lastFeedStamp: null,
    baselineCount: 0,
    suspiciousSince: null,
    updatedAt: new Date(0).toISOString(),
    vehicles: {},
  };
}

let cached: { mtimeMs: number; archive: Archive } | null = null;

async function loadArchive(): Promise<Archive> {
  try {
    const st = await stat(ARCHIVE_FILE);
    if (cached && cached.mtimeMs === st.mtimeMs) return cached.archive;
    const parsed = JSON.parse(await readFile(ARCHIVE_FILE, "utf8")) as Archive;
    const archive =
      parsed && parsed.version === 1 && parsed.vehicles ? parsed : emptyArchive();
    cached = { mtimeMs: st.mtimeMs, archive };
    return archive;
  } catch {
    return emptyArchive();
  }
}

async function saveArchive(archive: Archive): Promise<void> {
  await mkdir(ARCHIVE_DIR, { recursive: true });
  // Write-then-rename so a reader never sees a half-written file.
  const tmp = `${ARCHIVE_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(archive), "utf8");
  await rename(tmp, ARCHIVE_FILE);
  cached = null;
}

/**
 * True when this export looks like a feed problem rather than real sales.
 * Exported for the unit check in scripts/.
 */
export function isSuspiciousDrop(
  currentCount: number,
  baselineCount: number,
  missingCount: number,
): boolean {
  if (currentCount === 0) return true;
  if (baselineCount >= 10 && currentCount < baselineCount * 0.5) return true;
  const allowance = Math.max(
    MIN_DROP_ALLOWANCE,
    Math.ceil(baselineCount * MAX_DROP_SHARE),
  );
  return missingCount > allowance;
}

// Serialise updates within this process.
let queue: Promise<void> = Promise.resolve();

/**
 * Record the current feed. Called after every successful feed read; it only
 * does work when the export (DataFeed.CreationDate) has changed.
 */
export function recordInventorySnapshot(
  vehicles: DealerVehicle[],
  feedStamp: string | null,
): Promise<void> {
  // `next build` renders pages in parallel workers; letting each of them write
  // the archive would race. Runtime requests keep it current.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return Promise.resolve();
  }
  queue = queue
    .then(() => applySnapshot(vehicles, feedStamp))
    .catch((err) => {
      console.error("[sold-archive] update failed:", err);
    });
  return queue;
}

async function applySnapshot(
  vehicles: DealerVehicle[],
  feedStamp: string | null,
): Promise<void> {
  const archive = await loadArchive();
  if (feedStamp && archive.lastFeedStamp === feedStamp) return;

  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const currentIds = new Set<string>();

  for (const v of vehicles) {
    const id = String(v.ItemID);
    currentIds.add(id);
    const prev = archive.vehicles[id];
    archive.vehicles[id] = {
      slug: buildVehicleSlug(v).toLowerCase(),
      vehicle: v,
      firstSeenAt: prev?.firstSeenAt ?? now,
      lastSeenAt: now,
      // Back in the feed means back in stock (e.g. a sale fell through).
      soldAt: null,
    };
  }

  const missing = Object.entries(archive.vehicles).filter(
    ([id, entry]) => !currentIds.has(id) && entry.soldAt === null,
  );

  const suspicious = isSuspiciousDrop(
    vehicles.length,
    archive.baselineCount,
    missing.length,
  );

  if (suspicious && missing.length > 0) {
    archive.suspiciousSince ??= now;
    const sustainedMs = nowMs - Date.parse(archive.suspiciousSince);
    if (sustainedMs < SUSPICIOUS_ACCEPT_AFTER_MS) {
      console.warn(
        `[sold-archive] feed shrank from ${archive.baselineCount} to ${vehicles.length} (${missing.length} missing) — treating as a feed problem, nothing marked sold.`,
      );
      archive.lastFeedStamp = feedStamp;
      archive.updatedAt = now;
      await saveArchive(archive);
      return;
    }
    console.warn(
      `[sold-archive] lower stock count has held for 24h — accepting ${missing.length} vehicles as sold.`,
    );
  }

  for (const [, entry] of missing) entry.soldAt = now;

  // Drop sold vehicles once their retention window has passed.
  const cutoff = nowMs - SOLD_RETENTION_DAYS * DAY_MS;
  for (const [id, entry] of Object.entries(archive.vehicles)) {
    if (entry.soldAt && Date.parse(entry.soldAt) < cutoff) {
      delete archive.vehicles[id];
    }
  }

  archive.baselineCount = vehicles.length;
  archive.suspiciousSince = null;
  archive.lastFeedStamp = feedStamp;
  archive.updatedAt = now;
  await saveArchive(archive);
}

/** A vehicle that left the feed within the retention window, by public slug. */
export async function findRecentlySoldBySlug(
  slug: string,
): Promise<ArchivedVehicle | null> {
  const key = slug.trim().toLowerCase();
  if (!key) return null;
  const archive = await loadArchive();
  const cutoff = Date.now() - SOLD_RETENTION_DAYS * DAY_MS;
  for (const entry of Object.values(archive.vehicles)) {
    if (
      entry.slug === key &&
      entry.soldAt &&
      Date.parse(entry.soldAt) >= cutoff
    ) {
      return entry;
    }
  }
  return null;
}
