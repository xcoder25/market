import React, { useState, useEffect } from "react";
import { CreditCard, Building, Phone, Lock, CheckCircle2, AlertCircle, X, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PaystackCheckoutModal({ isOpen, onClose, amount, email, onSuccess, onCancel }) {
  const [activeChannel, setActiveChannel] = useState("card"); // card, transfer, ussd
  const [paymentStep, setPaymentStep] = useState("input"); // input, pin, otp, loading, success, error
  
  // Card Form States
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardPin, setCardPin] = useState("");
  const [otpCode, setOtpCode] = useState("");
  
  // USSD States
  const [selectedBank, setSelectedBank] = useState("");
  
  // Simulated Reference ID
  const [reference] = useState(() => "pstk_" + Math.random().toString(36).substring(2, 15));
  
  useEffect(() => {
    if (isOpen) {
      setPaymentStep("input");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      setCardPin("");
      setOtpCode("");
      setSelectedBank("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format Card Number (adds space every 4 digits)
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    let formattedValue = "";
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formattedValue += " ";
      }
      formattedValue += value[i];
    }
    setCardNumber(formattedValue.substring(0, 19));
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) {
      value = value.substring(0, 2) + "/" + value.substring(2, 4);
    }
    setCardExpiry(value.substring(0, 5));
  };

  const handlePayClick = (e) => {
    e.preventDefault();
    if (activeChannel === "card") {
      setPaymentStep("pin");
    } else if (activeChannel === "transfer") {
      setPaymentStep("loading");
      setTimeout(() => {
        setPaymentStep("success");
      }, 2500);
    } else if (activeChannel === "ussd") {
      if (!selectedBank) {
        alert("Please select a bank first.");
        return;
      }
      setPaymentStep("loading");
      setTimeout(() => {
        setPaymentStep("success");
      }, 2500);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (cardPin.length < 4) return;
    setPaymentStep("loading");
    setTimeout(() => {
      setPaymentStep("otp");
    }, 1500);
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (otpCode.length < 4) return;
    setPaymentStep("loading");
    setTimeout(() => {
      setPaymentStep("success");
    }, 2000);
  };

  const handleSuccessClose = () => {
    onSuccess({
      reference,
      status: "success",
      channel: activeChannel,
      amount
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 99999,
          padding: "16px"
        }}
      >
        <motion.div 
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 15 }}
          style={{
            width: "100%",
            maxWidth: "680px",
            backgroundColor: "#fcfcfc",
            borderRadius: "16px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            overflow: "hidden",
            color: "#333",
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            minHeight: "420px"
          }}
        >
          {/* Left Sidebar (Channels selection) */}
          <div 
            style={{
              backgroundColor: "#f5f6f7",
              borderRight: "1px solid #e1e4e6",
              padding: "24px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}
          >
            {/* Paystack logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: "900", color: "#09a5db" }}>pay</span>
              <span style={{ fontSize: "1.1rem", fontWeight: "900", color: "#3bb75e" }}>stack</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button 
                onClick={() => paymentStep === "input" && setActiveChannel("card")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: activeChannel === "card" ? "#fff" : "transparent",
                  color: activeChannel === "card" ? "#3bb75e" : "#5c6c75",
                  fontWeight: activeChannel === "card" ? "bold" : "normal",
                  textAlign: "left",
                  cursor: paymentStep === "input" ? "pointer" : "not-allowed",
                  boxShadow: activeChannel === "card" ? "0 4px 12px rgba(0,0,0,0.05)" : "none",
                  transition: "all 0.2s"
                }}
              >
                <CreditCard size={18} />
                <span style={{ fontSize: "0.85rem" }}>Pay with Card</span>
              </button>

              <button 
                onClick={() => paymentStep === "input" && setActiveChannel("transfer")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: activeChannel === "transfer" ? "#fff" : "transparent",
                  color: activeChannel === "transfer" ? "#3bb75e" : "#5c6c75",
                  fontWeight: activeChannel === "transfer" ? "bold" : "normal",
                  textAlign: "left",
                  cursor: paymentStep === "input" ? "pointer" : "not-allowed",
                  boxShadow: activeChannel === "transfer" ? "0 4px 12px rgba(0,0,0,0.05)" : "none",
                  transition: "all 0.2s"
                }}
              >
                <Building size={18} />
                <span style={{ fontSize: "0.85rem" }}>Bank Transfer</span>
              </button>

              <button 
                onClick={() => paymentStep === "input" && setActiveChannel("ussd")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: activeChannel === "ussd" ? "#fff" : "transparent",
                  color: activeChannel === "ussd" ? "#3bb75e" : "#5c6c75",
                  fontWeight: activeChannel === "ussd" ? "bold" : "normal",
                  textAlign: "left",
                  cursor: paymentStep === "input" ? "pointer" : "not-allowed",
                  boxShadow: activeChannel === "ussd" ? "0 4px 12px rgba(0,0,0,0.05)" : "none",
                  transition: "all 0.2s"
                }}
              >
                <Phone size={18} />
                <span style={{ fontSize: "0.85rem" }}>Pay with USSD</span>
              </button>
            </div>

            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#9aa8b3" }}>
                <Lock size={12} />
                <span>SECURED BY PAYSTACK</span>
              </div>
            </div>
          </div>

          {/* Right Content Pane */}
          <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", position: "relative" }}>
            {/* Header info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <span style={{ fontSize: "0.78rem", color: "#9aa8b3", display: "block" }}>{email || "customer@ibomone.com"}</span>
                <span style={{ fontSize: "0.85rem", color: "#5c6c75" }}>Pay <strong style={{ color: "#3bb75e" }}>IbomOne</strong></span>
              </div>
              <div style={{ textAlign: "right" }}>
                <h3 style={{ margin: 0, fontSize: "1.45rem", fontWeight: "900", color: "#333" }}>
                  ₦{amount.toLocaleString()}
                </h3>
              </div>
            </div>

            {/* Cancel icon */}
            {paymentStep !== "loading" && paymentStep !== "success" && (
              <button 
                onClick={() => {
                  if (onCancel) onCancel();
                  onClose();
                }}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9aa8b3"
                }}
              >
                <X size={18} />
              </button>
            )}

            {/* Simulated Payment channels content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              
              {paymentStep === "input" && (
                <div>
                  {activeChannel === "card" && (
                    <form onSubmit={handlePayClick} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: "bold", color: "#5c6c75" }}>CARD NUMBER</label>
                        <input 
                          type="text" 
                          placeholder="0000 0000 0000 0000" 
                          value={cardNumber} 
                          onChange={handleCardNumberChange} 
                          required
                          style={{
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #dcdfe3",
                            fontSize: "0.95rem",
                            outline: "none",
                            backgroundColor: "#fff",
                            color: "#333"
                          }}
                        />
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label style={{ fontSize: "0.78rem", fontWeight: "bold", color: "#5c6c75" }}>CARD EXPIRY</label>
                          <input 
                            type="text" 
                            placeholder="MM/YY" 
                            value={cardExpiry} 
                            onChange={handleExpiryChange} 
                            required
                            style={{
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #dcdfe3",
                              fontSize: "0.95rem",
                              outline: "none",
                              backgroundColor: "#fff",
                              color: "#333",
                              textAlign: "center"
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <label style={{ fontSize: "0.78rem", fontWeight: "bold", color: "#5c6c75" }}>CVV</label>
                          <input 
                            type="password" 
                            placeholder="123" 
                            maxLength="3"
                            value={cardCvv} 
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))} 
                            required
                            style={{
                              padding: "12px",
                              borderRadius: "8px",
                              border: "1px solid #dcdfe3",
                              fontSize: "0.95rem",
                              outline: "none",
                              backgroundColor: "#fff",
                              color: "#333",
                              textAlign: "center"
                            }}
                          />
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        style={{
                          backgroundColor: "#3bb75e",
                          color: "white",
                          padding: "14px",
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "0.95rem",
                          fontWeight: "bold",
                          cursor: "pointer",
                          marginTop: "16px",
                          transition: "background 0.2s"
                        }}
                      >
                        Pay ₦{amount.toLocaleString()}
                      </button>
                    </form>
                  )}

                  {activeChannel === "transfer" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center" }}>
                      <div style={{ background: "#f0fdf4", border: "1px dashed #3bb75e", padding: "16px", borderRadius: "10px" }}>
                        <small style={{ color: "#9aa8b3", fontWeight: "bold" }}>PROVidus/WEMA BANK ACCOUNT</small>
                        <h2 style={{ letterSpacing: "1px", margin: "8px 0", color: "#333" }}>9922 8833 11</h2>
                        <small style={{ color: "#5c6c75" }}>Account Name: <strong>Paystack / IbomOne Escrow</strong></small>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "#5c6c75", lineHeight: 1.45 }}>
                        Transfer the exact amount of <strong>₦{amount.toLocaleString()}</strong> to the account above. Payment completes automatically.
                      </p>
                      <button 
                        onClick={handlePayClick}
                        style={{
                          backgroundColor: "#3bb75e",
                          color: "white",
                          padding: "14px",
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "0.95rem",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        I've sent the transfer
                      </button>
                    </div>
                  )}

                  {activeChannel === "ussd" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: "bold", color: "#5c6c75" }}>CHOOSE YOUR BANK</label>
                        <select 
                          value={selectedBank} 
                          onChange={(e) => setSelectedBank(e.target.value)}
                          style={{
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #dcdfe3",
                            fontSize: "0.95rem",
                            outline: "none",
                            backgroundColor: "#fff",
                            color: "#333"
                          }}
                        >
                          <option value="">-- Choose Bank --</option>
                          <option value="GTBank">GTBank (Dial *737*1*2#)</option>
                          <option value="Zenith">Zenith Bank (Dial *966*3#)</option>
                          <option value="Access">Access Bank (Dial *901#)</option>
                          <option value="UBA">UBA (Dial *919#)</option>
                        </select>
                      </div>

                      {selectedBank && (
                        <div style={{ background: "#f8f9fa", padding: "14px", borderRadius: "8px", textAlign: "center", border: "1px solid #e1e4e6" }}>
                          <small style={{ color: "#9aa8b3" }}>DIAL THIS CODE ON YOUR MOBILE PHONE</small>
                          <h3 style={{ margin: "6px 0", color: "#3bb75e" }}>
                            {selectedBank === "GTBank" ? "*737*1*2*99#" : selectedBank === "Zenith" ? "*966*3*99#" : "*901*99#"}
                          </h3>
                        </div>
                      )}

                      <button 
                        onClick={handlePayClick}
                        style={{
                          backgroundColor: "#3bb75e",
                          color: "white",
                          padding: "14px",
                          borderRadius: "8px",
                          border: "none",
                          fontSize: "0.95rem",
                          fontWeight: "bold",
                          cursor: "pointer",
                          marginTop: "8px"
                        }}
                      >
                        Authorize & Complete Payment
                      </button>
                    </div>
                  )}
                </div>
              )}

              {paymentStep === "pin" && (
                <div style={{ textAlign: "center" }}>
                  <h4 style={{ marginBottom: "16px", color: "#333" }}>Enter Card PIN</h4>
                  <form onSubmit={handlePinSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                    <input 
                      type="password" 
                      maxLength="4" 
                      placeholder="••••" 
                      value={cardPin} 
                      onChange={(e) => setCardPin(e.target.value.replace(/\D/g, ""))}
                      required
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #dcdfe3",
                        fontSize: "1.5rem",
                        width: "120px",
                        textAlign: "center",
                        letterSpacing: "8px",
                        outline: "none",
                        backgroundColor: "#fff",
                        color: "#333"
                      }}
                    />
                    <button 
                      type="submit"
                      style={{
                        backgroundColor: "#3bb75e",
                        color: "white",
                        padding: "12px 28px",
                        borderRadius: "8px",
                        border: "none",
                        fontSize: "0.9rem",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      Submit PIN
                    </button>
                  </form>
                </div>
              )}

              {paymentStep === "otp" && (
                <div style={{ textAlign: "center" }}>
                  <h4 style={{ marginBottom: "8px", color: "#333" }}>Authorize Transaction</h4>
                  <p style={{ fontSize: "0.8rem", color: "#5c6c75", marginBottom: "16px" }}>An OTP has been sent to your simulated device. Enter it below to complete authorization.</p>
                  <form onSubmit={handleOtpSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                    <input 
                      type="text" 
                      maxLength="6" 
                      placeholder="123456" 
                      value={otpCode} 
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      required
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid #dcdfe3",
                        fontSize: "1.2rem",
                        width: "160px",
                        textAlign: "center",
                        letterSpacing: "4px",
                        outline: "none",
                        backgroundColor: "#fff",
                        color: "#333"
                      }}
                    />
                    <button 
                      type="submit"
                      style={{
                        backgroundColor: "#3bb75e",
                        color: "white",
                        padding: "12px 28px",
                        borderRadius: "8px",
                        border: "none",
                        fontSize: "0.9rem",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      Authorize Payment
                    </button>
                  </form>
                </div>
              )}

              {paymentStep === "loading" && (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <RefreshCw size={40} className="spin-loader" style={{ color: "#3bb75e", animation: "spin 1.5s linear infinite", marginBottom: "16px" }} />
                  <p style={{ color: "#5c6c75", fontSize: "0.9rem" }}>Contacting bank and securing transaction authorization...</p>
                  
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              )}

              {paymentStep === "success" && (
                <div style={{ textAlign: "center", padding: "20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <CheckCircle2 size={54} style={{ color: "#3bb75e" }} />
                  <h3 style={{ margin: 0, color: "#333", fontSize: "1.3rem" }}>Payment Successful</h3>
                  <p style={{ fontSize: "0.85rem", color: "#5c6c75" }}>Reference: <code>{reference}</code></p>
                  <button 
                    onClick={handleSuccessClose}
                    style={{
                      backgroundColor: "#3bb75e",
                      color: "white",
                      padding: "12px 36px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "0.9rem",
                      fontWeight: "bold",
                      cursor: "pointer",
                      marginTop: "12px"
                    }}
                  >
                    Done
                  </button>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
