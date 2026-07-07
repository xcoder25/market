import React, { useState } from "react";
import { 
  ArrowRight, 
  Shield, 
  Award, 
  Sparkles, 
  Navigation, 
  Globe, 
  Compass, 
  ShoppingBag, 
  TrendingUp, 
  Info, 
  MapPin, 
  Users, 
  Flame,
  ChevronDown,
  ChevronUp,
  Search,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LgaMap3D from "../components/LgaMap3D";

export default function Landing({ onExplore, onAuthClick, db }) {
  const [selectedLga, setSelectedLga] = useState("Uyo");
  const [mapMode, setMapMode] = useState("3d"); // "2d" or "3d"
  const [priceCategory, setPriceCategory] = useState("all");
  const [priceSearch, setPriceSearch] = useState("");
  const [activeFaq, setActiveFaq] = useState(null);

  const lgas = [
    { name: "Ini", crop: "Cocoa & Upland Rice", details: "Fertile volcanic plains producing high-grade cocoa beans and sweet swamp rice.", x: 200, y: 35, color: "#10b981" },
    { name: "Ikot Ekpene", crop: "Raffia & Yams", details: "Raffia crafting center supplying seed yams and palm kernel derivatives.", x: 110, y: 80, color: "#f59e0b" },
    { name: "Itu", crop: "Cassava & Fish", details: "Riverine border LGA producing coarse yellow garri and fresh water tilapia.", x: 210, y: 85, color: "#10b981" },
    { name: "Uyo", crop: "Capital Hub Markets", details: "Capital city commercial center aggregating products from all 31 LGAs.", x: 200, y: 130, color: "#0ea5e9" },
    { name: "Abak", crop: "Palm Oil & Cassava", details: "Extensive palm estates and automated mills supplying heavy consumer markets.", x: 110, y: 140, color: "#f59e0b" },
    { name: "Mkpat Enin", crop: "Coconut Refinery", details: "Home to the St. Gabriel Coconut Plantation supplying organic coconut meat and oil.", x: 100, y: 210, color: "#10b981" },
    { name: "Eket", crop: "Marine Fisheries", details: "Coastal city processing fresh sea food, ocean prawns, and cocoa farms.", x: 200, y: 230, color: "#0ea5e9" },
    { name: "Oron", crop: "Coastal Crayfish", details: "Akwa Ibom's marine gateway supplying dried crayfish, ocean shrimps, and periwinkles.", x: 290, y: 190, color: "#f59e0b" },
    { name: "Ibeno", crop: "Ocean Seafood & Fish", details: "Coastal sands with major artisanal fishing terminals supplying sea crayfish and oysters.", x: 250, y: 250, color: "#0ea5e9" },
    { name: "Oruk Anam", crop: "Cassava & Oil Palm", details: "Extensive family farm holdings producing bulk cassava stems and palm fruits.", x: 60, y: 170, color: "#10b981" },
    { name: "Essien Udim", crop: "Yam & Cocoyam", details: "Major roots and tubers supplier, producing high-grade yams and seed cocoyams.", x: 70, y: 95, color: "#f59e0b" },
    { name: "Uruan", crop: "Waterleaf & Pumpkin", details: "Riverine agricultural zone providing fresh leafy vegetables and local river clams.", x: 250, y: 120, color: "#10b981" },
    { name: "Ibiono Ibom", crop: "Rice & Oil Palm", details: "Lush hilly terrain famous for rice fields, cocoa groves, and palm plantations.", x: 160, y: 95, color: "#10b981" },
    { name: "Ikot Abasi", crop: "Mangrove Seafood", details: "Coastal port area known for crabs, dried crayfish, and palm plantations.", x: 60, y: 230, color: "#0ea5e9" }
  ];

  const localProduce = [
    {
      name: "Mkpat Enin Coconuts",
      description: "Organic coconuts sourced from the St. Gabriel Coconut Plantation. Perfect for oil extraction, confectionery, and direct supply.",
      image: "/coconut.png",
      location: "Mkpat Enin LGA"
    },
    {
      name: "Oron Coastal Crayfish",
      description: "Premium sun-dried crayfish harvested from the Gulf of Guinea. Sorted, clean, and packaged for domestic and restaurant kitchens.",
      image: "/crayfish.png",
      location: "Oron LGA"
    },
    {
      name: "Etinan Gold Palm Oil",
      description: "High-grade, rich red palm oil pressed in community mills. Fully natural, unadulterated, and available in retail and bulk volumes.",
      image: "/oil.jpg",
      location: "Etinan & Abak LGAs"
    },
    {
      name: "Itu Cassava & Garri",
      description: "Coarse, well-fried white and yellow garri processed from freshly uprooted high-yield cassava tubers.",
      image: "/garri.png",
      location: "Itu LGA"
    }
  ];

  // Compute live statistics based on real Firestore/local state database
  const getLgaStats = (lgaName) => {
    if (!db) return { farmers: 0, products: 0, listings: [] };
    const farmersCount = db.users.filter(u => u.role === "Farmer" && u.lga === lgaName).length;
    const productsInLga = db.products.filter(p => p.lga === lgaName);
    return {
      farmers: farmersCount,
      products: productsInLga.length,
      listings: productsInLga.map(p => p.name).slice(0, 3)
    };
  };

  const getProductCategory = (productName) => {
    const name = productName.toLowerCase();
    if (name.includes("rice") || name.includes("garri") || name.includes("yam") || name.includes("cassava") || name.includes("cocoyam")) {
      return "grains-roots";
    }
    if (name.includes("oil") || name.includes("crayfish") || name.includes("fish") || name.includes("seafood") || name.includes("shrimp") || name.includes("periwinkle") || name.includes("oyster") || name.includes("tilapia") || name.includes("crab")) {
      return "seafood-oils";
    }
    if (name.includes("cocoa") || name.includes("raffia") || name.includes("coconut") || name.includes("kernel") || name.includes("plantation")) {
      return "cash-crops";
    }
    return "others";
  };

  const drawSparkline = (item) => {
    const seed = item.prices.Itam || 2000;
    const points = [
      28 - (seed % 7),
      18 + (seed % 9),
      32 - (seed % 5),
      15 + (seed % 8),
      item.prices.Itam > (item.history?.[item.history.length - 2]?.Itam || item.prices.Itam) ? 12 : 24
    ];
    const pointsStr = points.map((p, idx) => `${idx * 18 + 4},${p}`).join(" ");
    const isUp = item.prices.Itam > (item.history?.[item.history.length - 2]?.Itam || item.prices.Itam);
    const strokeColor = isUp ? "#10b981" : "#f59e0b";
    return (
      <svg width="80" height="35" className="sparkline-svg" style={{ overflow: "visible" }}>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsStr}
        />
        <circle
          cx="76"
          cy={points[4]}
          r="3"
          fill={strokeColor}
        />
      </svg>
    );
  };

  const selectedLgaData = lgas.find(l => l.name === selectedLga) || lgas[3];
  const selectedStats = getLgaStats(selectedLga);

  const activeFarmersCount = db ? db.users.filter(u => u.role === "Farmer").length : 4;
  const marketPriceCount = db ? db.marketPrices.length : 4;

  // Stagger Container for Hero entrance
  const heroContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const heroItem = {
    hidden: { opacity: 0, y: 25 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  // Title Word-by-Word Reveal
  const titleWords = "The Digital Commerce Hub of Akwa Ibom".split(" ");
  const [searchText, setSearchText] = useState("");

  return (
    <div className="landing-page-wrapper">
      {/* Tech grid layout backdrop */}
      <div className="tech-grid-overlay" />
      
      {/* Ambient background glows */}
      <div className="ambient-glow-blob" style={{ top: "10%", left: "10%", width: "350px", height: "350px", background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)" }} />
      <div className="ambient-glow-blob" style={{ bottom: "20%", right: "5%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)" }} />
      <div className="ambient-glow-blob" style={{ top: "45%", left: "30%", width: "380px", height: "380px", background: "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)" }} />

      <div className="landing-page" style={{ position: "relative", zIndex: 1 }}>
        {/* Hero Section */}
        <section className="landing-hero" style={{ padding: "100px 20px" }}>
          <motion.div
            variants={heroContainer}
            initial="hidden"
            animate="show"
            style={{ width: "100%", maxWidth: "1050px", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            {/* Akwa Ibom State Logo with Floating Spring loop */}
            <motion.div
              variants={heroItem}
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
              style={{ marginBottom: "20px" }}
            >
              <img
                src="/aks.png"
                alt="Akwa Ibom State Seal"
                style={{ width: "95px", height: "95px", objectFit: "contain", filter: "drop-shadow(0 0 16px rgba(16, 185, 129, 0.45))" }}
              />
            </motion.div>

            {/* Slogan Pill Badge */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
              <motion.div
                variants={heroItem}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(245, 158, 11, 0.06)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "30px", padding: "8px 20px", fontSize: "0.9rem", color: "var(--secondary-light)", fontWeight: "bold" }}
                whileHover={{ scale: 1.05 }}
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <Flame size={15} style={{ color: "var(--secondary)" }} /> Akwa Ibom State • Land of Promise
              </motion.div>

              <motion.div
                variants={heroItem}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "30px", padding: "6px 16px", fontSize: "0.78rem", color: "var(--primary-light)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}
                whileHover={{ scale: 1.05 }}
              >
                <Sparkles size={12} style={{ color: "var(--primary)" }} /> Powered by ARISE Agenda
              </motion.div>
            </div>

            {/* Word-by-Word Hero Title Reveal */}
            <h1 style={{ fontSize: "clamp(2.4rem, 6.5vw, 4.4rem)", fontWeight: 955, lineHeight: 1.1, color: "white", marginBottom: "24px", textAlign: "center", letterSpacing: "-0.03em" }}>
              {titleWords.map((word, idx) => (
                <motion.span
                  key={idx}
                  style={{ display: "inline-block", marginRight: "12px" }}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.07 + 0.25, type: "spring", stiffness: 130 }}
                >
                  {word === "Commerce" || word === "Hub" ? (
                    <span style={{ color: "var(--primary)", textShadow: "0 0 25px rgba(16, 185, 129, 0.4)", background: "linear-gradient(135deg, #a7f3d0 0%, var(--primary-light) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{word}</span>
                  ) : (
                    word
                  )}
                </motion.span>
              ))}
            </h1>

            <motion.p
              variants={heroItem}
              style={{ fontSize: "clamp(1.05rem, 2.2vw, 1.3rem)", color: "var(--gray-600)", maxWidth: "800px", margin: "0 auto 32px auto", lineHeight: 1.6, textAlign: "center" }}
            >
              Find local products, hire trusted services, rent property, order native delicacies, and locate verified businesses across all 31 LGAs. Backed by cooperative escrow and local logistics networks.
            </motion.p>

            {/* Search anything in Akwa Ibom */}
            <motion.div 
              variants={heroItem}
              style={{ position: "relative", width: "100%", maxWidth: "650px", margin: "0 auto 36px auto", zIndex: 10 }}
            >
              <div style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", color: "var(--gray-600)", display: "flex", alignItems: "center" }}>
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Search anything in Akwa Ibom (e.g. palm oil, apartment, mechanic, food)..." 
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "18px 130px 18px 50px", 
                  borderRadius: "30px", 
                  border: "1px solid var(--glass-border)", 
                  background: "rgba(10, 20, 14, 0.6)", 
                  color: "white", 
                  fontSize: "1.05rem",
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
                  backdropFilter: "blur(16px)",
                  outline: "none",
                  transition: "all 0.3s ease"
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onExplore(searchText);
                  }
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--primary-light)"}
                onBlur={(e) => e.target.style.borderColor = "var(--glass-border)"}
              />
              <button 
                className="btn btn-primary"
                style={{ position: "absolute", right: "8px", top: "8px", borderRadius: "24px", padding: "10px 28px", fontSize: "0.95rem", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }}
                onClick={() => onExplore(searchText)}
              >
                Search
              </button>
            </motion.div>

            <motion.div
              variants={heroItem}
              style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap", marginBottom: "48px" }}
            >
              <motion.button
                className="btn btn-primary"
                onClick={() => onExplore("")}
                style={{ padding: "14px 32px", fontSize: "0.95rem" }}
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)" }}
                whileTap={{ scale: 0.95 }}
              >
                Browse Marketplace <ArrowRight size={18} style={{ marginLeft: "6px" }} />
              </motion.button>
              <motion.button
                className="btn btn-outline"
                onClick={onAuthClick}
                style={{ padding: "14px 32px", fontSize: "0.95rem" }}
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.06)", borderColor: "white" }}
                whileTap={{ scale: 0.95 }}
              >
                Sign In / Register
              </motion.button>
            </motion.div>

            {/* Redesigned 7 Categories Grid */}
            <motion.div
              variants={heroItem}
              className="category-grid-enhanced"
            >
              {[
                { id: "listings", query: "", label: "🌾 Agro Market", desc: "Crops & seeds", color: "rgba(16, 185, 129, 0.12)" },
                { id: "listings", query: "buy", label: "🛒 Buy & Sell", desc: "Retail & wholesale", color: "rgba(14, 165, 233, 0.12)" },
                { id: "listings", query: "property", label: "🏠 Property", desc: "Rentals & lands", color: "rgba(245, 158, 11, 0.12)" },
                { id: "listings", query: "vehicles", label: "🚗 Vehicles", desc: "Auto & rentals", color: "rgba(239, 68, 68, 0.12)" },
                { id: "listings", query: "food", label: "🍲 Food Market", desc: "Native cuisines", color: "rgba(236, 72, 153, 0.12)" },
                { id: "listings", query: "services", label: "👷 Services Hub", desc: "Hire local experts", color: "rgba(139, 92, 246, 0.12)" },
                { id: "directory", query: "", label: "🏢 Directory", desc: "Find businesses", color: "rgba(107, 114, 128, 0.12)" }
              ].map(cat => (
                <motion.div
                  key={cat.label}
                  className="category-card-enhanced"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (cat.id === "directory") {
                      onExplore("", "directory");
                    } else if (cat.label.includes("Agro")) {
                      onExplore("", "listings");
                    } else {
                      onExplore(cat.query, "listings");
                    }
                  }}
                  style={{
                    background: cat.color
                  }}
                >
                  <span className="category-card-icon">{cat.label.split(" ")[0]}</span>
                  <h4 className="category-card-title">{cat.label.split(" ").slice(1).join(" ")}</h4>
                  <p className="category-card-desc">{cat.desc}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Quick Platform Metrics */}
            <motion.div
              variants={heroItem}
              style={{ display: "flex", gap: "20px", justifyContent: "center", marginTop: "56px", borderTop: "1px solid var(--glass-border)", paddingTop: "28px", flexWrap: "wrap", width: "100%" }}
            >
              <div style={{ flex: "1 1 150px" }}>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)", textShadow: "0 0 10px rgba(16,185,129,0.2)" }}>{activeFarmersCount}+</div>
                <div style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>Verified Sellers</div>
              </div>
              <div style={{ flex: "1 1 150px", borderLeft: "1px solid var(--glass-border)", paddingLeft: "15px" }}>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--secondary-light)", textShadow: "0 0 10px rgba(245,158,11,0.2)" }}>Coop Escrow</div>
                <div style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>Protected Payments</div>
              </div>
              <div style={{ flex: "1 1 150px", borderLeft: "1px solid var(--glass-border)", paddingLeft: "15px" }}>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "white" }}>7 Verticals</div>
                <div style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>Unified State Economy</div>
              </div>
            </motion.div>
          </motion.div>
        </section>

      {/* Signature Produce Showcase Section */}
      <section className="landing-section">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="section-header">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "30px", padding: "4px 12px", marginBottom: "16px", fontSize: "0.8rem", color: "var(--primary-light)" }}>
              <Award size={14} /> Agricultural Gold
            </div>
            <h2>Akwa Ibom's Harvest Treasures</h2>
            <p>Discover the premium cash crops and marine seafood that make our state's soil and waters fertile and legendary.</p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            transition={{ staggerChildren: 0.1 }}
            className="product-grid horizontal-scrollable"
          >
            {localProduce.map((p, idx) => (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                }}
                className="product-card"
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <div className="product-img-wrapper" style={{ height: "190px" }}>
                  <img src={p.image} alt={p.name} className="product-img" />
                  <span className="product-organic-badge" style={{ backgroundColor: "var(--secondary)" }}>{p.location}</span>
                </div>
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <h3 style={{ fontSize: "1.15rem", color: "white", marginBottom: "8px" }}>{p.name}</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--gray-600)", lineHeight: 1.4, flex: 1 }}>{p.description}</p>
                </div>
                <div className="product-card-footer">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Shield size={12} style={{ color: "var(--primary)" }} /> Escrow Protected
                  </span>
                  <span style={{ color: "var(--primary-light)", fontWeight: "bold", cursor: "pointer" }} onClick={() => onExplore(p.name)}>
                    View Listings
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="landing-section">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="section-header">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "30px", padding: "4px 12px", marginBottom: "16px", fontSize: "0.8rem", color: "var(--secondary-light)" }}>
              <Sparkles size={14} /> Ecosystem Mechanics
            </div>
            <h2>How IbomOne Works</h2>
            <p>Our platform connects buyers, sellers, and logistics partners in three simple steps.</p>
          </div>

          <div className="how-it-works-grid-enhanced">
            <div className="step-card-enhanced">
              <span className="step-number">01</span>
              <div className="step-icon-wrapper" style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <Award size={24} />
              </div>
              <h3>Sellers List Storefronts</h3>
              <p>Verified businesses, farmers, property agents, and service professionals create digital storefronts, list inventory, and configure business details.</p>
            </div>

            <div className="step-card-enhanced">
              <span className="step-number">02</span>
              <div className="step-icon-wrapper" style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(245, 158, 11, 0.1)", color: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                <ShoppingBag size={24} />
              </div>
              <h3>Buyers Order Securely</h3>
              <p>Customers place orders or book services using Escrow protection. Funds are secured safely until goods are delivered or jobs are completed.</p>
            </div>

            <div className="step-card-enhanced">
              <span className="step-number">03</span>
              <div className="step-icon-wrapper" style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <Navigation size={24} />
              </div>
              <h3>Logistics & Matching</h3>
              <p>Verified logistics carriers claim deliveries, matching orders with vehicle types (bikes, kekes, or heavy trucks) to ensure prompt delivery.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Market Price Trends */}
      <section className="landing-section">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="section-header">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "30px", padding: "4px 12px", marginBottom: "16px", fontSize: "0.8rem", color: "var(--primary-light)" }}>
              <TrendingUp size={14} /> Price Indexing
            </div>
            <h2>Live Market Price Index</h2>
            <p>Real-time commodity price tracking across major markets in Akwa Ibom State.</p>
          </div>

          <div className="price-index-terminal">
            <div className="price-terminal-header">
              <div className="price-filter-tabs">
                {[
                  { id: "all", label: "All Commodities" },
                  { id: "grains-roots", label: "🌾 Grains & Roots" },
                  { id: "seafood-oils", label: "🍲 Seafood & Oils" },
                  { id: "cash-crops", label: "📦 Cash Crops" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    className={`price-filter-btn ${priceCategory === tab.id ? "active" : ""}`}
                    onClick={() => setPriceCategory(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="price-search-wrapper">
                <span className="price-search-icon"><Search size={14} /></span>
                <input
                  type="text"
                  placeholder="Search commodity..."
                  className="price-search-input"
                  value={priceSearch}
                  onChange={(e) => setPriceSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="market-trends-container">
              <table className="market-trends-table">
                <thead>
                  <tr>
                    <th>Commodity</th>
                    <th>Itam Market</th>
                    <th>Akpan Andem</th>
                    <th>Ikot Ekpene</th>
                    <th>Eket Market</th>
                    <th style={{ textAlign: "center" }}>7-Day Trend</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(db?.marketPrices || [])
                    .filter(item => {
                      if (priceCategory !== "all" && getProductCategory(item.product) !== priceCategory) return false;
                      if (priceSearch.trim() !== "" && !item.product.toLowerCase().includes(priceSearch.toLowerCase())) return false;
                      return true;
                    })
                    .map((item) => {
                      const latestPrice = item.prices.Itam;
                      const prevPrice = item.history && item.history.length > 1 ? item.history[item.history.length - 2].Itam : latestPrice;
                      const isUp = latestPrice > prevPrice;

                      return (
                        <tr key={item.id}>
                          <td style={{ fontWeight: "bold", color: "white" }}>{item.product}</td>
                          <td>₦{item.prices.Itam.toLocaleString()}</td>
                          <td>₦{item.prices["Akpan Andem"]?.toLocaleString() || item.prices.Itam.toLocaleString()}</td>
                          <td>₦{item.prices["Ikot Ekpene"]?.toLocaleString() || item.prices.Itam.toLocaleString()}</td>
                          <td>₦{item.prices.Eket?.toLocaleString() || item.prices.Itam.toLocaleString()}</td>
                          <td style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "8px" }}>
                            {drawSparkline(item)}
                          </td>
                          <td>
                            {isUp ? (
                              <span className="trend-indicator up">▲ Rising</span>
                            ) : (
                              <span className="trend-indicator stable">● Stable</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive LGA Agricultural Map & Showcase */}
      <section className="landing-section">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="regional-grid">

            {/* LGA List Column */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "30px", padding: "4px 12px", marginBottom: "16px", fontSize: "0.8rem", color: "var(--secondary-light)" }}>
                <Compass size={14} /> Regional Cultivation
              </div>
              <h2 style={{ fontSize: "2rem", color: "white", marginBottom: "16px" }}>LGA Commodity Mapping</h2>
              <p style={{ color: "var(--gray-600)", lineHeight: 1.5, marginBottom: "24px" }}>
                Akwa Ibom consists of 31 Local Government Areas, each with highly distinct ecological specializations. Click an LGA on the interactive map to load live stats.
              </p>

              <div className="regional-lga-list">
                {lgas.map((item) => {
                  const stats = getLgaStats(item.name);
                  const activityPct = Math.min((stats.products * 15) + (stats.farmers * 10) + 10, 100);
                  return (
                    <motion.div
                      key={item.name}
                      onClick={() => setSelectedLga(item.name)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        padding: "14px 18px",
                        border: selectedLga === item.name ? "1px solid var(--primary)" : "1px solid var(--glass-border)",
                        background: selectedLga === item.name ? "rgba(16, 185, 129, 0.12)" : "rgba(255,255,255,0.015)",
                        borderRadius: "14px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      whileHover={{ scale: 1.015, background: "rgba(255,255,255,0.03)" }}
                    >
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "50%", background: selectedLga === item.name ? "var(--primary)" : "rgba(16, 185, 129, 0.1)", color: selectedLga === item.name ? "var(--dark)" : "var(--primary)", fontWeight: "bold", flexShrink: 0 }}>
                          {item.name[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                            <strong style={{ color: "white", fontSize: "0.95rem" }}>{item.name} LGA</strong>
                            <span style={{ color: "var(--secondary-light)", fontSize: "0.8rem", fontWeight: "bold" }}>{item.crop}</span>
                          </div>
                        </div>
                      </div>
                      <div className="lga-activity-bar-container">
                        <div className="lga-activity-bar-fill" style={{ width: `${activityPct}%` }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--gray-600)", marginTop: "6px" }}>
                        <span>Market Activity</span>
                        <span style={{ color: selectedLga === item.name ? "var(--primary-light)" : "var(--gray-600)" }}>{activityPct}% Active</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Interactive SVG Map Column */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "14px" }}>
                  <h3 style={{ fontSize: "1.2rem", color: "white", margin: 0 }}>Interactive LGA Map</h3>
                  <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", padding: "2px", borderRadius: "20px", border: "1px solid var(--glass-border)" }}>
                    <button
                      onClick={() => setMapMode("2d")}
                      style={{
                        background: mapMode === "2d" ? "var(--primary)" : "none",
                        border: "none",
                        color: mapMode === "2d" ? "var(--dark)" : "var(--gray-600)",
                        padding: "4px 12px",
                        borderRadius: "18px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      2D Map
                    </button>
                    <button
                      onClick={() => setMapMode("3d")}
                      style={{
                        background: mapMode === "3d" ? "var(--primary)" : "none",
                        border: "none",
                        color: mapMode === "3d" ? "var(--dark)" : "var(--gray-600)",
                        padding: "4px 12px",
                        borderRadius: "18px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Globe size={11} /> 3D View
                    </button>
                  </div>
                </div>

                {mapMode === "3d" ? (
                  <div style={{ width: "100%" }}>
                    <LgaMap3D
                      db={db}
                      selectedLga={selectedLga}
                      onLgaSelect={setSelectedLga}
                    />
                  </div>
                ) : (
                  /* SVG MAP */
                  <div style={{ width: "100%", maxWidth: "400px", background: "rgba(0, 0, 0, 0.2)", borderRadius: "16px", padding: "10px", border: "1px solid var(--glass-border)", margin: "0 auto" }}>
                    <svg viewBox="0 0 400 300" width="100%" height="auto" style={{ overflow: "visible" }}>
                      {/* Grid Background Lines for modern visual effect */}
                      <line x1="50" y1="0" x2="50" y2="300" stroke="rgba(255,255,255,0.03)" />
                      <line x1="150" y1="0" x2="150" y2="300" stroke="rgba(255,255,255,0.03)" />
                      <line x1="250" y1="0" x2="250" y2="300" stroke="rgba(255,255,255,0.03)" />
                      <line x1="350" y1="0" x2="350" y2="300" stroke="rgba(255,255,255,0.03)" />
                      <line x1="0" y1="75" x2="400" y2="75" stroke="rgba(255,255,255,0.03)" />
                      <line x1="0" y1="150" x2="400" y2="150" stroke="rgba(255,255,255,0.03)" />
                      <line x1="0" y1="225" x2="400" y2="225" stroke="rgba(255,255,255,0.03)" />

                      {/* Interconnecting dashed logistics routes */}
                      {lgas.map((l, i) => {
                        if (l.name === "Uyo") return null;
                        return (
                          <line
                            key={i}
                            x1={l.x}
                            y1={l.y}
                            x2={200} // Uyo Center x
                            y2={130} // Uyo Center y
                            stroke="rgba(16, 185, 129, 0.15)"
                            strokeWidth="1.5"
                            strokeDasharray="4,4"
                          />
                        );
                      })}

                      {/* LGA Clickable Nodes */}
                      {lgas.map((item) => (
                        <g
                          key={item.name}
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedLga(item.name)}
                        >
                          {/* Outer pulsing circle for active LGA */}
                          {selectedLga === item.name && (
                            <motion.circle
                              cx={item.x}
                              cy={item.y}
                              r={25}
                              fill="none"
                              stroke="var(--primary)"
                              strokeWidth="1"
                              animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                            />
                          )}
                          {/* Outer Glow Circle */}
                          <circle
                            cx={item.x}
                            cy={item.y}
                            r={selectedLga === item.name ? 16 : 10}
                            fill={selectedLga === item.name ? "var(--primary)" : "rgba(255, 255, 255, 0.05)"}
                            stroke={selectedLga === item.name ? "white" : item.color}
                            strokeWidth="2"
                            style={{ transition: "all 0.3s", filter: selectedLga === item.name ? "drop-shadow(0 0 8px var(--primary))" : "none" }}
                          />
                          {/* Inner Dot */}
                          <circle
                            cx={item.x}
                            cy={item.y}
                            r={4}
                            fill={selectedLga === item.name ? "var(--dark)" : "white"}
                          />
                          {/* Text Label */}
                          <text
                            x={item.x}
                            y={item.y - 14}
                            textAnchor="middle"
                            fill={selectedLga === item.name ? "white" : "var(--gray-600)"}
                            fontSize="9"
                            fontWeight={selectedLga === item.name ? "bold" : "normal"}
                            style={{ transition: "all 0.3s" }}
                          >
                            {item.name}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                )}
              </div>

              {/* Live LGA Stats Display */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedLga}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="lga-insight-card"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <MapPin size={20} style={{ color: "var(--primary)" }} />
                      <h4 style={{ color: "white", fontSize: "1.3rem", margin: 0 }}>{selectedLgaData.name} Region Insights</h4>
                    </div>
                    <span style={{ fontSize: "0.75rem", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--primary-light)", padding: "4px 10px", borderRadius: "20px", fontWeight: "bold" }}>Realtime Sync</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div className="lga-insight-metric">
                      <span style={{ fontSize: "0.78rem", color: "var(--gray-600)", display: "flex", alignItems: "center", gap: "6px" }}><Users size={14} /> Active Sellers</span>
                      <strong style={{ fontSize: "1.6rem", color: "white", display: "block", marginTop: "4px" }}>{selectedStats.farmers}</strong>
                    </div>
                    <div className="lga-insight-metric">
                      <span style={{ fontSize: "0.78rem", color: "var(--gray-600)", display: "flex", alignItems: "center", gap: "6px" }}><ShoppingBag size={14} /> Local Listings</span>
                      <strong style={{ fontSize: "1.6rem", color: "white", display: "block", marginTop: "4px" }}>{selectedStats.products}</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(0,0,0,0.25)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.03)", marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--gray-600)" }}>Primary Specialization:</span>
                      <strong style={{ color: "var(--secondary-light)" }}>{selectedLgaData.crop}</strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px" }}>
                      <span style={{ color: "var(--gray-600)" }}>Agricultural Detail:</span>
                      <p style={{ color: "var(--white)", margin: 0, fontSize: "0.8rem", lineHeight: 1.4 }}>{selectedLgaData.details}</p>
                    </div>
                  </div>

                  <h5 style={{ fontSize: "0.82rem", color: "var(--gray-600)", marginBottom: "10px", fontWeight: "bold", letterSpacing: "0.03em" }}>FEATURED COMMODITIES:</h5>
                  {selectedStats.listings.length > 0 ? (
                    <ul style={{ listStyleType: "none", paddingLeft: 0, margin: 0, display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {selectedStats.listings.map((l, i) => (
                        <li key={i} style={{ fontSize: "0.8rem", padding: "6px 12px", borderRadius: "20px", background: "rgba(16, 185, 129, 0.12)", color: "var(--primary-light)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>{l}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: "0.8rem", color: "var(--gray-600)", fontStyle: "italic", margin: 0 }}>No active listings currently from this region. Be the first to register!</p>
                  )}

                  <button className="btn btn-primary" onClick={() => onExplore("")} style={{ width: "100%", marginTop: "24px", padding: "12px 20px" }}>
                    Explore {selectedLga} LGA Listings
                  </button>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQs Accordion */}
      <section className="landing-section">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="section-header">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "30px", padding: "4px 12px", marginBottom: "16px", fontSize: "0.8rem", color: "var(--primary-light)" }}>
              <HelpCircle size={14} /> Knowledge Hub
            </div>
            <h2>Frequently Asked Questions</h2>
            <p>Find answers to common questions about trading, escrow, and logistics on IbomOne.</p>
          </div>

          <div className="faq-section">
            {[
              {
                q: "How does the Sterling Cooperative Escrow protect my money?",
                a: "When you place an order, your money is held securely in the Sterling Cooperative Escrow account. The seller is notified to dispatch the items. Once you receive the products and confirm they meet your expectations, the funds are released to the seller. In case of dispute, our admin team mediates to guarantee fair resolutions."
              },
              {
                q: "I am a local farmer. How do I get verified on IbomOne?",
                a: "Registration is simple! Click 'Sign In / Register' in the hero header, create an account, and select the 'Farmer' role. You will be prompted to enter your LGA, farm location, and primary crop focus. Once submitted, our area representatives will conduct a swift verification call to list your crops."
              },
              {
                q: "How do logistics matching work for transporters?",
                a: "Transporters registered as Logistics Partners can view a live job dashboard. When a buyer completes a payment, logistics carriers in the area receive matching delivery alerts based on vehicle type (motorcycle, keke, or truck). Transporters accept the job, collect the products from the farm, and deliver them directly to the buyer's destination."
              },
              {
                q: "What types of items can be sold on this platform?",
                a: "IbomOne supports 7 distinct verticals: agricultural cash crops and fresh vegetables (Agro Market), consumer goods (Buy & Sell), residential and commercial spaces (Property), vehicle rentals (Vehicles), local delicacies (Food Market), specialized technical services (Services Hub), and a directory of verified local businesses (Directory)."
              }
            ].map((faq, idx) => (
              <div key={idx} className={`faq-item ${activeFaq === idx ? "active" : ""}`}>
                <button
                  className="faq-question-btn"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                >
                  <span>{faq.q}</span>
                  {activeFaq === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {activeFaq === idx && (
                  <div className="faq-answer-content">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Action CTA Section */}
      <section className="landing-section" style={{ border: "none", background: "none" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="action-cta-section">
            <div className="action-cta-card seller-cta">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "2rem" }}>🌾</span>
                <h3 style={{ fontSize: "1.4rem", color: "white", margin: 0 }}>Register as a Seller / Farmer</h3>
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--gray-600)", lineHeight: 1.5, margin: 0 }}>
                Gain access to thousands of buyers across Akwa Ibom State. Benefit from cooperative pricing, escrow protection, and direct access to trusted logistics carriers.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={onAuthClick}
                style={{ width: "fit-content", padding: "10px 24px", marginTop: "10px" }}
              >
                Create Storefront
              </button>
            </div>

            <div className="action-cta-card buyer-cta">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "2rem" }}>🛒</span>
                <h3 style={{ fontSize: "1.4rem", color: "white", margin: 0 }}>Start Ordering Today</h3>
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--gray-600)", lineHeight: 1.5, margin: 0 }}>
                Find the freshest agricultural produce, hire reliable service experts, rent properties, and order local foods directly. Secured by Sterling Cooperative Escrow.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => onExplore("")}
                style={{ width: "fit-content", padding: "10px 24px", marginTop: "10px", background: "var(--secondary)", borderColor: "var(--secondary)", color: "black" }}
              >
                Browse Marketplace
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
);
}
