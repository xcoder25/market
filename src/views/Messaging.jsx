import React, { useState, useEffect, useRef } from "react";
import { Send, Image, MapPin, Search, User, ShieldCheck, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDB, sendMessage } from "../db/store";

export default function Messaging({ activeUser, preselectedRecipientId, onClosePreselected }) {
  const [db, setDb] = useState(getDB());
  const [activeThread, setActiveThread] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileShowChatMain, setMobileShowChatMain] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleUpdate = () => {
      setDb(getDB());
    };
    window.addEventListener("db_update", handleUpdate);
    return () => window.removeEventListener("db_update", handleUpdate);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter threads for current user
  const myThreads = db.messages.filter(t => t.members.includes(activeUser.id));

  // Determine active thread
  useEffect(() => {
    if (preselectedRecipientId) {
      // Find or create thread for preselected recipient
      let thread = myThreads.find(t => t.members.includes(preselectedRecipientId));
      if (!thread) {
        // Create in memory representation first
        thread = {
          id: "temp-" + Date.now(),
          members: [activeUser.id, preselectedRecipientId],
          messages: []
        };
      }
      setActiveThread(thread);
      setMobileShowChatMain(true);
      if (onClosePreselected) onClosePreselected();
    } else if (myThreads.length > 0 && !activeThread) {
      // Don't auto-open on mobile to avoid covering the thread list immediately
      if (!isMobile) {
        setActiveThread(myThreads[0]);
      }
    }
  }, [preselectedRecipientId, myThreads, activeThread, activeUser, isMobile]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThread, db]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeThread) return;

    const recipientId = activeThread.members.find(m => m !== activeUser.id);
    
    // Send message to store
    const updatedDb = sendMessage(recipientId, messageText);
    setDb(updatedDb);
    setMessageText("");

    // Update active thread with fresh data
    const freshThread = updatedDb.messages.find(t => t.members.includes(activeUser.id) && t.members.includes(recipientId));
    if (freshThread) {
      setActiveThread(freshThread);
    }
    
    window.dispatchEvent(new Event("db_update"));
  };

  const handleShareLocation = () => {
    if (!activeThread) return;
    const recipientId = activeThread.members.find(m => m !== activeUser.id);
    const locText = `📍 Shared Location: ${activeUser.town}, ${activeUser.lga} LGA (GPS: 5.0392° N, 7.9284° E)`;
    
    const updatedDb = sendMessage(recipientId, locText, null, { lga: activeUser.lga, town: activeUser.town });
    setDb(updatedDb);
    
    const freshThread = updatedDb.messages.find(t => t.members.includes(activeUser.id) && t.members.includes(recipientId));
    if (freshThread) setActiveThread(freshThread);
    window.dispatchEvent(new Event("db_update"));
  };

  const handleShareImage = () => {
    if (!activeThread) return;
    const recipientId = activeThread.members.find(m => m !== activeUser.id);
    const imgUrl = "https://images.unsplash.com/photo-1590005354167-6da97870c913?w=400";
    
    const updatedDb = sendMessage(recipientId, "Shared a product photo:", imgUrl);
    setDb(updatedDb);
    
    const freshThread = updatedDb.messages.find(t => t.members.includes(activeUser.id) && t.members.includes(recipientId));
    if (freshThread) setActiveThread(freshThread);
    window.dispatchEvent(new Event("db_update"));
  };

  const getRecipientDetails = (thread) => {
    if (!thread) return {};
    const recId = thread.members.find(m => m !== activeUser.id);
    return db.users.find(u => u.id === recId) || { name: "Ibom Agro User", role: "Member" };
  };

  const getThreadLastMessage = (thread) => {
    if (!thread || !thread.messages || thread.messages.length === 0) return "Start chatting...";
    const last = thread.messages[thread.messages.length - 1];
    return last.text;
  };

  const getThreadLastTime = (thread) => {
    if (!thread || !thread.messages || thread.messages.length === 0) return "";
    const last = thread.messages[thread.messages.length - 1];
    return new Date(last.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeRecipient = getRecipientDetails(activeThread);

  return (
    <div className="chat-container">
      {/* Sidebar List */}
      <div className={`chat-sidebar ${isMobile && mobileShowChatMain ? "hidden-mobile" : ""}`}>
        <div className="chat-search">
          <div style={{ position: "relative" }}>
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="filter-input"
              style={{ paddingLeft: "36px" }}
            />
            <Search size={16} style={{ position: "absolute", left: "12px", top: "15px", color: "var(--gray-600)" }} />
          </div>
        </div>

        <div className="chat-threads-list">
          {myThreads.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--gray-600)", padding: "20px" }}>No active chats.</p>
          ) : (
            myThreads.filter(t => {
              const rec = getRecipientDetails(t);
              return rec.name.toLowerCase().includes(searchQuery.toLowerCase());
            }).map(t => {
              const rec = getRecipientDetails(t);
              const isActive = activeThread && (activeThread.id === t.id || (t.id.toString().startsWith("temp") && activeThread.members.includes(rec.id)));
              return (
                <div 
                  key={t.id} 
                  className={`chat-thread-item ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setActiveThread(t);
                    setMobileShowChatMain(true);
                  }}
                >
                  <img src={rec.avatar} alt="" className="avatar-small" />
                  <div className="chat-thread-info">
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="chat-thread-name">{rec.name}</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--gray-600)" }}>{getThreadLastTime(t)}</span>
                    </div>
                    <div className="chat-thread-last">{getThreadLastMessage(t)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`chat-main ${isMobile && mobileShowChatMain ? "active-mobile" : ""}`}>
        {activeThread ? (
          <>
            {/* Header */}
            <div className="chat-header">
              {isMobile && (
                <button 
                  onClick={() => setMobileShowChatMain(false)}
                  style={{ background: "none", border: "none", color: "var(--primary)", marginRight: "10px", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <img src={activeRecipient.avatar} alt="" className="avatar-small" />
              <div>
                <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  {activeRecipient.name}
                  {activeRecipient.verification && <ShieldCheck size={14} style={{ color: "var(--primary)" }} />}
                </h4>
                <span style={{ fontSize: "0.75rem", color: "var(--gray-600)" }}>
                  {activeRecipient.role} • {activeRecipient.town}, {activeRecipient.lga}
                </span>
              </div>
            </div>

            {/* Messages Body */}
            <div className="chat-messages">
              {activeThread.messages && activeThread.messages.length === 0 && (
                <div style={{ textAlign: "center", margin: "auto", color: "var(--gray-600)" }}>
                  <User size={36} style={{ color: "var(--gray-600)", margin: "0 auto" }} />
                  <p style={{ marginTop: "8px" }}>No messages yet. Send a message to start private trading discussion.</p>
                </div>
              )}

              {activeThread.messages && activeThread.messages.map((msg, index) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`chat-bubble ${msg.senderId === activeUser.id ? "sent" : "received"}`}
                >
                  <div>
                    {msg.text.startsWith("📍 Shared Location:") ? (
                      <div 
                        className="chat-gps-badge"
                        style={{ marginTop: 0 }}
                        onClick={() => {
                          alert(`Directions: Map route loaded for ${msg.text.split("Location:")[1].trim()}`);
                        }}
                      >
                        <MapPin size={16} style={{ color: "#38bdf8", flexShrink: 0 }} />
                        <div>
                          <strong style={{ display: "block", fontSize: "0.8rem", color: "#38bdf8", textAlign: "left" }}>Location Shared</strong>
                          <span style={{ fontSize: "0.68rem", opacity: 0.8, color: "white", display: "block", textAlign: "left" }}>{msg.text.replace("📍 Shared Location: ", "")}</span>
                        </div>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                  {msg.image && (
                    <img 
                      src={msg.image} 
                      alt="Attachment" 
                      style={{ maxWidth: "100%", borderRadius: "8px", marginTop: "8px", border: "1px solid var(--glass-border)" }} 
                    />
                  )}
                  <span className="chat-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer Input */}
            <form onSubmit={handleSendMessage} className="chat-input-area">
              <button 
                type="button" 
                className="icon-badge-btn" 
                onClick={handleShareImage}
                title="Share product photo"
              >
                <Image size={18} />
              </button>
              
              <button 
                type="button" 
                className="icon-badge-btn" 
                onClick={handleShareLocation}
                title="Share GPS/Town location"
              >
                <MapPin size={18} />
              </button>

              <input 
                type="text" 
                className="chat-input"
                placeholder="Type your transaction message..." 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                required
              />

              <button type="submit" className="btn btn-primary" style={{ padding: "10px", borderRadius: "50%", width: "42px", height: "42px", flexShrink: 0 }}>
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", margin: "auto", color: "var(--gray-600)", padding: "20px" }}>
            <User size={48} style={{ color: "var(--gray-600)", margin: "0 auto 12px auto" }} />
            <h3 style={{ color: "white" }}>Select a Conversation</h3>
            <p style={{ marginTop: "4px" }}>Choose a farmer or buyer from the directory to start talking about agricultural trades.</p>
          </div>
        )}
      </div>
    </div>
  );
}
