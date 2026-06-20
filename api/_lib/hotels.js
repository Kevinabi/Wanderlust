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

// Pure normalizer — maps a Sky-Scrapper searchHotels payload to our UI shape.
export function normalizeHotels(data) {
  const list =
    data?.data?.hotels ||
    data?.data?.results?.hotelCards ||
    data?.hotels ||
    [];
  const hotels = (Array.isArray(list) ? list : []).map((h) => {
    const reviews = h.reviewsSummary || h.rating || {};
    const rawPrice = h.rawPrice ?? h.priceRaw ?? h.price?.amount ?? null;
    const priceStr =
      (typeof h.price === "string" && h.price) ||
      h.price?.formatted ||
      (rawPrice != null ? `₹${Math.round(rawPrice)}` : "—");
    return {
      id: h.hotelId || h.id || h.name,
      name: h.name || h.heading || "—",
      image: h.heroImage || h.image || (Array.isArray(h.images) ? h.images[0] : null),
      stars: Number(h.stars || h.starRating || h.class || 0) || 0,
      rating: reviews.score ?? h.rating ?? null,
      ratingDesc: reviews.scoreDesc || reviews.label || "",
      reviewsCount: reviews.total ?? h.reviewsCount ?? null,
      price: priceStr,
      priceRaw: rawPrice,
      location: h.distance || h.relevantPoiDistance || h.area || h.address || "",
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
