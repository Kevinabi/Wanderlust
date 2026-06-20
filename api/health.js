import { setCors, IRCTC_HOST } from "./_lib/irctc.js";

export default function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const key = process.env.RAPIDAPI_KEY;
  res.status(200).json({
    status: "ok",
    api: IRCTC_HOST,
    keySet: !!(key && key !== "your_rapidapi_key_here" && key !== "YOUR_RAPIDAPI_KEY_HERE"),
    time: new Date().toISOString(),
  });
}
