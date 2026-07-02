import {
  AKWA_IBOM_LOCATIONS,
  CATEGORIES,
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_MARKET_PRICES,
  INITIAL_ORDERS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS
} from "./initialData";
import { doc, setDoc } from "firebase/firestore";
import { db as firestoreDb, isConfigured } from "../lib/firebase";

export { AKWA_IBOM_LOCATIONS, CATEGORIES };

const STORAGE_KEY = "ibom_agro_market_db";

export const getDB = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const initialDB = {
      users: INITIAL_USERS,
      products: INITIAL_PRODUCTS,
      marketPrices: INITIAL_MARKET_PRICES,
      orders: INITIAL_ORDERS,
      messages: INITIAL_MESSAGES,
      notifications: INITIAL_NOTIFICATIONS,
      auditLogs: INITIAL_AUDIT_LOGS,
      currentUser: null, // Start logged out for landing page & real authentication
      currentRole: null
    };
    saveDB(initialDB);
    return initialDB;
  }
  return JSON.parse(data);
};

export const saveDB = (db) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  
  // Realtime push to Firestore if configured
  if (isConfigured && firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "market", "state");
      // Strip local user session variables so they don't sync to other clients
      const remoteState = {
        ...db,
        currentUser: null,
        currentRole: null
      };
      setDoc(docRef, { state: remoteState }).catch(err => console.error("Firestore sync error:", err));
    } catch (e) {
      console.error("Firestore sync failed:", e);
    }
  }
};

// State Mutators
export const addAuditLog = (db, action, details) => {
  const newLog = {
    id: "al-" + Date.now(),
    timestamp: new Date().toISOString(),
    action,
    details
  };
  db.auditLogs.unshift(newLog);
  return db;
};

export const addNotification = (db, userId, title, message) => {
  const newNotif = {
    id: "n-" + Date.now() + Math.random().toString(36).substr(2, 5),
    userId,
    title,
    message,
    read: false,
    timestamp: new Date().toISOString()
  };
  db.notifications.unshift(newNotif);
  return db;
};

export const registerUser = (userData) => {
  const db = getDB();
  const newId = "usr-" + Date.now();
  const newUser = {
    id: newId,
    state: "Akwa Ibom",
    avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999999)}?w=150`,
    followers: 0,
    rating: 5.0,
    reviewsCount: 0,
    verification: userData.role === "Farmer" ? "Bronze" : null,
    ...userData
  };

  db.users.push(newUser);
  db.currentUser = newUser;
  db.currentRole = userData.role;
  
  addAuditLog(db, "User Registered", `${newUser.name} registered as ${newUser.role} in ${newUser.lga}/${newUser.town}`);
  saveDB(db);
  return { db, user: newUser };
};

export const loginUser = (phone) => {
  const db = getDB();
  const user = db.users.find(u => u.phone === phone);
  if (user) {
    db.currentUser = user;
    db.currentRole = user.role;
    addAuditLog(db, "User Logged In", `${user.name} logged in as ${user.role}`);
    saveDB(db);
    return { db, user };
  }
  return null;
};

export const switchRoleSim = (role) => {
  const db = getDB();
  db.currentRole = role;
  
  // Find a mock user of that role to switch current active user
  const matchingUser = db.users.find(u => u.role === role);
  if (matchingUser) {
    db.currentUser = matchingUser;
  }
  saveDB(db);
  return db;
};

export const switchUserById = (userId) => {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (user) {
    db.currentUser = user;
    db.currentRole = user.role;
    saveDB(db);
  }
  return db;
};

export const updateFarmerProfile = (profileData) => {
  const db = getDB();
  const index = db.users.findIndex(u => u.id === db.currentUser.id);
  if (index !== -1) {
    db.users[index] = {
      ...db.users[index],
      ...profileData
    };
    db.currentUser = db.users[index];
    addAuditLog(db, "Profile Updated", `${db.currentUser.name} updated farm details`);
    saveDB(db);
  }
  return db;
};

export const upgradeVerification = (farmerId, newLevel) => {
  const db = getDB();
  const index = db.users.findIndex(u => u.id === farmerId);
  if (index !== -1) {
    db.users[index].verification = newLevel;
    if (db.currentUser.id === farmerId) {
      db.currentUser.verification = newLevel;
    }
    addAuditLog(db, "Verification Upgraded", `${db.users[index].name} verification level changed to ${newLevel}`);
    addNotification(db, farmerId, "Verification Approved", `Your verification is now ${newLevel}.`);
    saveDB(db);
  }
  return db;
};

export const addProductListing = (productData) => {
  const db = getDB();
  const newProduct = {
    id: "p-" + Date.now(),
    farmerId: db.currentUser.id,
    status: "Available",
    ...productData
  };
  db.products.unshift(newProduct);
  addAuditLog(db, "Product Added", `${db.currentUser.name} added ${newProduct.name}`);
  saveDB(db);
  return db;
};

export const updateProduct = (productId, updatedData) => {
  const db = getDB();
  const index = db.products.findIndex(p => p.id === productId);
  if (index !== -1) {
    db.products[index] = {
      ...db.products[index],
      ...updatedData
    };
    saveDB(db);
  }
  return db;
};

export const placeOrder = (productId, quantity, deliveryOption) => {
  const db = getDB();
  const product = db.products.find(p => p.id === productId);
  if (!product) return db;

  const farmer = db.users.find(u => u.id === product.farmerId);
  const buyer = db.currentUser;
  
  const total = product.price * quantity;
  const orderId = "ord-" + Math.floor(10000 + Math.random() * 90000);
  
  const newOrder = {
    id: orderId,
    buyerId: buyer.id,
    buyerName: buyer.name,
    buyerPhone: buyer.phone,
    farmerId: product.farmerId,
    farmerName: farmer.name,
    productId: product.id,
    productName: product.name,
    quantity,
    price: product.price,
    totalAmount: total,
    status: "Requested",
    date: new Date().toISOString().split("T")[0],
    deliveryPartnerId: null,
    deliveryStatus: "Not Started",
    paymentReceipt: null,
    deliveryOption
  };

  db.orders.unshift(newOrder);
  
  // Update inventory
  product.quantity = Math.max(0, product.quantity - quantity);
  if (product.quantity === 0) {
    product.status = "Out of Stock";
  }

  addNotification(db, product.farmerId, "New Order Received", `${buyer.name} ordered ${quantity} ${product.unit}(s) of ${product.name}.`);
  addAuditLog(db, "Order Created", `Buyer ${buyer.name} placed order ${orderId} for ${product.name}`);
  saveDB(db);
  return { db, orderId };
};

export const updateOrderStatus = (orderId, newStatus, extraData = {}) => {
  const db = getDB();
  const index = db.orders.findIndex(o => o.id === orderId);
  if (index === -1) return db;

  const order = db.orders[index];
  const oldStatus = order.status;
  db.orders[index] = { ...order, status: newStatus, ...extraData };
  
  // Status transitions notifications
  if (newStatus === "Accepted") {
    addNotification(db, order.buyerId, "Order Approved", `${order.farmerName} approved your order ${orderId}. Please complete payment via the escrow gateway.`);
  } else if (newStatus === "Paid") {
    addNotification(db, order.farmerId, "Order Paid (Escrow)", `Buyer has completed payment for order ${orderId}. Funds are secured in Escrow. Please prepare the produce.`);
  } else if (newStatus === "Assigned") {
    addNotification(db, order.buyerId, "Order Ready", `Farmer has marked order ${orderId} as ready. Logistics carrier is being dispatched.`);
  } else if (newStatus === "Delivered") {
    addNotification(db, order.buyerId, "Order Delivered", `Logistics has marked order ${orderId} as Delivered. Please inspect it and confirm receipt.`);
  } else if (newStatus === "Completed") {
    addNotification(db, order.farmerId, "Escrow Funds Released", `Buyer confirmed receipt of order ${orderId}. Escrow balance credited to your wallet.`);
    if (order.deliveryPartnerId) {
      addNotification(db, order.deliveryPartnerId, "Delivery Confirmed", `Buyer confirmed receipt of order ${orderId}. Job successfully finalized.`);
    }
  }

  addAuditLog(db, "Order Status Updated", `Order ${orderId} changed status from ${oldStatus} to ${newStatus}`);
  saveDB(db);
  return db;
};

export const logisticsClaimJob = (orderId, logisticsId) => {
  const db = getDB();
  const index = db.orders.findIndex(o => o.id === orderId);
  if (index !== -1) {
    const order = db.orders[index];
    const logistics = db.users.find(u => u.id === logisticsId);
    db.orders[index] = {
      ...order,
      deliveryPartnerId: logisticsId,
      deliveryPartnerName: logistics.name,
      status: "Assigned", // Keep Assigned status on initial claim
      deliveryStatus: "Pending Pickup"
    };
    
    addNotification(db, order.buyerId, "Logistics Dispatched", `${logistics.name} has claimed your delivery and is picking it up.`);
    addNotification(db, order.farmerId, "Logistics Dispatched", `${logistics.name} is on the way to pick up order ${orderId}.`);
    addAuditLog(db, "Logistics Job Claimed", `${logistics.name} claimed order ${orderId} for delivery`);
    saveDB(db);
  }
  return db;
};

export const updateDeliveryStatus = (orderId, deliveryStatus, proof = null) => {
  const db = getDB();
  const index = db.orders.findIndex(o => o.id === orderId);
  if (index !== -1) {
    const order = db.orders[index];
    db.orders[index].deliveryStatus = deliveryStatus;
    
    if (deliveryStatus === "Picked Up") {
      db.orders[index].status = "Picked Up";
      addNotification(db, order.buyerId, "Order Picked Up", `Your order ${orderId} has been picked up from the farm by ${order.deliveryPartnerName}.`);
    } else if (deliveryStatus === "In Transit") {
      db.orders[index].status = "En Route";
      addNotification(db, order.buyerId, "Order In Transit", `Your order ${orderId} is currently on its way to you.`);
    } else if (deliveryStatus === "Delivered") {
      db.orders[index].status = "Delivered";
      if (proof) {
        db.orders[index].proofOfDelivery = proof;
      }
      addNotification(db, order.buyerId, "Delivery Arrived", `Your order ${orderId} has been delivered. Please confirm receipt and release escrow.`);
    }

    addAuditLog(db, "Delivery Status Updated", `Order ${orderId} delivery status changed to ${deliveryStatus}`);
    saveDB(db);
  }
  return db;
};

export const leaveReview = (orderId, reviewData) => {
  const db = getDB();
  const index = db.orders.findIndex(o => o.id === orderId);
  if (index !== -1) {
    db.orders[index].review = reviewData;
    db.orders[index].status = "Reviewed";
    
    const farmerId = db.orders[index].farmerId;
    const farmerIndex = db.users.findIndex(u => u.id === farmerId);
    if (farmerIndex !== -1) {
      // Recalculate average ratings
      const farmerOrders = db.orders.filter(o => o.farmerId === farmerId && o.review);
      const sum = farmerOrders.reduce((acc, curr) => acc + curr.review.rating, 0);
      db.users[farmerIndex].rating = parseFloat((sum / farmerOrders.length).toFixed(1));
      db.users[farmerIndex].reviewsCount = farmerOrders.length;
    }
    
    addAuditLog(db, "Review Submitted", `Buyer left review on order ${orderId} (Rating: ${reviewData.rating})`);
    saveDB(db);
  }
  return db;
};

export const sendMessage = (recipientId, text, image = null, location = null, product = null) => {
  const db = getDB();
  const senderId = db.currentUser.id;
  
  // Find or create thread
  let thread = db.messages.find(t => t.members.includes(senderId) && t.members.includes(recipientId));
  if (!thread) {
    thread = {
      id: "thread-" + Date.now(),
      members: [senderId, recipientId],
      messages: []
    };
    db.messages.push(thread);
  }

  const newMessage = {
    senderId,
    text,
    image,
    location,
    product,
    timestamp: new Date().toISOString()
  };

  thread.messages.push(newMessage);
  addNotification(db, recipientId, "New Message", `${db.currentUser.name} sent you a message: "${text.substring(0, 30)}..."`);
  
  // Simulate auto-responses if recipient is a mock farmer/buyer
  const recipient = db.users.find(u => u.id === recipientId);
  if (recipient && recipientId !== "admin1") {
    setTimeout(() => {
      simulateMockReply(recipientId, senderId, text);
    }, 2000);
  }

  saveDB(db);
  return db;
};

const simulateMockReply = (mockUserId, humanUserId, userText) => {
  const db = getDB();
  let thread = db.messages.find(t => t.members.includes(mockUserId) && t.members.includes(humanUserId));
  if (!thread) return;
  
  const mockUser = db.users.find(u => u.id === mockUserId);
  if (!mockUser) return;
  
  let replyText = "Thank you for reaching out! Let me check the details and get back to you shortly.";
  const query = userText.toLowerCase();
  
  if (query.includes("price") || query.includes("how much")) {
    replyText = `The price listed on my profile is current. Let me know what quantity you require and we can discuss the delivery options!`;
  } else if (query.includes("available") || query.includes("stock")) {
    replyText = `Yes! All products marked 'Available' on my page are ready for pickup or delivery. You can place the order directly.`;
  } else if (query.includes("deliver") || query.includes("location")) {
    replyText = `We are based in ${mockUser.town}, ${mockUser.lga}. We offer local delivery or can match with a reliable logistics rider on the platform.`;
  }

  const replyMessage = {
    senderId: mockUserId,
    text: replyText,
    timestamp: new Date().toISOString()
  };

  thread.messages.push(replyMessage);
  
  // Trigger notification for human
  addNotification(db, humanUserId, "New Message from " + mockUser.name, replyText);
  saveDB(db);
  
  // Dispatch event for UI re-render
  window.dispatchEvent(new Event("db_update"));
};

export const updateMarketPrice = (priceId, marketName, newPrice) => {
  const db = getDB();
  const index = db.marketPrices.findIndex(mp => mp.id === priceId);
  if (index !== -1) {
    const mp = db.marketPrices[index];
    mp.prices[marketName] = newPrice;
    
    // Add to price history
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" });
    const histIndex = mp.history.findIndex(h => h.date === today);
    if (histIndex !== -1) {
      mp.history[histIndex][marketName] = newPrice;
    } else {
      const histItem = { date: today };
      Object.keys(mp.prices).forEach(k => {
        histItem[k] = mp.prices[k];
      });
      mp.history.push(histItem);
    }
    
    // Trigger price alert notifications for users interested in this category
    db.users.forEach(u => {
      if (u.role === "Buyer") {
        addNotification(db, u.id, "Market Price Update", `Daily prices for ${mp.product} have been updated. Compare markets now!`);
      }
    });

    addAuditLog(db, "Market Price Updated", `Admin updated price of ${mp.product} in ${marketName} to N${newPrice}`);
    saveDB(db);
  }
  return db;
};

// Local AI Engine (Rule & Regex Based Search)
export const queryAI = (queryText) => {
  const db = getDB();
  const text = queryText.toLowerCase().trim();
  
  // 1. "Find cassava near me" or "Cassava near Uyo"
  if (text.includes("cassava") && (text.includes("near") || text.includes("in") || text.includes("around"))) {
    // Determine location if mentioned, or default to current user location
    let targetLga = db.currentUser.lga || "Uyo";
    const mentionedLga = AKWA_IBOM_LOCATIONS.find(loc => text.includes(loc.lga.toLowerCase()));
    if (mentionedLga) targetLga = mentionedLga.lga;

    const results = db.products.filter(p => 
      p.category === "Crops" && 
      p.name.toLowerCase().includes("cassava") && 
      p.lga.toLowerCase() === targetLga.toLowerCase() &&
      p.status === "Available"
    );

    return {
      type: "products",
      message: `Here are available cassava listings in **${targetLga}**:`,
      items: results
    };
  }
  
  // 2. "Cheapest palm oil today" or "Cheapest palm oil"
  if (text.includes("palm oil") && (text.includes("cheapest") || text.includes("lowest price") || text.includes("cheap"))) {
    const results = db.products
      .filter(p => p.name.toLowerCase().includes("palm oil") && p.status === "Available")
      .sort((a, b) => a.price - b.price);
      
    return {
      type: "products",
      message: "Here are the cheapest palm oil listings available today, sorted by lowest price:",
      items: results
    };
  }

  // 3. "Show verified fish farmers" or "verified fish"
  if (text.includes("fish") && text.includes("verified")) {
    const verifiedFarmers = db.users.filter(u => 
      u.role === "Farmer" && 
      u.farmType.toLowerCase().includes("fish") && 
      (u.verification === "Gold" || u.verification === "Silver")
    );
    
    return {
      type: "farmers",
      message: "Here are verified fish farmers (Silver/Gold verification) across Akwa Ibom:",
      items: verifiedFarmers
    };
  }

  // 4. "Which farmer has tomatoes available this week?" or "tomatoes"
  if (text.includes("tomatoes") || text.includes("tomato")) {
    const results = db.products.filter(p => 
      p.name.toLowerCase().includes("tomato") && 
      p.status === "Available"
    );
    
    return {
      type: "products",
      message: "Here are farmers who currently have fresh tomatoes in stock:",
      items: results
    };
  }

  // 5. "Compare garri prices across markets" or "compare garri"
  if (text.includes("garri") && (text.includes("compare") || text.includes("price") || text.includes("markets"))) {
    const garriPrices = db.marketPrices.find(mp => mp.product.toLowerCase().includes("garri"));
    if (garriPrices) {
      return {
        type: "market_prices",
        message: "Here is a comparison of daily Garri prices across major Akwa Ibom markets:",
        prices: garriPrices
      };
    }
  }

  // Generic Search Match
  // Try to find matching categories or product names
  const categoryMatch = Object.keys(CATEGORIES).find(cat => text.includes(cat.toLowerCase()));
  if (categoryMatch) {
    const results = db.products.filter(p => p.category === categoryMatch && p.status === "Available");
    return {
      type: "products",
      message: `Here are available items under the **${categoryMatch}** category:`,
      items: results
    };
  }

  const keywordResults = db.products.filter(p => 
    (p.name.toLowerCase().includes(text) || p.description.toLowerCase().includes(text)) &&
    p.status === "Available"
  );
  if (keywordResults.length > 0) {
    return {
      type: "products",
      message: `I found ${keywordResults.length} listings matching "${queryText}":`,
      items: keywordResults
    };
  }

  return {
    type: "text",
    message: "I couldn't find specific products matching that request. You can try asking:\n- *'Find cassava near me'*\n- *'Cheapest palm oil today'*\n- *'Show verified fish farmers'*\n- *'Compare garri prices'*",
    items: []
  };
};
