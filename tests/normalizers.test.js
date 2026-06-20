import { describe, it, expect } from "vitest";
import {
  normalizeTrainsBetween,
  normalizeLiveStatus,
  normalizePnr,
} from "../api/_lib/irctc.js";

describe("normalizeTrainsBetween", () => {
  it("maps a raw train list to the frontend shape", () => {
    const raw = {
      data: [
        {
          train_number: "12301",
          train_name: "RAJDHANI EXP",
          from_station_code: "NDLS",
          to_station_code: "HWH",
          from_std: "16:55",
          to_std: "09:55",
          duration: "17:00",
          class_type: ["1A", "2A", "3A"],
        },
      ],
    };
    const out = normalizeTrainsBetween(raw, "NDLS", "HWH");
    expect(out.total).toBe(1);
    expect(out.trains[0].trainNumber).toBe("12301");
    expect(out.trains[0].trainName).toBe("RAJDHANI EXP");
    expect(out.trains[0].classes).toEqual(["1A", "2A", "3A"]);
  });

  it("falls back to from/to args and empty list safely", () => {
    const out = normalizeTrainsBetween({}, "NDLS", "MAS");
    expect(out.total).toBe(0);
    expect(out.trains).toEqual([]);
  });
});

describe("normalizeLiveStatus", () => {
  it("normalizes status, distance units and location messages", () => {
    const raw = {
      status: true,
      data: {
        train_name: "SHATABDI",
        update_time: "12:30",
        source: "NDLS",
        destination: "BPL",
        total_distance: 700,
        distance_from_source: 350,
        current_station_name: "Jhansi [JHS]",
        current_state_code: "JHS",
        delay: "15 min",
        current_location_info: [{ readable_message: "Departed Jhansi" }],
      },
    };
    const out = normalizeLiveStatus(raw, "12001");
    expect(out.trainNumber).toBe("12001");
    expect(out.totalDistance).toBe("700 km");
    expect(out.distanceFromSource).toBe("350 km");
    expect(out.currentStation.name).toBe("Jhansi"); // [JHS] stripped
    expect(out.delay).toBe("15 min");
    expect(out.locationMessages).toEqual(["Departed Jhansi"]);
  });

  it("defaults gracefully when data is missing", () => {
    const out = normalizeLiveStatus({}, "12001");
    expect(out.delay).toBe("On time");
    expect(out.currentStation.name).toBe("—");
    expect(out.locationMessages).toEqual([]);
  });
});

describe("normalizePnr", () => {
  it("maps PNR fields and passenger statuses", () => {
    const raw = {
      data: {
        TrainNo: "12301",
        TrainName: "RAJDHANI",
        Class: "3A",
        From: "NDLS",
        To: "HWH",
        BookingFare: 1500,
        ChartPrepared: true,
        PassengerStatus: [
          { BookingStatus: "CNF/B1/23", CurrentStatusNew: "CNF", CurrentCoachId: "B1", CurrentBerthNo: "23" },
        ],
      },
    };
    const out = normalizePnr(raw, "1234567890");
    expect(out.pnr).toBe("1234567890");
    expect(out.bookingFare).toBe("₹1500");
    expect(out.chartStatus).toBe("Chart Prepared");
    expect(out.passengers).toHaveLength(1);
    expect(out.passengers[0].currentStatus).toBe("CNF");
    expect(out.passengers[0].coachPosition).toBe("B1-23");
  });

  it("reports chart-not-prepared and empty passengers safely", () => {
    const out = normalizePnr({ data: {} }, "1234567890");
    expect(out.chartStatus).toBe("Chart Not Prepared");
    expect(out.passengers).toEqual([]);
  });
});
