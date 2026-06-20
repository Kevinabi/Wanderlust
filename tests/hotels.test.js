import { describe, it, expect } from "vitest";
import { normalizeHotels } from "../api/_lib/hotels.js";

const sample = {
  data: {
    hotels: [
      {
        hotelId: "h2",
        name: "Grand Sea Resort",
        stars: 5,
        reviewsSummary: { score: 4.6, scoreDesc: "Excellent", total: 1820 },
        rawPrice: 14500,
        price: "₹14,500",
        heroImage: "http://img/2.jpg",
        distance: "1.2 km from centre",
      },
      {
        hotelId: "h1",
        name: "Budget Stay Inn",
        stars: 3,
        reviewsSummary: { score: 4.0, scoreDesc: "Very Good", total: 540 },
        rawPrice: 3200,
        price: "₹3,200",
        heroImage: "http://img/1.jpg",
        distance: "3 km from centre",
      },
    ],
  },
};

describe("normalizeHotels", () => {
  it("maps hotels and sorts cheapest first", () => {
    const out = normalizeHotels(sample);
    expect(out.total).toBe(2);
    expect(out.hotels[0].name).toBe("Budget Stay Inn");
    expect(out.hotels[0].price).toBe("₹3,200");
    expect(out.hotels[0].stars).toBe(3);
    expect(out.hotels[0].rating).toBe(4.0);
    expect(out.hotels[0].ratingDesc).toBe("Very Good");
    expect(out.hotels[1].reviewsCount).toBe(1820);
  });

  it("handles empty / malformed payloads safely", () => {
    expect(normalizeHotels({}).total).toBe(0);
    expect(normalizeHotels({ data: {} }).hotels).toEqual([]);
  });

  it("flattens an object-shaped rating to primitives (no React #31)", () => {
    const out = normalizeHotels({
      data: { hotels: [{
        hotelId: "x", name: "Obj Rating Hotel", stars: 4,
        rating: { value: 4.3, description: "Very Good", count: 980, color: "#0a0" },
        price: { amount: 6000, formatted: "₹6,000" },
        heroImage: { url: "http://img/x.jpg" },
        distance: { value: 2 },
      }] },
    });
    const h = out.hotels[0];
    expect(typeof h.rating).toBe("number");
    expect(h.rating).toBe(4.3);
    expect(h.ratingDesc).toBe("Very Good");
    expect(h.reviewsCount).toBe(980);
    expect(h.price).toBe("₹6,000");
    expect(h.image).toBe("http://img/x.jpg");
    expect(typeof h.location).toBe("string");
  });
});
