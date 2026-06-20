import { skyFetch } from "./_lib/flights.js";
import { resolveHotelDestination, normalizeHotels, hotelSearchPath } from "./_lib/hotels.js";
import { setCors } from "./_lib/irctc.js";

// GET /api/hotels-search?city=Goa&checkin=2026-07-01&checkout=2026-07-02&guests=2
export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const { city, cityCode, checkin, checkout, guests } = req.query;
  const query = city || cityCode;
  if (!query || !checkin) {
    return res.status(400).json({ error: "city and checkin date are required." });
  }

  try {
    const dest = await resolveHotelDestination(query);
    if (!dest) return res.status(404).json({ error: "Couldn't find that destination." });

    const { status, data } = await skyFetch(
      hotelSearchPath({ entityId: dest.entityId, checkin, checkout, guests })
    );
    if (status !== 200 || !data?.data) {
      return res.status(status === 429 ? 429 : status || 502).json({
        error: data?.message || "Hotel search failed or no results.",
      });
    }
    return res.status(200).json(normalizeHotels(data));
  } catch (err) {
    const code = err.code === "NO_KEY" ? 503 : 500;
    return res.status(code).json({ error: "Failed to fetch hotels. " + err.message });
  }
}
