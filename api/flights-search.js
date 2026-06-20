import { resolveAirport, skyFetch, normalizeFlights } from "./_lib/flights.js";
import { setCors } from "./_lib/irctc.js";

// GET /api/flights-search?fromCode=DEL&toCode=BOM&date=2026-07-01
//   (from/to city names accepted as fallback query terms)
export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const { from, to, fromCode, toCode, date } = req.query;
  const originQ = fromCode || from;
  const destQ = toCode || to;
  if (!originQ || !destQ || !date) {
    return res.status(400).json({ error: "from/to (or fromCode/toCode) and date are required." });
  }

  try {
    const [origin, dest] = await Promise.all([
      resolveAirport(originQ),
      resolveAirport(destQ),
    ]);
    if (!origin || !dest) {
      return res.status(404).json({ error: "Couldn't resolve one of the airports. Try a major airport code." });
    }

    const path =
      `/api/v2/flights/searchFlights?originSkyId=${encodeURIComponent(origin.skyId)}` +
      `&destinationSkyId=${encodeURIComponent(dest.skyId)}` +
      `&originEntityId=${encodeURIComponent(origin.entityId)}` +
      `&destinationEntityId=${encodeURIComponent(dest.entityId)}` +
      `&date=${encodeURIComponent(date)}&cabinClass=economy&adults=1&sortBy=best` +
      `&currency=INR&market=en-US&countryCode=IN`;

    const { status, data } = await skyFetch(path);
    if (status !== 200 || !data?.data) {
      return res.status(status === 429 ? 429 : status || 502).json({
        error: data?.message || "Flight search failed or no results.",
      });
    }
    return res.status(200).json(normalizeFlights(data));
  } catch (err) {
    const code = err.code === "NO_KEY" ? 503 : 500;
    return res.status(code).json({ error: "Failed to fetch flights. " + err.message });
  }
}
