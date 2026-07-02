import React, { useState, useEffect } from "react";
import { Truck, MapPin, Package, CheckSquare, DollarSign, Star, Navigation, RefreshCw, Check, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDB, logisticsClaimJob, updateDeliveryStatus } from "../db/store";
import Loader3D from "../components/Loader3D";

export default function LogisticsDashboard({ activeUser }) {
  const [db, setDb] = useState(getDB());
  const [activeTab, setActiveTab] = useState("board"); // board, active, history
  const [proofText, setProofText] = useState("");
  const [selectedOrderForProof, setSelectedOrderForProof] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    const handleUpdate = () => setDb(getDB());
    window.addEventListener("db_update", handleUpdate);
    return () => window.removeEventListener("db_update", handleUpdate);
  }, []);

  const refreshState = () => {
    setDb(getDB());
  };

  // Filter orders for job board: Paid and marked ready by farmer, but no logistics carrier assigned yet
  const availableJobs = db.orders.filter(o => o.status === "Assigned" && !o.deliveryPartnerId);

  // Logistics carrier specific jobs
  const myJobs = db.orders.filter(o => o.deliveryPartnerId === activeUser.id);
  const activeJobs = myJobs.filter(o => ["Picked Up", "En Route", "Delivered"].includes(o.status) && o.deliveryStatus !== "Delivered");
  const completedJobs = myJobs.filter(o => o.deliveryStatus === "Delivered");

  // Calculate earnings (simulate N2,500 delivery fee per completed trip)
  const deliveryFeePerTrip = 2500;
  const myEarnings = completedJobs.length * deliveryFeePerTrip;

  const handleClaimJob = (orderId) => {
    setActionLoading(true);
    setLoadingMessage("Assigning delivery carrier details on-chain...");
    setTimeout(() => {
      const updatedDb = logisticsClaimJob(orderId, activeUser.id);
      setDb(updatedDb);
      setActionLoading(false);
      alert("Job claimed successfully! Please pick up the produce from the farmer.");
      window.dispatchEvent(new Event("db_update"));
    }, 1200);
  };

  const handleUpdateStatus = (orderId, newStatus) => {
    if (newStatus === "Delivered") {
      const order = db.orders.find(o => o.id === orderId);
      setSelectedOrderForProof(order);
    } else {
      setActionLoading(true);
      setLoadingMessage(`Updating transit status to: ${newStatus}...`);
      setTimeout(() => {
        const updatedDb = updateDeliveryStatus(orderId, newStatus);
        setDb(getDB());
        setActionLoading(false);
        window.dispatchEvent(new Event("db_update"));
      }, 1200);
    }
  };

  const handleProofSubmit = (e) => {
    e.preventDefault();
    if (!proofText) return;

    setActionLoading(true);
    setLoadingMessage("Finalizing delivery proof and closing escrow order...");
    setTimeout(() => {
      updateDeliveryStatus(selectedOrderForProof.id, "Delivered", proofText);
      setSelectedOrderForProof(null);
      setProofText("");
      setDb(getDB());
      setActionLoading(false);
      alert("Delivery status marked as Delivered! The buyer has been notified to confirm receipt.");
      window.dispatchEvent(new Event("db_update"));
    }, 1200);
  };

  // Helper to extract farmer location info
  const getFarmerLocation = (farmerId) => {
    const farmer = db.users.find(u => u.id === farmerId);
    return farmer ? `${farmer.address}, ${farmer.town}, ${farmer.lga}` : "Akwa Ibom";
  };

  // Helper to extract buyer location info
  const getBuyerLocation = (buyerId) => {
    const buyer = db.users.find(u => u.id === buyerId);
    return buyer ? `${buyer.address}, ${buyer.town}, ${buyer.lga}` : "Akwa Ibom";
  };

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
    <div className="logistics-dashboard">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2>Logistics Partner Dashboard</h2>
          <p style={{ color: "var(--gray-600)" }}>Accept shipping requests, update pickup and transit status, and track your delivery earnings.</p>
        </div>
        <div className="dashboard-tabs">
          <button 
            className={`tab-pill ${activeTab === "board" ? "active" : ""}`}
            onClick={() => setActiveTab("board")}
          >
            Available Jobs ({availableJobs.length})
          </button>
          <button 
            className={`tab-pill ${activeTab === "active" ? "active" : ""}`}
            onClick={() => setActiveTab("active")}
          >
            My Active Trips ({activeJobs.length})
          </button>
          <button 
            className={`tab-pill ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            Completed Jobs ({completedJobs.length})
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="dashboard-grid"
      >
        <motion.div variants={cardVariants} className="card metric-card">
          <div className="metric-info">
            <span>Today's Earnings</span>
            <h3>₦{myEarnings.toLocaleString()}</h3>
            <span style={{ fontSize: "0.75rem" }}>₦2,500 flat rate per delivery</span>
          </div>
          <div className="metric-icon" style={{ backgroundColor: "rgba(245, 158, 11, 0.15)", color: "var(--secondary)" }}>
            <DollarSign size={24} />
          </div>
        </motion.div>

        <motion.div variants={cardVariants} className="card metric-card">
          <div className="metric-info">
            <span>Active Shipments</span>
            <h3>{activeJobs.length} Packages</h3>
          </div>
          <div className="metric-icon">
            <Truck size={24} />
          </div>
        </motion.div>

        <motion.div variants={cardVariants} className="card metric-card">
          <div className="metric-info">
            <span>Completed Trips</span>
            <h3>{completedJobs.length} Deliveries</h3>
          </div>
          <div className="metric-icon" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "var(--primary)" }}>
            <CheckSquare size={24} />
          </div>
        </motion.div>

        <motion.div variants={cardVariants} className="card metric-card">
          <div className="metric-info">
            <span>Driver Rating</span>
            <h3>{activeUser.rating} ★</h3>
            <span style={{ fontSize: "0.75rem" }}>Reliable Logistics Carrier</span>
          </div>
          <div className="metric-icon" style={{ backgroundColor: "rgba(245, 158, 11, 0.12)", color: "var(--secondary-light)" }}>
            <Star size={24} fill="currentColor" />
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === "board" && (
          <motion.div 
            key="board"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="card" 
            style={{ marginTop: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3>Available Delivery Jobs in Akwa Ibom</h3>
              <button onClick={refreshState} className="icon-badge-btn"><RefreshCw size={16} /></button>
            </div>

            {availableJobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <Clock size={40} style={{ color: "var(--gray-600)", marginBottom: "8px" }} />
                <p style={{ color: "var(--gray-600)" }}>No orders are currently waiting for delivery pickup. Check back soon!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {availableJobs.map(job => (
                  <div key={job.id} className="dashboard-order-card pending">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "10px", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <strong style={{ color: "white" }}>Order Request: {job.id}</strong>
                        <span style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginLeft: "12px" }}>Value: ₦{job.totalAmount.toLocaleString()}</span>
                      </div>
                      <span style={{ fontSize: "0.95rem", color: "var(--secondary-light)", fontWeight: "bold" }}>Est. Pay: ₦2,500</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "16px" }}>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <MapPin size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
                        <div>
                          <small style={{ color: "var(--gray-600)", display: "block" }}>PICKUP FROM (FARMER)</small>
                          <strong style={{ color: "white" }}>{job.farmerName}</strong>
                          <div style={{ fontSize: "0.85rem", color: "var(--gray-800)" }}>{getFarmerLocation(job.farmerId)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <Navigation size={20} style={{ color: "var(--secondary)", flexShrink: 0 }} />
                        <div>
                          <small style={{ color: "var(--gray-600)", display: "block" }}>DELIVER TO (BUYER)</small>
                          <strong style={{ color: "white" }}>{job.buyerName}</strong>
                          <div style={{ fontSize: "0.85rem", color: "var(--gray-800)" }}>{getBuyerLocation(job.buyerId)}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--glass-border)", padding: "10px 16px", borderRadius: "8px", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Package size={16} style={{ color: "var(--primary)" }} />
                        <span style={{ fontSize: "0.85rem" }}>Produce: <strong>{job.quantity} {job.productName}</strong></span>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => handleClaimJob(job.id)}>
                        Accept & Claim Delivery
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "active" && (
          <motion.div 
            key="active"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="card" 
            style={{ marginTop: "24px" }}
          >
            <h3>My Active Delivery Shipments</h3>
            {activeJobs.length === 0 ? (
              <p style={{ color: "var(--gray-600)", padding: "20px", textAlign: "center" }}>You have no active shipments in transit.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                {activeJobs.map(job => (
                  <div key={job.id} className="dashboard-order-card pending">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid var(--glass-border)", paddingBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                      <strong style={{ color: "white" }}>Job for Order {job.id}</strong>
                      <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--secondary-light)" }}>
                        Current Status: {job.deliveryStatus}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", fontSize: "0.85rem", marginBottom: "16px" }}>
                      <div>
                        <strong style={{ color: "white" }}>Farmer Pickup:</strong> {getFarmerLocation(job.farmerId)} <br />
                        <strong>Contact:</strong> {db.users.find(u => u.id === job.farmerId)?.phone}
                      </div>
                      <div>
                        <strong style={{ color: "white" }}>Buyer Destination:</strong> {getBuyerLocation(job.buyerId)} <br />
                        <strong>Contact:</strong> {job.buyerPhone}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "10px 16px", borderRadius: "8px", flexWrap: "wrap", gap: "10px" }}>
                      <span>Package: <strong>{job.quantity} {job.productName}</strong></span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {job.deliveryStatus === "Pending Pickup" && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(job.id, "Picked Up")}>
                            Mark Picked Up
                          </button>
                        )}
                        {job.deliveryStatus === "Picked Up" && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateStatus(job.id, "In Transit")}>
                            Mark In Transit
                          </button>
                        )}
                        {job.deliveryStatus === "In Transit" && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(job.id, "Delivered")}>
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "history" && (
          <motion.div 
            key="history"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="card" 
            style={{ marginTop: "24px" }}
          >
            <h3>Completed Deliveries History</h3>
            {completedJobs.length === 0 ? (
              <p style={{ color: "var(--gray-600)", padding: "20px", textAlign: "center" }}>No completed jobs recorded yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="prices-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Buyer</th>
                      <th>Destination</th>
                      <th>Item Quantity</th>
                      <th>Delivery Date</th>
                      <th>Proof of Delivery</th>
                      <th>Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedJobs.map(job => (
                      <tr key={job.id}>
                        <td>{job.id}</td>
                        <td>{job.buyerName}</td>
                        <td>{job.lga}</td>
                        <td>{job.quantity} {job.productName}</td>
                        <td>{job.date}</td>
                        <td><span style={{ fontSize: "0.85rem", color: "var(--gray-800)" }}>{job.proofOfDelivery || "N/A"}</span></td>
                        <td style={{ color: "var(--primary-light)", fontWeight: "bold" }}>₦2,500</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proof of Delivery Modal */}
      <AnimatePresence>
        {selectedOrderForProof && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-content" 
              style={{ maxWidth: "450px" }}
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
            >
              <div className="modal-header">
                <h3>Upload Proof of Delivery</h3>
                <button onClick={() => setSelectedOrderForProof(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "white" }}><X size={20} /></button>
              </div>

              <form onSubmit={handleProofSubmit}>
                <div className="form-field" style={{ marginBottom: "20px" }}>
                  <label>Confirm Delivery Details & Sign (e.g. "Received by Bassey's helper", or reference image URL)</label>
                  <input 
                    type="text" 
                    placeholder="Enter recipient name, details, or image link..." 
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                    className="filter-input"
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedOrderForProof(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }}><Check size={14} /> Submit & Mark Delivered</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {actionLoading && (
        <Loader3D fullScreen={true} message={loadingMessage} />
      )}
    </div>
  );
}
