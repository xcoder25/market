import React, { useState, useEffect } from "react";
import { DollarSign, ShoppingBag, PlusCircle, Check, X, ShieldAlert, Sparkles, TrendingUp, BarChart2, Star, Calendar, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDB, updateOrderStatus, addProductListing, updateProduct, CATEGORIES, AKWA_IBOM_LOCATIONS, saveDB } from "../db/store";
import Loader3D from "../components/Loader3D";

export default function FarmerDashboard({ activeUser, onSwitchView }) {
  const [db, setDb] = useState(getDB());
  const [activeTab, setActiveTab] = useState("overview"); // overview, orders, products, harvest
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  
  // New product form states
  const [prodName, setProdName] = useState("");
  const [prodCat, setProdCat] = useState("Crops");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodUnit, setProdUnit] = useState("Basin");
  const [prodQty, setProdQty] = useState("");
  const [prodMinOrder, setProdMinOrder] = useState("1");
  const [prodHarvestDate, setProdHarvestDate] = useState("");
  const [prodOrganic, setProdOrganic] = useState(true);
  const [prodImg, setProdImg] = useState("");

  // New Harvest Calendar State
  const [newHarvestCrop, setNewHarvestCrop] = useState("");
  const [newHarvestMonth, setNewHarvestMonth] = useState("July");
  const [newHarvestStatus, setNewHarvestStatus] = useState("Available");
  const [newHarvestDesc, setNewHarvestDesc] = useState("");

  useEffect(() => {
    const handleUpdate = () => setDb(getDB());
    window.addEventListener("db_update", handleUpdate);
    return () => window.removeEventListener("db_update", handleUpdate);
  }, []);

  const refreshState = () => {
    setDb(getDB());
  };

  // Farmer specific records
  const myProducts = db.products.filter(p => p.farmerId === activeUser.id);
  const myOrders = db.orders.filter(o => o.farmerId === activeUser.id);
  
  // Wallet Balance (Released Escrow Funds)
  const totalEarnings = myOrders
    .filter(o => ["Completed", "Reviewed"].includes(o.status))
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Escrow Balance (Locked in Active Orders)
  const pendingEscrow = myOrders
    .filter(o => ["Paid", "Assigned", "Picked Up", "En Route", "Delivered"].includes(o.status))
    .reduce((sum, o) => sum + o.totalAmount, 0);
  
  const activeOrdersCount = myOrders.filter(o => ["Requested", "Accepted", "Paid", "Assigned", "Picked Up", "En Route", "Delivered"].includes(o.status)).length;

  const handleAcceptOrder = (orderId) => {
    setActionLoading(true);
    setLoadingMessage("Accepting and processing buyer's order request...");
    setTimeout(() => {
      const updatedDb = updateOrderStatus(orderId, "Accepted");
      setDb(updatedDb);
      setActionLoading(false);
      window.dispatchEvent(new Event("db_update"));
    }, 1200);
  };

  const handleRejectOrder = (orderId) => {
    setActionLoading(true);
    setLoadingMessage("Processing order rejection...");
    setTimeout(() => {
      const updatedDb = updateOrderStatus(orderId, "Rejected");
      setDb(updatedDb);
      setActionLoading(false);
      window.dispatchEvent(new Event("db_update"));
    }, 1200);
  };

  const handleConfirmPayment = (orderId) => {
    setActionLoading(true);
    setLoadingMessage("Confirming receipt of payment and preparing dispatch...");
    setTimeout(() => {
      const updatedDb = updateOrderStatus(orderId, "Assigned", {
        deliveryStatus: "Pending Pickup"
      });
      setDb(updatedDb);
      setActionLoading(false);
      window.dispatchEvent(new Event("db_update"));
    }, 1200);
  };

  const handleToggleStatus = (productId, currentStatus) => {
    const newStatus = currentStatus === "Available" ? "Out of Stock" : "Available";
    const updatedDb = updateProduct(productId, { status: newStatus });
    setDb(updatedDb);
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!prodName || !prodPrice || !prodQty) {
      alert("Please fill all required fields.");
      return;
    }

    setActionLoading(true);
    setLoadingMessage("Uploading and processing crop listing data...");

    const imgMap = {
      Crops: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=500",
      Fish: "https://images.unsplash.com/photo-1534124412554-72583ec7cd30?w=500",
      Poultry: "https://images.unsplash.com/photo-1548550022-c14194051da3?w=500",
      Livestock: "https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=500",
      "Palm Products": "https://images.unsplash.com/photo-1612450796384-e1d113c2306d?w=500",
      "Processed Products": "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500",
      Fruits: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=500"
    };

    const productData = {
      name: prodName,
      category: prodCat,
      subcategory: prodName.split(" ")[0],
      description: prodDesc,
      price: parseFloat(prodPrice),
      unit: prodUnit,
      quantity: parseInt(prodQty),
      minOrder: parseInt(prodMinOrder),
      harvestDate: prodHarvestDate || new Date().toISOString().split("T")[0],
      organic: prodOrganic,
      deliveryAvailable: true,
      location: activeUser.town,
      lga: activeUser.lga,
      town: activeUser.town,
      image: prodImg || imgMap[prodCat] || "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=500"
    };

    setTimeout(() => {
      const updatedDb = addProductListing(productData);
      setDb(updatedDb);
      setShowAddForm(false);
      setActionLoading(false);
      
      // Clear fields
      setProdName("");
      setProdDesc("");
      setProdPrice("");
      setProdQty("");
      setProdMinOrder("1");
      setProdHarvestDate("");
      setProdImg("");
      alert("New product listing uploaded successfully!");
      window.dispatchEvent(new Event("db_update"));
    }, 1200);
  };

  const handleAddHarvest = (e) => {
    e.preventDefault();
    if (!newHarvestCrop) return;
    
    const newCalendarItem = {
      id: "h-" + Date.now(),
      product: newHarvestCrop,
      month: newHarvestMonth,
      status: newHarvestStatus,
      description: newHarvestDesc
    };

    const currentCalendar = activeUser.harvestCalendar || [];
    const updatedUserCalendar = [...currentCalendar, newCalendarItem];

    // Update profile
    const updatedDb = db;
    const userIndex = updatedDb.users.findIndex(u => u.id === activeUser.id);
    if (userIndex !== -1) {
      updatedDb.users[userIndex].harvestCalendar = updatedUserCalendar;
      if (updatedDb.currentUser.id === activeUser.id) {
        updatedDb.currentUser.harvestCalendar = updatedUserCalendar;
      }
      saveDB(updatedDb);
      setDb(getDB());
      setNewHarvestCrop("");
      setNewHarvestDesc("");
      alert("Harvest calendar updated!");
    }
  };

  // Framer Motion variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const dashboardItem = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } }
  };

  return (
    <div className="farmer-dashboard">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2>Farmer Dashboard</h2>
          <p style={{ color: "var(--gray-600)" }}>Manage your farm listings, fulfill orders, and track your agricultural earnings.</p>
        </div>
        <div className="dashboard-tabs">
          <button 
            className={`tab-pill ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button 
            className={`tab-pill ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            Orders ({activeOrdersCount})
          </button>
          <button 
            className={`tab-pill ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            My Listings ({myProducts.length})
          </button>
          <button 
            className={`tab-pill ${activeTab === "harvest" ? "active" : ""}`}
            onClick={() => setActiveTab("harvest")}
          >
            Harvest Calendar
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* Metrics Row */}
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="dashboard-grid"
            >
              <motion.div variants={dashboardItem} className="card metric-card">
                <div className="metric-info">
                  <span>Wallet Balance</span>
                  <h3>₦{totalEarnings.toLocaleString()}</h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>Released Escrow Funds</span>
                </div>
                <div className="metric-icon" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "var(--primary)" }}>
                  <DollarSign size={24} />
                </div>
              </motion.div>

              <motion.div variants={dashboardItem} className="card metric-card">
                <div className="metric-info">
                  <span>Escrow Vault</span>
                  <h3 style={{ color: "var(--secondary-light)" }}>₦{pendingEscrow.toLocaleString()}</h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>Locked in Transit Orders</span>
                </div>
                <div className="metric-icon" style={{ backgroundColor: "rgba(245, 158, 11, 0.15)", color: "var(--secondary)" }}>
                  <DollarSign size={24} />
                </div>
              </motion.div>

              <motion.div variants={dashboardItem} className="card metric-card">
                <div className="metric-info">
                  <span>Active Fulfillments</span>
                  <h3>{activeOrdersCount} Orders</h3>
                </div>
                <div className="metric-icon">
                  <ShoppingBag size={24} />
                </div>
              </motion.div>

              <motion.div variants={dashboardItem} className="card metric-card">
                <div className="metric-info">
                  <span>Live Listings</span>
                  <h3>{myProducts.length} Items</h3>
                </div>
                <div className="metric-icon" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "var(--primary)" }}>
                  <PlusCircle size={24} />
                </div>
              </motion.div>

              <motion.div variants={dashboardItem} className="card metric-card">
                <div className="metric-info">
                  <span>Reputation Score</span>
                  <h3>{activeUser.rating} ★</h3>
                  <span style={{ fontSize: "0.75rem" }}>Based on {activeUser.reviewsCount} reviews</span>
                </div>
                <div className="metric-icon" style={{ backgroundColor: "rgba(245, 158, 11, 0.12)", color: "var(--secondary-light)" }}>
                  <Star size={24} fill="currentColor" />
                </div>
              </motion.div>
            </motion.div>

            {/* Layout Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginTop: "24px" }}>
              {/* Custom SVG Earnings Chart with line animation */}
              <div className="card">
                <h3 className="card-title"><TrendingUp size={18} /> Revenue Trends (Last 6 Months)</h3>
                <div className="svg-chart-container">
                  <svg viewBox="0 0 500 200" width="100%" height="100%">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Grid Lines */}
                    <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4" />
                    <line x1="40" y1="70" x2="480" y2="70" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4" />
                    <line x1="40" y1="120" x2="480" y2="120" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4" />
                    <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                    
                    {/* Area path */}
                    <motion.path 
                      d="M 60 160 Q 140 140, 220 150 T 380 90 T 460 30 L 460 170 L 60 170 Z" 
                      fill="url(#chartGrad)" 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                    {/* Line path */}
                    <motion.path 
                      d="M 60 160 Q 140 140, 220 150 T 380 90 T 460 30" 
                      fill="none" 
                      stroke="var(--primary)" 
                      strokeWidth="3" 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                    
                    {/* Data Dots with float animations */}
                    {[[60, 160], [140, 140], [220, 150], [300, 120], [380, 90]].map((pt, i) => (
                      <motion.circle 
                        key={i}
                        cx={pt[0]} 
                        cy={pt[1]} 
                        r="5" 
                        fill="var(--primary)" 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 * i }}
                      />
                    ))}
                    <motion.circle 
                      cx="460" 
                      cy="30" 
                      r="6" 
                      fill="var(--secondary)" 
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                    />
                    
                    {/* X Axis Labels */}
                    <text x="60" y="190" fontSize="10" textAnchor="middle" fill="var(--gray-600)">Jan</text>
                    <text x="140" y="190" fontSize="10" textAnchor="middle" fill="var(--gray-600)">Feb</text>
                    <text x="220" y="190" fontSize="10" textAnchor="middle" fill="var(--gray-600)">Mar</text>
                    <text x="300" y="190" fontSize="10" textAnchor="middle" fill="var(--gray-600)">Apr</text>
                    <text x="380" y="190" fontSize="10" textAnchor="middle" fill="var(--gray-600)">May</text>
                    <text x="460" y="190" fontSize="10" textAnchor="middle" fill="var(--gray-600)">Jun</text>
                    
                    {/* Y Axis Labels */}
                    <text x="35" y="24" fontSize="10" textAnchor="end" fill="var(--gray-600)">₦150k</text>
                    <text x="35" y="74" fontSize="10" textAnchor="end" fill="var(--gray-600)">₦100k</text>
                    <text x="35" y="124" fontSize="10" textAnchor="end" fill="var(--gray-600)">₦50k</text>
                    <text x="35" y="174" fontSize="10" textAnchor="end" fill="var(--gray-600)">₦0</text>
                  </svg>
                </div>
              </div>

              {/* Performance Panel */}
              <div className="card">
                <h3 className="card-title"><BarChart2 size={18} /> Best Customers</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "10px" }}>
                    <div>
                      <strong style={{ color: "white" }}>Chef Bassey</strong>
                      <div style={{ fontSize: "0.8rem", color: "var(--gray-600)", marginTop: "2px" }}>Restaurant Owner • Uyo</div>
                    </div>
                    <strong style={{ color: "var(--primary)" }}>4 Orders (₦92,000)</strong>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ color: "white" }}>Edidiong Hotel & Suites</strong>
                      <div style={{ fontSize: "0.8rem", color: "var(--gray-600)", marginTop: "2px" }}>Hotel procurement • Eket</div>
                    </div>
                    <strong style={{ color: "var(--primary)" }}>2 Orders (₦130,000)</strong>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "orders" && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="card"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3>Customer Orders Panel</h3>
              <button onClick={refreshState} className="icon-badge-btn"><RefreshCw size={16} /></button>
            </div>

            {myOrders.length === 0 ? (
              <p style={{ textAlign: "center", padding: "20px", color: "var(--gray-600)" }}>You have not received any orders yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {myOrders.map(order => (
                  <div key={order.id} className={`dashboard-order-card ${["Paid", "Assigned", "Picked Up", "En Route"].includes(order.status) ? "pending" : ["Completed", "Reviewed"].includes(order.status) ? "completed" : order.status === "Rejected" || order.status === "Cancelled" ? "cancelled" : ""}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "12px", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <strong style={{ color: "white" }}>Order ID: {order.id}</strong>
                        <span style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginLeft: "12px" }}>Placed on: {order.date}</span>
                      </div>
                      <span className={`badge-status ${order.status.toLowerCase().replace(" ", "-")}`}>
                        {order.status}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                      <div>
                        <small style={{ color: "var(--gray-600)" }}>Buyer Contact</small>
                        <div style={{ fontWeight: "700", color: "white", marginTop: "2px" }}>{order.buyerName}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>📞 {order.buyerPhone}</div>
                      </div>
                      <div>
                        <small style={{ color: "var(--gray-600)" }}>Produce Details</small>
                        <div style={{ fontWeight: "700", color: "white", marginTop: "2px" }}>{order.productName}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>Qty: {order.quantity} | Total: <strong style={{ color: "var(--secondary)" }}>₦{order.totalAmount.toLocaleString()}</strong></div>
                      </div>
                      <div>
                        <small style={{ color: "var(--gray-600)" }}>Delivery Method</small>
                        <div style={{ fontSize: "0.85rem", color: "var(--gray-800)", marginTop: "2px" }}>Logistics: {order.deliveryPartnerName || "Pending Carrier Claim"}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>Status: <strong style={{ color: "var(--primary)" }}>{order.deliveryStatus}</strong></div>
                      </div>
                    </div>

                    {/* Operational actions for farmer */}
                    {order.status === "Requested" && (
                      <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" }}>
                        <button className="btn btn-outline btn-sm" onClick={() => handleRejectOrder(order.id)}>
                          <X size={14} /> Reject
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleAcceptOrder(order.id)}>
                          <Check size={14} /> Accept & Invoice
                        </button>
                      </div>
                    )}

                    {order.status === "Paid" && (
                      <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleConfirmPayment(order.id)}>
                          <Check size={14} style={{ marginRight: "4px" }} /> Mark Ready & Dispatch Logistics
                        </button>
                      </div>
                    )}
                    
                    {order.review && (
                      <div style={{ marginTop: "20px", borderTop: "1px solid var(--glass-border)", paddingTop: "12px" }}>
                        <h5 style={{ display: "flex", alignItems: "center", gap: "6px", color: "white" }}><Star size={14} fill="var(--warning)" color="var(--warning)" /> Buyer Review:</h5>
                        <p style={{ fontStyle: "italic", fontSize: "0.85rem", color: "var(--gray-600)", marginTop: "6px" }}>
                          "{order.review.comment}" - Rated <strong style={{ color: "var(--secondary)" }}>{order.review.rating} / 5 Stars</strong>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "products" && (
          <motion.div
            key="products"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="card"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <h3>Manage Produce Inventory</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
                <PlusCircle size={16} /> Add Product Listing
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="prices-table">
                <thead>
                  <tr>
                    <th>Listing Photo</th>
                    <th>Produce Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Min. Order</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myProducts.map(prod => (
                    <tr key={prod.id}>
                      <td>
                        <img src={prod.image} alt="" style={{ width: "50px", height: "45px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--glass-border)" }} />
                      </td>
                      <td><strong style={{ color: "white" }}>{prod.name}</strong></td>
                      <td>{prod.category}</td>
                      <td style={{ color: "var(--secondary-light)", fontWeight: "bold" }}>₦{prod.price.toLocaleString()} / {prod.unit}</td>
                      <td>{prod.quantity} {prod.unit}s</td>
                      <td>{prod.minOrder} {prod.unit}</td>
                      <td>
                        <span className={`badge-status ${prod.status.toLowerCase().replace(" ", "-")}`}>
                          {prod.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={`btn btn-sm ${prod.status === "Available" ? "btn-outline" : "btn-primary"}`}
                          onClick={() => handleToggleStatus(prod.id, prod.status)}
                          style={{ padding: "6px 12px" }}
                        >
                          {prod.status === "Available" ? "Set Out of Stock" : "Set Available"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === "harvest" && (
          <motion.div
            key="harvest"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="card"
          >
            <h3>Harvest Calendar Schedule</h3>
            <p style={{ color: "var(--gray-600)", marginBottom: "20px" }}>
              Specify your expected harvest periods. This allows bulk buyers to book and pre-order ahead, securing sales before you harvest.
            </p>

            <form onSubmit={handleAddHarvest} className="form-grid" style={{ marginBottom: "28px" }}>
              <div className="form-field">
                <label>Crop / Product Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Yellow Cassava, Palm Kernel" 
                  value={newHarvestCrop}
                  onChange={(e) => setNewHarvestCrop(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label>Expected Harvest Month</label>
                <select value={newHarvestMonth} onChange={(e) => setNewHarvestMonth(e.target.value)}>
                  <option value="July">July 2026</option>
                  <option value="August">August 2026</option>
                  <option value="September">September 2026</option>
                  <option value="October">October 2026</option>
                  <option value="November">November 2026</option>
                  <option value="December">December 2026</option>
                </select>
              </div>
              <div className="form-field">
                <label>Harvest Status</label>
                <select value={newHarvestStatus} onChange={(e) => setNewHarvestStatus(e.target.value)}>
                  <option value="Available">Available Now</option>
                  <option value="Harvesting">Harvesting Soon</option>
                  <option value="Pre-order">Open for Pre-order</option>
                </select>
              </div>
              <div className="form-field">
                <label>Calendar Notes (e.g. Estimated yield)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Approx. 20 bags available. High starch yield." 
                  value={newHarvestDesc}
                  onChange={(e) => setNewHarvestDesc(e.target.value)}
                />
              </div>
              <div className="form-field" style={{ justifyContent: "flex-end" }}>
                <button type="submit" className="btn btn-primary" style={{ height: "46px" }}><Calendar size={14} /> Update Schedule</button>
              </div>
            </form>

            <h4>Active Harvest Schedule</h4>
            <div style={{ overflowX: "auto", marginTop: "12px" }}>
              <table className="prices-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Harvest Period</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeUser.harvestCalendar || []).map(item => (
                    <tr key={item.id}>
                      <td><strong style={{ color: "white" }}>{item.product}</strong></td>
                      <td>{item.month} 2026</td>
                      <td>
                        <span className={`badge-status ${item.status.toLowerCase().replace(" ", "-")}`}>
                          {item.status}
                        </span>
                      </td>
                      <td><span style={{ color: "var(--gray-800)" }}>{item.description}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Product Modal Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
            >
              <div className="modal-header">
                <h3>Upload Produce Listing</h3>
                <button onClick={() => setShowAddForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "white" }}><X size={20} /></button>
              </div>

              <form onSubmit={handleAddProduct}>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Produce Name *</label>
                    <input type="text" placeholder="e.g. White Cassava Flour (Fufu)" value={prodName} onChange={(e) => setProdName(e.target.value)} required />
                  </div>

                  <div className="form-field">
                    <label>Category *</label>
                    <select value={prodCat} onChange={(e) => setProdCat(e.target.value)}>
                      {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-field">
                    <label>Price (₦) *</label>
                    <input type="number" placeholder="Price in Naira" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} required />
                  </div>

                  <div className="form-field">
                    <label>Selling Unit *</label>
                    <select value={prodUnit} onChange={(e) => setProdUnit(e.target.value)}>
                      <option value="Basin">Basin</option>
                      <option value="Kg">Kg</option>
                      <option value="Crate (30 eggs)">Crate (30 eggs)</option>
                      <option value="Bag (50kg)">Bag (50kg)</option>
                      <option value="Bag (100kg)">Bag (100kg)</option>
                      <option value="Gallon (5L)">Gallon (5L)</option>
                      <option value="Gallon (20L)">Gallon (20L)</option>
                      <option value="Bird">Bird</option>
                      <option value="Piece">Piece</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Available Quantity *</label>
                    <input type="number" placeholder="Total available quantity" value={prodQty} onChange={(e) => setProdQty(e.target.value)} required />
                  </div>

                  <div className="form-field">
                    <label>Min. Order Quantity *</label>
                    <input type="number" min="1" value={prodMinOrder} onChange={(e) => setProdMinOrder(e.target.value)} required />
                  </div>

                  <div className="form-field">
                    <label>Harvest Date</label>
                    <input type="date" value={prodHarvestDate} onChange={(e) => setProdHarvestDate(e.target.value)} />
                  </div>

                  <div className="form-field">
                    <label>Organic / Natural?</label>
                    <select value={prodOrganic} onChange={(e) => setProdOrganic(e.target.value === "true")}>
                      <option value="true">Organic (No chemical input)</option>
                      <option value="false">Conventional</option>
                    </select>
                  </div>
                </div>

                <div className="form-field" style={{ marginBottom: "16px" }}>
                  <label>Listing Image URL (Optional - leave blank for automatic placeholder)</label>
                  <input type="url" placeholder="https://example.com/image.jpg" value={prodImg} onChange={(e) => setProdImg(e.target.value)} />
                </div>

                <div className="form-field" style={{ marginBottom: "20px" }}>
                  <label>Detailed Description</label>
                  <textarea rows="3" placeholder="Describe the freshness, quality, and processing style..." value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} />
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Publish Produce Listing</button>
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
