import { irctcFetch, normalizePnr, setCors } from "../_lib/irctc.js";

// GET /api/pnr/:pnrNumber
export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const { pnrNumber } = req.query;
  if (!/^\d{10}$/.test(pnrNumber || "")) {
    return res.status(400).json({ error: "PNR must be exactly 10 digits." });
  }

  try {
    const { status, data } = await irctcFetch(`/api/v3/getPNRStatus?pnrNumber=${pnrNumber}`);
    if (status !== 200 || !data.data) {
      return res.status(status || 404).json({
        error: data.message || data.error || "PNR not found.",
      });
    }
    return res.status(200).json(normalizePnr(data, pnrNumber));
  } catch (err) {
    const code = err.code === "NO_KEY" ? 503 : 500;
    return res.status(code).json({ error: "Failed to fetch PNR status. " + err.message });
  }
}
