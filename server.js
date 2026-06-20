// ─── Wanderlust — Local Dev API Server ───────────────────────────────────────
//
// This Express server is for LOCAL DEVELOPMENT ONLY. In production the same
// endpoints are served by Vercel serverless functions in /api, which share the
// exact same logic via ./api/_lib/irctc.js (single source of truth).
//
// Run locally:  npm run dev:api   (or: node server.js)
// Endpoints:    GET /api/trains-between?from=&to=&date=
//               GET /api/live-status/:trainNumber?startDay=1
//               GET /api/pnr/:pnrNumber
//               GET /api/health
// ─────────────────────────────────────────────────────────────────────────────

import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import {
  irctcFetch,
  normalizeTrainsBetween,
  normalizeLiveStatus,
  normalizePnr,
  IRCTC_HOST,
} from "./api/_lib/irctc.js";
import { resolveAirport, skyFetch, normalizeFlights } from "./api/_lib/flights.js";
import { resolveHotelDestination, normalizeHotels, hotelSearchPath } from "./api/_lib/hotels.js";

const app = express();
app.use(cors());
app.use(express.json());

const keySet = () => {
  const k = process.env.RAPIDAPI_KEY;
  return !!(k && k !== "your_rapidapi_key_here" && k !== "YOUR_RAPIDAPI_KEY_HERE");
};

if (!keySet()) {
  console.warn(
    "\n⚠️  RAPIDAPI_KEY not set in .env\n" +
      "   Subscribe at: https://rapidapi.com/IRCTCAPI/api/irctc1\n" +
      "   Then add to .env: RAPIDAPI_KEY=your_key\n"
  );
}

app.get("/api/trains-between", async (req, res) => {
  const { from, to, date } = req.query;
  if (!from || !to || !date)
    return res.status(400).json({ error: "from, to and date are required." });
  const dateFormatted = String(date).replace(/-/g, "");
  try {
    const { status, data } = await irctcFetch(
      `/api/v3/trainBetweenStations?fromStationCode=${from}&toStationCode=${to}&dateOfJourney=${dateFormatted}`
    );
    if (status !== 200 || !data.data)
      return res.status(status || 404).json({
        error: data.message || data.error || "No trains found for this route/date.",
        raw: data,
      });
    res.json(normalizeTrainsBetween(data, from, to));
  } catch (err) {
    res.status(err.code === "NO_KEY" ? 503 : 500).json({ error: "Failed to fetch trains. " + err.message });
  }
});

app.get("/api/live-status/:trainNumber", async (req, res) => {
  const { trainNumber } = req.params;
  const startDay = req.query.startDay ?? "1";
  if (!/^\d{4,5}$/.test(trainNumber))
    return res.status(400).json({ error: "Train number must be 4–5 digits." });
  try {
    const { status, data } = await irctcFetch(
      `/api/v1/liveTrainStatus?trainNo=${trainNumber}&startDay=${startDay}`
    );
    if (status !== 200 || !data.data)
      return res.status(status || 404).json({
        error: data.message || data.error || "Train not found or not running today.",
      });
    res.json(normalizeLiveStatus(data, trainNumber));
  } catch (err) {
    res.status(err.code === "NO_KEY" ? 503 : 500).json({ error: "Failed to fetch live status. " + err.message });
  }
});

app.get("/api/pnr/:pnrNumber", async (req, res) => {
  const { pnrNumber } = req.params;
  if (!/^\d{10}$/.test(pnrNumber))
    return res.status(400).json({ error: "PNR must be exactly 10 digits." });
  try {
    const { status, data } = await irctcFetch(`/api/v3/getPNRStatus?pnrNumber=${pnrNumber}`);
    if (status !== 200 || !data.data)
      return res.status(status || 404).json({ error: data.message || data.error || "PNR not found." });
    res.json(normalizePnr(data, pnrNumber));
  } catch (err) {
    res.status(err.code === "NO_KEY" ? 503 : 500).json({ error: "Failed to fetch PNR status. " + err.message });
  }
});

app.get("/api/flights-search", async (req, res) => {
  const { from, to, fromCode, toCode, date } = req.query;
  const originQ = fromCode || from;
  const destQ = toCode || to;
  if (!originQ || !destQ || !date)
    return res.status(400).json({ error: "from/to (or fromCode/toCode) and date are required." });
  try {
    const [origin, dest] = await Promise.all([resolveAirport(originQ), resolveAirport(destQ)]);
    if (!origin || !dest)
      return res.status(404).json({ error: "Couldn't resolve one of the airports." });
    const path =
      `/api/v2/flights/searchFlights?originSkyId=${encodeURIComponent(origin.skyId)}` +
      `&destinationSkyId=${encodeURIComponent(dest.skyId)}` +
      `&originEntityId=${encodeURIComponent(origin.entityId)}` +
      `&destinationEntityId=${encodeURIComponent(dest.entityId)}` +
      `&date=${encodeURIComponent(date)}&cabinClass=economy&adults=1&sortBy=best&currency=INR&market=en-US&countryCode=IN`;
    const { status, data } = await skyFetch(path);
    if (status !== 200 || !data?.data)
      return res.status(status || 502).json({ error: data?.message || "Flight search failed or no results." });
    res.json(normalizeFlights(data));
  } catch (err) {
    res.status(err.code === "NO_KEY" ? 503 : 500).json({ error: "Failed to fetch flights. " + err.message });
  }
});

app.get("/api/hotels-search", async (req, res) => {
  const { city, cityCode, checkin, checkout, guests } = req.query;
  const query = city || cityCode;
  if (!query || !checkin)
    return res.status(400).json({ error: "city and checkin date are required." });
  try {
    const dest = await resolveHotelDestination(query);
    if (!dest) return res.status(404).json({ error: "Couldn't find that destination." });
    const { status, data } = await skyFetch(hotelSearchPath({ entityId: dest.entityId, checkin, checkout, guests }));
    if (status !== 200 || !data?.data)
      return res.status(status || 502).json({ error: data?.message || "Hotel search failed or no results." });
    res.json(normalizeHotels(data));
  } catch (err) {
    res.status(err.code === "NO_KEY" ? 503 : 500).json({ error: "Failed to fetch hotels. " + err.message });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", api: IRCTC_HOST, keySet: keySet(), time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅ Wanderlust dev API → http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
