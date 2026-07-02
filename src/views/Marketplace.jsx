import React, { useState, useEffect } from "react";
import { Search, Filter, ShieldCheck, Heart, ShoppingBag, Calendar, Check, Send, AlertCircle, RefreshCw, X, MessageSquare, Star, FileText, CreditCard, Truck, MapPin } from "lucide-react";
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
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState(null);
  
  // Review form states
  const [reviewOrder, setReviewOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [qualityRating, setQualityRating] = useState(5);
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
    
    const { db: updatedDb, orderId } = placeOrder(product.id, orderQty);
    setDb(updatedDb);
    
    const placedOrder = updatedDb.orders.find(o => o.id === orderId);
    setCurrentInvoice(placedOrder);
    setSelectedProduct(null);
    window.dispatchEvent(new Event("db_update"));
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
      setCurrentInvoice(null);
      
      // Reset input fields
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");
      
      alert(`Payment Successful! ₦${currentInvoice.totalAmount.toLocaleString()} has been locked in Akwa Ibom Escrow. The farmer has been notified.`);
      window.dispatchEvent(new Event("db_update"));
    }, 1500);
  };

  const handleConfirmReceipt = (orderId) => {
    const confirmRelease = window.confirm("Are you sure you want to release the Escrow funds to the farmer? This indicates you have received the fresh produce in perfect condition.");
    if (!confirmRelease) return;

    const updatedDb = updateOrderStatus(orderId, "Completed");
    setDb(updatedDb);
    setSelectedOrderForTracking(null);
    alert("Escrow funds successfully disbursed to the farmer's wallet account!");
    
    // Prompt to review
    const orderObj = updatedDb.orders.find(o => o.id === orderId);
    if (orderObj) {
      setReviewOrder(orderObj);
      setActiveTab("listings");
    }
    window.dispatchEvent(new Event("db_update"));
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2>Ibom Agro Marketplace</h2>
          <p style={{ color: "var(--gray-600)" }}>Connecting you to verified local farmers across Akwa Ibom State</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button 
            className={`btn btn-sm ${activeTab === "listings" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("listings")}
          >
            <ShoppingBag size={16} /> Browse Produce
          </button>
          <button 
            className={`btn btn-sm ${activeTab === "farmers" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("farmers")}
          >
            <ShieldCheck size={16} /> Farmers Directory
          </button>
          <button 
            className={`btn btn-sm ${activeTab === "harvest_calendar" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setActiveTab("harvest_calendar")}
          >
            <Calendar size={16} /> Harvest Calendar
          </button>
          {activeUser && (
            <button 
              className={`btn btn-sm ${activeTab === "my_orders" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setActiveTab("my_orders")}
            >
              <FileText size={16} /> My Orders ({myPendingOrders.length})
            </button>
          )}
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
            {/* Collapsible LGA Map Filter */}
            <div className="card" style={{ marginBottom: "20px", padding: "14px 20px", background: "rgba(16, 185, 129, 0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setMapVisible(!mapVisible)}>
                <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", color: "white", fontSize: "0.9rem" }}>
                  <MapPin size={16} style={{ color: "var(--primary)" }} /> Filter by Akwa Ibom LGA Map
                </span>
                <span style={{ color: "var(--primary)", fontSize: "0.8rem", fontWeight: "bold" }}>
                  {mapVisible ? "Hide Map Drawer" : "Show Map Drawer"}
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
                    <div style={{ width: "100%", maxWidth: "340px", padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                      <svg viewBox="0 0 400 300" width="100%" height="auto" style={{ overflow: "visible" }}>
                        {[
                          { name: "Ini", color: "#10b981", x: 200, y: 35 },
                          { name: "Ikot Ekpene", color: "#f59e0b", x: 110, y: 80 },
                          { name: "Itu", color: "#10b981", x: 210, y: 85 },
                          { name: "Uyo", color: "#0ea5e9", x: 200, y: 130 },
                          { name: "Abak", color: "#f59e0b", x: 110, y: 140 },
                          { name: "Mkpat Enin", color: "#10b981", x: 100, y: 210 },
                          { name: "Eket", color: "#0ea5e9", x: 200, y: 230 },
                          { name: "Oron", color: "#f59e0b", x: 290, y: 190 }
                        ].map((l, i) => {
                          if (l.name === "Uyo") return null;
                          return (
                            <line 
                              key={i} 
                              x1={l.x} 
                              y1={l.y} 
                              x2={200} 
                              y2={130} 
                              stroke="rgba(16, 185, 129, 0.15)" 
                              strokeWidth="1" 
                              strokeDasharray="4,4" 
                            />
                          );
                        })}

                        {[
                          { name: "Ini", color: "#10b981", x: 200, y: 35 },
                          { name: "Ikot Ekpene", color: "#f59e0b", x: 110, y: 80 },
                          { name: "Itu", color: "#10b981", x: 210, y: 85 },
                          { name: "Uyo", color: "#0ea5e9", x: 200, y: 130 },
                          { name: "Abak", color: "#f59e0b", x: 110, y: 140 },
                          { name: "Mkpat Enin", color: "#10b981", x: 100, y: 210 },
                          { name: "Eket", color: "#0ea5e9", x: 200, y: 230 },
                          { name: "Oron", color: "#f59e0b", x: 290, y: 190 }
                        ].map((item) => (
                          <g 
                            key={item.name} 
                            style={{ cursor: "pointer" }} 
                            onClick={() => {
                              setSelectedLga(selectedLga === item.name ? "All" : item.name);
                            }}
                          >
                            <circle 
                              cx={item.x} 
                              cy={item.y} 
                              r={selectedLga === item.name ? 14 : 9} 
                              fill={selectedLga === item.name ? "var(--primary)" : "rgba(255, 255, 255, 0.05)"} 
                              stroke={selectedLga === item.name ? "white" : item.color} 
                              strokeWidth="1.5" 
                              style={{ transition: "all 0.2s" }}
                            />
                            <text 
                              x={item.x} 
                              y={item.y - 12} 
                              textAnchor="middle" 
                              fill={selectedLga === item.name ? "white" : "var(--gray-600)"} 
                              fontSize="8" 
                              fontWeight={selectedLga === item.name ? "bold" : "normal"}
                            >
                              {item.name}
                            </text>
                          </g>
                        ))}
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
                className="product-grid"
              >
                {sortedProducts.map(product => {
                  const farmer = getFarmerDetails(product.farmerId);
                  return (
                    <motion.div 
                      key={product.id} 
                      variants={cardFadeIn}
                      className="product-card"
                    >
                      <div className="product-img-wrapper">
                        <img src={product.image} alt={product.name} className="product-img" />
                        {product.organic && <span className="product-organic-badge">Organic</span>}
                        <div className="product-farmer-badge">
                          <img 
                            src={farmer.avatar} 
                            alt={farmer.name} 
                            className="avatar-small" 
                            style={{ border: "2px solid var(--white)", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }} 
                          />
                        </div>
                      </div>
                      
                      <div className="product-details">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="product-cat">{product.category}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--primary)" }}>📍 {product.lga}</span>
                        </div>
                        <h4 className="product-name">{product.name}</h4>
                        
                        <div className="product-meta">
                          <span>Farmer: <strong>{farmer.name}</strong></span>
                          <span style={{ display: "flex", alignItems: "center", gap: "2px", color: "var(--secondary-light)" }}>
                            <Star size={12} fill="currentColor" /> {farmer.rating || "5.0"}
                          </span>
                        </div>

                        <p style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginBottom: "16px", flex: 1, lineHeight: 1.4 }}>
                          {product.description.length > 80 ? product.description.substring(0, 85) + "..." : product.description}
                        </p>

                        <div className="product-price-row">
                          <div className="product-price">
                            ₦{product.price.toLocaleString()} <span>/ {product.unit}</span>
                          </div>
                          <button 
                            className="btn btn-primary btn-sm"
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

              <form onSubmit={handlePaymentSubmit}>
                {paymentMethod === "card" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
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
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ color: "var(--gray-600)" }}>Bank Name:</span>
                        <strong style={{ color: "white" }}>Sterling Bank (Ibom Escrow)</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ color: "var(--gray-600)" }}>Account Name:</span>
                        <strong style={{ color: "white" }}>Ibom Agro Market Escrow Ltd</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--gray-600)" }}>Account Number:</span>
                        <strong style={{ color: "var(--primary)", fontSize: "1.1rem" }}>9032 8402 93</strong>
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
            </motion.div>
          </motion.div>
        )}

        {/* Realtime Order Progress Tracker Modal */}
        {selectedOrderForTracking && (
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

              {/* Realtime Stepper */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", margin: "24px 0", paddingLeft: "10px", borderLeft: "2px solid rgba(255,255,255,0.05)", marginLeft: "14px", position: "relative" }}>
                {[
                  { key: "Requested", label: "Order Submitted", desc: "Farmer received purchase invoice request", active: true },
                  { key: "Paid", label: "Escrow Payment Secured", desc: "Funds locked in Sterling Cooperative Escrow", active: ["Paid", "Assigned", "Picked Up", "En Route", "Delivered", "Completed", "Reviewed"].includes(selectedOrderForTracking.status) },
                  { key: "Assigned", label: "Produce Dispatched", desc: "Farmer prepared cargo for pickup", active: ["Assigned", "Picked Up", "En Route", "Delivered", "Completed", "Reviewed"].includes(selectedOrderForTracking.status) },
                  { key: "Picked Up", label: "Picked Up by Carrier", desc: "Logistics partner claimed and loaded produce", active: ["Picked Up", "En Route", "Delivered", "Completed", "Reviewed"].includes(selectedOrderForTracking.status) },
                  { key: "En Route", label: "En Route to drop-off", desc: "Carrier is delivering packages to your town", active: ["En Route", "Delivered", "Completed", "Reviewed"].includes(selectedOrderForTracking.status) },
                  { key: "Delivered", label: "Delivered", desc: "Produce arrived at dropsite. Awaiting your release", active: ["Delivered", "Completed", "Reviewed"].includes(selectedOrderForTracking.status) },
                  { key: "Completed", label: "Escrow Released", desc: "Payment disbursed to farmer's wallet. Complete!", active: ["Completed", "Reviewed"].includes(selectedOrderForTracking.status) }
                ].map((step, idx) => (
                  <div key={idx} style={{ position: "relative", paddingLeft: "20px" }}>
                    {/* Circle Node */}
                    <div style={{ 
                      position: "absolute", 
                      left: "-27px", 
                      top: "2px", 
                      width: "12px", 
                      height: "12px", 
                      borderRadius: "50%", 
                      background: step.active ? "var(--primary)" : "rgba(255,255,255,0.05)",
                      border: `2px solid ${step.active ? "white" : "var(--glass-border)"}`,
                      boxShadow: step.active ? "0 0 8px var(--primary)" : "none",
                      transition: "all 0.3s"
                    }}></div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong style={{ color: step.active ? "white" : "var(--gray-600)", fontSize: "0.9rem" }}>{step.label}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--gray-600)", marginTop: "2px" }}>{step.desc}</span>
                    </div>
                  </div>
                ))}
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
        )}

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
                <img src={selectedFarmer.banner} alt="" style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "12px" }} />
                <img 
                  src={selectedFarmer.avatar} 
                  alt="" 
                  style={{ 
                    width: "70px", 
                    height: "70px", 
                    borderRadius: "50%", 
                    objectFit: "cover", 
                    position: "absolute", 
                    bottom: "-30px", 
                    left: "20px",
                    border: "3px solid var(--dark-light)",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
                  }} 
                />
              </div>

              <div style={{ paddingLeft: "100px", minHeight: "36px", marginBottom: "20px" }}>
                <h4 style={{ margin: 0, fontSize: "1.3rem" }}>{selectedFarmer.name}</h4>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "4px" }}>
                  {getVerificationIcon(selectedFarmer.verification)}
                  <span style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>{selectedFarmer.followers} Followers</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div className="card" style={{ padding: "14px" }}>
                  <small style={{ color: "var(--gray-600)" }}>Years of Farming</small>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--primary)" }}>{selectedFarmer.yearsFarming} Years</div>
                </div>
                <div className="card" style={{ padding: "14px" }}>
                  <small style={{ color: "var(--gray-600)" }}>LGA / Location</small>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--primary)" }}>{selectedFarmer.town}, {selectedFarmer.lga}</div>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h5 style={{ marginBottom: "4px" }}>Farmer Bio</h5>
                <p style={{ fontSize: "0.9rem", color: "var(--gray-800)", lineHeight: 1.5 }}>{selectedFarmer.bio}</p>
              </div>

              {selectedFarmer.harvestCalendar && selectedFarmer.harvestCalendar.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h5 style={{ marginBottom: "8px" }}>Harvest Calendar</h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedFarmer.harvestCalendar.map(cal => (
                      <div key={cal.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)", borderRadius: "8px", fontSize: "0.85rem" }}>
                        <span><strong style={{ color: "white" }}>{cal.product}</strong> ({cal.month})</span>
                        <span style={{ color: "var(--secondary)", fontWeight: "bold" }}>{cal.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedFarmer(null)}>Close</button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }} 
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
                  <div style={{ display: "flex", gap: "8px", margin: "6px 0" }}>
                    {[1, 2, 3, 4, 5].map(val => (
                      <Star 
                        key={val} 
                        size={24} 
                        onClick={() => setRating(val)}
                        style={{ cursor: "pointer", color: val <= rating ? "var(--warning)" : "rgba(255,255,255,0.15)" }}
                        fill={val <= rating ? "var(--warning)" : "none"}
                      />
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
    </div>
  );
}
