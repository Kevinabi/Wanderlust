// ─── Shared IRCTC API helpers ────────────────────────────────────────────────
// Used by both the Vercel serverless functions (api/*.js) and the local Express
// dev server (server.js). The normalize* functions are PURE (no network) so they
// can be unit-tested directly with Vitest.

const IRCTC_HOST = "irctc1.p.rapidapi.com";

/**
 * Fetch a path from the IRCTC1 RapidAPI host. Returns { status, data }.
 * Uses the global fetch available in Node 18+ (Vercel runtime & local dev).
 */
export async function irctcFetch(path) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key || key === "your_rapidapi_key_here" || key === "YOUR_RAPIDAPI_KEY_HERE") {
    const err = new Error("RAPIDAPI_KEY is not configured.");
    err.code = "NO_KEY";
    throw err;
  }

  const res = await fetch(`https://${IRCTC_HOST}${path}`, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": IRCTC_HOST,
    },
  });

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON (HTTP ${res.status}): ${raw.slice(0, 200)}`);
  }
  return { status: res.status, data };
}

// ─── Pure normalizers (no network — unit-testable) ───────────────────────────

export function normalizeTrainsBetween(data, from, to) {
  const list = Array.isArray(data?.data) ? data.data : [];
  const trains = list.map((t) => ({
    trainNumber: t.train_number || t.trainNumber || t.TrainNo || "—",
    trainName: t.train_name || t.trainName || t.TrainName || "—",
    from: t.from_station_code || t.from || from,
    to: t.to_station_code || t.to || to,
    departureTime: t.from_std || t.departureTime || t.departure || "—",
    arrivalTime: t.to_std || t.arrivalTime || t.arrival || "—",
    duration: t.duration || "—",
    runningDays: t.train_date || t.days_of_week || t.runningDays || [],
    classes: t.class_type || t.classes || [],
  }));
  return { trains, total: trains.length };
}

export function normalizeLiveStatus(data, trainNumber) {
  const d = data?.data || {};
  const messages = (d.current_location_info || []).map((m) => m.readable_message || "");
  return {
    trainNumber,
    trainName: d.train_name || "—",
    updateTime: d.update_time || "—",
    source: d.source || "—",
    destination: d.destination || "—",
    totalDistance: d.total_distance ? `${d.total_distance} km` : "—",
    distanceFromSource: d.distance_from_source ? `${d.distance_from_source} km` : "—",
    currentStation: {
      name: (d.current_station_name || "").replace(/\s*\[.*?\]/, "").trim() || "—",
      code: d.current_state_code || "—",
    },
    delay: d.delay || "On time",
    locationMessages: messages,
    status: data?.status,
  };
}

export function normalizePnr(data, pnrNumber) {
  const d = data?.data || {};
  return {
    pnr: pnrNumber,
    trainNumber: d.TrainNo || "—",
    trainName: d.TrainName || "—",
    bookingDate: d.BookingDate || "—",
    doj: d.SourceDoj || "—",
    departureTime: d.DepartureTime || "—",
    arrivalDate: d.DestinationDoj || "—",
    arrivalTime: d.ArrivalTime || "—",
    duration: d.Duration || "—",
    from: d.From || "—",
    fromName: d.From || "—",
    to: d.To || "—",
    toName: d.To || "—",
    boardingPoint: d.BoardingPoint || d.From || "—",
    journeyClass: d.Class || "—",
    expectedPlatform: d.ExpectedPlatformNo || "—",
    bookingFare: d.BookingFare ? `₹${d.BookingFare}` : "—",
    ticketFare: d.TicketFare ? `₹${d.TicketFare}` : "—",
    chartStatus: d.ChartPrepared ? "Chart Prepared" : "Chart Not Prepared",
    passengers: (d.PassengerStatus || []).map((p, i) => ({
      number: i + 1,
      bookingStatus: p.BookingStatus || "—",
      currentStatus: p.CurrentStatusNew || p.CurrentStatus || "—",
      coach: p.CurrentCoachId || "—",
      berth: p.CurrentBerthNo || "—",
      coachPosition: p.CurrentCoachId ? `${p.CurrentCoachId}-${p.CurrentBerthNo}` : "—",
    })),
  };
}

// Small helper so serverless handlers and Express share identical CORS behaviour.
export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export { IRCTC_HOST };
