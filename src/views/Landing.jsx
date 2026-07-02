import React, { useState } from "react";
import { ArrowRight, Shield, Award, Sparkles, Navigation, Globe, Compass, ShoppingBag, TrendingUp, Info, MapPin, Users, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LgaMap3D from "../components/LgaMap3D";

export default function Landing({ onExplore, onAuthClick, db }) {
  const [selectedLga, setSelectedLga] = useState("Uyo");
  const [mapMode, setMapMode] = useState("3d"); // "2d" or "3d"

  const lgas = [
    { name: "Ini", crop: "Cocoa & Upland Rice", details: "Fertile volcanic plains producing high-grade cocoa beans and sweet swamp rice.", x: 200, y: 35, color: "#10b981" },
    { name: "Ikot Ekpene", crop: "Raffia & Yams", details: "Raffia crafting center supplying seed yams and palm kernel derivatives.", x: 110, y: 80, color: "#f59e0b" },
    { name: "Itu", crop: "Cassava & Fish", details: "Riverine border LGA producing coarse yellow garri and fresh water tilapia.", x: 210, y: 85, color: "#10b981" },
    { name: "Uyo", crop: "Capital Hub Markets", details: "Capital city commercial center aggregating products from all 31 LGAs.", x: 200, y: 130, color: "#0ea5e9" },
    { name: "Abak", crop: "Palm Oil & Cassava", details: "Extensive palm estates and automated mills supplying heavy consumer markets.", x: 110, y: 140, color: "#f59e0b" },
    { name: "Mkpat Enin", crop: "Coconut Refinery", details: "Home to the St. Gabriel Coconut Plantation supplying organic coconut meat and oil.", x: 100, y: 210, color: "#10b981" },
    { name: "Eket", crop: "Marine Fisheries", details: "Coastal city processing fresh sea food, ocean prawns, and cocoa farms.", x: 200, y: 230, color: "#0ea5e9" },
    { name: "Oron", crop: "Coastal Crayfish", details: "Akwa Ibom's marine gateway supplying dried crayfish, ocean shrimps, and periwinkles.", x: 290, y: 190, color: "#f59e0b" }
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
  const titleWords = "The Digital Food Basket of Akwa Ibom".split(" ");

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        {/* Ambient Glowing background blobs */}
        <div style={{ position: "absolute", top: "10%", left: "15%", width: "250px", height: "250px", background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)", pointerEvents: "none" }}></div>
        <div style={{ position: "absolute", bottom: "10%", right: "15%", width: "300px", height: "300px", background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)", pointerEvents: "none" }}></div>

        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="show"
          style={{ maxWidth: "900px", zIndex: 2 }}
        >
          {/* Akwa Ibom State Logo with Floating Spring loop */}
          <motion.div
            variants={heroItem}
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            style={{ marginBottom: "20px" }}
          >
            <img
              src="/aks.png"
              alt="Akwa Ibom State Seal"
              style={{ width: "90px", height: "90px", objectFit: "contain", filter: "drop-shadow(0 0 12px rgba(16, 185, 129, 0.4))" }}
            />
          </motion.div>

          {/* Slogan Pill Badge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
            <motion.div
              variants={heroItem}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "30px", padding: "8px 18px", fontSize: "0.9rem", color: "var(--secondary-light)", fontWeight: "bold" }}
              whileHover={{ scale: 1.05 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            >
              <Flame size={15} style={{ color: "var(--secondary)" }} /> Akwa Ibom State • Land of Promise
            </motion.div>

            <motion.div
              variants={heroItem}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "30px", padding: "6px 14px", fontSize: "0.8rem", color: "var(--primary-light)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles size={12} style={{ color: "var(--primary)" }} /> Powered by ARISE Agenda
            </motion.div>
          </div>

          {/* Word-by-Word Hero Title Reveal */}
          <h1 style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)", fontWeight: 900, lineHeight: 1.1, color: "white", marginBottom: "20px" }}>
            {titleWords.map((word, idx) => (
              <motion.span
                key={idx}
                style={{ display: "inline-block", marginRight: "10px" }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 + 0.3, type: "spring", stiffness: 120 }}
              >
                {word === "Akwa" || word === "Ibom" ? (
                  <span style={{ color: "var(--primary)", textShadow: "0 0 20px rgba(16, 185, 129, 0.3)" }}>{word}</span>
                ) : (
                  word
                )}
              </motion.span>
            ))}
          </h1>

          <motion.p
            variants={heroItem}
            style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", color: "var(--gray-600)", maxWidth: "750px", margin: "0 auto 36px auto", lineHeight: 1.5 }}
          >
            Connecting local smallholder farmers from Uyo to Eket directly with hotels, chefs, retail buyers, and logistics carriers in realtime. Transparent prices, secure escrow, fresh harvests.
          </motion.p>

          <motion.div
            variants={heroItem}
            style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}
          >
            <motion.button
              className="btn btn-primary"
              onClick={onExplore}
              style={{ padding: "14px 32px" }}
              whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(16, 185, 129, 0.4)" }}
              whileTap={{ scale: 0.95 }}
            >
              Explore Marketplace <ArrowRight size={18} style={{ marginLeft: "4px" }} />
            </motion.button>
            <motion.button
              className="btn btn-outline"
              onClick={onAuthClick}
              style={{ padding: "14px 32px" }}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.05)" }}
              whileTap={{ scale: 0.95 }}
            >
              Sign In / Register
            </motion.button>
          </motion.div>

          {/* Quick Platform Metrics */}
          <motion.div
            variants={heroItem}
            style={{ display: "flex", gap: "20px", justifyContent: "center", marginTop: "60px", borderTop: "1px solid var(--glass-border)", paddingTop: "28px", flexWrap: "wrap" }}
          >
            <div style={{ flex: "1 1 120px" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--primary)" }}>{activeFarmersCount}+</div>
              <div style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>Verified Farmers</div>
            </div>
            <div style={{ flex: "1 1 120px", borderLeft: "1px solid var(--glass-border)", paddingLeft: "10px" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--secondary-light)" }}>Realtime</div>
              <div style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>Escrow Protection</div>
            </div>
            <div style={{ flex: "1 1 120px", borderLeft: "1px solid var(--glass-border)", paddingLeft: "10px" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "white" }}>{marketPriceCount}+</div>
              <div style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>Daily Commodities</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Signature Produce Showcase Section */}
      <section className="landing-section">
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="section-header">
            <h2 style={{ fontSize: "2rem", color: "white", marginBottom: "12px" }}>Akwa Ibom's Harvest Treasures</h2>
            <p style={{ color: "var(--gray-600)", maxWidth: "600px", margin: "0 auto" }}>
              Discover the premium cash crops and marine seafood that make our state's soil and waters fertile and legendary.
            </p>
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
                <div className="product-img-wrapper" style={{ height: "180px" }}>
                  <img src={p.image} alt={p.name} className="product-img" />
                  <span className="product-organic-badge" style={{ backgroundColor: "var(--secondary)" }}>{p.location}</span>
                </div>
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <h3 style={{ fontSize: "1.2rem", color: "white", marginBottom: "8px" }}>{p.name}</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--gray-600)", lineHeight: 1.4, flex: 1 }}>{p.description}</p>
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
              <Sparkles size={14} /> Simplified Logistics
            </div>
            <h2>How Ibom Agro Market Works</h2>
            <p>Our platform closes the gap between the farm gate and the dining table in three simple steps.</p>
          </div>

          <div className="how-it-works-grid">
            <div className="step-card">
              <span className="step-number">01</span>
              <div className="step-icon-wrapper">
                <Award size={24} />
              </div>
              <h3>Farmers List Harvests</h3>
              <p>Verified farmers list their crops, set quantity limits, select harvest dates, and upload real pictures of produce right from the farm.</p>
            </div>

            <div className="step-card">
              <span className="step-number">02</span>
              <div className="step-icon-wrapper">
                <ShoppingBag size={24} />
              </div>
              <h3>Buyers Order Securely</h3>
              <p>Chefs, hotels, and retail buyers purchase produce with funds safely secured in Escrow. Funds are released only upon satisfactory delivery.</p>
            </div>

            <div className="step-card">
              <span className="step-number">03</span>
              <div className="step-icon-wrapper">
                <Navigation size={24} />
              </div>
              <h3>Logistics Delivers Direct</h3>
              <p>Registered logistics riders claim delivery jobs in real-time, pick up fresh produce from farm gates, and transport them securely to buyers.</p>
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
            <h2>Live Market Price Trends</h2>
            <p>Real-time commodity price tracking across major markets in Akwa Ibom State.</p>
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
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {(db?.marketPrices || []).map((item) => {
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

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {lgas.map((item) => (
                  <motion.div
                    key={item.name}
                    onClick={() => setSelectedLga(item.name)}
                    style={{
                      display: "flex",
                      gap: "12px",
                      padding: "14px",
                      border: selectedLga === item.name ? "1px solid var(--primary)" : "1px solid var(--glass-border)",
                      background: selectedLga === item.name ? "rgba(16, 185, 129, 0.12)" : "var(--glass-bg)",
                      borderRadius: "12px",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyCentering: "center", width: "40px", height: "40px", borderRadius: "50%", background: selectedLga === item.name ? "var(--primary)" : "rgba(16, 185, 129, 0.15)", color: selectedLga === item.name ? "var(--dark)" : "var(--primary)", fontWeight: "bold", flexShrink: 0, justifyContent: "center" }}>
                      {item.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                        <strong style={{ color: "white", fontSize: "0.95rem" }}>{item.name} LGA</strong>
                        <span style={{ color: "var(--secondary-light)", fontSize: "0.8rem", fontWeight: "bold" }}>{item.crop}</span>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "var(--gray-600)", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.details}</p>
                    </div>
                  </motion.div>
                ))}
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="card"
                  style={{ padding: "24px", border: "1px solid var(--primary)", background: "rgba(10, 25, 15, 0.7)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <MapPin size={18} style={{ color: "var(--primary)" }} />
                      <h4 style={{ color: "white", fontSize: "1.2rem" }}>{selectedLgaData.name} Region Status</h4>
                    </div>
                    <span style={{ fontSize: "0.75rem", background: "rgba(16,185,129,0.12)", color: "var(--primary)", padding: "3px 8px", borderRadius: "10px", fontWeight: "bold" }}>Realtime Sync</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--gray-600)", display: "flex", alignItems: "center", gap: "4px" }}><Users size={12} /> Active Farmers</span>
                      <strong style={{ fontSize: "1.4rem", color: "white", display: "block", marginTop: "4px" }}>{selectedStats.farmers}</strong>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--gray-600)", display: "flex", alignItems: "center", gap: "4px" }}><ShoppingBag size={12} /> Live Products</span>
                      <strong style={{ fontSize: "1.4rem", color: "white", display: "block", marginTop: "4px" }}>{selectedStats.products}</strong>
                    </div>
                  </div>

                  <h5 style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginBottom: "8px", fontWeight: "bold" }}>FEATURED COMMODITIES:</h5>
                  {selectedStats.listings.length > 0 ? (
                    <ul style={{ listStyleType: "none", paddingLeft: 0, margin: 0, display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {selectedStats.listings.map((l, i) => (
                        <li key={i} style={{ fontSize: "0.8rem", padding: "4px 10px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.1)", color: "var(--primary-light)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>{l}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: "0.8rem", color: "var(--gray-600)", fontStyle: "italic" }}>No active listings currently from this region. Be the first to register!</p>
                  )}

                  <button className="btn btn-primary" onClick={onExplore} style={{ width: "100%", marginTop: "20px" }}>
                    Explore Marketplace Listings
                  </button>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
