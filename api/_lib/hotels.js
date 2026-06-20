// ─── Sky-Scrapper hotel helpers ──────────────────────────────────────────────
// Hotel search via the same Sky-Scrapper API on RapidAPI used for flights
// (same RAPIDAPI_KEY). Flow:
//   1. resolveHotelDestination(query) → { entityId }   (searchDestinationOrHotel)
//   2. searchHotels(entityId, checkin, checkout)        (searchHotels)
//   3. normalizeHotels(data) → { hotels, total }        (pure, unit-tested)

import { skyFetch } from "./flights.js";

// Resolve a city/place name to Sky-Scrapper's hotel entityId.
export async function resolveHotelDestination(query) {
  const { data } = await skyFetch(
    `/api/v1/hotels/searchDestinationOrHotel?query=${encodeURIComponent(query)}`
  );
  const list = Array.isArray(data?.data) ? data.data : [];
  if (!list.length) return null;
  const pick =
    list.find((x) => /city|region|place/i.test(x.entityType || x.class || "")) ||
    list[0];
  const entityId = pick.entityId || pick.entityID || pick.id;
  if (!entityId) return null;
  return { entityId, name: pick.entityName || pick.name || query };
}

const str = (v) => (typeof v === "string" ? v : "");
const imgUrl = (v) =>
  typeof v === "string" ? v : v?.url || v?.dynamic || v?.src || null;

// Pure normalizer — maps a Sky-Scrapper searchHotels payload to our UI shape.
// Every rendered field is coerced to a primitive (never an object).
export function normalizeHotels(data) {
  const list =
    data?.data?.hotels ||
    data?.data?.results?.hotelCards ||
    data?.hotels ||
    [];
  const hotels = (Array.isArray(list) ? list : []).map((h) => {
    // rating can be a number, or an object like { value, description, count, color }
    const rv = h.reviewsSummary || (typeof h.rating === "object" ? h.rating : {}) || {};
    const ratingVal =
      rv.score ?? rv.value ?? (typeof h.rating === "number" ? h.rating : null);
    const ratingDesc = str(rv.scoreDesc || rv.description || rv.label);
    const reviewsCount = rv.total ?? rv.count ?? null;

    const rawPrice =
      h.rawPrice ??
      h.priceRaw ??
      (typeof h.price === "object" ? h.price.amount ?? h.price.raw : null) ??
      null;
    const price =
      (typeof h.price === "string" && h.price) ||
      (typeof h.price === "object" && str(h.price.formatted)) ||
      (rawPrice != null ? `₹${Math.round(rawPrice)}` : "—");

    return {
      id: h.hotelId || h.id || str(h.name) || Math.random().toString(36).slice(2),
      name: str(h.name) || str(h.heading) || "—",
      image: imgUrl(h.heroImage || h.image || (Array.isArray(h.images) ? h.images[0] : null)),
      stars: Number(h.stars || h.starRating || h.class || 0) || 0,
      rating: typeof ratingVal === "number" ? ratingVal : null,
      ratingDesc,
      reviewsCount: typeof reviewsCount === "number" ? reviewsCount : null,
      price,
      priceRaw: typeof rawPrice === "number" ? rawPrice : null,
      location: str(h.distance || h.relevantPoiDistance || h.area || h.address),
    };
  });
  hotels.sort((a, b) => (a.priceRaw ?? 1e12) - (b.priceRaw ?? 1e12));
  return { hotels, total: hotels.length };
}

// Build the searchHotels request path. checkout defaults to checkin + 1 night.
export function hotelSearchPath({ entityId, checkin, checkout, guests }) {
  const ci = checkin;
  const co = checkout || addOneDay(checkin);
  return (
    `/api/v1/hotels/searchHotels?entityId=${encodeURIComponent(entityId)}` +
    `&checkin=${encodeURIComponent(ci)}&checkout=${encodeURIComponent(co)}` +
    `&adults=${encodeURIComponent(guests || 1)}&rooms=1&limit=25&sorting=-relevance` +
    `&currency=INR&market=en-US&countryCode=IN`
  );
}

function addOneDay(d) {
  const dt = new Date(`${d}T00:00:00`);
  dt.setDate(dt.getDate() + 1);
  return dt.toISOString().slice(0, 10);
}
