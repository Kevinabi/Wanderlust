// ─── Sky-Scrapper (Skyscanner) flight helpers ────────────────────────────────
// Real flight search via the Sky-Scrapper API on RapidAPI.
//   Subscribe (free): https://rapidapi.com/apiheya/api/sky-scrapper
//   Host: sky-scrapper.p.rapidapi.com  — uses the same RAPIDAPI_KEY as trains.
//
// Flow (Sky-Scrapper needs internal skyId+entityId, not just IATA codes):
//   1. resolveAirport(query) → { skyId, entityId }   (searchAirport)
//   2. searchFlights(origin, dest, date)              (searchFlights)
//   3. normalizeFlights(data) → { flights, total }    (pure, unit-tested)

const SKY_HOST = "sky-scrapper.p.rapidapi.com";

function keyOrThrow() {
  const k = process.env.RAPIDAPI_KEY;
  if (!k || k === "your_rapidapi_key_here" || k === "YOUR_RAPIDAPI_KEY_HERE") {
    const err = new Error("RAPIDAPI_KEY is not configured.");
    err.code = "NO_KEY";
    throw err;
  }
  return k;
}

export async function skyFetch(path) {
  const key = keyOrThrow();
  const res = await fetch(`https://${SKY_HOST}${path}`, {
    method: "GET",
    headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": SKY_HOST },
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

// Resolve an IATA code or city name to Sky-Scrapper's { skyId, entityId }.
export async function resolveAirport(query) {
  const { data } = await skyFetch(
    `/api/v1/flights/searchAirport?query=${encodeURIComponent(query)}&locale=en-US`
  );
  const list = Array.isArray(data?.data) ? data.data : [];
  if (!list.length) return null;
  const q = String(query).toUpperCase();
  const pick =
    list.find((x) => (x.skyId || "").toUpperCase() === q) ||
    list.find(
      (x) => x.navigation?.relevantFlightParams?.flightPlaceType === "AIRPORT"
    ) ||
    list[0];
  const nav = pick.navigation?.relevantFlightParams || {};
  const skyId = pick.skyId || nav.skyId;
  const entityId = pick.entityId || nav.entityId;
  if (!skyId || !entityId) return null;
  return { skyId, entityId, name: pick.presentation?.title || skyId };
}

// HH:MM out of an ISO-ish timestamp like "2026-07-01T06:35:00".
function fmtTime(iso) {
  if (!iso) return "—";
  const m = String(iso).match(/T(\d{2}:\d{2})/);
  return m ? m[1] : String(iso);
}

function fmtMins(mins) {
  if (!mins && mins !== 0) return "—";
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

// Pure normalizer — maps a Sky-Scrapper searchFlights payload to our UI shape.
export function normalizeFlights(data) {
  const itineraries = data?.data?.itineraries || [];
  const flights = itineraries.map((it) => {
    const legs = it.legs || [];
    const leg = legs[0] || {};
    const carrier = (leg.carriers?.marketing || [])[0] || {};
    const stops = leg.stopCount ?? 0;
    return {
      id: it.id || `${leg.origin?.displayCode}-${leg.destination?.displayCode}-${leg.departure}`,
      airline: carrier.name || "—",
      airlineLogo: carrier.logoUrl || null,
      price: it.price?.formatted || (it.price?.raw != null ? `₹${Math.round(it.price.raw)}` : "—"),
      priceRaw: it.price?.raw ?? null,
      from: leg.origin?.displayCode || leg.origin?.id || "—",
      to: leg.destination?.displayCode || leg.destination?.id || "—",
      departure: fmtTime(leg.departure),
      arrival: fmtTime(leg.arrival),
      duration: fmtMins(leg.durationInMinutes),
      durationMin: leg.durationInMinutes ?? null,
      stops,
      stopsLabel: stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`,
    };
  });
  // Cheapest first when prices are available.
  flights.sort((a, b) => (a.priceRaw ?? 1e12) - (b.priceRaw ?? 1e12));
  return { flights, total: flights.length };
}

export { SKY_HOST };
