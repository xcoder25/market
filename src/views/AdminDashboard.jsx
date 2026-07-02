import React, { useState, useEffect } from "react";
import { Users, FileText, CheckCircle, AlertTriangle, ShieldCheck, DollarSign, RefreshCw, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDB, upgradeVerification, updateMarketPrice } from "../db/store";

export default function AdminDashboard() {
  const [db, setDb] = useState(getDB());
  const [activeTab, setActiveTab] = useState("verifications"); // verifications, prices, audit
  
  // Market price editing states
  const [selectedPriceItem, setSelectedPriceItem] = useState(null);
  const [itamPrice, setItamPrice] = useState("");
  const [akpanPrice, setAkpanPrice] = useState("");
  const [ikotPrice, setIkotPrice] = useState("");
  const [eketPrice, setEketPrice] = useState("");

  useEffect(() => {
    const handleUpdate = () => setDb(getDB());
    window.addEventListener("db_update", handleUpdate);
    return () => window.removeEventListener("db_update", handleUpdate);
  }, []);

  const refreshState = () => {
    setDb(getDB());
  };

  const handleVerify = (farmerId, level) => {
    const updatedDb = upgradeVerification(farmerId, level);
    setDb(updatedDb);
    alert(`Farmer verification updated to ${level}`);
    window.dispatchEvent(new Event("db_update"));
  };

  const handleEditPriceClick = (priceItem) => {
    setSelectedPriceItem(priceItem);
    setItamPrice(priceItem.prices.Itam);
    setAkpanPrice(priceItem.prices["Akpan Andem"]);
    setIkotPrice(priceItem.prices["Ikot Ekpene"]);
    setEketPrice(priceItem.prices.Eket);
  };

  const handlePriceUpdateSubmit = (e) => {
    e.preventDefault();
    if (!selectedPriceItem) return;

    let updatedDb = db;
    updatedDb = updateMarketPrice(selectedPriceItem.id, "Itam", parseInt(itamPrice));
    updatedDb = updateMarketPrice(selectedPriceItem.id, "Akpan Andem", parseInt(akpanPrice));
    updatedDb = updateMarketPrice(selectedPriceItem.id, "Ikot Ekpene", parseInt(ikotPrice));
    updatedDb = updateMarketPrice(selectedPriceItem.id, "Eket", parseInt(eketPrice));

    setDb(getDB());
    setSelectedPriceItem(null);
    alert("Market prices updated successfully! Price alert notifications sent to buyers.");
    window.dispatchEvent(new Event("db_update"));
  };

  const farmers = db.users.filter(u => u.role === "Farmer");
  const buyers = db.users.filter(u => u.role === "Buyer");
  const logistics = db.users.filter(u => u.role === "Logistics Partner");
  const totalSales = db.orders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Framer Motion variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } }
  };

  return (
    <div className="admin-dashboard">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2>Admin Command Center</h2>
          <p style={{ color: "var(--gray-600)" }}>Manage users, verify farmers, update daily market indices, and audit system actions.</p>
        </div>
        <div className="dashboard-tabs">
          <button 
            className={`tab-pill ${activeTab === "verifications" ? "active" : ""}`}
            onClick={() => setActiveTab("verifications")}
          >
            Farmer Verifications
          </button>
          <button 
            className={`tab-pill ${activeTab === "prices" ? "active" : ""}`}
            onClick={() => setActiveTab("prices")}
          >
            Update Daily Prices
          </button>
          <button 
            className={`tab-pill ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            Audit Trails ({db.auditLogs.length})
          </button>
        </div>
      </div>

      {/* Admin Metrics */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="dashboard-grid"
      >
        <motion.div variants={cardVariants} className="card metric-card">
          <div className="metric-info">
            <span>Registered Users</span>
            <h3>{db.users.length} Users</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>{farmers.length} Farmers | {buyers.length} Buyers</span>
          </div>
          <div className="metric-icon" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "var(--primary)" }}>
            <Users size={24} />
          </div>
        </motion.div>

        <motion.div variants={cardVariants} className="card metric-card">
          <div className="metric-info">
            <span>Platform Value</span>
            <h3>₦{totalSales.toLocaleString()}</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>Escrow & Completed trades</span>
          </div>
          <div className="metric-icon" style={{ backgroundColor: "rgba(245, 158, 11, 0.15)", color: "var(--secondary)" }}>
            <DollarSign size={24} />
          </div>
        </motion.div>

        <motion.div variants={cardVariants} className="card metric-card">
          <div className="metric-info">
            <span>Active Listings</span>
            <h3>{db.products.length} Products</h3>
          </div>
          <div className="metric-icon" style={{ backgroundColor: "rgba(16, 185, 129, 0.12)", color: "var(--primary)" }}>
            <FileText size={24} />
          </div>
        </motion.div>

        <motion.div variants={cardVariants} className="card metric-card">
          <div className="metric-info">
            <span>System Integrity</span>
            <h3>99.9% Up</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>Akwa Ibom CDN online</span>
          </div>
          <div className="metric-icon" style={{ backgroundColor: "rgba(12, 185, 230, 0.15)", color: "#10b981" }}>
            <CheckCircle size={24} />
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === "verifications" && (
          <motion.div 
            key="verifications"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="card" 
            style={{ marginTop: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3>Farmer Verification Center</h3>
              <button onClick={refreshState} className="icon-badge-btn"><RefreshCw size={16} /></button>
            </div>
            <p style={{ color: "var(--gray-600)", marginBottom: "20px", fontSize: "0.85rem" }}>
              Verify farmers to increase market trust. **Bronze** = Phone verified, **Silver** = Government ID matched, **Gold** = Physical cooperative audit complete.
            </p>

            <div style={{ overflowX: "auto" }}>
              <table className="prices-table">
                <thead>
                  <tr>
                    <th>Farmer Name</th>
                    <th>Farm Business</th>
                    <th>Location (LGA)</th>
                    <th>Reputation</th>
                    <th>Status</th>
                    <th>Verification Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {farmers.map(farmer => (
                    <tr key={farmer.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <img src={farmer.avatar} alt="" className="avatar-small" style={{ width: "32px", height: "32px" }} />
                          <strong style={{ color: "white" }}>{farmer.name}</strong>
                        </div>
                      </td>
                      <td>{farmer.farmName}</td>
                      <td>{farmer.town}, {farmer.lga}</td>
                      <td>{farmer.rating} ★ ({farmer.reviewsCount} reviews)</td>
                      <td>
                        <span style={{ 
                          fontSize: "0.75rem", 
                          padding: "4px 10px", 
                          borderRadius: "10px",
                          fontWeight: "bold",
                          backgroundColor: farmer.verification === "Gold" ? "var(--secondary-bg)" : "rgba(255, 255, 255, 0.05)",
                          color: farmer.verification === "Gold" ? "var(--secondary)" : "white",
                          border: `1px solid ${farmer.verification === "Gold" ? "var(--secondary)" : "var(--glass-border)"}`
                        }}>
                          {farmer.verification} Verified
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button 
                            className="btn btn-outline btn-sm" 
                            onClick={() => handleVerify(farmer.id, "Bronze")}
                            disabled={farmer.verification === "Bronze"}
                          >
                            Bronze
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => handleVerify(farmer.id, "Silver")}
                            disabled={farmer.verification === "Silver"}
                            style={{ padding: "6px 12px" }}
                          >
                            Silver
                          </button>
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={() => handleVerify(farmer.id, "Gold")}
                            disabled={farmer.verification === "Gold"}
                            style={{ padding: "6px 12px" }}
                          >
                            Gold
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === "prices" && (
          <motion.div 
            key="prices"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="card" 
            style={{ marginTop: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3>Daily Market Price Updates</h3>
              <button onClick={refreshState} className="icon-badge-btn"><RefreshCw size={16} /></button>
            </div>
            <p style={{ color: "var(--gray-600)", marginBottom: "20px", fontSize: "0.85rem" }}>
              Maintain daily market price indexes across the 4 major market locations in Akwa Ibom. Changes immediately sync to users' dashboards.
            </p>

            <div style={{ overflowX: "auto" }}>
              <table className="prices-table">
                <thead>
                  <tr>
                    <th>Product Index</th>
                    <th>Itam (₦)</th>
                    <th>Akpan Andem (₦)</th>
                    <th>Ikot Ekpene (₦)</th>
                    <th>Eket (₦)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {db.marketPrices.map(item => (
                    <tr key={item.id}>
                      <td><strong style={{ color: "white" }}>{item.product}</strong></td>
                      <td className="price-value">₦{item.prices.Itam.toLocaleString()}</td>
                      <td className="price-value">₦{item.prices["Akpan Andem"].toLocaleString()}</td>
                      <td className="price-value">₦{item.prices["Ikot Ekpene"].toLocaleString()}</td>
                      <td className="price-value">₦{item.prices.Eket.toLocaleString()}</td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => handleEditPriceClick(item)} style={{ padding: "6px 12px" }}>
                          Edit Index
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <AnimatePresence>
              {selectedPriceItem && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="card" 
                  style={{ marginTop: "24px", border: "1px dashed var(--primary)", padding: "20px" }}
                >
                  <h4>Update Price Index for {selectedPriceItem.product}</h4>
                  <form onSubmit={handlePriceUpdateSubmit} className="form-grid" style={{ marginTop: "14px" }}>
                    <div className="form-field">
                      <label>Itam Market (₦)</label>
                      <input type="number" value={itamPrice} onChange={(e) => setItamPrice(e.target.value)} required />
                    </div>
                    <div className="form-field">
                      <label>Akpan Andem Market (₦)</label>
                      <input type="number" value={akpanPrice} onChange={(e) => setAkpanPrice(e.target.value)} required />
                    </div>
                    <div className="form-field">
                      <label>Ikot Ekpene Market (₦)</label>
                      <input type="number" value={ikotPrice} onChange={(e) => setIkotPrice(e.target.value)} required />
                    </div>
                    <div className="form-field">
                      <label>Eket Market (₦)</label>
                      <input type="number" value={eketPrice} onChange={(e) => setEketPrice(e.target.value)} required />
                    </div>
                    <div className="form-field" style={{ justifyContent: "flex-end", gridColumn: "span 2" }}>
                      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                        <button type="button" className="btn btn-outline" onClick={() => setSelectedPriceItem(null)}>Cancel</button>
                        <button type="submit" className="btn btn-secondary">Apply Updates</button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {activeTab === "audit" && (
          <motion.div 
            key="audit"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="card" 
            style={{ marginTop: "24px" }}
          >
            <h3>Security Audit Logs</h3>
            <p style={{ color: "var(--gray-600)", marginBottom: "20px", fontSize: "0.85rem" }}>
              Immutable administrative logs capturing user registration events, verification shifts, listing activations, and payment authorizations.
            </p>
            <div style={{ maxHeight: "350px", overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "12px", background: "rgba(0,0,0,0.15)" }}>
              {db.auditLogs.map(log => (
                <div key={log.id} className="audit-log-item">
                  <div>
                    <span style={{ color: "var(--primary)", fontWeight: "bold" }}>[{log.action}]</span>
                    <span style={{ marginLeft: "12px", color: "white" }}>{log.details}</span>
                  </div>
                  <span style={{ color: "var(--gray-600)" }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
