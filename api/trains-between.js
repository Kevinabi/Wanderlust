import { irctcFetch, normalizeTrainsBetween, setCors } from "./_lib/irctc.js";

// GET /api/trains-between?from=NDLS&to=MAS&date=20260620 (or 2026-06-20)
export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const { from, to, date } = req.query;
  if (!from || !to || !date) {
    return res.status(400).json({ error: "from, to and date are required." });
  }
  const dateFormatted = String(date).replace(/-/g, "");

  try {
    const { status, data } = await irctcFetch(
      `/api/v3/trainBetweenStations?fromStationCode=${from}&toStationCode=${to}&dateOfJourney=${dateFormatted}`
    );
    if (status !== 200 || !data.data) {
      return res.status(status || 404).json({
        error: data.message || data.error || "No trains found for this route/date.",
        raw: data,
      });
    }
    return res.status(200).json(normalizeTrainsBetween(data, from, to));
  } catch (err) {
    const code = err.code === "NO_KEY" ? 503 : 500;
    return res.status(code).json({ error: "Failed to fetch trains. " + err.message });
  }
}
