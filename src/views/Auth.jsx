import React, { useState } from "react";
import { LogIn, UserPlus, Shield, Eye, EyeOff, MapPin, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { AKWA_IBOM_LOCATIONS, getDB } from "../db/store";
import { auth, db as firestoreDb, isConfigured } from "../lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function Auth({ onAuthSuccess, onBackToLanding }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Buyer");
  const [lga, setLga] = useState("Uyo");
  const [town, setTown] = useState("");
  const [address, setAddress] = useState("");
  const [farmName, setFarmName] = useState("");
  const [farmType, setFarmType] = useState("Crops & Processing");
  const [bio, setBio] = useState("");

  const selectedLgaObj = AKWA_IBOM_LOCATIONS.find((loc) => loc.lga === lga);
  const townsList = selectedLgaObj ? selectedLgaObj.towns : [];

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!isConfigured) {
      // MOCK LOCAL STORAGE REALTIME AUTHENTICATION FALLBACK
      try {
        const localDb = getDB();
        if (isLogin) {
          const foundUser = localDb.users.find(
            (u) => u.email.toLowerCase() === email.toLowerCase()
          );
          if (foundUser) {
            localDb.currentUser = foundUser;
            localDb.currentRole = foundUser.role;
            localStorage.setItem("ibom_agro_market_db", JSON.stringify(localDb));
            window.dispatchEvent(new Event("db_update"));
            onAuthSuccess(foundUser);
          } else {
            setError("Local user account not found. Try one of the test accounts below.");
          }
        } else {
          if (!name || !phone || !town) {
            setError("Please fill in all required fields.");
            setLoading(false);
            return;
          }
          const uid = "usr-" + Date.now();
          const userProfile = {
            id: uid,
            email,
            name,
            phone,
            role,
            lga,
            town,
            address,
            state: "Akwa Ibom",
            avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999999)}?w=150`,
            followers: 0,
            rating: 5.0,
            reviewsCount: 0,
            verification: role === "Farmer" ? "Bronze" : null,
            createdAt: new Date().toISOString()
          };

          if (role === "Farmer") {
            userProfile.farmName = farmName || `${name}'s Farm`;
            userProfile.farmType = farmType;
            userProfile.bio = bio || "Fresh agricultural products from Akwa Ibom State.";
            userProfile.yearsFarming = 1;
            userProfile.harvestCalendar = [];
          }

          localDb.users.push(userProfile);
          localDb.currentUser = userProfile;
          localDb.currentRole = role;

          // Audit log
          const newLog = {
            id: "al-" + Date.now(),
            timestamp: new Date().toISOString(),
            action: "User Registered",
            details: `${name} registered locally as ${role} in ${lga}/${town}`
          };
          localDb.auditLogs.unshift(newLog);

          localStorage.setItem("ibom_agro_market_db", JSON.stringify(localDb));
          window.dispatchEvent(new Event("db_update"));
          onAuthSuccess(userProfile);
        }
      } catch (err) {
        setError(err.message || "A local authentication error occurred.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // REAL FIREBASE AUTHENTICATION
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        const userDocRef = doc(firestoreDb, "users", uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          onAuthSuccess(userDoc.data());
        } else {
          setError("User profile data not found in database.");
        }
      } else {
        if (!name || !phone || !town) {
          setError("Please fill in all required fields.");
          setLoading(false);
          return;
        }

        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } catch (authErr) {
          throw authErr;
        }

        try {
          const uid = userCredential.user.uid;
          const userProfile = {
            id: uid,
            email,
            name,
            phone,
            role,
            lga,
            town,
            address,
            state: "Akwa Ibom",
            avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999999)}?w=150`,
            followers: 0,
            rating: 5.0,
            reviewsCount: 0,
            verification: role === "Farmer" ? "Bronze" : null,
            createdAt: new Date().toISOString()
          };

          if (role === "Farmer") {
            userProfile.farmName = farmName || `${name}'s Farm`;
            userProfile.farmType = farmType;
            userProfile.bio = bio || "Fresh agricultural products from Akwa Ibom State.";
            userProfile.yearsFarming = 1;
            userProfile.harvestCalendar = [];
          }

          await setDoc(doc(firestoreDb, "users", uid), userProfile);
          onAuthSuccess(userProfile);
        } catch (dbErr) {
          if (userCredential && userCredential.user) {
            try {
              await userCredential.user.delete();
            } catch (delErr) {
              console.error("Failed to delete auth user after database registration failed:", delErr);
            }
          }
          throw dbErr;
        }
      }
    } catch (err) {
      console.error(err);
      const code = err.code || "";
      if (code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else if (code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email address format.");
      } else if (code === "auth/user-disabled") {
        setError("This user account has been disabled.");
      } else if (code === "auth/too-many-requests") {
        setError("Access to this account has been temporarily disabled due to many failed login attempts. Try again later or reset your password.");
      } else {
        setError(err.message || "An authentication error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResetEmailSent(false);

    if (!isConfigured) {
      // Mock Forgot Password
      try {
        const localDb = getDB();
        const foundUser = localDb.users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        );
        if (foundUser) {
          setResetEmailSent(true);
        } else {
          setError("Local user account not found with this email. Try bassey.kitchen@cook.ng");
        }
      } catch (err) {
        setError("A local reset error occurred.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Real Firebase Reset
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (err) {
      console.error(err);
      const code = err.code || "";
      if (code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email address format.");
      } else {
        setError(err.message || "Could not send password reset email.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoUser = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  const demoAccounts = [
    { name: "Chef Bassey (Buyer)", email: "bassey.kitchen@cook.ng" },
    { name: "Etim Okon (Farmer)", email: "etim.okon@agro.ng" },
    { name: "Ibom Express (Logistics)", email: "deliveries@ibomexpress.com" },
    { name: "Mfon Udo (Admin)", email: "admin@ibommarket.com" }
  ];

  return (
    <div className="auth-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "90vh", padding: "20px" }}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="auth-card card"
        style={{ maxWidth: "500px", width: "100%", background: "rgba(10, 22, 15, 0.85)", border: "1px solid var(--glass-border)", padding: "32px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div className="auth-brand" style={{ fontSize: "1.6rem", fontWeight: 900, fontFamily: "var(--font-display)", color: "white" }}>
            Ibom Agro <span style={{ color: "var(--primary)" }}>Market</span>
          </div>
          <button onClick={onBackToLanding} className="btn btn-outline btn-sm" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
            ← Home
          </button>
        </div>
        
        <p className="auth-subtitle" style={{ color: "var(--gray-600)", fontSize: "0.85rem", marginBottom: "20px" }}>
          {isLogin 
            ? "Connect with Akwa Ibom farmers and carriers in realtime" 
            : "Register to trade crops, schedule logistics, and query live market prices"}
        </p>

        {!isConfigured && (
          <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "8px", padding: "10px 14px", marginBottom: "20px", fontSize: "0.8rem", color: "var(--secondary-light)", lineHeight: 1.4 }}>
            <strong>Local Mode Active:</strong> Firebase API keys not found in <code>.env.local</code>. Running securely on local storage sync. Try test logins below:
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: "8px", padding: "10px 14px", marginBottom: "20px", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: "0 0 8px 0", color: "white", fontSize: "1.2rem", fontWeight: "700" }}>Reset Password</h3>
            
            {resetEmailSent ? (
              <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", padding: "14px", color: "var(--primary-light)", fontSize: "0.85rem", lineHeight: "1.4" }}>
                <strong>Reset Link Sent!</strong>
                {!isConfigured ? (
                  <p style={{ margin: "4px 0 0 0" }}>
                    A password reset simulation link has been sent to <strong>{email}</strong>.<br />
                    <em>(Local Mode: In this simulation, the password remains <strong>"password123"</strong>)</em>.
                  </p>
                ) : (
                  <p style={{ margin: "4px 0 0 0" }}>
                    A password reset link has been sent to <strong>{email}</strong>. Please check your inbox.
                  </p>
                )}
              </div>
            ) : (
              <>
                <p style={{ color: "var(--gray-600)", fontSize: "0.82rem", margin: 0 }}>
                  Enter your email address below, and we'll send you a link to reset your password.
                </p>
                <div className="form-field">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    placeholder="e.g. user@ibomagro.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px", marginTop: "8px" }} disabled={loading}>
                  {loading ? "Sending link..." : "Send Reset Link"}
                </button>
              </>
            )}

            <button
              type="button"
              className="btn btn-outline"
              style={{ width: "100%", padding: "12px" }}
              onClick={() => {
                setIsForgotPassword(false);
                setResetEmailSent(false);
                setError("");
              }}
            >
              Back to Log In
            </button>
          </form>
        ) : (
          <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Sign Up Fields */}
            {!isLogin && (
              <>
                <div className="form-field">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Samuel Akpan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0803XXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>User Role *</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="Buyer">Buyer (Hotel, Chef, Retailer)</option>
                    <option value="Farmer">Farmer (Producer)</option>
                    <option value="Logistics Partner">Logistics Delivery Carrier</option>
                  </select>
                </div>

                {/* Farmer Profile Fields */}
                {role === "Farmer" && (
                  <div style={{ border: "1px solid var(--glass-border)", padding: "14px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "12px", background: "rgba(255,255,255,0.01)" }}>
                    <div className="form-field">
                      <label>Farm Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Etim Gold Agri-Ventures"
                        value={farmName}
                        onChange={(e) => setFarmName(e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Farm Category</label>
                      <select value={farmType} onChange={(e) => setFarmType(e.target.value)}>
                        <option value="Crops & Processing">Crops & Processing</option>
                        <option value="Fish Farming">Fish Farming</option>
                        <option value="Poultry">Poultry</option>
                        <option value="Livestock">Livestock</option>
                        <option value="Palm Processing">Palm Processing</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Bio / Description</label>
                      <textarea
                        placeholder="Tell buyers about your produce..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {/* Location Fields */}
                <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: 0 }}>
                  <div className="form-field">
                    <label>LGA *</label>
                    <select value={lga} onChange={(e) => { setLga(e.target.value); setTown(""); }}>
                      {AKWA_IBOM_LOCATIONS.map((loc) => (
                        <option key={loc.lga} value={loc.lga}>{loc.lga}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Town *</label>
                    <select value={town} onChange={(e) => setTown(e.target.value)} required>
                      <option value="" disabled>Select Town...</option>
                      {townsList.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Physical Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 14 Ikpa Road, Uyo"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Common Fields */}
            <div className="form-field">
              <label>Email Address *</label>
              <input
                type="email"
                placeholder="e.g. user@ibomagro.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label>Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: "40px", width: "100%" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--gray-600)"
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isLogin && (
                <div style={{ textAlign: "right", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError("");
                    }}
                    style={{ background: "none", border: "none", color: "var(--primary-light)", fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline" }}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px", marginTop: "8px" }} disabled={loading}>
              {loading ? (
                <span className="spinner">Authenticating...</span>
              ) : isLogin ? (
                <>
                  <LogIn size={16} style={{ marginRight: "6px" }} /> Log In
                </>
              ) : (
                <>
                  <UserPlus size={16} style={{ marginRight: "6px" }} /> Register Profile
                </>
              )}
            </button>
          </form>
        )}

        {isLogin && !isForgotPassword && !isConfigured && (
          <div style={{ marginTop: "20px", borderTop: "1px solid var(--glass-border)", paddingTop: "14px" }}>
            <small style={{ color: "var(--gray-600)", display: "block", marginBottom: "8px", fontWeight: "bold" }}>CLICK TO AUTO-FILL TEST CREDENTIALS:</small>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {demoAccounts.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFillDemoUser(acc.email)}
                  className="btn btn-outline"
                  style={{ fontSize: "0.75rem", padding: "6px", textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  ⚡ {acc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isForgotPassword && (
          <div className="auth-toggle" style={{ marginTop: "24px", textAlign: "center", fontSize: "0.9rem" }}>
            {isLogin ? (
              <p style={{ color: "var(--gray-600)" }}>
                New to the market?{" "}
                <button 
                  type="button" 
                  onClick={() => setIsLogin(false)}
                  style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }}
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p style={{ color: "var(--gray-600)" }}>
                Already registered?{" "}
                <button 
                  type="button" 
                  onClick={() => setIsLogin(true)}
                  style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }}
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
