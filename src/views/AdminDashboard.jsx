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
  const sellers = db.users.filter(u => u.role === "Seller");
  const logistics = db.users.filter(u => u.role === "Logistics Partner");
  const totalSales = db.orders.reduce((sum, o) => sum + o.totalAmount, 0);

  const totalSubRevenue = (db.subscriptionPayments || []).reduce((sum, p) => sum + p.amount, 0);
  const totalAdRevenue = (db.adPayments || []).reduce((sum, p) => sum + p.amount, 0);
  const totalEscrowComm = db.orders.reduce((sum, o) => sum + (o.escrowFee || 0), 0);
  const totalLogisticsComm = db.orders.filter(o => o.deliveryStatus === "Delivered").reduce((sum, o) => sum + Math.round((o.deliveryFee || 2500) * 0.05), 0);

  const totalPlatformRevenue = totalSubRevenue + totalAdRevenue + totalEscrowComm + totalLogisticsComm;

  const activeProCount = db.users.filter(u => u.subscriptionPlan === "Pro").length;
  const activePremiumCount = db.users.filter(u => u.subscriptionPlan === "Premium").length;
  const currentMRR = (activeProCount * 15000) + (activePremiumCount * 35000);

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
            className={`tab-pill ${activeTab === "revenue" ? "active" : ""}`}
            onClick={() => setActiveTab("revenue")}
          >
            MRR & Revenue
          </button>
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
        {activeTab === "revenue" && (
          <motion.div 
            key="revenue"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="card" 
            style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, color: "white" }}>MRR & Platform Revenue Operations</h3>
              <span style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>Escrow commissions, ad sales, and merchant subscriptions</span>
            </div>

            {/* Top Stat Blocks */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              <div className="card" style={{ background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.2) 100%)", border: "1px solid rgba(139, 92, 246, 0.3)", padding: "20px" }}>
                <small style={{ color: "var(--gray-600)", fontWeight: "bold", textTransform: "uppercase" }}>Monthly Recurring Revenue (MRR)</small>
                <h2 style={{ fontSize: "2.2rem", fontWeight: "900", margin: "8px 0", color: "white" }}>₦{currentMRR.toLocaleString()}</h2>
                <div style={{ fontSize: "0.85rem", color: "var(--gray-800)" }}>
                  Pro: <strong>{activeProCount}</strong> (₦15k) | Premium: <strong>{activePremiumCount}</strong> (₦35k)
                </div>
              </div>

              <div className="card" style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.2) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "20px" }}>
                <small style={{ color: "var(--gray-600)", fontWeight: "bold", textTransform: "uppercase" }}>Net Accumulated Earnings</small>
                <h2 style={{ fontSize: "2.2rem", fontWeight: "900", margin: "8px 0", color: "var(--primary-light)" }}>₦{totalPlatformRevenue.toLocaleString()}</h2>
                <div style={{ fontSize: "0.85rem", color: "var(--gray-800)" }}>
                  Gross platform sales: ₦{totalSales.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Breakdown Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div className="card" style={{ padding: "16px" }}>
                <small style={{ color: "var(--gray-600)" }}>Subscription Billings</small>
                <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "white", marginTop: "4px" }}>₦{totalSubRevenue.toLocaleString()}</div>
              </div>
              <div className="card" style={{ padding: "16px" }}>
                <small style={{ color: "var(--gray-600)" }}>Sponsored Ads</small>
                <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "white", marginTop: "4px" }}>₦{totalAdRevenue.toLocaleString()}</div>
              </div>
              <div className="card" style={{ padding: "16px" }}>
                <small style={{ color: "var(--gray-600)" }}>Escrow Fees (3%)</small>
                <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "white", marginTop: "4px" }}>₦{totalEscrowComm.toLocaleString()}</div>
              </div>
              <div className="card" style={{ padding: "16px" }}>
                <small style={{ color: "var(--gray-600)" }}>Logistics Cut (5%)</small>
                <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "white", marginTop: "4px" }}>₦{totalLogisticsComm.toLocaleString()}</div>
              </div>
            </div>

            {/* Transactions & Subscription Ledgers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", marginTop: "12px" }}>
              {/* Subscriptions */}
              <div className="card" style={{ padding: "20px" }}>
                <h4 style={{ color: "white", marginBottom: "16px", borderBottom: "1px solid var(--glass-border)", paddingBottom: "8px" }}>Active Subscriptions</h4>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--gray-600)", textAlign: "left" }}>
                        <th style={{ padding: "8px" }}>Merchant</th>
                        <th style={{ padding: "8px" }}>Plan</th>
                        <th style={{ padding: "8px" }}>Amount</th>
                        <th style={{ padding: "8px" }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(db.subscriptionPayments || []).map((sub, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td style={{ padding: "8px", fontWeight: "bold", color: "white" }}>{sub.name}</td>
                          <td style={{ padding: "8px" }}><span style={{ padding: "2px 6px", borderRadius: "8px", background: "rgba(139,92,246,0.1)", color: "var(--primary-light)", fontSize: "0.75rem", fontWeight: "bold" }}>{sub.plan}</span></td>
                          <td style={{ padding: "8px", color: "var(--secondary-light)" }}>₦{sub.amount.toLocaleString()}</td>
                          <td style={{ padding: "8px", color: "var(--gray-800)" }}>{sub.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sponsored Ads */}
              <div className="card" style={{ padding: "20px" }}>
                <h4 style={{ color: "white", marginBottom: "16px", borderBottom: "1px solid var(--glass-border)", paddingBottom: "8px" }}>Ad Campaign Billings</h4>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--gray-600)", textAlign: "left" }}>
                        <th style={{ padding: "8px" }}>Advertiser</th>
                        <th style={{ padding: "8px" }}>Ad Slot</th>
                        <th style={{ padding: "8px" }}>Budget</th>
                        <th style={{ padding: "8px" }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(db.adPayments || []).map((ad, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td style={{ padding: "8px", fontWeight: "bold", color: "white" }}>{ad.name}</td>
                          <td style={{ padding: "8px", color: "var(--gray-600)" }}>{ad.type}</td>
                          <td style={{ padding: "8px", color: "var(--secondary-light)" }}>₦{ad.amount.toLocaleString()}</td>
                          <td style={{ padding: "8px", color: "var(--gray-800)" }}>{ad.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Platform Demographics */}
            <div className="card" style={{ padding: "16px" }}>
              <h4 style={{ color: "white", marginBottom: "12px", fontSize: "0.95rem" }}>Ecosystem Registered Users:</h4>
              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "0.9rem" }}>
                <div>Buyers: <strong style={{ color: "white" }}>{buyers.length}</strong></div>
                <div>Farmers: <strong style={{ color: "white" }}>{farmers.length}</strong></div>
                <div>Sellers/Businesses: <strong style={{ color: "white" }}>{sellers.length}</strong></div>
                <div>Logistics Partners: <strong style={{ color: "white" }}>{logistics.length}</strong></div>
              </div>
            </div>
          </motion.div>
        )}
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
