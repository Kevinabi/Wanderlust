import { useState, useRef, useEffect, useCallback } from "react";

// ─── API CONFIG ───────────────────────────────────────────────────────────────
// In dev (vite) the API runs on the local Express server at :3001.
// In production (Vercel) the API is served from the same domain at /api.
// Override anytime with VITE_API_BASE in a .env file.
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? "http://localhost:3001/api" : "/api");

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");
  return data;
}

// Format an IRCTC duration like "14:8" or "12:10" into a tidy "14h 08m".
function fmtDuration(d) {
  if (!d) return "—";
  const m = String(d).match(/^(\d{1,2}):(\d{1,2})$/);
  return m ? `${parseInt(m[1], 10)}h ${m[2].padStart(2, "0")}m` : String(d);
}

// ─── RESPONSIVE HOOK ───
// Returns true on narrow (mobile) viewports. Updates live on resize/rotate.
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(`(max-width:${breakpoint}px)`).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${breakpoint}px)`);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return isMobile;
}

// Tracks whether the page has scrolled past a threshold (drives header anim).
function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

// Fade-and-rise wrapper that animates its children into view on scroll.
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? "translateY(0)" : "translateY(28px)",
      transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// Page scroll progress 0..1 (drives the little flight-mover indicator).
function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setP(max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);
  return p;
}

// Hero motion graphics — three parallax depth layers (background gradient shapes,
// mid clouds + route path, foreground airplane + travel icons). Pure SVG/CSS with
// direct-DOM transforms on scroll (no React re-renders) for performance.
function Cloud({ w }) {
  return (
    <svg width={w} viewBox="0 0 100 56" fill="#ffffff" aria-hidden>
      <path d="M25 50h52a14 14 0 0 0 1.5-27.8A19 19 0 0 0 42 15.5 13 13 0 0 0 25 50z" />
    </svg>
  );
}
function HeroMotion({ isMobile }) {
  const bg = useRef(null), mid = useRef(null), fg = useRef(null);
  useEffect(() => {
    let raf = 0;
    const apply = () => {
      const y = window.scrollY;
      if (bg.current) bg.current.style.transform = `translate3d(0, ${y * 0.07}px, 0)`;
      if (mid.current) mid.current.style.transform = `translate3d(0, ${y * 0.18}px, 0)`;
      if (fg.current) fg.current.style.transform = `translate3d(0, ${y * 0.36}px, 0)`;
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const icon = { position: "absolute", opacity: 0.22, filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.3))" };
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
      {/* BACKGROUND layer — soft gradient shapes + abstract globe (slowest) */}
      <div ref={bg} style={{ position: "absolute", inset: 0, willChange: "transform" }}>
        <div style={{ position: "absolute", top: "-12%", left: "-7%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(23,104,209,0.38), transparent 70%)", filter: "blur(6px)" }} />
        <div style={{ position: "absolute", bottom: "-22%", right: "-9%", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(11,77,162,0.34), transparent 70%)", filter: "blur(10px)" }} />
        <svg style={{ position: "absolute", top: "6%", right: "28%", width: isMobile ? 120 : 230, opacity: 0.12 }} viewBox="0 0 100 100" fill="none" stroke="#ffffff" strokeWidth="1" aria-hidden>
          <circle cx="50" cy="50" r="46" />
          <ellipse cx="50" cy="50" rx="46" ry="18" />
          <ellipse cx="50" cy="50" rx="20" ry="46" />
          <line x1="4" y1="50" x2="96" y2="50" />
        </svg>
      </div>
      {/* MID layer — self-drawing route path + clouds (medium) */}
      <div ref={mid} style={{ position: "absolute", inset: 0, willChange: "transform" }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 1000 460" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <path d="M-40 430 C 240 380, 430 210, 1040 70" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="1400" strokeDashoffset="1400" vectorEffect="non-scaling-stroke" style={{ animation: "drawPath 3s ease forwards .4s" }} />
        </svg>
        <div style={{ position: "absolute", top: "15%", left: "5%", opacity: 0.5 }}><Cloud w={isMobile ? 64 : 120} /></div>
        <div style={{ position: "absolute", top: "34%", right: "8%", opacity: 0.34 }}><Cloud w={isMobile ? 46 : 92} /></div>
      </div>
      {/* FOREGROUND layer — airplane + travel icons (fastest) */}
      <div ref={fg} style={{ position: "absolute", inset: 0, willChange: "transform" }}>
        <div style={{ position: "absolute", top: isMobile ? "9%" : "15%", right: isMobile ? "9%" : "14%" }}>
          <div style={{ animation: "heroFloat 5s ease-in-out infinite" }}>
            <svg width={isMobile ? 34 : 58} height={isMobile ? 34 : 58} viewBox="0 0 24 24" fill="#ffffff" style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))" }} aria-hidden>
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" />
            </svg>
          </div>
        </div>
        <svg style={{ ...icon, top: "23%", left: "8%", animation: "heroFloat 6s ease-in-out infinite" }} width={isMobile ? 22 : 34} height={isMobile ? 22 : 34} viewBox="0 0 24 24" fill="#ffffff" aria-hidden>
          <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
        </svg>
        <svg style={{ ...icon, bottom: "17%", left: "14%", animation: "heroFloat 7s ease-in-out infinite" }} width={isMobile ? 22 : 32} height={isMobile ? 22 : 32} viewBox="0 0 24 24" fill="#ffffff" aria-hidden>
          <path d="M9 4h6a2 2 0 0 1 2 2v1h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2V6a2 2 0 0 1 2-2zm0 3h6V6H9v1z" />
        </svg>
        <svg style={{ ...icon, bottom: "27%", right: "20%", animation: "heroFloat 6.5s ease-in-out infinite" }} width={isMobile ? 20 : 30} height={isMobile ? 20 : 30} viewBox="0 0 24 24" fill="#ffffff" aria-hidden>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm3.5 6.5-2 5-5 2 2-5 5-2z" />
        </svg>
        <svg style={{ ...icon, top: "30%", left: "17%", animation: "heroFloat 7.5s ease-in-out infinite" }} width={isMobile ? 22 : 32} height={isMobile ? 22 : 32} viewBox="0 0 24 24" fill="#ffffff" aria-hidden>
          <path d="M12 2c-4 0-8 .5-8 4v9a3 3 0 0 0 3 3l-2 3h2l2-2h6l2 2h2l-2-3a3 3 0 0 0 3-3V6c0-3.5-4-4-8-4zM6.5 14a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm11 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM11 9H6V6h5v3zm7 0h-5V6h5v3z" />
        </svg>
      </div>
    </div>
  );
}

// Category tiles (MMT-style icon-over-label). Rendered big inside the hero and
// compact in the docked bar via the `compact` flag.
function CategoryTiles({ categories, activeCategory, setActiveCategory, compact, isMobile }) {
  const iconSize = compact ? (isMobile ? 18 : 21) : (isMobile ? 22 : 28);
  const labelSize = compact ? 10.5 : (isMobile ? 11 : 12.5);
  const tileW = compact ? (isMobile ? 60 : 80) : (isMobile ? 74 : 94);
  const pad = compact ? "5px 4px 7px" : "8px 4px 12px";
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: isMobile ? 2 : 6, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", padding: "0 10px" }}>
      {categories.map((cat) => {
        const active = cat.id === activeCategory;
        return (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#0B4DA2"; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#444"; }}
            style={{
              position: "relative", border: "none", background: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
              gap: compact ? 3 : 5, width: tileW, padding: pad, color: active ? "#0B4DA2" : "#444", transition: "color .2s",
            }}>
            <span style={{ fontSize: iconSize, lineHeight: 1 }}>{cat.icon}</span>
            <span style={{ fontSize: labelSize, fontWeight: active ? 700 : 600, textAlign: "center", lineHeight: 1.15, whiteSpace: "normal", maxWidth: tileW - 4 }}>{cat.label}</span>
            {active && <span style={{ position: "absolute", bottom: 0, left: "18%", right: "18%", height: 3, borderRadius: 3, background: "#0B4DA2" }} />}
          </button>
        );
      })}
    </div>
  );
}

// True once the in-hero category row reaches the top (header line). No tracking,
// no mid-scroll floating — the nav stays in flow until it docks.
function useDocked(ref, offset = 56) {
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    const onScroll = () => { const el = ref.current; if (el) setDocked(el.getBoundingClientRect().top <= offset); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [ref, offset]);
  return docked;
}

// Compact glass category bar that fades/slides in, pinned at the top, only once
// the hero tiles reach it. Stays still — it never moves during scrolling.
function DockedCategoryBar({ categories, activeCategory, setActiveCategory, visible, isMobile }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 110,
      background: "rgba(255,255,255,0.95)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      boxShadow: visible ? "0 6px 22px rgba(4,29,54,0.13)" : "none", borderBottom: "1px solid #eef1f6",
      transform: visible ? "translateY(0)" : "translateY(-14px)", opacity: visible ? 1 : 0,
      pointerEvents: visible ? "auto" : "none",
      transition: "opacity .26s ease, transform .26s ease", willChange: "opacity, transform",
    }}>
      <CategoryTiles categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} compact isMobile={isMobile} />
    </div>
  );
}

// ─── DATASETS per category ────────────────────────────────────────────────────

const FLIGHT_CITIES = {
  "Popular Domestic": [
    { code: "DEL", name: "Delhi", sub: "Indira Gandhi International Airport" },
    { code: "BOM", name: "Mumbai", sub: "Chhatrapati Shivaji Maharaj Airport" },
    { code: "BLR", name: "Bengaluru", sub: "Kempegowda International Airport" },
    { code: "MAA", name: "Chennai", sub: "Chennai International Airport" },
    { code: "CCU", name: "Kolkata", sub: "Netaji Subhas Chandra Bose Airport" },
    { code: "HYD", name: "Hyderabad", sub: "Rajiv Gandhi International Airport" },
    { code: "GOI", name: "Goa", sub: "Dabolim Airport" },
    { code: "JAI", name: "Jaipur", sub: "Jaipur International Airport" },
    { code: "AMD", name: "Ahmedabad", sub: "Sardar Vallabhbhai Patel Airport" },
    { code: "PNQ", name: "Pune", sub: "Pune Airport" },
    { code: "COK", name: "Kochi", sub: "Cochin International Airport" },
  ],
  "Visa-Free / Visa on Arrival": [
    { code: "DPS", name: "Bali (Denpasar)", sub: "Ngurah Rai International Airport" },
    { code: "CMB", name: "Colombo", sub: "Bandaranaike International Airport" },
    { code: "MLE", name: "Malé", sub: "Velana International Airport" },
    { code: "KUL", name: "Kuala Lumpur", sub: "KLIA Airport" },
    { code: "MNL", name: "Manila", sub: "Ninoy Aquino International Airport" },
    { code: "HKG", name: "Hong Kong", sub: "Hong Kong International Airport" },
    { code: "MRU", name: "Mauritius", sub: "Sir Seewoosagur Ramgoolam Airport" },
    { code: "PBH", name: "Paro (Bhutan)", sub: "Paro International Airport" },
    { code: "SEZ", name: "Mahe (Seychelles)", sub: "Seychelles International Airport" },
  ],
  "E-Visa Destinations": [
    { code: "DXB", name: "Dubai", sub: "Dubai International Airport" },
    { code: "SIN", name: "Singapore", sub: "Changi Airport" },
    { code: "BKK", name: "Bangkok", sub: "Suvarnabhumi Airport" },
    { code: "TYO", name: "Tokyo", sub: "Narita International Airport" },
    { code: "REP", name: "Siem Reap", sub: "Angkor International Airport" },
    { code: "DOH", name: "Doha", sub: "Hamad International Airport" },
  ],
  "Popular International": [
    { code: "CDG", name: "Paris", sub: "Charles de Gaulle Airport" },
    { code: "LHR", name: "London", sub: "Heathrow Airport" },
    { code: "JFK", name: "New York", sub: "John F. Kennedy International Airport" },
    { code: "SYD", name: "Sydney", sub: "Kingsford Smith Airport" },
    { code: "FCO", name: "Rome", sub: "Leonardo da Vinci Airport" },
    { code: "ATH", name: "Athens", sub: "Athens International Airport" },
  ],
};

const TRAIN_CITIES = {
  "Popular Cities": [
    { code: "NDLS", name: "Delhi", sub: "New Delhi Railway Station" },
    { code: "HWH", name: "Kolkata", sub: "Kolkata Howrah Junction" },
    { code: "KYN", name: "Mumbai", sub: "Kalyan Junction" },
    { code: "MAS", name: "Chennai", sub: "Chennai MGR Central Railway Station" },
    { code: "SC", name: "Hyderabad", sub: "Secunderabad Junction" },
    { code: "SBC", name: "Bengaluru", sub: "KSR Bengaluru City Junction" },
    { code: "JP", name: "Jaipur", sub: "Jaipur Junction" },
    { code: "ADI", name: "Ahmedabad", sub: "Ahmedabad Junction" },
    { code: "PUNE", name: "Pune", sub: "Pune Junction" },
    { code: "LKO", name: "Lucknow", sub: "Lucknow Charbagh" },
    { code: "CNB", name: "Kanpur", sub: "Kanpur Central" },
    { code: "PNBE", name: "Patna", sub: "Patna Junction" },
  ],
  "South India": [
    { code: "ERS", name: "Ernakulam", sub: "Ernakulam Junction" },
    { code: "TVC", name: "Thiruvananthapuram", sub: "Thiruvananthapuram Central" },
    { code: "CBE", name: "Coimbatore", sub: "Coimbatore Junction" },
    { code: "MDU", name: "Madurai", sub: "Madurai Junction" },
    { code: "VSP", name: "Visakhapatnam", sub: "Visakhapatnam Railway Station" },
    { code: "MYS", name: "Mysuru", sub: "Mysuru Junction" },
  ],
  "North & Central India": [
    { code: "AGC", name: "Agra", sub: "Agra Cantonment" },
    { code: "BSB", name: "Varanasi", sub: "Varanasi Junction" },
    { code: "HW", name: "Haridwar", sub: "Haridwar Junction" },
    { code: "INDB", name: "Indore", sub: "Indore Junction" },
    { code: "BPL", name: "Bhopal", sub: "Bhopal Junction" },
    { code: "NZM", name: "Hazrat Nizamuddin", sub: "Hazrat Nizamuddin Station, Delhi" },
  ],
};

const BUS_CITIES = {
  "Popular Routes": [
    { code: "BLR-BS", name: "Bengaluru", sub: "Kempegowda Bus Station (Majestic)" },
    { code: "CHN-BS", name: "Chennai", sub: "Chennai Mofussil Bus Terminus (CMBT)" },
    { code: "HYD-BS", name: "Hyderabad", sub: "Mahatma Gandhi Bus Station (MGBS)" },
    { code: "MUM-BS", name: "Mumbai", sub: "Mumbai Central Bus Depot" },
    { code: "PNQ-BS", name: "Pune", sub: "Pune Swargate Bus Stand" },
    { code: "GOA-BS", name: "Goa", sub: "Panaji Kadamba Bus Terminal" },
    { code: "COC-BS", name: "Kochi", sub: "Vytilla Mobility Hub" },
    { code: "MYS-BS", name: "Mysuru", sub: "Mysuru Central Bus Stand" },
    { code: "CBE-BS", name: "Coimbatore", sub: "Gandhipuram Bus Stand" },
    { code: "MDU-BS", name: "Madurai", sub: "Mattuthavani Bus Terminal" },
  ],
  "North India": [
    { code: "DEL-BS", name: "Delhi", sub: "Kashmere Gate ISBT" },
    { code: "JAI-BS", name: "Jaipur", sub: "Sindhi Camp Bus Stand" },
    { code: "AGR-BS", name: "Agra", sub: "Agra Idgah Bus Stand" },
    { code: "LKO-BS", name: "Lucknow", sub: "Charbagh Bus Station" },
    { code: "CHD-BS", name: "Chandigarh", sub: "Chandigarh ISBT Sector 43" },
  ],
};

const HOTEL_CITIES = {
  "Trending Domestic": [
    { code: "GOA", name: "Goa", sub: "Beach destination, India" },
    { code: "MUM", name: "Mumbai", sub: "Maharashtra, India" },
    { code: "DEL", name: "Delhi", sub: "Capital, India" },
    { code: "JAI", name: "Jaipur", sub: "Pink City, Rajasthan" },
    { code: "MYS", name: "Mysuru", sub: "Karnataka, India" },
    { code: "OOT", name: "Ooty", sub: "Tamil Nadu, India" },
    { code: "MSS", name: "Manali", sub: "Himachal Pradesh, India" },
    { code: "DRJ", name: "Darjeeling", sub: "West Bengal, India" },
    { code: "UDR", name: "Udaipur", sub: "Lake City, Rajasthan" },
  ],
  "Trending International": [
    { code: "BAL", name: "Bali", sub: "Indonesia" },
    { code: "BKK", name: "Bangkok", sub: "Thailand" },
    { code: "DXB", name: "Dubai", sub: "UAE" },
    { code: "SIN", name: "Singapore", sub: "Singapore" },
    { code: "PRG", name: "Prague", sub: "Czech Republic" },
    { code: "IST", name: "Istanbul", sub: "Turkey" },
  ],
};

const TOUR_CITIES = {
  "Beach & Islands": [
    { code: "GOA-T", name: "Goa", sub: "Beach, nightlife & Portuguese heritage" },
    { code: "AND-T", name: "Andaman Islands", sub: "Pristine beaches & scuba diving" },
    { code: "LAK-T", name: "Lakshadweep", sub: "Coral reefs & water sports" },
    { code: "BAL-T", name: "Bali, Indonesia", sub: "Tropical paradise & temples" },
    { code: "MLV-T", name: "Maldives", sub: "Overwater bungalows & snorkelling" },
  ],
  "Heritage & Culture": [
    { code: "RAJ-T", name: "Rajasthan", sub: "Forts, palaces & desert safari" },
    { code: "VRN-T", name: "Varanasi", sub: "Ghats, rituals & spiritual experience" },
    { code: "AGR-T", name: "Agra", sub: "Taj Mahal & Mughal architecture" },
    { code: "HAM-T", name: "Hampi", sub: "UNESCO World Heritage ruins" },
  ],
  "Hill Stations & Adventure": [
    { code: "MNL-T", name: "Manali", sub: "Snow, trekking & river rafting" },
    { code: "DRJ-T", name: "Darjeeling", sub: "Tea gardens & toy train" },
    { code: "KSH-T", name: "Kashmir", sub: "Dal Lake, houseboats & skiing" },
    { code: "RIS-T", name: "Rishikesh", sub: "Yoga capital & bungee jumping" },
    { code: "COG-T", name: "Coorg", sub: "Coffee plantations & waterfalls" },
  ],
};

const DATASETS = {
  flights: FLIGHT_CITIES,
  hotels: HOTEL_CITIES,
  tours: TOUR_CITIES,
  homestays: HOTEL_CITIES,
  trains: TRAIN_CITIES,
  buses: BUS_CITIES,
  cabs: HOTEL_CITIES,
  cruises: FLIGHT_CITIES,
};

const CATEGORY_META = {
  flights: { fromLabel: "FROM", toLabel: "TO", fromHint: "Departure Airport", toHint: "Arrival Airport", icon: "✈️" },
  hotels: { fromLabel: "CITY / DESTINATION", toLabel: "CHECK-IN", fromHint: "Where do you want to stay?", toHint: "", icon: "🏨" },
  tours: { fromLabel: "STARTING FROM", toLabel: "DESTINATION", fromHint: "Your city", toHint: "Tour destination", icon: "🗺️" },
  homestays: { fromLabel: "CITY / AREA", toLabel: "CHECK-IN", fromHint: "Where do you want to stay?", toHint: "", icon: "🏡" },
  trains: { fromLabel: "FROM STATION", toLabel: "TO STATION", fromHint: "Departure Railway Station", toHint: "Arrival Railway Station", icon: "🚆" },
  buses: { fromLabel: "FROM", toLabel: "TO", fromHint: "Departure Bus Stand", toHint: "Arrival Bus Stand", icon: "🚌" },
  cabs: { fromLabel: "PICK UP", toLabel: "DROP OFF", fromHint: "Your pickup location", toHint: "Your drop location", icon: "🚕" },
  cruises: { fromLabel: "DEPARTURE PORT", toLabel: "DESTINATION", fromHint: "Departure city / port", toHint: "Cruise destination", icon: "🛳️" },
};

const categories = [
  { id: "flights", label: "Flights", icon: "✈️" },
  { id: "hotels", label: "Hotels", icon: "🏨" },
  { id: "tours", label: "Tours & Activities", icon: "🗺️" },
  { id: "homestays", label: "Villas & Homestays", icon: "🏡" },
  { id: "trains", label: "Trains", icon: "🚆" },
  { id: "buses", label: "Buses", icon: "🚌" },
  { id: "cabs", label: "Cabs", icon: "🚕" },
  { id: "cruises", label: "Cruises", icon: "🛳️" },
];

const destinations = [
  { name: "Bali, Indonesia", tag: "Tropical Paradise", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80", price: "₹35,999" },
  { name: "Paris, France", tag: "City of Love", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80", price: "₹72,499" },
  { name: "Maldives", tag: "Beach Getaway", img: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&q=80", price: "₹58,999" },
  { name: "Rajasthan, India", tag: "Heritage & Culture", img: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&q=80", price: "₹18,999" },
  { name: "Tokyo, Japan", tag: "Modern Meets Ancient", img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80", price: "₹82,000" },
  { name: "Santorini, Greece", tag: "Island Dreams", img: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&q=80", price: "₹95,000" },
];

const offers = [
  { title: "Early Bird Discount", desc: "Book 30 days in advance & save up to 25% on any package", badge: "25% OFF", color: "#0B4DA2", bg: "#EAF1FC" },
  { title: "Couple Special", desc: "Exclusive honeymoon packages starting at ₹49,999 per couple", badge: "HOT DEAL", color: "#1768D1", bg: "#EAF1FC" },
  { title: "Group Getaway", desc: "Travel with 6+ friends and get one FREE booking on tours", badge: "1 FREE", color: "#0E6BB8", bg: "#E8F2FB" },
  { title: "Flash Sale", desc: "48-hour sale — Flights from Delhi to Goa starting ₹1,499", badge: "FLASH", color: "#0B4DA2", bg: "#EAF1FC" },
];

const navLinks = ["My Trips", "Wishlist", "Offers", "Support"];

// ─── CITY PICKER ─────────────────────────────────────────────────────────────

function CityPicker({ value, onChange, placeholder, exclude, dataset, isMobile }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const allCities = Object.values(dataset).flat();

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = query.trim()
    ? allCities.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase()) ||
        c.sub.toLowerCase().includes(query.toLowerCase())
      ).filter(c => c.code !== exclude?.code)
    : null;

  const select = (city) => { onChange(city); setOpen(false); setQuery(""); };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <div onClick={() => setOpen(o => !o)} style={{ cursor: "pointer", minHeight: 48 }}>
        {value ? (
          <>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#1a1a2e", lineHeight: 1 }}>{value.name}</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 3 }}>
              {value.code} · {value.sub.length > 30 ? value.sub.slice(0, 30) + "…" : value.sub}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 18, color: "#bbb", fontWeight: 600, paddingTop: 4 }}>{placeholder}</div>
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 16px)", left: isMobile ? 0 : "-24px",
          width: isMobile ? "100%" : 400, minWidth: isMobile ? 0 : 400, maxWidth: "calc(100vw - 32px)", background: "#fff",
          borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          zIndex: 999, overflow: "hidden", border: "1px solid #f0f0f0",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>🔍</span>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search city, station or airport…"
              style={{ border: "none", outline: "none", fontSize: 14, width: "100%", color: "#1a1a2e", background: "none" }} />
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {filtered ? (
              filtered.length === 0
                ? <div style={{ padding: "20px", textAlign: "center", color: "#aaa", fontSize: 14 }}>No results found</div>
                : filtered.map(city => <CityRow key={city.code} city={city} onSelect={select} />)
            ) : (
              Object.entries(dataset).map(([group, cities]) => (
                <div key={group}>
                  <div style={{ padding: "10px 16px 6px", fontSize: 11, fontWeight: 800, color: "#999", letterSpacing: 0.8, textTransform: "uppercase", background: "#fafafa" }}>
                    {group}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "8px 14px 12px" }}>
                    {cities.filter(c => c.code !== exclude?.code).map(city => (
                      <button key={city.code} onClick={() => select(city)} style={{
                        border: "1.5px solid #e8e8e8", borderRadius: 8, padding: "6px 12px",
                        background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#333",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#0B4DA2"; e.currentTarget.style.color = "#0B4DA2"; e.currentTarget.style.background = "#EAF1FC"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e8e8"; e.currentTarget.style.color = "#333"; e.currentTarget.style.background = "#fff"; }}
                      >{city.name}</button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CityRow({ city, onSelect }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={() => onSelect(city)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", background: hov ? "#EAF1FC" : "#fff", transition: "background .15s" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: hov ? "#0B4DA2" : "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, transition: "background .15s", flexShrink: 0 }}>📍</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{city.name}</div>
        <div style={{ fontSize: 11, color: "#999" }}>{city.sub}</div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#0B4DA2" }}>{city.code}</div>
    </div>
  );
}

// ─── TRAIN LIVE STATUS ────────────────────────────────────────────────────────

function TrainLiveStatus() {
  const [trainNo, setTrainNo] = useState("");
  const [myStop, setMyStop] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    if (!trainNo.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      // startDay=1 handles overnight trains; pass 0 if train started today
      const data = await apiGet(`/live-status/${trainNo.trim()}?startDay=1`);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [trainNo]);

  const current = result?.currentStation;
  const delay = result?.delay && result.delay !== "On time" ? result.delay : "On time";

  return (
    <div style={{ padding: "20px 24px 24px" }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>TRAIN NUMBER</div>
          <input value={trainNo} onChange={e => setTrainNo(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="e.g. 12301"
            style={{ border: "none", borderBottom: "2px solid #eee", outline: "none", fontSize: 22, fontWeight: 800, color: "#1a1a2e", width: "100%", padding: "4px 0", background: "none" }}
            onFocus={e => e.target.style.borderBottomColor = "#0B4DA2"}
            onBlur={e => e.target.style.borderBottomColor = "#eee"}
            onKeyDown={e => e.key === "Enter" && check()}
          />
          <div style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>4 or 5 digit train number</div>
        </div>
        <div style={{ flex: 1.5, minWidth: 140 }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>DATE OF JOURNEY</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ border: "none", borderBottom: "2px solid #eee", outline: "none", fontSize: 18, fontWeight: 800, color: "#1a1a2e", width: "100%", padding: "4px 0", background: "none" }}
            onFocus={e => e.target.style.borderBottomColor = "#0B4DA2"}
            onBlur={e => e.target.style.borderBottomColor = "#eee"}
          />
        </div>
        <div style={{ flex: 2, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>
            YOUR STOP <span style={{ color: "#bbb", fontWeight: 400 }}>(optional)</span>
          </div>
          <input value={myStop} onChange={e => setMyStop(e.target.value)}
            placeholder="e.g. Bhopal or BPL"
            style={{ border: "none", borderBottom: "2px solid #eee", outline: "none", fontSize: 18, fontWeight: 800, color: "#1a1a2e", width: "100%", padding: "4px 0", background: "none" }}
            onFocus={e => e.target.style.borderBottomColor = "#0B4DA2"}
            onBlur={e => e.target.style.borderBottomColor = "#eee"}
          />
          <div style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>Station name or code</div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button onClick={check} disabled={loading || !trainNo} style={{
          background: loading || !trainNo ? "#ccc" : "linear-gradient(135deg, #0B4DA2, #1768D1)",
          color: "#fff", border: "none", borderRadius: 12,
          padding: "14px 56px", fontSize: 16, fontWeight: 800,
          cursor: loading || !trainNo ? "default" : "pointer",
          boxShadow: !loading && trainNo ? "0 6px 20px rgba(11,77,162,0.32)" : "none",
        }}>{loading ? "⏳ Fetching Live Status…" : "🔍 CHECK STATUS"}</button>
      </div>

      {error && (
        <div style={{ marginTop: 16, background: "#FFF0F0", borderRadius: 12, border: "1.5px solid #E91E63", padding: "16px 20px", color: "#c62828", fontWeight: 600 }}>
          ❌ {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 20 }}>
          {/* Main status card */}
          <div style={{ background: "#F8FFF8", borderRadius: 14, border: "1.5px solid #00C853", padding: "20px 24px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#1a1a2e" }}>
                  {result.trainName || `Train #${result.trainNumber}`}
                  <span style={{ fontSize: 13, color: "#888", fontWeight: 500, marginLeft: 8 }}>#{result.trainNumber}</span>
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Last updated: {result.updateTime}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ background: "#00C853", color: "#fff", fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 20 }}>🟢 Running</span>
                  {delay !== "On time"
                    ? <span style={{ background: "#EAF1FC", color: "#0B4DA2", fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 20 }}>⏱ {delay} late</span>
                    : <span style={{ background: "#E8F5E9", color: "#00C853", fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 20 }}>✅ On Time</span>
                  }
                </div>
              </div>
              {current && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#999", fontWeight: 700 }}>CURRENTLY AT / NEAR</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e" }}>{current.name}</div>
                  <div style={{ fontSize: 13, color: "#0B4DA2", fontWeight: 700 }}>{current.code}</div>
                </div>
              )}
            </div>

            {/* Route summary */}
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              {[
                ["FROM", result.source],
                ["TO", result.destination],
                ["DISTANCE COVERED", result.distanceFromSource + " / " + result.totalDistance],
              ].map(([label, val]) => (
                <div key={label} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid #eee" }}>
                  <div style={{ fontSize: 10, color: "#999", fontWeight: 700, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Location messages */}
            {result.locationMessages?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: "#999", fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>LIVE LOCATION UPDATES</div>
                {result.locationMessages.map((msg, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#444", padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
                    📍 {msg}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Your stop info */}
          {myStop && (
            <div style={{ background: "#fafafa", borderRadius: 12, padding: "14px 18px", border: "1.5px solid #ddd", fontSize: 13, color: "#888" }}>
              ℹ️ Station-specific ETA for "{myStop}" requires the paid tier of the IRCTC API. The free tier shows current position and route messages above.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PNR STATUS ───────────────────────────────────────────────────────────────

function PNRStatus() {
  const [pnr, setPnr] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    if (pnr.length < 10) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await apiGet(`/pnr/${pnr}`);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pnr]);

  const statusColor = (s) => {
    if (!s) return "#999";
    const u = s.toUpperCase();
    if (u.includes("CNF") || u.includes("CONFIRM")) return "#00C853";
    if (u.includes("WL") || u.includes("WAIT")) return "#0B4DA2";
    if (u.includes("CAN")) return "#E91E63";
    return "#555";
  };

  return (
    <div style={{ padding: "20px 24px 24px" }}>
      <div style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>PNR NUMBER</div>
        <input value={pnr} onChange={e => setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="Enter 10-digit PNR"
          style={{ border: "none", borderBottom: "2px solid #eee", outline: "none", fontSize: 22, fontWeight: 800, color: "#1a1a2e", width: "100%", padding: "4px 0", background: "none", letterSpacing: 3 }}
          onFocus={e => e.target.style.borderBottomColor = "#0B4DA2"}
          onBlur={e => e.target.style.borderBottomColor = "#eee"}
          onKeyDown={e => e.key === "Enter" && check()}
        />
        <div style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>10-digit number printed on your ticket</div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={check} disabled={pnr.length < 10 || loading} style={{
          background: pnr.length < 10 || loading ? "#ccc" : "linear-gradient(135deg, #0B4DA2, #1768D1)",
          color: "#fff", border: "none", borderRadius: 12,
          padding: "14px 48px", fontSize: 16, fontWeight: 800,
          cursor: pnr.length < 10 || loading ? "default" : "pointer",
          boxShadow: pnr.length === 10 && !loading ? "0 6px 20px rgba(11,77,162,0.32)" : "none",
        }}>{loading ? "⏳ Checking PNR…" : "🔍 CHECK PNR STATUS"}</button>
      </div>

      {error && (
        <div style={{ marginTop: 16, background: "#FFF0F0", borderRadius: 12, border: "1.5px solid #E91E63", padding: "16px 20px", color: "#c62828", fontWeight: 600 }}>
          ❌ {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 20, background: "#F8FFF8", borderRadius: 14, border: "1.5px solid #00C853", padding: "20px 24px" }}>
          <div style={{ fontWeight: 900, fontSize: 17, color: "#1a1a2e", marginBottom: 14 }}>
            PNR: {result.pnr}
            {result.chartStatus && <span style={{ marginLeft: 10, fontSize: 12, color: "#888", fontWeight: 500 }}>({result.chartStatus})</span>}
          </div>

          {/* Train info */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
            {[
              ["Train", `${result.trainNumber} — ${result.trainName}`],
              ["Date of Journey", result.doj],
              ["From", `${result.fromName} (${result.from})`],
              ["To", `${result.toName} (${result.to})`],
              ["Boarding At", result.boardingPoint || result.from],
              ["Class", result.journeyClass],
            ].map(([label, val]) => (
              <div key={label} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid #eee" }}>
                <div style={{ fontSize: 11, color: "#999", fontWeight: 700, marginBottom: 3 }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>{val || "—"}</div>
              </div>
            ))}
          </div>

          {/* Passengers */}
          {result.passengers?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8, letterSpacing: 0.5 }}>PASSENGER STATUS</div>
              {result.passengers.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid #eee", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: "#1a1a2e" }}>Passenger {p.number}</span>
                    <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>Booked: {p.bookingStatus}</span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 13, color: statusColor(p.currentStatus), background: statusColor(p.currentStatus) + "18", padding: "3px 12px", borderRadius: 20 }}>
                    {p.currentStatus} {p.coachPosition ? `· ${p.coachPosition}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SEARCH FORM ──────────────────────────────────────────────────────────────

function SearchForm({ activeCategory, isMobile }) {
  const [tripType, setTripType] = useState("oneway");
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [date, setDate] = useState("2026-06-20");
  const [travellers, setTravellers] = useState(1);
  const [trainTab, setTrainTab] = useState("book");

  const [searched, setSearched] = useState(false);

  // Train search results
  const [trainResults, setTrainResults] = useState(null);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainError, setTrainError] = useState(null);

  // Flight search results
  const [flightResults, setFlightResults] = useState(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightError, setFlightError] = useState(null);

  // Hotel search results
  const [hotelResults, setHotelResults] = useState(null);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [hotelError, setHotelError] = useState(null);

  const meta = CATEGORY_META[activeCategory] || CATEGORY_META.flights;
  const dataset = DATASETS[activeCategory] || FLIGHT_CITIES;

  // Reset selections when category changes
  useEffect(() => {
    setFrom(null); setTo(null); setSearched(false);
    setTrainResults(null); setTrainError(null);
    setFlightResults(null); setFlightError(null);
    setHotelResults(null); setHotelError(null);
  }, [activeCategory]);

  const swap = () => { setFrom(to); setTo(from); };

  const searchTrains = useCallback(async () => {
    if (!from || !to) return;
    setTrainLoading(true); setTrainError(null); setTrainResults(null);
    try {
      const data = await apiGet(`/trains-between?from=${from.code}&to=${to.code}&date=${date}`);
      setTrainResults(data);
    } catch (e) {
      setTrainError(e.message);
    } finally {
      setTrainLoading(false);
    }
  }, [from, to, date]);

  const searchFlights = useCallback(async () => {
    if (!from || !to) return;
    setFlightLoading(true); setFlightError(null); setFlightResults(null);
    try {
      const data = await apiGet(
        `/flights-search?from=${encodeURIComponent(from.name)}&fromCode=${from.code}&to=${encodeURIComponent(to.name)}&toCode=${to.code}&date=${date}`
      );
      setFlightResults(data);
    } catch (e) {
      setFlightError(e.message);
    } finally {
      setFlightLoading(false);
    }
  }, [from, to, date]);

  const searchHotels = useCallback(async () => {
    if (!from) return;
    setHotelLoading(true); setHotelError(null); setHotelResults(null);
    try {
      const data = await apiGet(
        `/hotels-search?city=${encodeURIComponent(from.name)}&cityCode=${from.code}&checkin=${date}&guests=${travellers}`
      );
      setHotelResults(data);
    } catch (e) {
      setHotelError(e.message);
    } finally {
      setHotelLoading(false);
    }
  }, [from, date, travellers]);

  // Train-specific layout
  if (activeCategory === "trains") {
    return (
      <>
        {/* Train sub-tabs */}
        <div style={{ display: "flex", gap: 24, padding: "16px 24px 0", borderBottom: "1px solid #f0f0f0", marginBottom: 0 }}>
          {[["book", "Book Train Tickets"], ["pnr", "Check PNR Status"], ["live", "Live Train Status"]].map(([val, lbl]) => (
            <label key={val} onClick={() => setTrainTab(val)} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", paddingBottom: 14, borderBottom: trainTab === val ? "2px solid #0B4DA2" : "2px solid transparent", marginBottom: -1 }}>
              <span style={{
                width: 16, height: 16, borderRadius: "50%",
                border: `2px solid ${trainTab === val ? "#0B4DA2" : "#ccc"}`,
                background: trainTab === val ? "#0B4DA2" : "#fff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {trainTab === val && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "block" }} />}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: trainTab === val ? 700 : 500, color: trainTab === val ? "#0B4DA2" : "#555" }}>{lbl}</span>
            </label>
          ))}
        </div>

        {trainTab === "book" && (
          <>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "flex-start", padding: isMobile ? "20px 16px 6px" : "28px 32px 12px", gap: isMobile ? 4 : 0 }}>
              <div style={{ flex: 2, minWidth: 160, padding: "12px 20px 12px 0", borderRight: isMobile ? "none" : "1px solid #eee" }}>
                <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>FROM STATION</div>
                <CityPicker value={from} onChange={setFrom} placeholder="Select station" exclude={to} dataset={dataset} isMobile={isMobile} />
              </div>
              <button onClick={swap} style={{
                width: 36, height: 36, borderRadius: "50%", border: "2px solid #0B4DA2", background: "#fff",
                cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, zIndex: 1, margin: "0 -4px", alignSelf: "center", transition: "all .2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "#0B4DA2"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#000"; }}
              >⇌</button>
              <div style={{ flex: 2, minWidth: 160, padding: "12px 20px", borderRight: isMobile ? "none" : "1px solid #eee" }}>
                <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>TO STATION</div>
                <CityPicker value={to} onChange={setTo} placeholder="Select station" exclude={from} dataset={dataset} isMobile={isMobile} />
              </div>
              <div style={{ flex: 1.5, minWidth: 140, padding: "12px 20px", borderRight: isMobile ? "none" : "1px solid #eee" }}>
                <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>DEPARTURE</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ border: "none", outline: "none", fontSize: 18, fontWeight: 800, color: "#1a1a2e", background: "none", width: "100%" }} />
              </div>
              <div style={{ flex: 1.2, minWidth: 130, padding: "12px 0 12px 20px" }}>
                <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>TRAVELLERS</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => setTravellers(Math.max(1, travellers - 1))}
                    style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <span style={{ fontSize: 24, fontWeight: 900, color: "#1a1a2e" }}>{travellers}</span>
                  <button onClick={() => setTravellers(Math.min(9, travellers + 1))}
                    style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #0B4DA2", background: "#0B4DA2", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Passengers</div>
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "12px 0 24px" }}>
              <button onClick={searchTrains} disabled={!from || !to || trainLoading} style={{
                background: !from || !to || trainLoading ? "#ccc" : "linear-gradient(135deg, #0B4DA2, #1768D1)",
                color: "#fff", border: "none", borderRadius: 12,
                padding: "16px 78px", fontSize: 18, fontWeight: 800,
                cursor: !from || !to || trainLoading ? "default" : "pointer",
                boxShadow: from && to && !trainLoading ? "0 6px 20px rgba(11,77,162,0.32)" : "none",
              }}>{trainLoading ? "⏳ Searching…" : "🔍 SEARCH TRAINS"}</button>
              {!from || !to ? (
                <div style={{ marginTop: 8, color: "#aaa", fontSize: 13 }}>Select both stations to search</div>
              ) : null}
            </div>

            {/* Train error */}
            {trainError && (
              <div style={{ margin: "0 24px 20px", background: "#FFF0F0", borderRadius: 12, border: "1.5px solid #E91E63", padding: "14px 18px", color: "#c62828", fontWeight: 600 }}>
                ❌ {trainError}
              </div>
            )}

            {/* Train results */}
            {trainResults && (
              <div style={{ padding: "0 24px 24px" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e", marginBottom: 14 }}>
                  {trainResults.total} train{trainResults.total !== 1 ? "s" : ""} found · {from?.name} → {to?.name} · {new Date(date + "T00:00:00").toDateString()}
                </div>
                {trainResults.trains.length === 0 ? (
                  <div style={{ color: "#888", fontSize: 14 }}>No trains found for this route on the selected date.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {trainResults.trains.map((t, i) => (
                      <div key={i} style={{ borderRadius: 14, border: "1.5px solid #eef1f6", padding: isMobile ? "14px 16px" : "16px 20px", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 76px 104px 76px minmax(116px,0.8fr)", alignItems: "center", gap: isMobile ? 12 : 16 }}>
                        {/* Train name */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e", lineHeight: 1.3 }}>{t.trainName}</div>
                          <div style={{ fontSize: 12, color: "#0B4DA2", fontWeight: 700, marginTop: 2 }}>#{t.trainNumber}</div>
                        </div>
                        {/* Departure / duration / arrival (own grid columns on desktop, a row on mobile) */}
                        <div style={{ display: isMobile ? "flex" : "contents", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ textAlign: isMobile ? "left" : "center" }}>
                            <div style={{ fontSize: 19, fontWeight: 900, color: "#1a1a2e" }}>{t.departureTime}</div>
                            <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>{t.from}</div>
                          </div>
                          <div style={{ textAlign: "center", color: "#9aa3af" }}>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>{fmtDuration(t.duration)}</div>
                            <div style={{ fontSize: 12, letterSpacing: 1 }}>──→</div>
                          </div>
                          <div style={{ textAlign: isMobile ? "right" : "center" }}>
                            <div style={{ fontSize: 19, fontWeight: 900, color: "#1a1a2e" }}>{t.arrivalTime}</div>
                            <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>{t.to}</div>
                          </div>
                        </div>
                        {/* Classes */}
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end" }}>
                          {(t.classes || []).map((cls, ci) => (
                            <span key={ci} style={{ background: "#EAF1FC", color: "#0B4DA2", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8 }}>
                              {typeof cls === "object" ? cls.class_type || JSON.stringify(cls) : cls}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {trainTab === "pnr" && <PNRStatus />}
        {trainTab === "live" && <TrainLiveStatus />}
      </>
    );
  }

  // Generic layout for all other categories
  return (
    <>
      {/* Trip type (only for flights) */}
      {activeCategory === "flights" && (
        <div style={{ padding: "14px 24px 0", display: "flex", gap: 24 }}>
          {[["oneway", "One Way"], ["roundtrip", "Round Trip"], ["multicity", "Multi City"]].map(([val, lbl]) => (
            <label key={val} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, fontWeight: 500, color: tripType === val ? "#0B4DA2" : "#555" }}>
              <input type="radio" name="triptype" checked={tripType === val} onChange={() => setTripType(val)} style={{ accentColor: "#0B4DA2", width: 15, height: 15 }} />
              {lbl}
            </label>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "flex-start", padding: isMobile ? "20px 16px 6px" : "28px 32px 12px", gap: isMobile ? 4 : 0 }}>
        {/* FROM */}
        <div style={{ flex: 2, minWidth: 160, padding: "12px 20px 12px 0", borderRight: isMobile ? "none" : "1px solid #eee" }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>{meta.fromLabel}</div>
          <CityPicker value={from} onChange={setFrom} placeholder="Select city" exclude={to} dataset={dataset} isMobile={isMobile} />
          {from && <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>{meta.fromHint}</div>}
          {!from && <div style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>{meta.fromHint}</div>}
        </div>

        {/* SWAP (not for hotels/homestays) */}
        {!["hotels", "homestays"].includes(activeCategory) && (
          <button onClick={swap} style={{
            width: 36, height: 36, borderRadius: "50%", border: "2px solid #0B4DA2", background: "#fff",
            cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, zIndex: 1, margin: "0 -4px", alignSelf: "center", transition: "all .2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#0B4DA2"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#000"; }}
          >⇌</button>
        )}

        {/* TO (not for hotels/homestays single-city) */}
        {!["hotels", "homestays"].includes(activeCategory) && (
          <div style={{ flex: 2, minWidth: 160, padding: "12px 20px", borderRight: isMobile ? "none" : "1px solid #eee" }}>
            <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>{meta.toLabel}</div>
            <CityPicker value={to} onChange={setTo} placeholder="Select city" exclude={from} dataset={dataset} isMobile={isMobile} />
            {!to && <div style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>{meta.toHint}</div>}
          </div>
        )}

        {/* DATE */}
        <div style={{ flex: 1.5, minWidth: 140, padding: "12px 20px", borderRight: isMobile ? "none" : "1px solid #eee" }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>
            {["hotels", "homestays"].includes(activeCategory) ? "CHECK-IN" : "DEPARTURE"}
          </div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 18, fontWeight: 800, color: "#1a1a2e", background: "none", width: "100%" }} />
        </div>

        {/* TRAVELLERS */}
        <div style={{ flex: 1.2, minWidth: 130, padding: "12px 0 12px 20px" }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>
            {["hotels", "homestays"].includes(activeCategory) ? "GUESTS" : "TRAVELLERS"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setTravellers(Math.max(1, travellers - 1))}
              style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <span style={{ fontSize: 24, fontWeight: 900, color: "#1a1a2e" }}>{travellers}</span>
            <button onClick={() => setTravellers(Math.min(9, travellers + 1))}
              style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #0B4DA2", background: "#0B4DA2", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Economy / Premium</div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "12px 0 24px" }}>
        <button
          onClick={() => {
            if (activeCategory === "flights") {
              if (!from || !to) { setFlightError("Please select both From and To cities."); return; }
              searchFlights();
            } else if (activeCategory === "hotels") {
              if (!from) { setHotelError("Please select a city / destination."); return; }
              searchHotels();
            } else setSearched(true);
          }}
          disabled={(activeCategory === "flights" && flightLoading) || (activeCategory === "hotels" && hotelLoading)}
          style={{
            background: "linear-gradient(135deg, #0B4DA2, #1768D1)",
            color: "#fff", border: "none",
            borderRadius: 12, padding: "16px 78px", fontSize: 18, fontWeight: 800,
            cursor: (activeCategory === "flights" && flightLoading) || (activeCategory === "hotels" && hotelLoading) ? "default" : "pointer",
            opacity: (activeCategory === "flights" && flightLoading) || (activeCategory === "hotels" && hotelLoading) ? 0.85 : 1,
            boxShadow: "0 6px 20px rgba(11,77,162,0.32)", transition: "transform .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
        >{activeCategory === "flights" ? (flightLoading ? "⏳ Searching Flights…" : "✈️ SEARCH FLIGHTS") : activeCategory === "hotels" ? (hotelLoading ? "⏳ Searching Hotels…" : "🏨 SEARCH HOTELS") : `${meta.icon} SEARCH ${activeCategory.toUpperCase()}`}</button>
        {searched && from && (
          <div style={{ marginTop: 10, color: "#00897B", fontWeight: 600, fontSize: 13 }}>
            ✓ Searching {from.name}{to ? ` → ${to.name}` : ""} for {travellers} {["hotels","homestays"].includes(activeCategory) ? "guest" : "traveller"}{travellers > 1 ? "s" : ""} on {new Date(date).toDateString()}
          </div>
        )}
        {searched && !from && (
          <div style={{ marginTop: 10, color: "#E91E63", fontWeight: 600, fontSize: 13 }}>⚠ Please select a city to search</div>
        )}
      </div>

      {activeCategory === "hotels" && (hotelError || hotelResults) && (
        <div style={{ padding: "0 24px 24px" }}>
          {hotelError && (
            <div style={{ background: "#FFF0F0", borderRadius: 12, border: "1.5px solid #E91E63", padding: "14px 18px", color: "#c62828", fontWeight: 600 }}>❌ {hotelError}</div>
          )}
          {hotelResults && (
            <>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e", margin: "0 0 14px" }}>
                {hotelResults.total} hotel{hotelResults.total !== 1 ? "s" : ""} in {from?.name} · check-in {new Date(date + "T00:00:00").toDateString()}
              </div>
              {hotelResults.hotels.length === 0 ? (
                <div style={{ color: "#888", fontSize: 14 }}>No hotels found for this destination/date.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {hotelResults.hotels.map((h) => (
                    <div key={h.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "170px 1fr auto", border: "1.5px solid #eef1f6", borderRadius: 14, overflow: "hidden", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                      <div style={{ height: isMobile ? 160 : "100%", minHeight: 120, background: "#eef1f6" }}>
                        {h.image
                          ? <img src={h.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 30 }}>🏨</div>}
                      </div>
                      <div style={{ padding: isMobile ? "12px 16px 6px" : "16px 18px", minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", lineHeight: 1.3 }}>{h.name}</div>
                        {h.stars > 0 && <div style={{ color: "#f5a623", fontSize: 13, marginTop: 3 }}>{"★".repeat(h.stars)}</div>}
                        {h.location && <div style={{ fontSize: 12.5, color: "#888", marginTop: 5 }}>📍 {h.location}</div>}
                        {h.rating != null && (
                          <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 7 }}>
                            <span style={{ background: "#0B4DA2", color: "#fff", fontSize: 12, fontWeight: 800, padding: "2px 8px", borderRadius: 6 }}>{h.rating}</span>
                            <span style={{ fontSize: 12, color: "#555", fontWeight: 600 }}>{h.ratingDesc}{h.reviewsCount ? ` · ${h.reviewsCount} reviews` : ""}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: isMobile ? "0 16px 14px" : "16px 20px", display: "flex", flexDirection: "column", alignItems: isMobile ? "flex-start" : "flex-end", justifyContent: "center", gap: 4 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "#0B4DA2" }}>{h.price}</div>
                        <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>per night</div>
                        <button style={{ background: "linear-gradient(135deg, #0B4DA2, #1768D1)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Book</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {activeCategory === "flights" && (flightError || flightResults) && (
        <div style={{ padding: "0 24px 24px" }}>
          {flightError && (
            <div style={{ background: "#FFF0F0", borderRadius: 12, border: "1.5px solid #E91E63", padding: "14px 18px", color: "#c62828", fontWeight: 600 }}>❌ {flightError}</div>
          )}
          {flightResults && (
            <>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e", margin: "0 0 14px" }}>
                {flightResults.total} flight{flightResults.total !== 1 ? "s" : ""} found · {from?.name} → {to?.name} · {new Date(date + "T00:00:00").toDateString()}
              </div>
              {flightResults.flights.length === 0 ? (
                <div style={{ color: "#888", fontSize: 14 }}>No flights found for this route on the selected date.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {flightResults.flights.map((f) => (
                    <div key={f.id} style={{ borderRadius: 14, border: "1.5px solid #eef1f6", padding: isMobile ? "14px 16px" : "16px 20px", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 76px 112px 76px minmax(108px,0.75fr)", alignItems: "center", gap: isMobile ? 12 : 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        {f.airlineLogo
                          ? <img src={f.airlineLogo} alt="" style={{ width: 30, height: 30, objectFit: "contain", flexShrink: 0 }} />
                          : <div style={{ width: 30, height: 30, borderRadius: 7, background: "#EAF1FC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>✈️</div>}
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1a2e", lineHeight: 1.3 }}>{f.airline}</div>
                      </div>
                      <div style={{ display: isMobile ? "flex" : "contents", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ textAlign: isMobile ? "left" : "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e" }}>{f.departure}</div>
                          <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>{f.from}</div>
                        </div>
                        <div style={{ textAlign: "center", color: "#9aa3af" }}>
                          <div style={{ fontSize: 11, fontWeight: 600 }}>{f.duration}</div>
                          <div style={{ fontSize: 12, letterSpacing: 1 }}>──→</div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: f.stops === 0 ? "#0a9d57" : "#9aa3af" }}>{f.stopsLabel}</div>
                        </div>
                        <div style={{ textAlign: isMobile ? "right" : "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e" }}>{f.arrival}</div>
                          <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>{f.to}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "flex-start" : "flex-end", gap: 6 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "#0B4DA2" }}>{f.price}</div>
                        <button style={{ background: "linear-gradient(135deg, #0B4DA2, #1768D1)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Book</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function WanderlustApp() {
  const [activeCategory, setActiveCategory] = useState("flights");
  const isMobile = useIsMobile();
  const scrolled = useScrolled();
  const navAnchor = useRef(null);
  const docked = useDocked(navAnchor);
  const progress = useScrollProgress();

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", background: "#F5F7FA", minHeight: "100vh" }}>

      {/* Scroll-progress flight mover */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "rgba(11,77,162,0.12)", zIndex: 300, pointerEvents: "none" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: "linear-gradient(90deg, #0B4DA2, #1768D1)", transition: "width .1s linear" }} />
        <div style={{ position: "absolute", top: -10, left: `${progress * 100}%`, transform: "translateX(-50%)", fontSize: 15, transition: "left .1s linear" }}>✈️</div>
      </div>

      {/* Docked category bar: pins at the top only once the hero tiles reach it */}
      <DockedCategoryBar categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} visible={docked} isMobile={isMobile} />

      {/* BANNER */}
      <div style={{ background: "linear-gradient(90deg, #1a1a2e, #16213e)", color: "#aaa", fontSize: 12, textAlign: "center", padding: "6px 0", letterSpacing: 0.5 }}>
        ✨ New: Multi-city bookings now available! &nbsp;|&nbsp; 🎁 Use code <strong style={{ color: "#9CC4FF" }}>WANDER25</strong> for ₹2,500 off your first booking
      </div>

      {/* NAVBAR */}
      <nav style={{ background: "#fff", boxShadow: scrolled ? "0 4px 18px rgba(4,29,54,0.13)" : "0 1px 0 rgba(0,0,0,0.06)", padding: isMobile ? "0 16px" : "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: scrolled ? 56 : 64, position: "sticky", top: 0, zIndex: 100, transition: "height .25s ease, box-shadow .25s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #0B4DA2, #1768D1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🌍</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#1a1a2e", lineHeight: 1 }}>Wanderlust</div>
            <div style={{ fontSize: 10, color: "#0B4DA2", fontWeight: 600, letterSpacing: 1 }}>TRAVEL PLANNER</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 28 }}>
          {!isMobile && navLinks.map(l => (
            <a key={l} href="#" style={{ textDecoration: "none", color: "#555", fontSize: 13.5, fontWeight: 500 }}
              onMouseEnter={e => e.target.style.color = "#0B4DA2"} onMouseLeave={e => e.target.style.color = "#555"}>{l}</a>
          ))}
          <button style={{ background: "linear-gradient(135deg, #0B4DA2, #1768D1)", color: "#fff", border: "none", borderRadius: 8, padding: isMobile ? "8px 14px" : "8px 20px", fontWeight: 700, fontSize: isMobile ? 12.5 : 13.5, cursor: "pointer", whiteSpace: "nowrap" }}>{isMobile ? "Login" : "Login / Sign Up"}</button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ position: "relative", overflow: "visible", padding: isMobile ? "52px 14px 52px" : "92px 32px 68px" }}>
        {/* Animated cover photo (Ken Burns), clipped to the hero, behind a blue overlay */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
          <video
            autoPlay loop muted playsInline preload="auto"
            poster="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          >
            <source src="/hero.mp4" type="video/mp4" />
          </video>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,27,58,0.78) 0%, rgba(8,42,92,0.62) 55%, rgba(8,42,92,0.62) 100%)" }} />
        </div>
        <HeroMotion isMobile={isMobile} />
        <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: "#8FBEFF", fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>YOUR JOURNEY BEGINS HERE</div>
          <h1 style={{ color: "#fff", fontSize: isMobile ? 28 : 44, fontWeight: 800, margin: 0, lineHeight: 1.15, textShadow: "0 2px 18px rgba(0,0,0,0.35)" }}>Explore the World with <span style={{ color: "#8FBEFF" }}>Wanderlust</span></h1>
          <p style={{ color: "#cdd8e8", marginTop: 12, fontSize: isMobile ? 14 : 17 }}>Flights · Hotels · Tours · Trains · Buses — all in one place</p>
        </div>

        {/* SEARCH CARD */}
        <div style={{ maxWidth: isMobile ? "100%" : 1120, margin: "0 auto", background: "#fff", borderRadius: 22, boxShadow: "0 24px 70px rgba(4,29,54,0.30)", position: "relative", zIndex: 10 }}>
          {/* Category tiles live here in the hero; a docked copy pins at the top on scroll */}
          <div ref={navAnchor} style={{ borderBottom: "1px solid #f0f0f0" }}>
            <CategoryTiles categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} isMobile={isMobile} />
          </div>

          <SearchForm activeCategory={activeCategory} isMobile={isMobile} />
        </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "28px 14px" : "40px 24px" }}>
        {/* SPECIAL FARES */}
        <Reveal><div style={{ display: "flex", gap: 12, overflowX: "auto", marginBottom: 48, padding: "4px 0", scrollbarWidth: "none" }}>
          {[
            { label: "Regular", sub: "Regular fares", active: true },
            { label: "Student", sub: "Extra discounts" },
            { label: "Armed Forces", sub: "Up to ₹600 off" },
            { label: "Senior Citizen", sub: "Up to ₹600 off" },
            { label: "Doctor & Nurses", sub: "Up to ₹600 off" },
          ].map(f => (
            <div key={f.label} style={{ padding: "10px 20px", borderRadius: 10, whiteSpace: "nowrap", border: f.active ? "2px solid #0B4DA2" : "2px solid #e0e0e0", background: f.active ? "#EAF1FC" : "#fff", cursor: "pointer" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: f.active ? "#0B4DA2" : "#333" }}>{f.label}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{f.sub}</div>
            </div>
          ))}
        </div></Reveal>

        {/* OFFERS */}
        <Reveal><div style={{ marginBottom: 52 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>🎁 Exclusive Offers</h2>
              <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Handpicked deals just for you</p>
            </div>
            <a href="#" style={{ color: "#0B4DA2", fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>View All →</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
            {offers.map(o => (
              <div key={o.title} style={{ background: o.bg, borderRadius: 14, padding: "20px", border: `1px solid ${o.color}22`, position: "relative", cursor: "pointer", transition: "transform .2s, box-shadow .2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${o.color}22`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ position: "absolute", top: 14, right: 14, background: o.color, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6 }}>{o.badge}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e", marginBottom: 6, paddingRight: 60 }}>{o.title}</div>
                <div style={{ fontSize: 12.5, color: "#555", lineHeight: 1.5 }}>{o.desc}</div>
                <div style={{ marginTop: 14, color: o.color, fontWeight: 700, fontSize: 13 }}>Grab Deal →</div>
              </div>
            ))}
          </div>
        </div></Reveal>

        {/* DESTINATIONS */}
        <Reveal><div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>🌏 Popular Destinations</h2>
              <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Top picks travellers are loving right now</p>
            </div>
            <a href="#" style={{ color: "#0B4DA2", fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>Explore All →</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {destinations.map(d => (
              <div key={d.name} style={{ borderRadius: 16, overflow: "hidden", background: "#fff", boxShadow: "0 2px 16px rgba(0,0,0,0.08)", cursor: "pointer", transition: "transform .2s, box-shadow .2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.14)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.08)"; }}>
                <div style={{ position: "relative" }}>
                  <img src={d.img} alt={d.name} style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.55))", padding: "30px 14px 12px" }}>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>{d.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{d.tag}</div>
                  </div>
                  <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.95)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#0B4DA2" }}>from {d.price}</div>
                </div>
                <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12.5, color: "#666" }}>✈ Flights + 🏨 Hotels</div>
                  <button style={{ background: "linear-gradient(135deg, #0B4DA2, #1768D1)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Book Now</button>
                </div>
              </div>
            ))}
          </div>
        </div></Reveal>
      </div>

      {/* FOOTER */}
      <footer style={{ background: "#1a1a2e", color: "#8899aa", padding: "40px 32px 24px", marginTop: 40 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32, marginBottom: 36 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #0B4DA2, #1768D1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🌍</div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Wanderlust</div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>Your trusted travel partner for unforgettable journeys around the world.</p>
            </div>
            {[
              { title: "Explore", links: ["Flights", "Hotels", "Tour Packages", "Trains", "Buses"] },
              { title: "Support", links: ["Help Center", "Cancellations", "Travel Insurance", "Contact Us"] },
              { title: "Company", links: ["About Us", "Careers", "Blog", "Press", "Partner With Us"] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 13.5, marginBottom: 12 }}>{col.title}</div>
                {col.links.map(l => (
                  <a key={l} href="#" style={{ display: "block", color: "#8899aa", fontSize: 13, textDecoration: "none", marginBottom: 7 }}
                    onMouseEnter={e => e.target.style.color = "#0B4DA2"} onMouseLeave={e => e.target.style.color = "#8899aa"}>{l}</a>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #ffffff15", paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontSize: 12 }}>
            <div>© 2026 Wanderlust Travel Planner. All rights reserved.</div>
            <div style={{ display: "flex", gap: 20 }}>
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(l => (
                <a key={l} href="#" style={{ color: "#8899aa", textDecoration: "none" }}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

