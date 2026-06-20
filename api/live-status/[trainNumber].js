import { irctcFetch, normalizeLiveStatus, setCors } from "../_lib/irctc.js";

// GET /api/live-status/:trainNumber?startDay=1
export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const { trainNumber } = req.query;
  const startDay = req.query.startDay ?? "1";

  if (!/^\d{4,5}$/.test(trainNumber || "")) {
    return res.status(400).json({ error: "Train number must be 4–5 digits." });
  }

  try {
    const { status, data } = await irctcFetch(
      `/api/v1/liveTrainStatus?trainNo=${trainNumber}&startDay=${startDay}`
    );
    if (status !== 200 || !data.data) {
      return res.status(status || 404).json({
        error: data.message || data.error || "Train not found or not running today.",
      });
    }
    return res.status(200).json(normalizeLiveStatus(data, trainNumber));
  } catch (err) {
    const code = err.code === "NO_KEY" ? 503 : 500;
    return res.status(code).json({ error: "Failed to fetch live status. " + err.message });
  }
}
