import React, { useState, useEffect } from "react";
import { 
  Search, Filter, ShieldCheck, Heart, ShoppingBag, Calendar, Check, Send, 
  AlertCircle, RefreshCw, X, MessageSquare, Star, FileText, CreditCard, 
  Truck, MapPin, Sprout, Fish, Egg, Beef, Droplets, Package, Apple, 
  CheckCircle2, ChevronRight, Copy, Award, Shield 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getDB, 
  placeOrder, 
  updateOrderStatus, 
  leaveReview, 
  sendMessage, 
  AKWA_IBOM_LOCATIONS, 
  CATEGORIES 
} from "../db/store";
import Loader3D from "../components/Loader3D";

const CATEGORY_ICONS = {
  Crops: <Sprout size={16} />,
  Fish: <Fish size={16} />,
  Poultry: <Egg size={16} />,
  Livestock: <Beef size={16} />,
  "Palm Products": <Droplets size={16} />,
  "Processed Products": <Package size={16} />,
  Fruits: <Apple size={16} />
};

export default function Marketplace({ activeUser, onSwitchView, onOpenChat }) {
  const [db, setDb] = useState(getDB());
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLga, setSelectedLga] = useState("All");
  const [selectedVerification, setSelectedVerification] = useState("All");
  const [sortBy, setSortBy] = useState("Recently Added");
  const [organicFilter, setOrganicFilter] = useState("All"); // All, Organic, Non-Organic

  const [activeTab, setActiveTab] = useState("listings"); // listings, farmers, harvest_calendar, my_orders
  
  // Mobile filter drawer state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQty, setOrderQty] = useState(1);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  
  // Paystack checkout portal states
  const [paymentMethod, setPaymentMethod] = useState("card"); // card, transfer
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState(null);
  
  // Review form states
  const [reviewOrder, setReviewOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [qualityRating, setQualityRating] = useState(5);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [commRating, setCommRating] = useState(5);
  const [delivRating, setDelivRating] = useState(5);
  const [packRating, setPackRating] = useState(5);

  useEffect(() => {
    const handleUpdate = () => setDb(getDB());
    window.addEventListener("db_update", handleUpdate);
    return () => window.removeEventListener("db_update", handleUpdate);
  }, []);

  // Listen for AI assistant click links to trigger details or buying modals
  useEffect(() => {
    const handleOpenBuyModal = (e) => {
      const product = e.detail;
      setSelectedProduct(product);
      setOrderQty(product.minOrder);
      setActiveTab("listings");
    };

    const handleOpenFarmerModal = (e) => {
      const farmer = e.detail;
      setSelectedFarmer(farmer);
      setActiveTab("farmers");
    };

    window.addEventListener("open_buy_modal", handleOpenBuyModal);
    window.addEventListener("open_farmer_modal", handleOpenFarmerModal);

    return () => {
      window.removeEventListener("open_buy_modal", handleOpenBuyModal);
      window.removeEventListener("open_farmer_modal", handleOpenFarmerModal);
    };
  }, []);

  const refreshState = () => {
    setDb(getDB());
  };

  const getFarmerDetails = (farmerId) => {
    return db.users.find(u => u.id === farmerId) || {};
  };

  // Filtered Products
  const filteredProducts = db.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesLga = selectedLga === "All" || p.lga === selectedLga;
    
    const farmer = getFarmerDetails(p.farmerId);
    const matchesVerification = selectedVerification === "All" || farmer.verification === selectedVerification;
    const matchesOrganic = organicFilter === "All" || 
                           (organicFilter === "Organic" && p.organic) || 
                           (organicFilter === "Non-Organic" && !p.organic);
    
    return matchesSearch && matchesCategory && matchesLga && matchesVerification && matchesOrganic && p.status === "Available";
  });

  // Sorted Products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "Lowest Price") return a.price - b.price;
    if (sortBy === "Highest Rating") {
      const ratingA = getFarmerDetails(a.farmerId).rating || 0;
      const ratingB = getFarmerDetails(b.farmerId).rating || 0;
      return ratingB - ratingA;
    }
    if (sortBy === "Recently Added") {
      return b.id.localeCompare(a.id);
    }
    return 0;
  });

  // Handle order submission
  const handlePlaceOrder = (product) => {
    if (!activeUser) {
      onSwitchView("auth");
      setSelectedProduct(null);
      return;
    }

    if (orderQty < product.minOrder) {
      alert(`Minimum order quantity is ${product.minOrder} ${product.unit}`);
      return;
    }
    
    setActionLoading(true);
    setLoadingMessage("Securing your escrow allocation...");

    setTimeout(() => {
      const { db: updatedDb, orderId } = placeOrder(product.id, orderQty);
      setDb(updatedDb);
      
      const placedOrder = updatedDb.orders.find(o => o.id === orderId);
      setCurrentInvoice(placedOrder);
      setSelectedProduct(null);
      setActionLoading(false);
      window.dispatchEvent(new Event("db_update"));
    }, 1200);
  };

  // Handle Paystack-style payment submit
  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    setPaymentProcessing(true);
    
    // Simulate real gateway network latency
    setTimeout(() => {
      setPaymentProcessing(false);
      const updatedDb = updateOrderStatus(currentInvoice.id, "Paid");
      setDb(updatedDb);
      
      // Reset input fields
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");
      setCardName("");
      
      setPaymentSuccess(true);
      window.dispatchEvent(new Event("db_update"));
    }, 1800);
  };

  const handleConfirmReceipt = (orderId) => {
    const confirmRelease = window.confirm("Are you sure you want to release the Escrow funds to the farmer? This indicates you have received the fresh produce in perfect condition.");
    if (!confirmRelease) return;

    setActionLoading(true);
    setLoadingMessage("Releasing funds from secure escrow custody...");

    setTimeout(() => {
      const updatedDb = updateOrderStatus(orderId, "Completed");
      setDb(updatedDb);
      setSelectedOrderForTracking(null);
      setActionLoading(false);
      alert("Escrow funds successfully disbursed to the farmer's wallet account!");
      
      // Prompt to review
      const orderObj = updatedDb.orders.find(o => o.id === orderId);
      if (orderObj) {
        setReviewOrder(orderObj);
        setActiveTab("listings");
      }
      window.dispatchEvent(new Event("db_update"));
    }, 1200);
  };

  // Handle Review submission
  const handleReviewSubmit = (e) => {
    e.preventDefault();
    const reviewData = {
      rating,
      comment: reviewComment,
      aspects: {
        quality: qualityRating,
        communication: commRating,
        delivery: delivRating,
        packaging: packRating
      }
    };
    
    const updatedDb = leaveReview(reviewOrder.id, reviewData);
    setDb(updatedDb);
    setReviewOrder(null);
    setReviewComment("");
    alert("Thank you for your feedback! Your review has been published.");
    window.dispatchEvent(new Event("db_update"));
  };

  const getVerificationIcon = (level) => {
    if (level === "Gold") return <span className="badge-verification gold"><ShieldCheck size={14} /> Gold Verified</span>;
    if (level === "Silver") return <span className="badge-verification silver"><ShieldCheck size={14} /> Silver Verified</span>;
    return <span className="badge-verification bronze"><ShieldCheck size={14} /> Phone Verified</span>;
  };

  // Framer Motion Variants
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const cardFadeIn = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } }
  };

  // Escrow Orders that need review or payment
  const myPendingOrders = activeUser ? db.orders.filter(o => o.buyerId === activeUser.id) : [];
  const unpaidOrders = myPendingOrders.filter(o => o.status === "Requested");
  const unreviewedOrders = myPendingOrders.filter(o => o.status === "Delivered");

  return (
    <div className="marketplace-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px", borderBottom: "1px solid var(--glass-border)", paddingBottom: "16px" }}>
        <div>
          <h2>Ibom Agro Marketplace</h2>
          <p style={{ color: "var(--gray-600)" }}>Connecting you to verified local farmers across Akwa Ibom State</p>
        </div>
        
        <div className="marketplace-nav-tabs">
          {[
            { id: "listings", label: "Browse Produce", icon: <ShoppingBag size={16} /> },
            { id: "farmers", label: "Farmers Directory", icon: <ShieldCheck size={16} /> },
            { id: "harvest_calendar", label: "Harvest Calendar", icon: <Calendar size={16} /> },
            ...(activeUser ? [{ id: "my_orders", label: `My Orders (${myPendingOrders.length})`, icon: <FileText size={16} /> }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              className={`marketplace-nav-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeMarketTab"
                  className="marketplace-nav-tab-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action alerts block for Buyers (unpaid or unreviewed purchases) */}
      {(unpaidOrders.length > 0 || unreviewedOrders.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {unpaidOrders.map(order => (
            <div key={order.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderColor: "var(--secondary)", background: "var(--secondary-bg)", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertCircle size={18} style={{ color: "var(--secondary)" }} />
                <span>You have an unpaid order request: <strong>{order.productName} ({order.quantity} {order.unit})</strong> from {order.farmerName}.</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setCurrentInvoice(order)}>Complete Payment</button>
            </div>
          ))}
          {unreviewedOrders.map(order => (
            <div key={order.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderColor: "var(--primary)", background: "var(--primary-bg)", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Check size={18} style={{ color: "var(--primary)" }} />
                <span>Produce delivered! Confirm receipt and release Escrow funds for <strong>{order.farmerName}</strong>.</span>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setSelectedOrderForTracking(order)}>Confirm Delivery</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "listings" && (
        <div className="marketplace-layout">
          {/* Filters Sidebar (Mobile Drawer compatible) */}
          <aside className={`filter-sidebar ${mobileFiltersOpen ? "mobile-open" : ""}`}>
            <div className="filter-sidebar-header">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--white)", fontSize: "1.1rem" }}>
                <Filter size={18} /> Filters
              </h3>
              <button 
                onClick={() => setMobileFiltersOpen(false)}
                style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="filter-group" style={{ marginTop: "12px" }}>
              <label>Search Products</label>
              <div style={{ position: "relative" }}>
                <input 
                  type="text" 
                  className="filter-input" 
                  placeholder="Cassava, Palm oil, Catfish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: "36px" }}
                />
                <Search size={16} style={{ position: "absolute", left: "12px", top: "15px", color: "var(--gray-600)" }} />
              </div>
            </div>

            <div className="filter-group">
              <label>Category</label>
              <select className="filter-input" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="All">All Categories</option>
                {Object.keys(CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Location (LGA)</label>
              <select className="filter-input" value={selectedLga} onChange={(e) => setSelectedLga(e.target.value)}>
                <option value="All">All LGAs</option>
                {AKWA_IBOM_LOCATIONS.map(loc => (
                  <option key={loc.lga} value={loc.lga}>{loc.lga}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Farmer Verification</label>
              <select className="filter-input" value={selectedVerification} onChange={(e) => setSelectedVerification(e.target.value)}>
                <option value="All">All Verified</option>
                <option value="Gold">Gold Inspection</option>
                <option value="Silver">Silver ID Verified</option>
                <option value="Bronze">Bronze Phone Verified</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Cultivation Type</label>
              <select className="filter-input" value={organicFilter} onChange={(e) => setOrganicFilter(e.target.value)}>
                <option value="All">All Produce</option>
                <option value="Organic">Organic Only</option>
                <option value="Non-Organic">Conventional</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Sort By</label>
              <select className="filter-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="Recently Added">Recently Added</option>
                <option value="Lowest Price">Lowest Price</option>
                <option value="Highest Rating">Highest Rating</option>
              </select>
            </div>
            
            <button 
              className="btn btn-outline btn-sm" 
              style={{ width: "100%", marginTop: "10px" }}
              onClick={() => {
                setSearch("");
                setSelectedCategory("All");
                setSelectedLga("All");
                setSelectedVerification("All");
                setOrganicFilter("All");
                setSortBy("Recently Added");
                setMobileFiltersOpen(false);
              }}
            >
              Reset Filters
            </button>
          </aside>

          {/* Product Grid Area */}
          <main style={{ width: "100%" }}>
            {/* Horizontal Category Pills Row */}
            <div className="category-pills-row">
              <button
                className={`category-pill ${selectedCategory === "All" ? "active" : ""}`}
                onClick={() => setSelectedCategory("All")}
              >
                <span className="category-pill-icon"><ShoppingBag size={14} /></span>
                <span>All Products</span>
              </button>
              {Object.keys(CATEGORIES).map(cat => (
                <button
                  key={cat}
                  className={`category-pill ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span className="category-pill-icon">{CATEGORY_ICONS[cat] || <ShoppingBag size={14} />}</span>
                  <span>{cat}</span>
                </button>
              ))}
            </div>

            {/* Collapsible LGA Radar Map Filter */}
            <div className="card radar-map-card" style={{ marginBottom: "24px", padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setMapVisible(!mapVisible)}>
                <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", color: "white", fontSize: "0.9rem" }}>
                  <MapPin size={16} style={{ color: "var(--primary)" }} /> Filter by Akwa Ibom LGA Radar Map
                </span>
                <span style={{ color: "var(--primary)", fontSize: "0.8rem", fontWeight: "bold" }}>
                  {mapVisible ? "Hide Radar Map" : "Show Radar Map"}
                </span>
              </div>

              <AnimatePresence>
                {mapVisible && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: "14px", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center" }}
                  >
                    <div style={{ width: "100%", maxWidth: "340px", padding: "8px", background: "rgba(0,0,0,0.3)", borderRadius: "12px", border: "1px solid var(--glass-border)", position: "relative" }}>
                      <svg viewBox="0 0 400 300" width="100%" height="auto" className="lga-map-svg">
                        <defs>
                          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                          </radialGradient>
                          <linearGradient id="radarSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                          </linearGradient>
                        </defs>

                        {/* Radar Background Glow */}
                        <circle cx="200" cy="130" r="120" fill="url(#radarGlow)" />

                        {/* Concentric Radar Rings */}
                        <circle cx="200" cy="130" r="40" className="lga-radar-ring" strokeDasharray="3,6" />
                        <circle cx="200" cy="130" r="80" className="lga-radar-ring" strokeDasharray="4,8" />
                        <circle cx="200" cy="130" r="120" className="lga-radar-ring" />
                        <circle cx="200" cy="130" r="160" className="lga-radar-ring" strokeDasharray="5,10" />

                        {/* Radar Grid Crosshairs */}
                        <line x1="40" y1="130" x2="360" y2="130" className="lga-radar-grid" strokeDasharray="4,4" />
                        <line x1="200" y1="10" x2="200" y2="250" className="lga-radar-grid" strokeDasharray="4,4" />

                        {/* Rotating Radar Sweep Line */}
                        <line x1="200" y1="130" x2="200" y2="10" className="lga-radar-sweep" />

                        {/* Connections from center (Uyo) */}
                        {[
                          { name: "Ini", x: 200, y: 35 },
                          { name: "Ikot Ekpene", x: 110, y: 80 },
                          { name: "Itu", x: 210, y: 85 },
                          { name: "Abak", x: 110, y: 140 },
                          { name: "Mkpat Enin", x: 100, y: 210 },
                          { name: "Eket", x: 200, y: 230 },
                          { name: "Oron", x: 290, y: 190 }
                        ].map((l, idx) => (
                          <line
                            key={idx}
                            x1={l.x}
                            y1={l.y}
                            x2={200}
                            y2={130}
                            stroke={selectedLga === l.name ? "var(--primary-light)" : "rgba(16, 185, 129, 0.15)"}
                            strokeWidth={selectedLga === l.name ? 1.5 : 1}
                            strokeDasharray="4,4"
                          />
                        ))}

                        {/* LGA Nodes */}
                        {[
                          { name: "Ini", color: "#10b981", x: 200, y: 35 },
                          { name: "Ikot Ekpene", color: "#f59e0b", x: 110, y: 80 },
                          { name: "Itu", color: "#10b981", x: 210, y: 85 },
                          { name: "Uyo", color: "#0ea5e9", x: 200, y: 130 },
                          { name: "Abak", color: "#f59e0b", x: 110, y: 140 },
                          { name: "Mkpat Enin", color: "#10b981", x: 100, y: 210 },
                          { name: "Eket", color: "#0ea5e9", x: 200, y: 230 },
                          { name: "Oron", color: "#f59e0b", x: 290, y: 190 }
                        ].map((item) => {
                          const isSelected = selectedLga === item.name;
                          return (
                            <g
                              key={item.name}
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                setSelectedLga(selectedLga === item.name ? "All" : item.name);
                              }}
                            >
                              {/* Pulsing ring under selected marker */}
                              {isSelected && (
                                <circle
                                  cx={item.x}
                                  cy={item.y}
                                  r={18}
                                  fill="none"
                                  stroke="var(--primary)"
                                  className="lga-marker-pulse"
                                />
                              )}
                              {/* Main Circle Marker */}
                              <circle
                                cx={item.x}
                                cy={item.y}
                                r={isSelected ? 10 : 7}
                                fill={isSelected ? "var(--primary)" : "rgba(10, 22, 15, 0.9)"}
                                stroke={isSelected ? "#fff" : item.color}
                                strokeWidth="2"
                                style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
                              />
                              <text
                                x={item.x}
                                y={item.y - 12}
                                textAnchor="middle"
                                fill={isSelected ? "#fff" : "var(--gray-600)"}
                                fontSize="9"
                                fontWeight={isSelected ? "800" : "600"}
                                style={{
                                  textShadow: isSelected ? "0 0 8px rgba(16, 185, 129, 0.6)" : "none",
                                  transition: "all 0.3s"
                                }}
                              >
                                {item.name}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                    {selectedLga !== "All" && (
                      <button 
                        className="btn btn-outline btn-sm" 
                        style={{ marginTop: "12px", padding: "4px 12px" }}
                        onClick={() => setSelectedLga("All")}
                      >
                        Reset Map Filter
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--gray-600)" }}>
                Showing <strong>{sortedProducts.length}</strong> available products
              </span>
              <button onClick={refreshState} className="icon-badge-btn" title="Refresh Listings">
                <RefreshCw size={16} />
              </button>
            </div>

            {sortedProducts.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                <AlertCircle size={48} style={{ color: "var(--gray-600)", marginBottom: "12px" }} />
                <h3>No Products Found</h3>
                <p style={{ color: "var(--gray-600)", marginTop: "4px" }}>Try broadening your search or resetting filters.</p>
              </div>
            ) : (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="product-grid horizontal-scrollable"
              >
                {sortedProducts.map(product => {
                  const farmer = getFarmerDetails(product.farmerId);
                  
                  // Calculate dynamic badges
                  let badge = null;
                  if (product.quantity < 10) {
                    badge = <span className="product-card-badge last-units">Low Stock ({product.quantity})</span>;
                  } else if (product.organic) {
                    badge = <span className="product-card-badge fresh">Organic Fresh</span>;
                  } else {
                    badge = <span className="product-card-badge limited">Direct Farm</span>;
                  }

                  return (
                    <motion.div 
                      key={product.id} 
                      variants={cardFadeIn}
                      className="product-card"
                      whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    >
                      <div className="product-img-wrapper">
                        <img src={product.image} alt={product.name} className="product-img" />
                        {badge}
                        <div className="product-farmer-badge">
                          <img 
                            src={farmer.avatar} 
                            alt={farmer.name} 
                            className="avatar-small" 
                            style={{ border: "2px solid var(--white)", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", cursor: "pointer" }} 
                            onClick={() => setSelectedFarmer(farmer)}
                            title={`View profile of ${farmer.name}`}
                          />
                        </div>
                      </div>
                      
                      <div className="product-details">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span className="product-cat">{product.category}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: "600" }}>📍 {product.lga}</span>
                        </div>
                        <h4 className="product-name">{product.name}</h4>
                        
                        <div className="product-meta">
                          <span style={{ cursor: "pointer" }} onClick={() => setSelectedFarmer(farmer)}>
                            Farmer: <strong style={{ color: "white" }}>{farmer.name}</strong>
                          </span>
                          <span className="product-rating-compact" style={{ cursor: "pointer" }} onClick={() => setSelectedFarmer(farmer)}>
                            <Star size={12} fill="currentColor" /> {farmer.rating || "5.0"} ({farmer.reviewsCount || 0})
                          </span>
                        </div>

                        <p style={{ fontSize: "0.82rem", color: "var(--gray-600)", marginBottom: "16px", flex: 1, lineHeight: 1.45 }}>
                          {product.description.length > 80 ? product.description.substring(0, 85) + "..." : product.description}
                        </p>

                        <div className="product-price-row">
                          <div className="product-price">
                            ₦{product.price.toLocaleString()} <span style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>/ {product.unit}</span>
                          </div>
                          <button 
                            className="btn btn-primary btn-sm"
                            style={{ padding: "8px 16px", borderRadius: "20px", fontWeight: "800" }}
                            onClick={() => {
                              if (!activeUser) {
                                onSwitchView("auth");
                                return;
                              }
                              setSelectedProduct(product);
                              setOrderQty(product.minOrder);
                            }}
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </main>
        </div>
      )}

      {activeTab === "farmers" && (
        <div>
          <h3 style={{ marginBottom: "16px" }}>Farmers Directory</h3>
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="product-grid"
          >
            {db.users.filter(u => u.role === "Farmer").map(farmer => (
              <motion.div 
                key={farmer.id} 
                variants={cardFadeIn}
                className="card" 
                style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", textAlign: "center" }}
              >
                <img 
                  src={farmer.avatar} 
                  alt={farmer.name} 
                  style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary)" }} 
                />
                <div>
                  <h4 style={{ margin: "4px 0" }}>{farmer.name}</h4>
                  <p style={{ fontSize: "0.85rem", fontStyle: "italic", color: "var(--gray-600)" }}>{farmer.farmName}</p>
                </div>
                
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", margin: "4px 0" }}>
                  {getVerificationIcon(farmer.verification)}
                  <span style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px", color: "var(--white)", background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--glass-border)", padding: "2px 8px", borderRadius: "10px" }}>
                    <Star size={12} fill="var(--secondary)" color="var(--secondary)" /> {farmer.rating} ({farmer.reviewsCount})
                  </span>
                </div>

                <p style={{ fontSize: "0.8rem", color: "var(--gray-800)" }}>
                  📍 {farmer.town}, {farmer.lga} LGA | {farmer.yearsFarming} Yrs Farming
                </p>

                <p style={{ fontSize: "0.8rem", color: "var(--gray-600)", flex: 1, lineHeight: 1.4 }}>
                  {farmer.bio}
                </p>
                
                <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "12px" }}>
                  <button 
                    className="btn btn-outline btn-sm" 
                    style={{ flex: 1 }}
                    onClick={() => {
                      if (!activeUser) {
                        onSwitchView("auth");
                        return;
                      }
                      onOpenChat(farmer.id);
                    }}
                  >
                    <MessageSquare size={14} /> Chat
                  </button>
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ flex: 1 }}
                    onClick={() => setSelectedFarmer(farmer)}
                  >
                    View Farm
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {activeTab === "harvest_calendar" && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="card"
        >
          <h3 style={{ marginBottom: "8px" }}><Calendar size={18} style={{ verticalAlign: "middle", marginRight: "6px" }} /> Upcoming Harvests & Pre-Orders</h3>
          <p style={{ color: "var(--gray-600)", marginBottom: "20px" }}>
            See expected harvest windows from farmers. Pre-ordering ensures you lock in prices and get fresh deliveries first.
          </p>

          <div style={{ overflowX: "auto" }}>
            <table className="prices-table">
              <thead>
                <tr>
                  <th>Farmer Name</th>
                  <th>Product</th>
                  <th>Expected Harvest Month</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {db.users.filter(u => u.role === "Farmer").flatMap(farmer => 
                  (farmer.harvestCalendar || []).map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <img src={farmer.avatar} alt={farmer.name} className="avatar-small" style={{ width: "32px", height: "32px" }} />
                          <div>
                            <strong style={{ color: "white" }}>{farmer.name}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>{farmer.lga} LGA</div>
                          </div>
                        </div>
                      </td>
                      <td><strong style={{ color: "var(--primary)" }}>{item.product}</strong></td>
                      <td>{item.month} 2026</td>
                      <td>
                        <span style={{ 
                          fontSize: "0.75rem", 
                          padding: "4px 10px", 
                          borderRadius: "10px",
                          fontWeight: "bold",
                          backgroundColor: item.status === "Harvesting" ? "var(--secondary-bg)" : "rgba(16, 185, 129, 0.1)",
                          color: item.status === "Harvesting" ? "var(--secondary)" : "var(--primary)",
                          border: `1px solid ${item.status === "Harvesting" ? "var(--secondary)" : "var(--primary)"}`
                        }}>
                          {item.status}
                        </span>
                      </td>
                      <td><span style={{ fontSize: "0.85rem", color: "var(--gray-800)" }}>{item.description}</span></td>
                      <td>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            if (!activeUser) {
                              onSwitchView("auth");
                              return;
                            }
                            onOpenChat(farmer.id);
                          }}
                        >
                          Book / Pre-Order
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === "my_orders" && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="card"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3>My Escrow Purchases</h3>
            <button onClick={refreshState} className="icon-badge-btn"><RefreshCw size={16} /></button>
          </div>
          <p style={{ color: "var(--gray-600)", marginBottom: "20px" }}>
            Monitor your realtime payments, transit shipments, and confirm delivery releases from the sterling escrow vaults.
          </p>

          {myPendingOrders.length === 0 ? (
            <p style={{ textAlign: "center", padding: "30px", color: "var(--gray-600)", fontStyle: "italic" }}>
              You have not placed any orders yet. Explore our fresh listings to start trading!
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {myPendingOrders.map(order => (
                <div key={order.id} className="card" style={{ borderLeft: "4px solid var(--primary)", padding: "18px", background: "rgba(255,255,255,0.01)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)", paddingBottom: "10px", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <strong style={{ color: "white" }}>Order #{order.id}</strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--gray-600)", marginLeft: "12px" }}>Placed on: {order.date}</span>
                    </div>
                    <span style={{ 
                      fontSize: "0.75rem", 
                      padding: "3px 10px", 
                      borderRadius: "10px", 
                      fontWeight: "bold",
                      backgroundColor: order.status === "Requested" ? "var(--secondary-bg)" : "rgba(16, 185, 129, 0.1)",
                      color: order.status === "Requested" ? "var(--secondary)" : "var(--primary)",
                      border: `1px solid ${order.status === "Requested" ? "var(--secondary)" : "var(--primary)"}`
                    }}>
                      {order.status}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "14px" }}>
                    <div>
                      <small style={{ color: "var(--gray-600)" }}>Produce Details</small>
                      <div style={{ fontWeight: "700", color: "white", marginTop: "2px" }}>{order.productName}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>Qty: {order.quantity} | Unit: {order.price.toLocaleString()} ₦</div>
                    </div>
                    <div>
                      <small style={{ color: "var(--gray-600)" }}>Total Amount</small>
                      <div style={{ fontWeight: "700", color: "var(--secondary-light)", marginTop: "2px" }}>₦{order.totalAmount.toLocaleString()}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>Sterling Escrow Vault Secured</div>
                    </div>
                    <div>
                      <small style={{ color: "var(--gray-600)" }}>Farmer Info</small>
                      <div style={{ fontWeight: "700", color: "white", marginTop: "2px" }}>{order.farmerName}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>Phone: {order.buyerPhone}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => setSelectedOrderForTracking(order)}
                    >
                      <Truck size={14} style={{ marginRight: "4px" }} /> Track Order
                    </button>

                    {(order.status === "Requested" || order.status === "Accepted") && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCurrentInvoice(order)}
                      >
                        <CreditCard size={14} style={{ marginRight: "4px" }} /> Pay Now
                      </button>
                    )}

                    {order.status === "Delivered" && (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => setSelectedOrderForTracking(order)}
                      >
                        Confirm Receipt & Release Escrow
                      </button>
                    )}

                    {order.status === "Completed" && (
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setReviewOrder(order);
                          setActiveTab("listings");
                        }}
                      >
                        Rate & Review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Floating Filter Button for Mobile Screen */}
      {activeTab === "listings" && (
        <button 
          className="mobile-filters-trigger"
          onClick={() => setMobileFiltersOpen(true)}
        >
          <Filter size={16} /> Filter
        </button>
      )}

      {/* Marketplace Modals using AnimatePresence */}
      <AnimatePresence>
        {/* Product Details & Purchase Modal */}
        {selectedProduct && (
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
                <h3>Buy {selectedProduct.name}</h3>
                <button onClick={() => setSelectedProduct(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "white" }}><X size={20} /></button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", marginBottom: "20px" }}>
                <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "12px" }} />
                <div>
                  <span className="product-cat">{selectedProduct.category}</span>
                  <h4 style={{ fontSize: "1.5rem", margin: "4px 0" }}>{selectedProduct.name}</h4>
                  <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--secondary)", margin: "4px 0" }}>
                    ₦{selectedProduct.price.toLocaleString()} <span style={{ fontSize: "0.85rem", color: "var(--gray-600)", fontWeight: "normal" }}>/ {selectedProduct.unit}</span>
                  </div>
                  <p style={{ fontSize: "0.9rem", color: "var(--gray-800)" }}>
                    📍 Pickup Location: <strong>{selectedProduct.town}, {selectedProduct.lga} LGA</strong>
                  </p>
                </div>
              </div>

              <p style={{ fontSize: "0.9rem", color: "var(--gray-800)", marginBottom: "20px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--glass-border)", padding: "14px", borderRadius: "8px", lineHeight: 1.5 }}>
                {selectedProduct.description}
              </p>

              <div className="card" style={{ marginBottom: "20px", padding: "16px", border: "1px dashed rgba(16, 185, 129, 0.3)", backgroundColor: "var(--primary-bg)" }}>
                <h5 style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px" }}><ShieldCheck size={16} /> Farmer Details</h5>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "10px" }}>
                  <img src={getFarmerDetails(selectedProduct.farmerId).avatar} alt="" className="avatar-small" />
                  <div>
                    <strong style={{ color: "white" }}>{getFarmerDetails(selectedProduct.farmerId).name}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--gray-800)" }}>
                      Rating: {getFarmerDetails(selectedProduct.farmerId).rating} ★ | {getFarmerDetails(selectedProduct.farmerId).yearsFarming} Yrs farming
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-field" style={{ marginBottom: "20px" }}>
                <label>Select Quantity (Units: {selectedProduct.unit})</label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <input 
                    type="number" 
                    min={selectedProduct.minOrder} 
                    max={selectedProduct.quantity}
                    value={orderQty}
                    onChange={(e) => setOrderQty(parseInt(e.target.value) || selectedProduct.minOrder)}
                    style={{ width: "100px", padding: "10px", fontSize: "1.1rem", textAlign: "center" }}
                  />
                  <span style={{ fontSize: "0.9rem", color: "var(--gray-600)" }}>
                    (Min: {selectedProduct.minOrder} | Available: {selectedProduct.quantity} {selectedProduct.unit}s)
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3rem", fontWeight: "bold", borderTop: "1px solid var(--glass-border)", paddingTop: "16px", marginBottom: "20px" }}>
                <span>Total Price:</span>
                <span style={{ color: "var(--secondary)" }}>₦{(selectedProduct.price * orderQty).toLocaleString()}</span>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedProduct(null)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 2 }}
                  onClick={() => handlePlaceOrder(selectedProduct)}
                >
                  Submit Order Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Invoice & Escrow Payment Form Modal (Paystack-Style Gateway) */}
        {currentInvoice && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-content" 
              style={{ maxWidth: "500px", position: "relative" }}
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
            >
              {/* Payment Processing Spinner Overlay */}
              {paymentProcessing && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(10, 22, 15, 0.9)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: "16px" }}>
                  <span className="spinner" style={{ width: "40px", height: "40px", marginBottom: "16px" }}></span>
                  <strong style={{ color: "white" }}>Contacting Sterling Bank Gateway...</strong>
                  <p style={{ color: "var(--gray-600)", fontSize: "0.8rem", marginTop: "4px" }}>Securing funds in Ibom Escrow vault</p>
                </div>
              )}

              {paymentSuccess ? (
                /* Payment Success View */
                <div className="success-checkmark-wrapper">
                  <div className="checkmark-circle">
                    <CheckCircle2 size={44} className="checkmark-icon" />
                  </div>
                  <h3 style={{ marginTop: "24px", color: "white", fontSize: "1.4rem" }}>Payment Secured!</h3>
                  <p style={{ color: "var(--gray-600)", fontSize: "0.88rem", textAlign: "center", marginTop: "8px", lineHeight: 1.5 }}>
                    ₦{currentInvoice.totalAmount.toLocaleString()} is now locked in Sterling Bank Cooperative Escrow. The farmer has been notified and is preparing your produce.
                  </p>
                  <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "28px" }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ flex: 1 }}
                      onClick={() => {
                        setPaymentSuccess(false);
                        setCurrentInvoice(null);
                      }}
                    >
                      Close Window
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1.5 }}
                      onClick={() => {
                        setPaymentSuccess(false);
                        const trackingOrder = currentInvoice;
                        setCurrentInvoice(null);
                        setSelectedOrderForTracking(trackingOrder);
                        setActiveTab("my_orders");
                      }}
                    >
                      Track Order Request
                    </button>
                  </div>
                </div>
              ) : (
                /* Payment Form View */
                <>
                  <div className="modal-header">
                    <h3>Invoice & Escrow Payment</h3>
                    <button onClick={() => setCurrentInvoice(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "white" }}><X size={20} /></button>
                  </div>

                  <p style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginBottom: "16px" }}>
                    Order request has been approved by the farmer. Choose a payment method to lock the funds in Escrow.
                  </p>

                  {/* Invoice Summary Box */}
                  <div className="invoice-box" style={{ background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "10px", border: "1px solid var(--glass-border)", marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.85rem" }}>
                      <span>Order ID:</span>
                      <strong style={{ color: "white" }}>{currentInvoice.id}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.85rem" }}>
                      <span>Product Name:</span>
                      <span style={{ color: "white" }}>{currentInvoice.productName} ({currentInvoice.quantity} Units)</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.85rem" }}>
                      <span>Farmer:</span>
                      <span style={{ color: "white" }}>{currentInvoice.farmerName}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--glass-border)", paddingTop: "8px", marginTop: "8px", fontWeight: "bold", fontSize: "1.1rem", color: "var(--secondary-light)" }}>
                      <span>Amount Due:</span>
                      <span>₦{currentInvoice.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Gateway Tabs */}
                  <div style={{ display: "flex", borderBottom: "1px solid var(--glass-border)", marginBottom: "20px" }}>
                    <button 
                      onClick={() => setPaymentMethod("card")}
                      style={{ 
                        flex: 1, 
                        padding: "10px", 
                        background: "none", 
                        border: "none", 
                        color: paymentMethod === "card" ? "var(--primary)" : "var(--gray-600)", 
                        borderBottom: paymentMethod === "card" ? "2px solid var(--primary)" : "none",
                        fontWeight: "bold",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                    >
                      <CreditCard size={16} /> Pay via Card
                    </button>
                    <button 
                      onClick={() => setPaymentMethod("transfer")}
                      style={{ 
                        flex: 1, 
                        padding: "10px", 
                        background: "none", 
                        border: "none", 
                        color: paymentMethod === "transfer" ? "var(--primary)" : "var(--gray-600)", 
                        borderBottom: paymentMethod === "transfer" ? "2px solid var(--primary)" : "none",
                        fontWeight: "bold",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                    >
                      <FileText size={16} /> Bank Transfer
                    </button>
                  </div>

                  {/* Live Credit Card Mockup */}
                  {paymentMethod === "card" && (
                    <div className="credit-card-container">
                      <div className="credit-card-preview">
                        <div className="credit-card-top">
                          <span className="credit-card-logo">IBOM ESCROW CARD</span>
                          <div className="credit-card-chip"></div>
                        </div>
                        <div className="credit-card-mid">
                          <div className="credit-card-number">
                            {cardNumber || "•••• •••• •••• ••••"}
                          </div>
                        </div>
                        <div className="credit-card-bottom">
                          <div>
                            <div className="credit-card-label">Card Holder</div>
                            <div className="credit-card-val" style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {cardName || "YOUR FULL NAME"}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "16px" }}>
                            <div>
                              <div className="credit-card-label">Expires</div>
                              <div className="credit-card-val">{cardExpiry || "MM/YY"}</div>
                            </div>
                            <div>
                              <div className="credit-card-label">CVV</div>
                              <div className="credit-card-val">{cardCvc ? "•••" : "000"}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handlePaymentSubmit}>
                    {paymentMethod === "card" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                        <div className="form-grid" style={{ gridTemplateColumns: "1.2fr 0.8fr", gap: "10px", marginBottom: 0 }}>
                          <div className="form-field">
                            <label>Card Number *</label>
                            <input 
                              type="text" 
                              placeholder="4242 •••• •••• 4242" 
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim().substring(0, 19))}
                              required 
                            />
                          </div>
                          <div className="form-field">
                            <label>Cardholder Name *</label>
                            <input 
                              type="text" 
                              placeholder="E.g. Chef Bassey" 
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              required 
                            />
                          </div>
                        </div>
                        <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: 0 }}>
                          <div className="form-field">
                            <label>Expiry Date *</label>
                            <input 
                              type="text" 
                              placeholder="MM/YY" 
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value.substring(0, 5))}
                              required 
                            />
                          </div>
                          <div className="form-field">
                            <label>CVV *</label>
                            <input 
                              type="password" 
                              placeholder="•••" 
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value.substring(0, 3))}
                              required 
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "10px", border: "1px solid var(--glass-border)", marginBottom: "20px" }}>
                        <small style={{ color: "var(--gray-600)", textTransform: "uppercase", fontSize: "0.7rem", fontWeight: "bold" }}>Escrow virtual Account details</small>
                        <div style={{ marginTop: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.85rem" }}>
                            <span style={{ color: "var(--gray-600)" }}>Bank Name:</span>
                            <strong style={{ color: "white" }}>Sterling Bank (Ibom Escrow)</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.85rem" }}>
                            <span style={{ color: "var(--gray-600)" }}>Account Name:</span>
                            <strong style={{ color: "white" }}>Ibom Agro Market Escrow Ltd</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: "8px", marginTop: "8px" }}>
                            <span style={{ color: "var(--gray-600)", fontSize: "0.85rem" }}>Account Number:</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <strong style={{ color: "var(--primary)", fontSize: "1.15rem" }}>9032840293</strong>
                              <button 
                                type="button"
                                className="icon-badge-btn" 
                                style={{ padding: "5px", borderRadius: "6px" }}
                                onClick={() => {
                                  navigator.clipboard.writeText("9032840293");
                                  alert("Account Number Copied!");
                                }}
                                title="Copy Account Number"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--gray-600)", marginTop: "12px", lineHeight: 1.4 }}>
                          ⚠️ Funds transferred here are securely held in cooperative escrow and are released to the farmer only when you confirm receipt of fresh produce.
                        </p>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "12px" }}>
                      <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setCurrentInvoice(null)}>Cancel</button>
                      <button type="submit" className="btn btn-secondary" style={{ flex: 2 }}>
                        {paymentMethod === "card" ? `Pay ₦${currentInvoice.totalAmount.toLocaleString()}` : "Confirm Bank Transfer"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Realtime Order Progress Tracker Modal */}
        {selectedOrderForTracking && (() => {
          const ORDER_STATUS_STEPS = [
            { status: "Requested", label: "Order Submitted", desc: "Farmer received purchase invoice request", icon: <FileText size={14} /> },
            { status: "Paid", label: "Escrow Secured", desc: "Funds locked in Sterling Cooperative Escrow", icon: <CreditCard size={14} /> },
            { status: "Assigned", label: "Carrier Assigned", desc: "Logistics courier partner accepted shipment", icon: <User size={14} /> },
            { status: "Picked Up", label: "Picked Up", desc: "Cargo claimed and loaded by carrier", icon: <Package size={14} /> },
            { status: "En Route", label: "En Route", desc: "Courier is transporting cargo to destination", icon: <Truck size={14} /> },
            { status: "Delivered", label: "Delivered", desc: "Produce arrived at dropsite. Awaiting release", icon: <MapPin size={14} /> },
            { status: "Completed", label: "Escrow Released", desc: "Escrow funds disbursed to farmer. Completed!", icon: <CheckCircle2 size={14} /> }
          ];

          const getStepIndex = (status) => {
            if (status === "Reviewed") return 6;
            return ORDER_STATUS_STEPS.findIndex(step => step.status === status);
          };

          const currentIdx = getStepIndex(selectedOrderForTracking.status);
          const progressHeight = `${(currentIdx / (ORDER_STATUS_STEPS.length - 1)) * 100}%`;

          return (
            <motion.div 
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="modal-content" 
                style={{ maxWidth: "550px" }}
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
              >
                <div className="modal-header">
                  <h3>Escrow Order Tracking</h3>
                  <button onClick={() => setSelectedOrderForTracking(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "white" }}><X size={20} /></button>
                </div>

                <div className="invoice-box" style={{ background: "rgba(0,0,0,0.15)", border: "1px solid var(--glass-border)", padding: "14px", borderRadius: "10px", marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span>Order ID:</span>
                    <strong style={{ color: "white" }}>#{selectedOrderForTracking.id}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span>Item:</span>
                    <span style={{ color: "white" }}>{selectedOrderForTracking.productName} ({selectedOrderForTracking.quantity} Units)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span>Escrow Amount:</span>
                    <strong style={{ color: "var(--secondary-light)" }}>₦{selectedOrderForTracking.totalAmount.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Carrier Partner:</span>
                    <span style={{ color: "white" }}>{selectedOrderForTracking.deliveryPartnerName || "Assigning Carrier..."}</span>
                  </div>
                </div>

                {/* Realtime Stepper Timeline */}
                <div className="timeline-stepper">
                  <div 
                    className="timeline-stepper-progress" 
                    style={{ height: progressHeight }} 
                  />
                  
                  {ORDER_STATUS_STEPS.map((step, idx) => {
                    const isCompleted = idx < currentIdx;
                    const isActive = idx === currentIdx;
                    
                    let stepClass = "timeline-step";
                    if (isActive) stepClass += " active";
                    else if (isCompleted) stepClass += " completed";
                    else stepClass += " pending";
                    
                    return (
                      <div key={idx} className={stepClass}>
                        <div className="timeline-node">
                          {isActive ? (
                            <div style={{ color: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {step.icon}
                            </div>
                          ) : isCompleted ? (
                            <div style={{ color: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Check size={12} />
                            </div>
                          ) : (
                            <div style={{ color: "var(--gray-600)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {step.icon}
                            </div>
                          )}
                        </div>
                        <div className="timeline-content">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong style={{ color: isActive ? "white" : isCompleted ? "var(--gray-800)" : "var(--gray-600)", fontSize: "0.95rem" }}>
                              {step.label}
                            </strong>
                            {isActive && (
                              <span style={{ fontSize: "0.7rem", background: "rgba(16, 185, 129, 0.15)", color: "var(--primary-light)", padding: "2px 8px", borderRadius: "10px", fontWeight: "bold" }}>
                                Current
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: "0.78rem", color: "var(--gray-600)", marginTop: "4px", display: "block" }}>
                            {step.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedOrderForTracking(null)}>Close</button>
                  {selectedOrderForTracking.status === "Delivered" && (
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 2 }}
                      onClick={() => handleConfirmReceipt(selectedOrderForTracking.id)}
                    >
                      Confirm Handover & Release Escrow
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}

        {/* Farmer Detailed View Modal */}
        {selectedFarmer && (
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
                <h3>{selectedFarmer.farmName}</h3>
                <button onClick={() => setSelectedFarmer(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "white" }}><X size={20} /></button>
              </div>

              <div style={{ position: "relative", marginBottom: "24px" }}>
                <img src={selectedFarmer.banner} alt="" style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "12px", border: "1px solid var(--glass-border)" }} />
                <img 
                  src={selectedFarmer.avatar} 
                  alt="" 
                  style={{ 
                    width: "75px", 
                    height: "75px", 
                    borderRadius: "50%", 
                    objectFit: "cover", 
                    position: "absolute", 
                    bottom: "-30px", 
                    left: "20px",
                    border: "3px solid var(--dark-light)",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.4)"
                  }} 
                />
              </div>

              <div style={{ paddingLeft: "105px", minHeight: "36px", marginBottom: "24px" }}>
                <h4 style={{ margin: 0, fontSize: "1.35rem" }}>{selectedFarmer.name}</h4>
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "6px" }}>
                  {getVerificationIcon(selectedFarmer.verification)}
                  <span style={{ fontSize: "0.8rem", color: "var(--gray-600)", background: "rgba(255,255,255,0.03)", padding: "2px 8px", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
                    {selectedFarmer.followers} Followers
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <small style={{ color: "var(--gray-600)", fontWeight: "600" }}>Years of Farming</small>
                  <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--primary-light)" }}>{selectedFarmer.yearsFarming} Years</div>
                </div>
                <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <small style={{ color: "var(--gray-600)", fontWeight: "600" }}>LGA / Location</small>
                  <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--primary-light)" }}>{selectedFarmer.town}, {selectedFarmer.lga}</div>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h5 style={{ marginBottom: "6px", fontSize: "0.95rem", color: "white" }}>Farmer Bio</h5>
                <p style={{ fontSize: "0.88rem", color: "var(--gray-800)", lineHeight: 1.55 }}>{selectedFarmer.bio}</p>
              </div>

              {selectedFarmer.harvestCalendar && selectedFarmer.harvestCalendar.length > 0 && (
                <div style={{ marginBottom: "28px" }}>
                  <h5 style={{ marginBottom: "10px", fontSize: "0.95rem", color: "white" }}>Harvest Calendar Milestones</h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedFarmer.harvestCalendar.map(cal => (
                      <div key={cal.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)", borderRadius: "10px", fontSize: "0.85rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Sprout size={14} style={{ color: "var(--primary-light)" }} />
                          <span><strong style={{ color: "white" }}>{cal.product}</strong> ({cal.month})</span>
                        </div>
                        <span style={{ 
                          fontSize: "0.75rem", 
                          padding: "3px 10px", 
                          borderRadius: "20px", 
                          fontWeight: "bold",
                          backgroundColor: cal.status === "Harvesting" ? "var(--secondary-bg)" : "rgba(16, 185, 129, 0.1)",
                          color: cal.status === "Harvesting" ? "var(--secondary)" : "var(--primary)",
                          border: `1px solid ${cal.status === "Harvesting" ? "var(--secondary)" : "var(--primary)"}`
                        }}>
                          {cal.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedFarmer(null)}>Close</button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1.5 }} 
                  onClick={() => {
                    onOpenChat(selectedFarmer.id);
                    setSelectedFarmer(null);
                  }}
                >
                  Start Private Chat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Review Modal Form */}
        {reviewOrder && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-content" 
              style={{ maxWidth: "500px" }}
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
            >
              <div className="modal-header">
                <h3>Rate Order Delivery</h3>
                <button onClick={() => setReviewOrder(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "white" }}><X size={20} /></button>
              </div>

              <form onSubmit={handleReviewSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>
                  Submit a rating and review for order <strong>{reviewOrder.id}</strong> (from {reviewOrder.farmerName}).
                </p>

                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: "bold", color: "white" }}>Average Rating</label>
                  <div style={{ display: "flex", gap: "12px", margin: "8px 0" }}>
                    {[1, 2, 3, 4, 5].map(val => (
                      <motion.div
                        key={val}
                        whileHover={{ scale: 1.25 }}
                        whileTap={{ scale: 0.9 }}
                        style={{ display: "inline-block" }}
                      >
                        <Star 
                          size={28} 
                          onClick={() => setRating(val)}
                          style={{ 
                            cursor: "pointer", 
                            color: val <= rating ? "var(--warning)" : "rgba(255,255,255,0.15)",
                            filter: val <= rating ? "drop-shadow(0 0 6px rgba(245, 158, 11, 0.5))" : "none",
                            transition: "all 0.15s ease"
                          }}
                          fill={val <= rating ? "var(--warning)" : "none"}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-field">
                    <label>Product Quality</label>
                    <select value={qualityRating} onChange={(e) => setQualityRating(parseInt(e.target.value))}>
                      {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} Stars</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Communication</label>
                    <select value={commRating} onChange={(e) => setCommRating(parseInt(e.target.value))}>
                      {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} Stars</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Delivery Timeliness</label>
                    <select value={delivRating} onChange={(e) => setDelivRating(parseInt(e.target.value))}>
                      {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} Stars</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Packaging</label>
                    <select value={packRating} onChange={(e) => setPackRating(parseInt(e.target.value))}>
                      {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} Stars</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Review Comment</label>
                  <textarea 
                    rows={3} 
                    placeholder="Share your experience with this transaction..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setReviewOrder(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Submit Review</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {paymentProcessing && (
        <Loader3D fullScreen={true} message="Processing escrow payment gateway..." />
      )}
      {actionLoading && (
        <Loader3D fullScreen={true} message={loadingMessage} />
      )}
    </div>
  );
}
