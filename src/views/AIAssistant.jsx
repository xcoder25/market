import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Star, MapPin, ShieldCheck, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDB, queryAI } from "../db/store";

export default function AIAssistant({ activeUser, onBuyProduct, onViewFarmer }) {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: `Hello ${activeUser.name}! I am your **Ibom Agro AI Assistant**.\n\nI can search our platform database in real-time to answer questions about products, farmers, and prices in Akwa Ibom State. You can try typing or clicking these:`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestedPrompts = [
    "Find cassava near me",
    "Cheapest palm oil today",
    "Show verified fish farmers",
    "Compare garri prices across markets",
    "Which farmer has tomatoes available this week?"
  ];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSend = (textToSend) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg = {
      sender: "user",
      text: textToSend,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResult = queryAI(textToSend);
      
      const botMsg = {
        sender: "bot",
        text: aiResult.message,
        results: aiResult,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 700); // 700ms delay
  };

  const getVerificationIcon = (level) => {
    if (level === "Gold") return <span className="badge-verification gold" style={{ transform: "scale(0.85)", transformOrigin: "left" }}><ShieldCheck size={12} /> Gold</span>;
    if (level === "Silver") return <span className="badge-verification silver" style={{ transform: "scale(0.85)", transformOrigin: "left" }}><ShieldCheck size={12} /> Silver</span>;
    return <span className="badge-verification bronze" style={{ transform: "scale(0.85)", transformOrigin: "left" }}><ShieldCheck size={12} /> Phone</span>;
  };

  return (
    <div className="ai-layout">
      {/* Header */}
      <div className="chat-header" style={{ borderBottom: "1px solid var(--glass-border)", display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ padding: "8px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", color: "var(--primary)" }}>
          <Sparkles size={20} className="sparkles-anim" />
        </div>
        <div>
          <h4 style={{ margin: 0 }}>Ibom Agro AI Assistant</h4>
          <span style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>Local AI search engine. No hallucination.</span>
        </div>
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {messages.map((msg, index) => (
          <motion.div 
            key={index} 
            className={`ai-bubble ${msg.sender}`} 
            style={{ whiteSpace: "pre-line" }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div>{msg.text}</div>
            
            {/* Render search results if present */}
            {msg.results && msg.results.type === "products" && msg.results.items.length > 0 && (
              <div className="ai-results-grid">
                {msg.results.items.map(item => (
                  <div key={item.id} className="ai-results-card">
                    <img src={item.image} alt="" style={{ width: "100%", height: "80px", objectFit: "cover", borderRadius: "8px", marginBottom: "6px", border: "1px solid var(--glass-border)" }} />
                    <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--white)" }}>{item.name}</strong>
                    <div style={{ fontSize: "0.8rem", color: "var(--secondary-light)", fontWeight: "bold", margin: "2px 0" }}>
                      ₦{item.price.toLocaleString()} / {item.unit}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>📍 {item.town}, {item.lga}</div>
                    
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ width: "100%", fontSize: "0.75rem", padding: "6px", marginTop: "8px" }}
                      onClick={() => onBuyProduct(item)}
                    >
                      Buy Now
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Render farmers if present */}
            {msg.results && msg.results.type === "farmers" && msg.results.items.length > 0 && (
              <div className="ai-results-grid">
                {msg.results.items.map(farmer => (
                  <div key={farmer.id} className="ai-results-card" style={{ textAlign: "center" }}>
                    <img src={farmer.avatar} alt="" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 6px auto", display: "block", border: "1.5px solid var(--primary)" }} />
                    <strong style={{ color: "white" }}>{farmer.name}</strong>
                    <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--gray-600)" }}>{farmer.farmName}</div>
                    <div style={{ margin: "4px 0" }}>{getVerificationIcon(farmer.verification)}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>📍 {farmer.town}, {farmer.lga}</div>
                    
                    <button 
                      className="btn btn-outline btn-sm" 
                      style={{ width: "100%", fontSize: "0.75rem", padding: "6px", marginTop: "8px" }}
                      onClick={() => onViewFarmer(farmer)}
                    >
                      View Farm
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Render market prices list if present */}
            {msg.results && msg.results.type === "market_prices" && msg.results.prices && (
              <div style={{ marginTop: "12px", background: "rgba(0,0,0,0.15)", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "8px", overflowX: "auto" }}>
                <table className="prices-table" style={{ fontSize: "0.8rem", margin: 0, width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px 12px" }}>Market</th>
                      <th style={{ padding: "8px 12px" }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "8px 12px" }}>Itam Market (Uyo)</td>
                      <td style={{ padding: "8px 12px", fontWeight: "bold", color: "var(--secondary-light)" }}>₦{msg.results.prices.prices.Itam.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 12px" }}>Akpan Andem Market</td>
                      <td style={{ padding: "8px 12px", fontWeight: "bold", color: "var(--secondary-light)" }}>₦{msg.results.prices.prices["Akpan Andem"].toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 12px" }}>Ikot Ekpene Market</td>
                      <td style={{ padding: "8px 12px", fontWeight: "bold", color: "var(--secondary-light)" }}>₦{msg.results.prices.prices["Ikot Ekpene"].toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px 12px" }}>Eket Market</td>
                      <td style={{ padding: "8px 12px", fontWeight: "bold", color: "var(--secondary-light)" }}>₦{msg.results.prices.prices.Eket.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        ))}
        {isTyping && (
          <motion.div 
            className="ai-bubble bot"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <div style={{ display: "flex", gap: "4px" }}>
              {[0, 1, 2].map(dot => (
                <motion.div
                  key={dot}
                  style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--primary)" }}
                  animate={{ y: ["0px", "-6px", "0px"] }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6,
                    delay: dot * 0.15,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>AI is searching database...</span>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="ai-suggested-prompts">
        {suggestedPrompts.map((p, i) => (
          <button 
            key={i} 
            className="ai-prompt-chip" 
            onClick={() => handleSend(p)}
            disabled={isTyping}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputText);
        }}
        className="chat-input-area"
        style={{ borderTop: "1px solid var(--glass-border)" }}
      >
        <input 
          type="text" 
          placeholder="Ask AI e.g. Find cassava near me..." 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="chat-input"
          disabled={isTyping}
          required
        />
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={isTyping} 
          style={{ padding: "12px 20px" }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
