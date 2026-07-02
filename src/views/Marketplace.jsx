import React, { useState, useEffect } from "react";
import { 
  Search, Filter, ShieldCheck, Heart, ShoppingBag, Calendar, Check, Send, 
  AlertCircle, RefreshCw, X, MessageSquare, Star, FileText, CreditCard, 
  Truck, MapPin, Sprout, Fish, Egg, Beef, Droplets, Package, Apple, 
  CheckCircle2, ChevronRight, Copy, Award, Shield, Bell, Compass, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PaystackCheckoutModal from "../components/PaystackCheckoutModal";
import { 
  getDB, 
  placeOrder, 
  updateOrderStatus, 
  leaveReview, 
  sendMessage, 
  AKWA_IBOM_LOCATIONS, 
  CATEGORIES,
  VERTICALS,
  toggleFollowStore,
  updateBusinessStorefront,
  subscribeToPlan,
  purchaseAd
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

export default function Marketplace({ activeUser, onSwitchView, onOpenChat, initialSearchQuery = "", initialTab = "listings" }) {
  const [db, setDb] = useState(getDB());
  const [search, setSearch] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLga, setSelectedLga] = useState("All");
  const [selectedVerification, setSelectedVerification] = useState("All");
  const [sortBy, setSortBy] = useState("Recently Added");
  const [organicFilter, setOrganicFilter] = useState("All"); // All, Organic, Non-Organic

  const [activeTab, setActiveTab] = useState(initialTab); // listings, farmers, harvest_calendar, my_orders
  
  // Mobile filter drawer state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQty, setOrderQty] = useState(1);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  
  // Paystack checkout portal states
  const [paymentMethod, setPaymentMethod] = useState("paystack"); // paystack, wallet
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaystackModal, setShowPaystackModal] = useState(false);

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

  // Shopping Cart States
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("ibom_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [cartOpen, setCartOpen] = useState(false);

  // Compare States
  const [compareList, setCompareList] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);

  // Price Alerts States
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem("ibom_price_alerts");
    return saved ? JSON.parse(saved) : [];
  });

  // Hero Carousel State
  const [heroIndex, setHeroIndex] = useState(0);
  const [showEscrowInfo, setShowEscrowInfo] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setDb(getDB());
    window.addEventListener("db_update", handleUpdate);
    return () => window.removeEventListener("db_update", handleUpdate);
  }, []);

  useEffect(() => {
    localStorage.setItem("ibom_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("ibom_price_alerts", JSON.stringify(alerts));
  }, [alerts]);

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

  // Helper handlers
  const handleAddToCart = (product) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [...prev, { product, quantity: product.minOrder || 1 }];
    });

    window.dispatchEvent(new CustomEvent("add_toast", {
      detail: {
        title: "Cart Updated",
        message: `${product.name} has been added to your shopping cart.`
      }
    }));
  };

  const handleRemoveFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleUpdateCartQty = (productId, qty) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const minOrder = item.product.minOrder || 1;
        const validQty = Math.max(minOrder, qty);
        return { ...item, quantity: validQty };
      }
      return item;
    }));
  };

  const handleCheckoutCart = () => {
    if (!activeUser) {
      onSwitchView("auth");
      setCartOpen(false);
      return;
    }

    if (cart.length === 0) return;

    setActionLoading(true);
    setLoadingMessage("Creating secure escrow allocations for your items...");

    setTimeout(() => {
      let finalDb = getDB();
      
      // Place orders grouped by farmer
      cart.forEach(item => {
        const { db: updatedDb } = placeOrder(item.product.id, item.quantity);
        finalDb = updatedDb;
      });

      setDb(finalDb);
      setCart([]); // Clear cart
      setCartOpen(false);
      setActionLoading(false);

      window.dispatchEvent(new Event("db_update"));
      window.dispatchEvent(new CustomEvent("add_toast", {
        detail: {
          title: "Orders Placed Successfully",
          message: "Your orders have been secured in Escrow! Go to 'My Orders' to make payment."
        }
      }));

      // Switch to My Orders tab
      setActiveTab("my_orders");
    }, 1500);
  };

  const toggleCompare = (product) => {
    setCompareList(prev => {
      const exists = prev.some(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      }
      if (prev.length >= 3) {
        window.dispatchEvent(new CustomEvent("add_toast", {
          detail: {
            title: "Comparison Limit",
            message: "You can compare a maximum of 3 products at a time."
          }
        }));
        return prev;
      }
      return [...prev, product];
    });
  };

  const toggleAlertSubscription = (product) => {
    setAlerts(prev => {
      const subscribed = prev.includes(product.id);
      if (subscribed) {
        window.dispatchEvent(new CustomEvent("add_toast", {
          detail: {
            title: "Unsubscribed",
            message: `You will no longer receive price alerts for ${product.name}.`
          }
        }));
        return prev.filter(id => id !== product.id);
      } else {
        window.dispatchEvent(new CustomEvent("add_toast", {
          detail: {
            title: "Subscribed to Price Alerts",
            message: `We will notify you whenever the price of ${product.name} changes.`
          }
        }));
        return [...prev, product.id];
      }
    });
  };

  const HERO_BANNERS = [
    {
      title: "Rainy Season Bulk Discount",
      subtitle: "Get up to 15% off local Itu White Rice & yellow garri from certified producers.",
      category: "Crops",
      color: "linear-gradient(135deg, rgba(6, 32, 16, 0.8) 0%, rgba(12, 60, 32, 0.95) 100%)",
      actionText: "Browse Crops"
    },
    {
      title: "Oron Seafood Fresh Landing",
      subtitle: "Dry Smoked Bonga fish and fresh water shrimps straight from Oron ports.",
      category: "Fish",
      color: "linear-gradient(135deg, rgba(9, 26, 36, 0.8) 0%, rgba(17, 45, 62, 0.95) 100%)",
      actionText: "Shop Seafood"
    },
    {
      title: "Secure Escrow Guarantee",
      subtitle: "Your payments are safely held in escrow until you inspect and approve the produce.",
      category: "All",
      color: "linear-gradient(135deg, rgba(27, 22, 4, 0.8) 0%, rgba(53, 44, 10, 0.95) 100%)",
      actionText: "Learn Escrow Flow",
      isEscrow: true
    }
  ];

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

  const handleFollowStore = (sellerId) => {
    if (!activeUser) {
      onSwitchView("auth");
      return;
    }
    const updatedDb = toggleFollowStore(sellerId);
    setDb(updatedDb);
    const updatedSeller = updatedDb.users.find(u => u.id === sellerId);
    if (selectedFarmer && selectedFarmer.id === sellerId) {
      setSelectedFarmer(updatedSeller);
    }
    window.dispatchEvent(new Event("db_update"));
  };

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px", borderBottom: "1px solid var(--glass-border)", paddingBottom: "16px", width: "100%" }}>
        <div>
          <h2>IbomOne</h2>
          <p style={{ color: "var(--gray-600)" }}>Connecting buyers, sellers, service providers, and directory storefronts in one trusted ecosystem</p>
        </div>
        
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="marketplace-nav-tabs">
            {[
              { id: "listings", label: "Browse Products", icon: <ShoppingBag size={16} /> },
              { id: "bulk", label: "Bulk Palm Oil", icon: <Droplets size={16} /> },
              { id: "farmers", label: "Farmers Directory", icon: <ShieldCheck size={16} /> },
              { id: "directory", label: "Business Directory", icon: <Compass size={16} /> },
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

          <button 
            onClick={() => setCartOpen(true)}
            className="btn btn-outline"
            style={{
              borderRadius: "50px",
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              position: "relative",
              height: "44px",
              fontFamily: "var(--font-display)",
              fontWeight: "700",
              fontSize: "0.9rem"
            }}
          >
            <ShoppingBag size={16} />
            <span>Cart</span>
            {cart.length > 0 && (
              <span style={{
                background: "var(--secondary)",
                color: "black",
                fontSize: "0.75rem",
                fontWeight: "800",
                borderRadius: "50%",
                minWidth: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 6px"
              }}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
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
      {activeTab === "bulk" && (
        <div style={{ width: "100%" }}>
          {/* Bulk Hero Banner */}
          <div 
            style={{ 
              background: "linear-gradient(135deg, rgba(88, 28, 135, 0.2) 0%, rgba(124, 58, 237, 0.45) 100%)", 
              border: "1px solid var(--glass-border)", 
              borderRadius: "16px", 
              padding: "clamp(16px, 5vw, 24px) clamp(20px, 6vw, 32px)", 
              marginBottom: "20px", 
              position: "relative", 
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", right: "-20px", bottom: "-20px", width: "150px", height: "150px", background: "var(--secondary)", filter: "blur(60px)", opacity: 0.25, pointerEvents: "none" }} />
            <span style={{ color: "var(--secondary-light)", fontSize: "0.8rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px", display: "block" }}>Wholesale B2B Trading Hub</span>
            <h3 style={{ fontSize: "clamp(1.3rem, 4vw, 1.8rem)", color: "white", fontWeight: "900", marginBottom: "8px", fontFamily: "var(--font-display)", margin: 0 }}>
              Akwa Ibom Bulk Palm Oil Hub
            </h3>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "clamp(0.8rem, 2.5vw, 0.95rem)", maxWidth: "650px", lineHeight: 1.4, margin: "6px 0 0 0" }}>
              Direct mill bookings from Abak, Eket, and Uyo. Secured by 3% Escrow Commission with fixed inter-LGA Bulk Haulage Carrier matching. Save 5% on 10+ Jerrycans, 10% on 50+.
            </p>
          </div>

          {/* Bulk Listings Grid */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
            <h4 style={{ fontSize: "1.2rem", color: "white", margin: 0 }}>Wholesale Palm Oil Listings</h4>
            <span style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>Verified cooperative mills & processing yards</span>
          </div>

          <div className="product-grid" style={{ gap: "20px" }}>
            {db.products.filter(p => p.isBulk && p.category === "Palm Products" && p.name.toLowerCase().includes("palm oil") && p.status === "Available").map(product => {
              const farmer = getFarmerDetails(product.farmerId);
              return (
                <div key={product.id} className="product-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div className="product-img-wrapper" style={{ height: "160px" }}>
                    <img src={product.image} alt={product.name} className="product-img" />
                    <span className="product-card-badge fresh" style={{ background: "var(--secondary)", color: "black", fontWeight: "bold" }}>Wholesale Bulk</span>
                  </div>
                  <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="product-cat">{product.category}</span>
                      <span style={{ fontSize: "0.75rem", background: "rgba(16,185,129,0.1)", color: "var(--primary-light)", padding: "2px 6px", borderRadius: "8px" }}>📍 {product.lga}</span>
                    </div>
                    <h4 style={{ fontSize: "1.1rem", color: "white", margin: "6px 0 4px 0", fontWeight: "bold" }}>{product.name}</h4>
                    <p style={{ fontSize: "0.8rem", color: "var(--gray-600)", lineHeight: 1.3, flex: 1 }}>{product.description}</p>
                    
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px", marginTop: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "0.7rem", color: "var(--gray-600)", display: "block" }}>Price / Unit</span>
                          <strong style={{ fontSize: "1.15rem", color: "var(--secondary-light)" }}>₦{product.price.toLocaleString()}</strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}> / {product.unit}</span>
                        </div>
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ padding: "8px 14px", fontSize: "0.8rem" }}
                          onClick={() => {
                            setSelectedProduct(product);
                            setOrderQty(product.minOrder || 1);
                          }}
                        >
                          Book Bulk Order
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {activeTab === "listings" && (
        <div style={{ width: "100%" }}>
          {/* Hero Carousel Banner */}
          <div 
            style={{ 
              background: HERO_BANNERS[heroIndex].color, 
              border: "1px solid var(--glass-border)", 
              borderRadius: "16px", 
              padding: "24px 32px", 
              marginBottom: "28px", 
              position: "relative", 
              overflow: "hidden",
              minHeight: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              transition: "all 0.5s ease"
            }}
          >
            {/* Ambient Background Glow */}
            <div style={{ position: "absolute", right: "-50px", bottom: "-50px", width: "200px", height: "200px", background: "var(--primary)", filter: "blur(80px)", opacity: 0.15, pointerEvents: "none" }} />
            
            <span style={{ color: "var(--primary-light)", fontSize: "0.8rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px", display: "block" }}>Featured Update</span>
            <h3 style={{ fontSize: "1.5rem", color: "white", fontWeight: "800", marginBottom: "8px", fontFamily: "var(--font-display)", margin: 0 }}>
              {HERO_BANNERS[heroIndex].title}
            </h3>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.92rem", maxWidth: "600px", marginBottom: "16px", marginTop: "4px", lineHeight: "1.45" }}>
              {HERO_BANNERS[heroIndex].subtitle}
            </p>
            
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (HERO_BANNERS[heroIndex].isEscrow) {
                    setShowEscrowInfo(true);
                  } else {
                    setSelectedCategory(HERO_BANNERS[heroIndex].category);
                  }
                }}
              >
                {HERO_BANNERS[heroIndex].actionText}
              </button>
              
              {/* Dot Indicators */}
              <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
                {HERO_BANNERS.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setHeroIndex(idx)}
                    style={{ 
                      width: heroIndex === idx ? "24px" : "8px", 
                      height: "8px", 
                      borderRadius: "4px", 
                      background: heroIndex === idx ? "var(--primary)" : "rgba(255,255,255,0.2)", 
                      border: "none", 
                      padding: 0,
                      cursor: "pointer", 
                      transition: "all 0.3s ease" 
                    }}
                    title={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="marketplace-layout">
            {/* Filters Sidebar */}
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
            <main style={{ width: "100%", minWidth: 0 }}>
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
                          
                          {/* Quick Action Overlay Buttons */}
                          <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", gap: "6px", zIndex: 10 }}>
                            {/* Alert Bell */}
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAlertSubscription(product);
                              }}
                              style={{
                                background: alerts.includes(product.id) ? "var(--secondary)" : "rgba(5, 10, 7, 0.6)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "50%",
                                width: "28px",
                                height: "28px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: alerts.includes(product.id) ? "black" : "white",
                                backdropFilter: "blur(4px)",
                                transition: "all 0.2s"
                              }}
                              title={alerts.includes(product.id) ? "Unsubscribe from price alerts" : "Subscribe to price alerts"}
                            >
                              <Bell size={12} fill={alerts.includes(product.id) ? "black" : "none"} />
                            </button>

                            {/* Compare Toggle */}
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCompare(product);
                              }}
                              style={{
                                background: compareList.some(p => p.id === product.id) ? "var(--primary)" : "rgba(5, 10, 7, 0.6)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "50%",
                                width: "28px",
                                height: "28px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: compareList.some(p => p.id === product.id) ? "black" : "white",
                                backdropFilter: "blur(4px)",
                                transition: "all 0.2s"
                              }}
                              title="Compare this product"
                            >
                              <RefreshCw size={12} className={compareList.some(p => p.id === product.id) ? "rotate-animation" : ""} />
                            </button>
                          </div>

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
                            
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button 
                                type="button"
                                className="btn btn-outline btn-sm"
                                style={{ padding: "8px", borderRadius: "50%", minWidth: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}
                                onClick={() => handleAddToCart(product)}
                                title="Add to Cart"
                              >
                                <ShoppingBag size={14} />
                              </button>
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
                                Buy
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </main>
          </div>
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

      {activeTab === "directory" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
            <h3 style={{ margin: 0 }}>Business Directory</h3>
            <span style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>Verified local companies, SMEs, and service providers</span>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="product-grid"
          >
            {db.users.filter(u => u.role === "Seller").map(seller => {
              const planColor = seller.subscriptionPlan === "Premium" 
                ? "rgba(139, 92, 246, 0.15)" 
                : seller.subscriptionPlan === "Pro" 
                  ? "rgba(14, 165, 233, 0.15)" 
                  : "rgba(156, 163, 175, 0.15)";
              const planText = seller.subscriptionPlan || "Free";
              const planTextColor = seller.subscriptionPlan === "Premium" 
                ? "var(--secondary-light)" 
                : seller.subscriptionPlan === "Pro" 
                  ? "var(--primary-light)" 
                  : "var(--gray-600)";

              return (
                <motion.div 
                  key={seller.id} 
                  variants={cardFadeIn}
                  className="card" 
                  style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", textAlign: "center", position: "relative" }}
                >
                  {/* Subscription Plan Badge */}
                  <span style={{ 
                    position: "absolute", 
                    top: "12px", 
                    right: "12px", 
                    fontSize: "0.7rem", 
                    background: planColor, 
                    color: planTextColor, 
                    padding: "2px 8px", 
                    borderRadius: "12px", 
                    fontWeight: "bold",
                    border: `1px solid ${planTextColor}33`
                  }}>
                    {planText}
                  </span>

                  <img 
                    src={seller.avatar || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150"} 
                    alt={seller.name} 
                    style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--secondary)" }} 
                  />
                  <div>
                    <h4 style={{ margin: "4px 0" }}>{seller.farmName || seller.name}</h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>Representative: {seller.name}</p>
                  </div>
                  
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center", margin: "2px 0" }}>
                    {getVerificationIcon(seller.verification)}
                    <span style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px", color: "var(--white)", background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--glass-border)", padding: "2px 8px", borderRadius: "10px" }}>
                      <Star size={12} fill="var(--secondary)" color="var(--secondary)" /> {seller.rating || 5.0} ({seller.reviewsCount || 0})
                    </span>
                  </div>

                  <p style={{ fontSize: "0.8rem", color: "var(--gray-800)" }}>
                    📍 {seller.town}, {seller.lga} LGA
                  </p>

                  <p style={{ fontSize: "0.8rem", color: "var(--gray-600)", flex: 1, lineHeight: 1.4 }}>
                    {seller.bio}
                  </p>

                  {seller.businessHours && (
                    <p style={{ fontSize: "0.75rem", color: "var(--secondary-light)" }}>
                      🕒 Hours: {seller.businessHours}
                    </p>
                  )}
                  
                  <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "12px" }}>
                    <button 
                      className="btn btn-outline btn-sm" 
                      style={{ flex: 1 }}
                      onClick={() => {
                        if (!activeUser) {
                          onSwitchView("auth");
                          return;
                        }
                        onOpenChat(seller.id);
                      }}
                    >
                      <MessageSquare size={14} /> Chat
                    </button>
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ flex: 1.2 }}
                      onClick={() => setSelectedFarmer(seller)}
                    >
                      Visit Storefront
                    </button>
                  </div>
                </motion.div>
              );
            })}
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

              {/* Dynamic Escrow & Delivery Fee Calculator */}
              {(() => {
                const prodLga = selectedProduct.lga || "Uyo";
                const buyerLga = activeUser?.lga || "Uyo";
                const sub = selectedProduct.price * orderQty;
                
                let disc = 0;
                if (selectedProduct.isBulk || orderQty >= 5) {
                  if (orderQty >= 10 && orderQty < 50) {
                    disc = sub * 0.05;
                  } else if (orderQty >= 50) {
                    disc = sub * 0.10;
                  }
                }
                const discSub = sub - disc;
                const escFee = Math.round(discSub * 0.03);
                
                const isBlk = selectedProduct.isBulk || orderQty >= 5;
                let delFee = 0;
                let delType = "";
                if (buyerLga.toLowerCase() === prodLga.toLowerCase()) {
                  delFee = isBlk ? 2500 : 1000;
                  delType = isBlk ? "Local Bulk Cargo (Tricycle)" : "Local Retail (Motorcycle)";
                } else {
                  delFee = isBlk ? 12000 : 3500;
                  delType = isBlk ? "Inter-LGA Haulage (Truck)" : "Inter-LGA Light Shipping";
                }
                const totAmt = discSub + escFee + delFee;

                return (
                  <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "14px", marginTop: "14px", fontSize: "0.85rem", color: "var(--gray-800)", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Subtotal:</span>
                      <span style={{ color: "white" }}>₦{sub.toLocaleString()}</span>
                    </div>
                    {disc > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--secondary-light)" }}>
                        <span>Volume Discount:</span>
                        <span>-₦{disc.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Escrow Platform Fee (3%):</span>
                      <span style={{ color: "white" }}>₦{escFee.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", flexDirection: "column" }}>
                        <span>Delivery & Shipping:</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--gray-600)" }}>{delType} (From {prodLga} to {buyerLga})</span>
                      </span>
                      <span style={{ color: "white" }}>₦{delFee.toLocaleString()}</span>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3rem", fontWeight: "bold", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px", marginTop: "6px", color: "white" }}>
                      <span>Total Amount:</span>
                      <span style={{ color: "var(--secondary)" }}>₦{totAmt.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
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
                    
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", margin: "8px 0", paddingTop: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.80rem", color: "var(--gray-600)" }}>
                        <span>Subtotal:</span>
                        <span>₦{(currentInvoice.subtotal || (currentInvoice.price * currentInvoice.quantity)).toLocaleString()}</span>
                      </div>
                      {currentInvoice.discount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.80rem", color: "var(--secondary-light)" }}>
                          <span>Volume Discount:</span>
                          <span>-₦{currentInvoice.discount.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.80rem", color: "var(--gray-600)" }}>
                        <span>Escrow Fee (3%):</span>
                        <span>₦{(currentInvoice.escrowFee || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.80rem", color: "var(--gray-600)" }}>
                        <span>Delivery Fee ({currentInvoice.deliveryType || "Standard"}):</span>
                        <span>₦{(currentInvoice.deliveryFee || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--glass-border)", paddingTop: "8px", marginTop: "8px", fontWeight: "bold", fontSize: "1.1rem", color: "var(--secondary-light)" }}>
                      <span>Amount Due:</span>
                      <span>₦{currentInvoice.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Payment Channel Selector */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px", marginTop: "12px" }}>
                    <div 
                      className={`card ${paymentMethod === "paystack" ? "active" : ""}`}
                      style={{ padding: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", border: `1px solid ${paymentMethod === "paystack" ? "var(--primary)" : "var(--glass-border)"}`, background: "rgba(255,255,255,0.02)" }}
                      onClick={() => setPaymentMethod("paystack")}
                    >
                      <CreditCard size={20} style={{ color: "var(--primary-light)" }} />
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <strong style={{ color: "white", display: "block" }}>Paystack Checkout</strong>
                        <small style={{ color: "var(--gray-600)" }}>Secure payment via Cards, Bank Transfer, or USSD</small>
                      </div>
                      <input type="radio" checked={paymentMethod === "paystack"} readOnly />
                    </div>

                    <div 
                      className={`card ${paymentMethod === "wallet" ? "active" : ""}`}
                      style={{ padding: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", border: `1px solid ${paymentMethod === "wallet" ? "var(--primary)" : "var(--glass-border)"}`, background: "rgba(255,255,255,0.02)" }}
                      onClick={() => setPaymentMethod("wallet")}
                    >
                      <FileText size={20} style={{ color: "var(--secondary-light)" }} />
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <strong style={{ color: "white", display: "block" }}>Platform Wallet Balance</strong>
                        <small style={{ color: "var(--gray-600)" }}>Pay using your existing virtual account balance</small>
                      </div>
                      <input type="radio" checked={paymentMethod === "wallet"} readOnly />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setCurrentInvoice(null)}>Cancel</button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      style={{ flex: 2 }}
                      onClick={() => {
                        if (paymentMethod === "paystack") {
                          setShowPaystackModal(true);
                        } else {
                          // Wallet processing simulation
                          setPaymentProcessing(true);
                          setLoadingMessage("Debiting platform wallet balance...");
                          setTimeout(() => {
                            setPaymentProcessing(false);
                            const updatedDb = updateOrderStatus(currentInvoice.id, "Paid");
                            setDb(updatedDb);
                            setPaymentSuccess(true);
                            window.dispatchEvent(new Event("db_update"));
                          }, 1500);
                        }
                      }}
                    >
                      {paymentMethod === "paystack" ? "Proceed to Paystack" : "Confirm Wallet Payment"}
                    </button>
                  </div>
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
          )}

        {/* Farmer / Seller Storefront Modal */}
        {selectedFarmer && (() => {
          const activeStoreProducts = db.products.filter(p => p.farmerId === selectedFarmer.id && p.status === "Available");
          const isFollowing = selectedFarmer.followersList?.includes(activeUser?.id);
          const isFarmer = selectedFarmer.role === "Farmer";

          return (
            <motion.div 
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ zIndex: 9999 }}
            >
              <motion.div 
                className="modal-content"
                style={{ maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
              >
                <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>{selectedFarmer.farmName || selectedFarmer.name}</h3>
                  <button onClick={() => setSelectedFarmer(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "white" }}><X size={20} /></button>
                </div>

                <div style={{ position: "relative", marginBottom: "24px", marginTop: "12px" }}>
                  <img src={selectedFarmer.banner || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"} alt="" style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "12px", border: "1px solid var(--glass-border)" }} />
                  <img 
                    src={selectedFarmer.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
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
                      boxShadow: "0 6px 16px rgba(0,0,0,0.4)"
                    }} 
                  />
                  <div style={{ position: "absolute", bottom: "10px", right: "10px" }}>
                    <button 
                      className={`btn ${isFollowing ? "btn-outline" : "btn-primary"} btn-sm`}
                      onClick={() => handleFollowStore(selectedFarmer.id)}
                      style={{ padding: "6px 16px", borderRadius: "20px" }}
                    >
                      {isFollowing ? "Following" : "Follow Store"}
                    </button>
                  </div>
                </div>

                <div style={{ paddingLeft: "105px", minHeight: "36px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <h4 style={{ margin: 0, fontSize: "1.2rem", color: "white" }}>{selectedFarmer.name}</h4>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    {getVerificationIcon(selectedFarmer.verification)}
                    <span style={{ fontSize: "0.8rem", color: "var(--secondary-light)", background: "rgba(245, 158, 11, 0.08)", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(245, 158, 11, 0.2)", fontWeight: "bold" }}>
                      {selectedFarmer.followers || 0} Followers
                    </span>
                    {selectedFarmer.subscriptionPlan && (
                      <span style={{ fontSize: "0.75rem", color: "var(--primary-light)", background: "rgba(16, 185, 129, 0.08)", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.2)", fontWeight: "bold" }}>
                        {selectedFarmer.subscriptionPlan} Plan
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                  <div className="card" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "2px" }}>
                    <small style={{ color: "var(--gray-600)", fontWeight: "600" }}>{isFarmer ? "Years of Farming" : "Business Hours"}</small>
                    <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--primary-light)" }}>
                      {isFarmer ? `${selectedFarmer.yearsFarming} Years` : (selectedFarmer.businessHours || "8:00 AM - 6:00 PM")}
                    </div>
                  </div>
                  <div className="card" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "2px" }}>
                    <small style={{ color: "var(--gray-600)", fontWeight: "600" }}>LGA / Location</small>
                    <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--primary-light)" }}>{selectedFarmer.town}, {selectedFarmer.lga}</div>
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <h5 style={{ marginBottom: "6px", fontSize: "0.95rem", color: "white" }}>About Storefront</h5>
                  <p style={{ fontSize: "0.85rem", color: "var(--gray-800)", lineHeight: 1.5, margin: 0 }}>{selectedFarmer.bio}</p>
                </div>

                {/* Active Products list */}
                <div style={{ marginBottom: "24px" }}>
                  <h5 style={{ marginBottom: "10px", fontSize: "0.95rem", color: "white" }}>Active Listings</h5>
                  {activeStoreProducts.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
                      {activeStoreProducts.map(prod => (
                        <div 
                          key={prod.id} 
                          className="card" 
                          style={{ padding: "8px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px" }}
                          onClick={() => {
                            setSelectedProduct(prod);
                            setOrderQty(prod.minOrder || 1);
                            setSelectedFarmer(null);
                          }}
                        >
                          <img src={prod.image} alt={prod.name} style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "8px" }} />
                          <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "white", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{prod.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--secondary-light)", fontWeight: "bold" }}>₦{prod.price.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.8rem", color: "var(--gray-600)", fontStyle: "italic", margin: 0 }}>No active listings currently from this store.</p>
                  )}
                </div>

                {isFarmer && selectedFarmer.harvestCalendar && selectedFarmer.harvestCalendar.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <h5 style={{ marginBottom: "10px", fontSize: "0.95rem", color: "white" }}>Harvest Calendar Milestones</h5>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedFarmer.harvestCalendar.map(cal => (
                        <div key={cal.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)", borderRadius: "10px", fontSize: "0.8rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Sprout size={14} style={{ color: "var(--primary-light)" }} />
                            <span><strong style={{ color: "white" }}>{cal.product}</strong> ({cal.month})</span>
                          </div>
                          <span style={{ 
                            fontSize: "0.7rem", 
                            padding: "2px 8px", 
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

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button className="btn btn-outline" style={{ flex: 1, minWidth: "100px" }} onClick={() => setSelectedFarmer(null)}>Close</button>
                  {selectedFarmer.whatsapp && (
                    <a 
                      href={`https://wa.me/${selectedFarmer.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      style={{ flex: 1.2, minWidth: "120px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", textDecoration: "none", color: "var(--primary-light)", border: "1px solid var(--primary-light)" }}
                    >
                      <Globe size={14} /> WhatsApp
                    </a>
                  )}
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1.5, minWidth: "140px" }} 
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
          );
        })()}

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

      {/* Shopping Cart Drawer */}
      <AnimatePresence>
        {cartOpen && (
          <div className="cart-drawer-backdrop" onClick={() => setCartOpen(false)}>
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="cart-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cart-drawer-header">
                <h3>Shopping Cart ({cart.length})</h3>
                <button onClick={() => setCartOpen(false)}><X size={20} /></button>
              </div>
              
              <div className="cart-drawer-body">
                {cart.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--gray-600)" }}>
                    <ShoppingBag size={48} style={{ marginBottom: "16px", opacity: 0.5, margin: "0 auto 16px auto" }} />
                    <p>Your cart is empty.</p>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: "16px" }} onClick={() => setCartOpen(false)}>Shop Now</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {cart.map(item => (
                      <div key={item.product.id} className="cart-item-card">
                        <img src={item.product.image} alt={item.product.name} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4>{item.product.name}</h4>
                          <span style={{ fontSize: "0.75rem", color: "var(--primary-light)" }}>
                            By {getFarmerDetails(item.product.farmerId).name || "Farmer"}
                          </span>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                            <span style={{ fontWeight: "bold", color: "var(--secondary-light)" }}>
                              ₦{(item.product.price * item.quantity).toLocaleString()}
                            </span>
                            
                            {/* Qty Controls */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "4px", padding: "2px 6px" }}>
                              <button 
                                onClick={() => handleUpdateCartQty(item.product.id, item.quantity - 1)}
                                style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1rem", width: "16px" }}
                              >-</button>
                              <span style={{ fontSize: "0.85rem", fontWeight: "bold", minWidth: "16px", textAlign: "center" }}>{item.quantity}</span>
                              <button 
                                onClick={() => handleUpdateCartQty(item.product.id, item.quantity + 1)}
                                style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1rem", width: "16px" }}
                              >+</button>
                            </div>
                          </div>
                        </div>
                        <button className="cart-item-remove" onClick={() => handleRemoveFromCart(item.product.id)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {cart.length > 0 && (
                <div className="cart-drawer-footer">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                    <span>Subtotal</span>
                    <strong style={{ fontSize: "1.2rem", color: "white" }}>
                      ₦{cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toLocaleString()}
                    </strong>
                  </div>
                  <button className="btn btn-primary" style={{ width: "100%", padding: "12px" }} onClick={handleCheckoutCart}>
                    Secure Escrow Checkout
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Compare Tray */}
      {compareList.length > 0 && (
        <div className="compare-tray">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span>Comparing <strong>{compareList.length}/3</strong> items</span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {compareList.map(p => (
                <span key={p.id} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)", padding: "4px 10px", borderRadius: "10px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", color: "white" }}>
                  {p.name.substring(0, 15)}...
                  <X size={12} style={{ cursor: "pointer", color: "var(--danger)" }} onClick={() => toggleCompare(p)} />
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", marginLeft: "auto" }}>
            <button className="btn btn-outline btn-sm" onClick={() => setCompareList([])}>Clear All</button>
            <button className="btn btn-primary btn-sm" onClick={() => setCompareOpen(true)}>Compare Now</button>
          </div>
        </div>
      )}

      {/* Compare Details Modal */}
      <AnimatePresence>
        {compareOpen && (
          <div className="modal-overlay" onClick={() => setCompareOpen(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-card card"
              style={{ maxWidth: "800px", width: "90%", background: "rgba(10, 22, 15, 0.95)", border: "1px solid var(--glass-border)", padding: "28px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3>Product Comparison</h3>
                <button onClick={() => setCompareOpen(false)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer" }}><X size={20} /></button>
              </div>
              
              <div style={{ overflowX: "auto" }}>
                <table className="prices-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "25%", textAlign: "left", padding: "10px" }}>Feature</th>
                      {compareList.map(p => (
                        <th key={p.id} style={{ width: "25%", textAlign: "center", padding: "10px" }}>{p.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--glass-border)" }}><strong>Image</strong></td>
                      {compareList.map(p => (
                        <td key={p.id} style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid var(--glass-border)" }}>
                          <img src={p.image} alt={p.name} style={{ width: "80px", height: "60px", borderRadius: "6px", objectFit: "cover", margin: "0 auto" }} />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--glass-border)" }}><strong>Price</strong></td>
                      {compareList.map(p => (
                        <td key={p.id} style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid var(--glass-border)", color: "var(--secondary-light)", fontWeight: "bold" }}>
                          ₦{p.price.toLocaleString()} / {p.unit}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--glass-border)" }}><strong>Cultivation</strong></td>
                      {compareList.map(p => (
                        <td key={p.id} style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid var(--glass-border)", color: "white" }}>
                          {p.organic ? "🌿 Organic" : "Conventional"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--glass-border)" }}><strong>Farmer</strong></td>
                      {compareList.map(p => {
                        const f = getFarmerDetails(p.farmerId);
                        return (
                          <td key={p.id} style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid var(--glass-border)", color: "white" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                              <span>{f.name}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--primary-light)" }}>★ {f.rating}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--glass-border)" }}><strong>Location</strong></td>
                      {compareList.map(p => (
                        <td key={p.id} style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid var(--glass-border)", color: "white" }}>
                          📍 {p.town}, {p.lga}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--glass-border)" }}><strong>Min Order</strong></td>
                      {compareList.map(p => (
                        <td key={p.id} style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid var(--glass-border)", color: "white" }}>
                          {p.minOrder} {p.unit}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--glass-border)" }}><strong>Delivery</strong></td>
                      {compareList.map(p => (
                        <td key={p.id} style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid var(--glass-border)", color: "white" }}>
                          {p.deliveryAvailable ? "🚚 Available" : "Pick Up Only"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Escrow Explainer Modal */}
      <AnimatePresence>
        {showEscrowInfo && (
          <div className="modal-overlay" onClick={() => setShowEscrowInfo(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="modal-card card"
              style={{ maxWidth: "500px", width: "90%", background: "rgba(10, 22, 15, 0.95)", border: "1px solid var(--glass-border)", padding: "28px", textAlign: "center" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setShowEscrowInfo(false)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer" }}><X size={20} /></button>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginTop: "-10px" }}>
                <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid var(--warning)", padding: "16px", borderRadius: "50%" }}>
                  <ShieldCheck size={48} style={{ color: "var(--warning)" }} />
                </div>
                <h3 style={{ fontSize: "1.4rem", color: "white", fontWeight: "bold" }}>Ibom Secure Escrow Flow</h3>
                <p style={{ color: "var(--gray-600)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  To protect both buyers and local farmers, we route all payments through our secure Escrow gateway. Here is how it protects you:
                </p>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", textAlign: "left", fontSize: "0.85rem", color: "white" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <span style={{ background: "var(--primary)", color: "black", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0 }}>1</span>
                    <span><strong>Commit Funds:</strong> You pay for the produce. The funds are held securely in escrow. The farmer is notified to harvest and package your order.</span>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <span style={{ background: "var(--primary)", color: "black", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0 }}>2</span>
                    <span><strong>Logistics Delivery:</strong> A verified logistics carrier is assigned, picks up the fresh harvest, and delivers it to your location.</span>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <span style={{ background: "var(--primary)", color: "black", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0 }}>3</span>
                    <span><strong>Inspect & Release:</strong> Once you inspect the produce and confirm it is fresh and correct, click "Confirm Receipt" to release the funds directly to the farmer's wallet.</span>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: "100%", padding: "12px", marginTop: "10px" }} onClick={() => setShowEscrowInfo(false)}>
                  Got It, Let's Trade!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PaystackCheckoutModal 
        isOpen={showPaystackModal}
        onClose={() => setShowPaystackModal(false)}
        amount={currentInvoice ? currentInvoice.totalAmount : 0}
        email={activeUser ? activeUser.email : "customer@ibomone.com"}
        onSuccess={(paymentResult) => {
          setActionLoading(true);
          setLoadingMessage("Securing funds in IbomOne Escrow vault...");
          setShowPaystackModal(false);
          setTimeout(() => {
            setActionLoading(false);
            const updatedDb = updateOrderStatus(currentInvoice.id, "Paid");
            setDb(updatedDb);
            setPaymentSuccess(true);
            window.dispatchEvent(new Event("db_update"));
          }, 1500);
        }}
        onCancel={() => {
          setShowPaystackModal(false);
        }}
      />

      {paymentProcessing && (
        <Loader3D fullScreen={true} message="Processing escrow payment gateway..." />
      )}
      {actionLoading && (
        <Loader3D fullScreen={true} message={loadingMessage} />
      )}
    </div>
  );
}
