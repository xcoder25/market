import React, { useState, useEffect } from "react";
import { TrendingUp, RefreshCw, AlertTriangle, ShieldCheck, Award, ArrowUpRight, ArrowDownRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { getDB } from "../db/store";

export default function MarketPrices() {
  const [db, setDb] = useState(getDB());
  const [selectedProductIndex, setSelectedProductIndex] = useState(null);
  const [alertSettings, setAlertSettings] = useState({ product: "", targetPrice: "", active: false });

  useEffect(() => {
    const handleUpdate = () => setDb(getDB());
    window.addEventListener("db_update", handleUpdate);
    return () => window.removeEventListener("db_update", handleUpdate);
  }, []);

  useEffect(() => {
    if (db.marketPrices.length > 0 && !selectedProductIndex) {
      setSelectedProductIndex(db.marketPrices[0]);
    }
  }, [db]);

  const handlePriceAlertSetup = (e) => {
    e.preventDefault();
    if (!alertSettings.product || !alertSettings.targetPrice) return;
    
    alert(`Price alert configured successfully! We will notify you via SMS and Push Alerts when the price of ${alertSettings.product} drops below ₦${parseInt(alertSettings.targetPrice).toLocaleString()}.`);
    setAlertSettings({ product: "", targetPrice: "", active: true });
  };

  // Sparkline calculation helper for sidebar
  const drawSparkline = (history, market) => {
    if (!history || history.length < 3) return "";
    const prices = history.map(h => h[market] || h.price || 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const points = prices.map((p, idx) => {
      const x = (idx / (prices.length - 1)) * width;
      const y = height - 2 - ((p - min) / range) * (height - 4);
      return `${x},${y}`;
    }).join(" ");
    return points;
  };

  return (
    <div className="market-prices-page card" style={{ position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2>IbomOne Commodity Price Index</h2>
          <p style={{ color: "var(--gray-600)" }}>Compare commodity pricing across Uyo (Itam & Akpan Andem), Ikot Ekpene, and Eket. Sourced daily by administrative market superintendents.</p>
        </div>
        <button onClick={() => setDb(getDB())} className="icon-badge-btn" style={{ padding: "10px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }}><RefreshCw size={16} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "28px", marginTop: "24px" }}>
        {/* Product selector list */}
        <div>
          <h4 style={{ marginBottom: "16px", borderBottom: "1px solid var(--glass-border)", paddingBottom: "8px" }}>Select Commodity</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {db.marketPrices.map(item => {
              // Calculate overall trend direction (comparing last 2 prices in Itam)
              const history = item.history || [];
              const isUp = history.length >= 2 ? (history[history.length - 1].Itam >= history[history.length - 2].Itam) : true;
              
              return (
                <div 
                  key={item.id}
                  onClick={() => setSelectedProductIndex(item)}
                  className={`chat-thread-item ${selectedProductIndex && selectedProductIndex.id === item.id ? "active" : ""}`}
                  style={{ borderRadius: "12px", border: "1px solid var(--glass-border)", padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div>
                    <strong style={{ color: "white", fontSize: "0.95rem" }}>{item.product}</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--gray-600)", marginTop: "2px" }}>Category: {item.category}</div>
                  </div>
                  
                  {/* Tiny Sparkline & Trend Arrow */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="60" height="20" style={{ pointerEvents: "none" }}>
                      <path 
                        d={drawSparkline(item.history, "Itam") ? `M ${drawSparkline(item.history, "Itam")}` : ""} 
                        fill="none" 
                        stroke={isUp ? "var(--primary)" : "#ef4444"} 
                        strokeWidth="2" 
                      />
                    </svg>
                    <span style={{ color: isUp ? "var(--primary)" : "#ef4444" }}>
                      {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Price alert setup */}
          <div className="card" style={{ marginTop: "24px", padding: "20px", border: "1px dashed rgba(16, 185, 129, 0.3)", backgroundColor: "rgba(16, 185, 129, 0.02)" }}>
            <h5 style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px", fontSize: "1rem" }}><TrendingUp size={16} /> Configure Price Alert</h5>
            <form onSubmit={handlePriceAlertSetup} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
              <div className="form-field">
                <select 
                  value={alertSettings.product} 
                  onChange={(e) => setAlertSettings({ ...alertSettings, product: e.target.value })}
                  style={{ padding: "8px", fontSize: "0.85rem", width: "100%", borderRadius: "8px", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "white" }}
                  required
                >
                  <option value="" style={{ background: "#0d1a11" }}>Select commodity...</option>
                  {db.marketPrices.map(mp => (
                    <option key={mp.id} value={mp.product} style={{ background: "#0d1a11" }}>{mp.product}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <input 
                  type="number" 
                  placeholder="Target Price (₦)"
                  value={alertSettings.targetPrice}
                  onChange={(e) => setAlertSettings({ ...alertSettings, targetPrice: e.target.value })}
                  style={{ padding: "8px 12px", fontSize: "0.85rem", width: "100%", borderRadius: "8px", border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "white" }}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ width: "100%", padding: "10px", fontWeight: "bold" }}>Activate Alert</button>
            </form>
          </div>
        </div>

        {/* Detailed Price Comparison Table & Charts */}
        <div>
          {selectedProductIndex ? (() => {
            const pricesObj = selectedProductIndex.prices || {};
            const priceEntries = Object.entries(pricesObj);
            const lowestPrice = priceEntries.length > 0 ? Math.min(...priceEntries.map(p => p[1])) : 0;
            const highestPrice = priceEntries.length > 0 ? Math.max(...priceEntries.map(p => p[1])) : 0;

            const history = selectedProductIndex.history || [];
            const markets = ["Itam", "Akpan Andem", "Ikot Ekpene", "Eket"];
            const allPrices = history.flatMap(h => markets.map(m => h[m] || 0)).filter(p => p > 0);
            const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
            const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 10000;
            const range = maxPrice - minPrice || 1;

            const getPath = (market) => {
              if (history.length < 2) return "";
              return history.map((h, idx) => {
                const x = 60 + (idx / (history.length - 1)) * 380;
                const v = h[market] || 0;
                const y = 160 - ((v - minPrice) / range) * 120;
                return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
              }).join(" ");
            };

            const getCirclePoints = (market) => {
              return history.map((h, idx) => {
                const x = 60 + (idx / (history.length - 1)) * 380;
                const v = h[market] || 0;
                const y = 160 - ((v - minPrice) / range) * 120;
                return { x, y, v };
              });
            };

            return (
              <motion.div
                key={selectedProductIndex.id}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                <h3>Daily Index for: {selectedProductIndex.product}</h3>
                <div style={{ overflowX: "auto" }}>
                  <table className="prices-table" style={{ marginTop: "12px", marginBottom: "24px" }}>
                    <thead>
                      <tr>
                        <th>Market Location</th>
                        <th>Current Price</th>
                        <th>Rating</th>
                        <th>Availability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {markets.map(market => {
                        const curPrice = pricesObj[market] || 0;
                        let isLowest = curPrice === lowestPrice;
                        let isHighest = curPrice === highestPrice;
                        
                        return (
                          <tr key={market}>
                            <td><strong>{market} Market</strong></td>
                            <td className={`price-value ${isLowest ? "cheapest-price" : isHighest ? "highest-price" : ""}`} style={{ borderRadius: "8px", transition: "all 0.2s" }}>
                              ₦{curPrice.toLocaleString()}
                              {isLowest && <span style={{ fontSize: "0.7rem", marginLeft: "6px", background: "rgba(16,185,129,0.2)", padding: "1px 6px", borderRadius: "8px", color: "var(--primary-light)", fontWeight: "bold" }}>CHEAPEST</span>}
                            </td>
                            <td>★★★★★ ({market === "Itam" ? "4.8" : market === "Akpan Andem" ? "4.9" : market === "Ikot Ekpene" ? "4.5" : "4.7"})</td>
                            <td><span style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: "bold" }}>● High</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <h3 style={{ marginBottom: "12px" }}>Dynamic Price History Trend</h3>
                <div className="svg-chart-container" style={{ border: "1px solid var(--glass-border)", padding: "20px", borderRadius: "16px", backgroundColor: "rgba(0, 0, 0, 0.25)" }}>
                  <svg viewBox="0 0 500 200" width="100%" height="100%">
                    {/* Grid Lines */}
                    <line x1="50" y1="20" x2="460" y2="20" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4" />
                    <line x1="50" y1="80" x2="460" y2="80" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4" />
                    <line x1="50" y1="140" x2="460" y2="140" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4" />
                    <line x1="50" y1="160" x2="460" y2="160" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />
                    
                    {/* Render Dynamic Paths */}
                    {/* Itam Path (Green) */}
                    <motion.path 
                      d={getPath("Itam")} 
                      fill="none" 
                      stroke="var(--primary)" 
                      strokeWidth="3.5" 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                    />
                    {/* Eket Path (Gold) */}
                    <motion.path 
                      d={getPath("Eket")} 
                      fill="none" 
                      stroke="var(--secondary)" 
                      strokeWidth="2.5" 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, delay: 0.1, ease: "easeInOut" }}
                    />
                    
                    {/* Render Circles on vertices */}
                    {getCirclePoints("Itam").map((pt, i) => (
                      <g key={`c-itam-${i}`}>
                        <motion.circle cx={pt.x} cy={pt.y} r="5" fill="var(--primary)" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.1 }} />
                        <text x={pt.x} y={pt.y - 8} fontSize="8" textAnchor="middle" fill="white" fontWeight="bold">₦{pt.v.toLocaleString()}</text>
                      </g>
                    ))}
                    {getCirclePoints("Eket").map((pt, i) => (
                      <g key={`c-eket-${i}`}>
                        <motion.circle cx={pt.x} cy={pt.y} r="4" fill="var(--secondary)" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 + i * 0.1 }} />
                        <text x={pt.x} y={pt.y + 12} fontSize="8" textAnchor="middle" fill="var(--secondary-light)">₦{pt.v.toLocaleString()}</text>
                      </g>
                    ))}

                    {/* X Labels */}
                    {history.map((h, i) => {
                      const x = 60 + (i / (history.length - 1)) * 380;
                      return (
                        <text key={`x-l-${i}`} x={x} y="182" fontSize="9" textAnchor="middle" fill="var(--gray-600)">{h.date}</text>
                      );
                    })}
                    
                    {/* Y Axis Labels */}
                    <text x="42" y="24" fontSize="8" textAnchor="end" fill="var(--gray-600)">₦{maxPrice.toLocaleString()}</text>
                    <text x="42" y="90" fontSize="8" textAnchor="end" fill="var(--gray-600)">₦{Math.round((maxPrice + minPrice) / 2).toLocaleString()}</text>
                    <text x="42" y="156" fontSize="8" textAnchor="end" fill="var(--gray-600)">₦{minPrice.toLocaleString()}</text>
                  </svg>
                  
                  <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginTop: "12px", fontSize: "0.85rem", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "16px", height: "4px", backgroundColor: "var(--primary)", borderRadius: "2px", display: "inline-block" }}></span> Itam Market (Uyo Hub)
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "16px", height: "4px", backgroundColor: "var(--secondary)", borderRadius: "2px", display: "inline-block" }}></span> Eket Market
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })() : (
            <p style={{ color: "var(--gray-600)" }}>Select a commodity to view details.</p>
          )}
        </div>
      </div>

      {/* Seasonal Forecast Section */}
      <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "28px", marginTop: "32px", width: "100%" }}>
        <h3 style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", color: "white" }}>
          <TrendingUp size={20} style={{ color: "var(--primary)" }} /> Akwa Ibom Seasonal Harvest & Price Forecast
        </h3>
        <p style={{ color: "var(--gray-600)", marginBottom: "20px", fontSize: "0.9rem" }}>
          Anticipated pricing changes and harvesting cycles curated by IbomOne AI analytics based on historical LGA volume metrics.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
          {[
            {
              crop: "White & Yellow Cassava Tubers",
              lga: "Ini & Itu LGA",
              window: "July - August (Rainy Harvest)",
              trend: "Bearish (-15% price drop)",
              outlook: "High yields from wet season harvests will surge supply in Akpan Andem and Itam markets. Excellent window for bulk garri processors.",
              recommendation: "Hold purchases until mid-July for maximum price savings.",
              alert: "Minor delays expected along Itu-Calabar highway due to heavy flooding.",
              isDrop: true
            },
            {
              crop: "Premium Processing Palm Oil",
              lga: "Abak & Uyo LGA",
              window: "Peak Milling: March - May (Off-peak now)",
              trend: "Bullish (+12% price increase)",
              outlook: "Off-peak milling cycles reduce supply volume. Storage levels in Abak yards are dropping. Logistics carrier matching remains high.",
              recommendation: "Purchase immediately to hedge against August inflation.",
              alert: "Sterling bank credit facility available for bulk cooperative warehouse storage.",
              isDrop: false
            },
            {
              crop: "Oron Smoked Crayfish",
              lga: "Oron & Mbo Coastline",
              window: "September - October (Tidal landings)",
              trend: "Stable (Price matching ±3%)",
              outlook: "Curing and smoking firewood supply is stable. High sea tide cycles may limit deep-sea canoe operations but landings are normal.",
              recommendation: "Secure pre-order bookings on the Harvest Calendar to guarantee dry stock.",
              alert: "Strict inspection criteria enforced at Oron ports to ensure sand-free quality.",
              isDrop: null
            }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className="card" 
              style={{ 
                padding: "20px", 
                borderLeft: `4px solid ${item.isDrop === true ? "var(--primary)" : item.isDrop === false ? "var(--secondary)" : "var(--glass-border)"}`,
                background: "rgba(255,255,255,0.01)",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", flexWrap: "wrap" }}>
                <div>
                  <strong style={{ color: "white", fontSize: "1.05rem", display: "block" }}>{item.crop}</strong>
                  <small style={{ color: "var(--primary-light)", fontWeight: "bold" }}>📍 Core LGA: {item.lga}</small>
                </div>
                <span 
                  style={{ 
                    fontSize: "0.75rem", 
                    padding: "3px 8px", 
                    borderRadius: "10px", 
                    fontWeight: "bold",
                    backgroundColor: item.isDrop === true ? "rgba(16,185,129,0.12)" : item.isDrop === false ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)",
                    color: item.isDrop === true ? "var(--primary-light)" : item.isDrop === false ? "var(--secondary-light)" : "white"
                  }}
                >
                  {item.trend}
                </span>
              </div>

              <div style={{ fontSize: "0.82rem", color: "var(--gray-600)", lineHeight: 1.45, flex: 1 }}>
                <span style={{ display: "block", marginBottom: "6px" }}>📅 <strong>Harvest Window:</strong> {item.window}</span>
                <p style={{ margin: 0 }}>{item.outlook}</p>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px", marginTop: "4px" }}>
                <div style={{ fontSize: "0.8rem", color: "white", marginBottom: "6px" }}>
                  💡 <strong>Advice:</strong> {item.recommendation}
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", fontSize: "0.75rem", color: "var(--warning)" }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>{item.alert}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
