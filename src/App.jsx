import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  User, 
  MessageSquare, 
  Bell, 
  ShieldCheck, 
  LogOut, 
  UserPlus, 
  RefreshCw, 
  Activity, 
  Award, 
  Shield, 
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  TrendingUp,
  LogIn
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getDB, 
  saveDB 
} from "./db/store";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db as firestoreDb, isConfigured, auth } from "./lib/firebase";

// Import Views
import Landing from "./views/Landing";
import Auth from "./views/Auth";
import Marketplace from "./views/Marketplace";
import FarmerDashboard from "./views/FarmerDashboard";
import LogisticsDashboard from "./views/LogisticsDashboard";
import AdminDashboard from "./views/AdminDashboard";
import MarketPrices from "./views/MarketPrices";
import Messaging from "./views/Messaging";
import AIAssistant from "./views/AIAssistant";

import "./App.css";

export default function App() {
  const [db, setDb] = useState(getDB());
  const [currentView, setCurrentView] = useState("landing"); // landing, auth, marketplace, farmer_dashboard, logistics_dashboard, admin_dashboard, messaging, prices, ai_assistant
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [chatPreselectedRecipient, setChatPreselectedRecipient] = useState(null);

  // Network connection status state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isOfflineDemoMode = localStorage.getItem("ibom_offline_mode") === "true";

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleExitOfflineMode = () => {
    localStorage.removeItem("ibom_offline_mode");
    window.location.reload();
  };

  // Load local user session from localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("ibom_current_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [currentRole, setCurrentRole] = useState(() => {
    return localStorage.getItem("ibom_current_role") || null;
  });

  // Toasts state and Ref
  const [toasts, setToasts] = useState([]);
  const lastToastedNotifIdRef = useRef(null);

  const addToast = (title, message) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts(prev => [...prev, { id, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Realtime Firestore synchronization listener
  useEffect(() => {
    if (!isConfigured || !firestoreDb) return;

    const docRef = doc(firestoreDb, "market", "state");
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const remoteState = docSnap.data().state;
        const localStateStr = localStorage.getItem("ibom_agro_market_db");
        
        // Merge the global remote state with local user sessions to keep tabs isolated
        const currentLocalDb = getDB();
        const mergedState = {
          ...remoteState,
          currentUser: currentLocalDb.currentUser,
          currentRole: currentLocalDb.currentRole
        };
        
        if (JSON.stringify(mergedState) !== localStateStr) {
          localStorage.setItem("ibom_agro_market_db", JSON.stringify(mergedState));
          setDb(mergedState);
          window.dispatchEvent(new Event("db_update"));
        }
      } else {
        // Initial state sync push to firestore if remote document doesn't exist
        const initialDb = getDB();
        setDoc(docRef, { state: initialDb }).catch(err => console.error("Firestore init error:", err));
      }
    }, (err) => {
      console.warn("Firestore sync connection offline or unreachable:", err.message);
    });

    return () => unsubscribe();
  }, []);

  // Update local React state when the DB is modified locally on this machine
  useEffect(() => {
    const handleUpdate = () => {
      const freshDb = getDB();
      setDb(freshDb);

      // Intercept and display toast alert for new notifications
      if (freshDb.notifications.length > 0) {
        const latestNotif = freshDb.notifications[0];
        if (latestNotif.id !== lastToastedNotifIdRef.current) {
          lastToastedNotifIdRef.current = latestNotif.id;
          
          const savedUserStr = localStorage.getItem("ibom_current_user");
          const localUserObj = savedUserStr ? JSON.parse(savedUserStr) : null;
          
          const isForMe = localUserObj && latestNotif.userId === localUserObj.id;
          const isGlobal = latestNotif.userId === "all";

          if (isForMe || isGlobal) {
            addToast(latestNotif.title, latestNotif.message);
          }
        }
      }

      // Synchronize session states
      if (freshDb.currentUser) {
        setCurrentUser(freshDb.currentUser);
        setCurrentRole(freshDb.currentRole);
        localStorage.setItem("ibom_current_user", JSON.stringify(freshDb.currentUser));
        localStorage.setItem("ibom_current_role", freshDb.currentRole);
      }
    };

    const handleAddToast = (e) => {
      if (e.detail) {
        addToast(e.detail.title, e.detail.message);
      }
    };

    window.addEventListener("db_update", handleUpdate);
    window.addEventListener("add_toast", handleAddToast);

    return () => {
      window.removeEventListener("db_update", handleUpdate);
      window.removeEventListener("add_toast", handleAddToast);
    };
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    localStorage.setItem("ibom_current_user", JSON.stringify(user));
    localStorage.setItem("ibom_current_role", user.role);

    // Save in local storage DB as active session
    const currentDb = getDB();
    currentDb.currentUser = user;
    currentDb.currentRole = user.role;
    
    // Add to users catalog if registering
    const userExists = currentDb.users.some(u => u.id === user.id);
    if (!userExists) {
      currentDb.users.push(user);
    } else {
      const idx = currentDb.users.findIndex(u => u.id === user.id);
      currentDb.users[idx] = { ...currentDb.users[idx], ...user };
    }
    
    saveDB(currentDb);
    setDb(currentDb);

    // Dynamic routing after login
    if (user.role === "Farmer") setCurrentView("farmer_dashboard");
    else if (user.role === "Logistics Partner") setCurrentView("logistics_dashboard");
    else if (user.role === "Admin") setCurrentView("admin_dashboard");
    else setCurrentView("marketplace");
    
    window.dispatchEvent(new Event("db_update"));
  };

  const handleLogout = () => {
    if (isConfigured && auth) {
      import("firebase/auth").then(({ signOut }) => signOut(auth));
    }
    
    // Clear offline fallback so it tries real connection next time
    localStorage.removeItem("ibom_offline_mode");
    
    setCurrentUser(null);
    setCurrentRole(null);
    localStorage.removeItem("ibom_current_user");
    localStorage.removeItem("ibom_current_role");

    const currentDb = getDB();
    currentDb.currentUser = null;
    currentDb.currentRole = null;
    saveDB(currentDb);
    setDb(currentDb);
    
    setCurrentView("landing");
    window.dispatchEvent(new Event("db_update"));
  };

  const handleMarkNotificationsRead = () => {
    if (!currentUser) return;
    const updatedDb = db;
    updatedDb.notifications.forEach(n => {
      if (n.userId === currentUser.id) n.read = true;
    });
    saveDB(updatedDb);
    setDb(getDB());
    window.dispatchEvent(new Event("db_update"));
  };

  // Switch to Messaging view and preselect a contact
  const handleOpenChat = (recipientId) => {
    if (!currentUser) {
      setCurrentView("auth");
      return;
    }
    setChatPreselectedRecipient(recipientId);
    setCurrentView("messaging");
  };

  // Buy a product from AI Bot card action
  const handleBuyProductFromBot = (product) => {
    setCurrentView("marketplace");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open_buy_modal", { detail: product }));
    }, 100);
  };

  // View farmer profile from AI Bot card action
  const handleViewFarmerFromBot = (farmer) => {
    setCurrentView("marketplace");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open_farmer_modal", { detail: farmer }));
    }, 100);
  };

  // Get responsive bottom navigation bar options based on auth
  const getMobileNavItems = () => {
    const items = [];
    if (!currentUser) {
      items.push({ id: "landing", label: "Home", icon: <Activity size={20} /> });
      items.push({ id: "marketplace", label: "Market", icon: <ShoppingBag size={20} /> });
      items.push({ id: "prices", label: "Prices", icon: <TrendingUp size={20} /> });
      items.push({ id: "auth", label: "Login", icon: <LogIn size={20} /> });
      return items;
    }

    if (currentRole === "Buyer") {
      items.push({ id: "marketplace", label: "Market", icon: <ShoppingBag size={20} /> });
      items.push({ id: "prices", label: "Indices", icon: <TrendingUp size={20} /> });
      items.push({ id: "ai_assistant", label: "AI Help", icon: <Sparkles size={20} /> });
    } else if (currentRole === "Farmer") {
      items.push({ id: "farmer_dashboard", label: "Hub", icon: <Activity size={20} /> });
      items.push({ id: "prices", label: "Indices", icon: <TrendingUp size={20} /> });
    } else if (currentRole === "Logistics Partner") {
      items.push({ id: "logistics_dashboard", label: "Logistics", icon: <Activity size={20} /> });
    } else if (currentRole === "Admin") {
      items.push({ id: "admin_dashboard", label: "Admin", icon: <ShieldCheck size={20} /> });
    }
    items.push({ id: "messaging", label: "Chats", icon: <MessageSquare size={20} /> });
    return items;
  };

  // Unread notifications filter
  const myNotifications = currentUser ? db.notifications.filter(n => n.userId === currentUser.id) : [];
  const unreadNotifCount = myNotifications.filter(n => !n.read).length;

  return (
    <div className="app-container">
      {/* Offline Status Banner */}
      <AnimatePresence>
        {(!isOnline || isOfflineDemoMode) && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="network-status-banner"
            style={{
              background: isOfflineDemoMode 
                ? "rgba(245, 158, 11, 0.18)" 
                : "rgba(239, 68, 68, 0.18)",
              backdropFilter: "blur(12px)",
              borderBottom: `1px solid ${isOfflineDemoMode ? "var(--warning)" : "var(--danger)"}`,
              padding: "10px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.85rem",
              zIndex: 1100,
              gap: "12px",
              color: "white",
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isOfflineDemoMode ? (
                <>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--warning)" }} />
                  <span><strong>Demo Mode:</strong> You are currently simulating offline mode. Changes are saved locally.</span>
                </>
              ) : (
                <>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--danger)" }} />
                  <span><strong>Offline:</strong> Firestore sync connection is unreachable. Real-time updates paused.</span>
                </>
              )}
            </div>
            
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {isOfflineDemoMode ? (
                <button
                  className="btn btn-primary btn-sm"
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.75rem",
                    background: "var(--primary)",
                    borderColor: "var(--primary)",
                    color: "white",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                  onClick={handleExitOfflineMode}
                >
                  Reconnect
                </button>
              ) : (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.75rem",
                    background: "var(--warning)",
                    borderColor: "var(--warning)",
                    color: "black",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    localStorage.setItem("ibom_offline_mode", "true");
                    window.location.reload();
                  }}
                >
                  Switch to Offline Demo
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main App Navigation */}
      <nav className="main-navbar">
        <a href="#" className="nav-brand" onClick={() => setCurrentView("landing")}>
          Ibom Agro <span>Market</span>
        </a>

        {/* Dynamic Navigation Links */}
        <ul className="nav-links">
          {currentUser ? (
            <>
              {currentRole === "Buyer" && (
                <>
                  <li><a className={`nav-link ${currentView === "marketplace" ? "active" : ""}`} onClick={() => setCurrentView("marketplace")}>Marketplace</a></li>
                  <li><a className={`nav-link ${currentView === "prices" ? "active" : ""}`} onClick={() => setCurrentView("prices")}>Market Prices</a></li>
                  <li><a className={`nav-link ${currentView === "ai_assistant" ? "active" : ""}`} onClick={() => setCurrentView("ai_assistant")}>AI Assistant</a></li>
                </>
              )}
              {currentRole === "Farmer" && (
                <>
                  <li><a className={`nav-link ${currentView === "farmer_dashboard" ? "active" : ""}`} onClick={() => setCurrentView("farmer_dashboard")}>Farmer Dashboard</a></li>
                  <li><a className={`nav-link ${currentView === "prices" ? "active" : ""}`} onClick={() => setCurrentView("prices")}>Market Indices</a></li>
                </>
              )}
              {currentRole === "Logistics Partner" && (
                <>
                  <li><a className={`nav-link ${currentView === "logistics_dashboard" ? "active" : ""}`} onClick={() => setCurrentView("logistics_dashboard")}>Logistics Hub</a></li>
                </>
              )}
              {currentRole === "Admin" && (
                <>
                  <li><a className={`nav-link ${currentView === "admin_dashboard" ? "active" : ""}`} onClick={() => setCurrentView("admin_dashboard")}>Admin Panel</a></li>
                </>
              )}
              <li><a className={`nav-link ${currentView === "messaging" ? "active" : ""}`} onClick={() => setCurrentView("messaging")}>Messages</a></li>
            </>
          ) : (
            <>
              <li><a className={`nav-link ${currentView === "landing" ? "active" : ""}`} onClick={() => setCurrentView("landing")}>Home</a></li>
              <li><a className={`nav-link ${currentView === "marketplace" ? "active" : ""}`} onClick={() => setCurrentView("marketplace")}>Marketplace</a></li>
              <li><a className={`nav-link ${currentView === "prices" ? "active" : ""}`} onClick={() => setCurrentView("prices")}>Market Prices</a></li>
              <li><a className={`nav-link ${currentView === "ai_assistant" ? "active" : ""}`} onClick={() => setCurrentView("ai_assistant")}>AI Assistant</a></li>
            </>
          )}
        </ul>

        {/* User profile / Guest Login */}
        <div className="nav-actions">
          {!isConfigured && (
            <span style={{ fontSize: "0.75rem", background: "rgba(245, 158, 11, 0.12)", color: "var(--secondary-light)", padding: "4px 10px", borderRadius: "20px", fontWeight: "bold" }}>
              Local Mode
            </span>
          )}

          {currentUser ? (
            <>
              {/* Notification Button */}
              <button 
                className="icon-badge-btn"
                onClick={() => {
                  setShowNotifDrawer(!showNotifDrawer);
                  if (!showNotifDrawer) {
                    handleMarkNotificationsRead();
                  }
                }}
              >
                <Bell size={20} />
                {unreadNotifCount > 0 && <span className="badge-count">{unreadNotifCount}</span>}
              </button>

              {/* Active User Summary */}
              <div className="user-profile-summary">
                <img src={currentUser.avatar} alt={currentUser.name} className="avatar-small" />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "bold", lineHeight: 1.1, color: "white" }}>{currentUser.name}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--gray-600)" }}>{currentRole}</span>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="icon-badge-btn" 
                  title="Log Out" 
                  style={{ marginLeft: "8px", padding: "6px", background: "none", border: "none" }}
                >
                  <LogOut size={16} style={{ color: "var(--danger)" }} />
                </button>
              </div>
            </>
          ) : (
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => setCurrentView("auth")}
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Notifications Drawer */}
      <AnimatePresence>
        {showNotifDrawer && currentUser && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="notifications-drawer"
          >
            <div className="notif-header">
              <h4>Notifications</h4>
              <button 
                className="sim-btn" 
                style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                onClick={() => setShowNotifDrawer(false)}
              >
                Close
              </button>
            </div>
            {myNotifications.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--gray-600)", padding: "20px", fontSize: "0.85rem" }}>No notifications.</p>
            ) : (
              myNotifications.map(n => (
                <div key={n.id} className={`notif-item ${!n.read ? "unread" : ""}`}>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-message">{n.message}</div>
                  <span className="notif-time">{new Date(n.timestamp).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Views routing container with transitions */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView + "_" + (currentUser ? currentUser.id : "guest")}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            style={{ width: "100%", height: "100%" }}
          >
            {currentView === "landing" && (
              <Landing 
                onExplore={() => setCurrentView("marketplace")}
                onAuthClick={() => {
                  if (currentUser) {
                    if (currentRole === "Farmer") setCurrentView("farmer_dashboard");
                    else if (currentRole === "Logistics Partner") setCurrentView("logistics_dashboard");
                    else if (currentRole === "Admin") setCurrentView("admin_dashboard");
                    else setCurrentView("marketplace");
                  } else {
                    setCurrentView("auth");
                  }
                }}
                db={db}
              />
            )}
            {currentView === "auth" && (
              <Auth 
                onAuthSuccess={handleAuthSuccess} 
                onBackToLanding={() => setCurrentView("landing")}
              />
            )}
            {currentView === "marketplace" && (
              <Marketplace 
                activeUser={currentUser} 
                onSwitchView={setCurrentView} 
                onOpenChat={handleOpenChat} 
              />
            )}
            {currentView === "farmer_dashboard" && currentUser && (
              <FarmerDashboard 
                activeUser={currentUser} 
                onSwitchView={setCurrentView} 
              />
            )}
            {currentView === "logistics_dashboard" && currentUser && (
              <LogisticsDashboard 
                activeUser={currentUser} 
              />
            )}
            {currentView === "admin_dashboard" && currentUser && (
              <AdminDashboard />
            )}
            {currentView === "prices" && (
              <MarketPrices />
            )}
            {currentView === "messaging" && currentUser && (
              <Messaging 
                activeUser={currentUser} 
                preselectedRecipientId={chatPreselectedRecipient} 
                onClosePreselected={() => setChatPreselectedRecipient(null)} 
              />
            )}
            {currentView === "ai_assistant" && (
              <AIAssistant 
                activeUser={currentUser || { name: "Guest" }} 
                onBuyProduct={handleBuyProductFromBot} 
                onViewFarmer={handleViewFarmerFromBot} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation Menu */}
      <div className="mobile-bottom-nav">
        {getMobileNavItems().map(item => (
          <button 
            key={item.id}
            className={`mobile-nav-item ${currentView === item.id ? "active" : ""}`}
            onClick={() => setCurrentView(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Toast Notifications Container */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div 
              key={t.id}
              initial={{ opacity: 0, x: 50, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="toast-alert"
            >
              <strong>{t.title}</strong>
              <p>{t.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
