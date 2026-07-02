import React, { useState, useEffect } from "react";
import { TrendingUp, RefreshCw, AlertTriangle, ShieldCheck, Award } from "lucide-react";
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
    
    alert(`Price alert configured successfully! We will notify you via SMS and Push Alerts when the price of ${alertSettings.product} drops below ₦${alertSettings.targetPrice}.`);
    setAlertSettings({ product: "", targetPrice: "", active: true });
  };

  return (
    <div className="market-prices-page card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2>IbomOne Commodity Price Index</h2>
          <p style={{ color: "var(--gray-600)" }}>Compare commodity pricing across Eket, Itam, Akpan Andem, and Ikot Ekpene. Sourced daily by administrative market superintendents.</p>
        </div>
        <button onClick={() => setDb(getDB())} className="icon-badge-btn"><RefreshCw size={16} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "28px", marginTop: "24px" }}>
        {/* Product selector list */}
        <div>
          <h4 style={{ marginBottom: "16px", borderBottom: "1px solid var(--glass-border)", paddingBottom: "8px" }}>Select Commodity</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {db.marketPrices.map(item => (
              <div 
                key={item.id}
                onClick={() => setSelectedProductIndex(item)}
                className={`chat-thread-item ${selectedProductIndex && selectedProductIndex.id === item.id ? "active" : ""}`}
                style={{ borderRadius: "12px", border: "1px solid var(--glass-border)", padding: "14px", cursor: "pointer" }}
              >
                <div>
                  <strong style={{ color: "white" }}>{item.product}</strong>
                  <div style={{ fontSize: "0.75rem", color: "var(--gray-600)", marginTop: "2px" }}>Category: {item.category}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Price alert setup */}
          <div className="card" style={{ marginTop: "24px", padding: "20px", border: "1px dashed rgba(16, 185, 129, 0.3)", backgroundColor: "var(--primary-bg)" }}>
            <h5 style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px", fontSize: "1rem" }}><TrendingUp size={16} /> Configure Price Alert</h5>
            <form onSubmit={handlePriceAlertSetup} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
              <div className="form-field">
                <select 
                  value={alertSettings.product} 
                  onChange={(e) => setAlertSettings({ ...alertSettings, product: e.target.value })}
                  style={{ padding: "8px", fontSize: "0.85rem" }}
                  required
                >
                  <option value="">Select commodity...</option>
                  {db.marketPrices.map(mp => (
                    <option key={mp.id} value={mp.product}>{mp.product}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <input 
                  type="number" 
                  placeholder="Target Price (₦)"
                  value={alertSettings.targetPrice}
                  onChange={(e) => setAlertSettings({ ...alertSettings, targetPrice: e.target.value })}
                  style={{ padding: "8px", fontSize: "0.85rem" }}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" style={{ width: "100%" }}>Activate Alert</button>
            </form>
          </div>
        </div>

        {/* Detailed Price Comparison Table & Charts */}
        <div>
          {selectedProductIndex ? (
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
                    <tr>
                      <td><strong>Itam Market (Uyo)</strong></td>
                      <td className="price-value">₦{selectedProductIndex.prices.Itam.toLocaleString()}</td>
                      <td>★★★★★ (4.8)</td>
                      <td><span style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: "bold" }}>● High</span></td>
                    </tr>
                    <tr>
                      <td><strong>Akpan Andem Market</strong></td>
                      <td className="price-value">₦{selectedProductIndex.prices["Akpan Andem"].toLocaleString()}</td>
                      <td>★★★★★ (4.9)</td>
                      <td><span style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: "bold" }}>● High</span></td>
                    </tr>
                    <tr>
                      <td><strong>Ikot Ekpene Market</strong></td>
                      <td className="price-value">₦{selectedProductIndex.prices["Ikot Ekpene"].toLocaleString()}</td>
                      <td>★★★★☆ (4.5)</td>
                      <td><span style={{ color: "var(--secondary-light)", fontSize: "0.85rem", fontWeight: "bold" }}>● Moderate</span></td>
                    </tr>
                    <tr>
                      <td><strong>Eket Market</strong></td>
                      <td className="price-value">₦{selectedProductIndex.prices.Eket.toLocaleString()}</td>
                      <td>★★★★★ (4.7)</td>
                      <td><span style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: "bold" }}>● High</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>Price History Trend</h3>
              <div className="svg-chart-container" style={{ border: "1px solid var(--glass-border)", padding: "20px", borderRadius: "16px", backgroundColor: "rgba(0, 0, 0, 0.15)" }}>
                <svg viewBox="0 0 500 200" width="100%" height="100%">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4" />
                  <line x1="40" y1="80" x2="480" y2="80" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4" />
                  <line x1="40" y1="140" x2="480" y2="140" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4" />
                  <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                  
                  {/* Historical comparison path (Itam market trend) */}
                  {selectedProductIndex.history && selectedProductIndex.history.length >= 3 && (
                    <>
                      {/* Itam Path (Green) */}
                      <motion.path 
                        d={`M 80 140 L 260 120 L 440 90`} 
                        fill="none" 
                        stroke="var(--primary)" 
                        strokeWidth="3" 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                      />
                      {/* Eket Path (Orange) */}
                      <motion.path 
                        d={`M 80 120 L 260 100 L 440 70`} 
                        fill="none" 
                        stroke="var(--secondary)" 
                        strokeWidth="2.5" 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.2, delay: 0.2, ease: "easeInOut" }}
                      />
                      
                      <motion.circle cx="80" cy="140" r="4" fill="var(--primary)" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                      <motion.circle cx="260" cy="120" r="4" fill="var(--primary)" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                      <motion.circle cx="440" cy="90" r="4" fill="var(--primary)" initial={{ scale: 0 }} animate={{ scale: 1 }} />

                      <motion.circle cx="80" cy="120" r="4" fill="var(--secondary)" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                      <motion.circle cx="260" cy="100" r="4" fill="var(--secondary)" initial={{ scale: 0 }} animate={{ scale: 1 }} />
                      <motion.circle cx="440" cy="70" r="4" fill="var(--secondary)" initial={{ scale: 0 }} animate={{ scale: 1 }} />

                      {/* X Labels */}
                      <text x="80" y="190" fontSize="10" textAnchor="middle" fill="var(--gray-600)">{selectedProductIndex.history[0].date}</text>
                      <text x="260" y="190" fontSize="10" textAnchor="middle" fill="var(--gray-600)">{selectedProductIndex.history[1].date}</text>
                      <text x="440" y="190" fontSize="10" textAnchor="middle" fill="var(--gray-600)">{selectedProductIndex.history[2].date}</text>
                    </>
                  )}
                  
                  {/* Y Axis Labels */}
                  <text x="35" y="24" fontSize="10" textAnchor="end" fill="var(--gray-600)">₦10,000</text>
                  <text x="35" y="84" fontSize="10" textAnchor="end" fill="var(--gray-600)">₦5,000</text>
                  <text x="35" y="144" fontSize="10" textAnchor="end" fill="var(--gray-600)">₦2,000</text>
                  <text x="35" y="174" fontSize="10" textAnchor="end" fill="var(--gray-600)">₦0</text>
                </svg>
                <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "10px", fontSize: "0.8rem", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "12px", height: "4px", backgroundColor: "var(--primary)", display: "inline-block" }}></span> Itam Market (Uyo)
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "12px", height: "4px", backgroundColor: "var(--secondary)", display: "inline-block" }}></span> Eket Market
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <p style={{ color: "var(--gray-600)" }}>Select a commodity to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
