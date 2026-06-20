import { describe, it, expect } from "vitest";
import { normalizeFlights } from "../api/_lib/flights.js";

// Representative Sky-Scrapper searchFlights payload (trimmed to the fields we use).
const sample = {
  data: {
    itineraries: [
      {
        id: "it-2",
        price: { raw: 8200, formatted: "₹8,200" },
        legs: [
          {
            origin: { displayCode: "DEL" },
            destination: { displayCode: "BOM" },
            departure: "2026-07-01T18:00:00",
            arrival: "2026-07-01T20:15:00",
            durationInMinutes: 135,
            stopCount: 1,
            carriers: { marketing: [{ name: "Air India", logoUrl: "http://x/ai.png" }] },
          },
        ],
      },
      {
        id: "it-1",
        price: { raw: 5234, formatted: "₹5,234" },
        legs: [
          {
            origin: { displayCode: "DEL" },
            destination: { displayCode: "BOM" },
            departure: "2026-07-01T06:05:00",
            arrival: "2026-07-01T08:15:00",
            durationInMinutes: 130,
            stopCount: 0,
            carriers: { marketing: [{ name: "IndiGo" }] },
          },
        ],
      },
    ],
  },
};

describe("normalizeFlights", () => {
  it("maps itineraries and sorts cheapest first", () => {
    const out = normalizeFlights(sample);
    expect(out.total).toBe(2);
    // cheapest first
    expect(out.flights[0].airline).toBe("IndiGo");
    expect(out.flights[0].price).toBe("₹5,234");
    expect(out.flights[0].departure).toBe("06:05");
    expect(out.flights[0].arrival).toBe("08:15");
    expect(out.flights[0].duration).toBe("2h 10m");
    expect(out.flights[0].stopsLabel).toBe("Non-stop");
    expect(out.flights[1].stopsLabel).toBe("1 stop");
  });

  it("handles an empty / malformed payload safely", () => {
    expect(normalizeFlights({}).total).toBe(0);
    expect(normalizeFlights({ data: {} }).flights).toEqual([]);
  });
});
