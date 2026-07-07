import {
  AKWA_IBOM_LOCATIONS,
  CATEGORIES,
  VERTICALS,
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_MARKET_PRICES,
  INITIAL_ORDERS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SUBSCRIPTION_PAYMENTS,
  INITIAL_AD_PAYMENTS
} from "./initialData";
import { doc, setDoc } from "firebase/firestore";
import { db as firestoreDb, isConfigured } from "../lib/firebase";

export { AKWA_IBOM_LOCATIONS, CATEGORIES, VERTICALS };

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
      subscriptionPayments: INITIAL_SUBSCRIPTION_PAYMENTS || [],
      adPayments: INITIAL_AD_PAYMENTS || [],
      groupBuys: [
        {
          id: "gb-1",
          productId: "p2",
          productName: "Fresh Yellow Cassava Tubers",
          farmerId: "f1",
          farmerName: "Etim Okon",
          lga: "Uyo",
          targetQuantity: 50,
          currentQuantity: 35,
          price: 11000,
          unit: "Bag (100kg)",
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "Active",
          contributors: [
            { buyerId: "b1", buyerName: "Chef Bassey", quantity: 15, deliveryFeeShare: 750 },
            { buyerId: "b2", buyerName: "Edidiong Hotel & Suites", quantity: 20, deliveryFeeShare: 1000 }
          ]
        }
      ],
      currentUser: null,
      currentRole: null
    };
    saveDB(initialDB);
    return initialDB;
  }
  const db = JSON.parse(data);
  let updated = false;

  // Sync groupBuys array if not present
  if (!db.groupBuys) {
    db.groupBuys = [
      {
        id: "gb-1",
        productId: "p2",
        productName: "Fresh Yellow Cassava Tubers",
        farmerId: "f1",
        farmerName: "Etim Okon",
        lga: "Uyo",
        targetQuantity: 50,
        currentQuantity: 35,
        price: 11000,
        unit: "Bag (100kg)",
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "Active",
        contributors: [
          { buyerId: "b1", buyerName: "Chef Bassey", quantity: 15, deliveryFeeShare: 750 },
          { buyerId: "b2", buyerName: "Edidiong Hotel & Suites", quantity: 20, deliveryFeeShare: 1000 }
        ]
      }
    ];
    updated = true;
  }

  // Sync payments arrays if not present
  if (!db.subscriptionPayments) {
    db.subscriptionPayments = INITIAL_SUBSCRIPTION_PAYMENTS || [];
    updated = true;
  }
  if (!db.adPayments) {
    db.adPayments = INITIAL_AD_PAYMENTS || [];
    updated = true;
  }

  // Auto-sync products
  INITIAL_PRODUCTS.forEach(p => {
    if (!db.products.some(dp => dp.id === p.id)) {
      db.products.push(p);
      updated = true;
    }
  });

  // Auto-sync users
  INITIAL_USERS.forEach(u => {
    if (!db.users.some(du => du.id === u.id)) {
      db.users.push(u);
      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  return db;
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

export const calculateOrderBreakdown = (product, quantity, buyerLga) => {
  const subtotal = product.price * quantity;
  let discount = 0;
  
  if (product.isBulk || quantity >= 5) {
    if (quantity >= 10 && quantity < 50) {
      discount = subtotal * 0.05; // 5% bulk discount
    } else if (quantity >= 50) {
      discount = subtotal * 0.10; // 10% bulk discount
    }
  }

  const discountedSubtotal = subtotal - discount;
  const escrowFee = Math.round(discountedSubtotal * 0.03); // 3% platform escrow fee
  
  // Delivery Fee
  const buyerLgaName = buyerLga || "Uyo";
  const farmerLgaName = product.lga || "Uyo";
  const isBulk = product.isBulk || quantity >= 5;
  
  let deliveryFee = 0;
  let deliveryType = "";
  
  if (buyerLgaName.toLowerCase() === farmerLgaName.toLowerCase()) {
    deliveryFee = isBulk ? 2500 : 1000;
    deliveryType = isBulk ? "Local Bulk Cargo (Tricycle)" : "Local Retail (Motorcycle)";
  } else {
    deliveryFee = isBulk ? 12000 : 3500;
    deliveryType = isBulk ? "Inter-LGA Haulage (Truck)" : "Inter-LGA Light Shipping";
  }

  const totalAmount = discountedSubtotal + escrowFee + deliveryFee;

  return {
    subtotal,
    discount,
    discountedSubtotal,
    escrowFee,
    deliveryFee,
    deliveryType,
    totalAmount
  };
};

export const placeOrder = (productId, quantity, deliveryOption) => {
  const db = getDB();
  const product = db.products.find(p => p.id === productId);
  if (!product) return db;

  const farmer = db.users.find(u => u.id === product.farmerId);
  const buyer = db.currentUser;
  
  const breakdown = calculateOrderBreakdown(product, quantity, buyer?.lga);
  const orderId = "ord-" + Math.floor(10000 + Math.random() * 90000);
  
  const newOrder = {
    id: orderId,
    buyerId: buyer?.id || "guest",
    buyerName: buyer?.name || "Guest Buyer",
    buyerPhone: buyer?.phone || "08000000000",
    farmerId: product.farmerId,
    farmerName: farmer.name,
    productId: product.id,
    productName: product.name,
    quantity,
    price: product.price,
    subtotal: breakdown.subtotal,
    discount: breakdown.discount,
    escrowFee: breakdown.escrowFee,
    deliveryFee: breakdown.deliveryFee,
    deliveryType: breakdown.deliveryType,
    totalAmount: breakdown.totalAmount,
    status: "Requested",
    date: new Date().toISOString().split("T")[0],
    deliveryPartnerId: null,
    deliveryStatus: "Not Started",
    paymentReceipt: null,
    deliveryOption: deliveryOption || breakdown.deliveryType
  };

  db.orders.unshift(newOrder);
  
  // Update inventory
  product.quantity = Math.max(0, product.quantity - quantity);
  if (product.quantity === 0) {
    product.status = "Out of Stock";
  }

  addNotification(db, product.farmerId, "New Order Received", `${buyer?.name || "Guest"} ordered ${quantity} ${product.unit}(s) of ${product.name}.`);
  addAuditLog(db, "Order Created", `Buyer ${buyer?.name || "Guest"} placed order ${orderId} for ${product.name}`);
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

// Local AI Engine (Rule & Regex Based Search with Local Synonyms)
export const queryAI = (queryText) => {
  const db = getDB();
  let text = queryText.toLowerCase().trim();
  
  // Local translations mapping
  if (text.includes("mfi")) {
    text = text.replace("mfi", "periwinkle");
  }
  if (text.includes("obo")) {
    text = text.replace("obo", "crayfish");
  }
  if (text.includes("afere mmong") || text.includes("nnise")) {
    text = text.replace("afere mmong", "waterleaf").replace("nnise", "waterleaf");
  }

  // 1. Bulk / Wholesale Search
  if (text.includes("bulk") || text.includes("wholesale") || text.includes("jerrycan") || text.includes("drum")) {
    let results = db.products.filter(p => p.isBulk && p.status === "Available");
    
    if (text.includes("palm oil")) {
      results = results.filter(p => p.name.toLowerCase().includes("palm oil"));
      return {
        type: "products",
        message: "I found wholesale bulk **Palm Oil** listings. Perfect for distributors, processors, and restaurants with platform escrow and bulk haulage transport:",
        items: results
      };
    }

    return {
      type: "products",
      message: "Here are the wholesale bulk commodities currently listed on the platform:",
      items: results
    };
  }

  // 2. Services Hub Query
  if (text.includes("plumber") || text.includes("mechanic") || text.includes("electrician") || text.includes("tailor") || text.includes("photographer")) {
    let matchingCategory = "";
    if (text.includes("plumber")) matchingCategory = "Plumbers";
    else if (text.includes("mechanic")) matchingCategory = "Mechanics";
    else if (text.includes("electrician")) matchingCategory = "Electricians";
    else if (text.includes("tailor") || text.includes("hairdresser") || text.includes("repairs")) matchingCategory = "Home Repairs";
    else if (text.includes("photographer")) matchingCategory = "Media";

    const results = db.products.filter(p => p.category === matchingCategory && p.status === "Available");
    return {
      type: "products",
      message: `I found these verified local **Service Providers** in Akwa Ibom:`,
      items: results
    };
  }

  // 3. Real Estate / Property Query
  if (text.includes("land") || text.includes("apartment") || text.includes("house") || text.includes("shop") || text.includes("office") || text.includes("hostel")) {
    let matchingCategory = "";
    if (text.includes("land")) matchingCategory = "Land";
    else if (text.includes("house")) matchingCategory = "Houses";
    else if (text.includes("apartment") || text.includes("flat") || text.includes("rent")) matchingCategory = "Apartments";
    else matchingCategory = "Commercial";

    const results = db.products.filter(p => p.category === matchingCategory && p.status === "Available");
    return {
      type: "products",
      message: `Here are available **Properties & Commercial Rentals** matching your request:`,
      items: results
    };
  }

  // 3b. Escrow system query
  if (text.includes("escrow") || text.includes("sterling") || text.includes("vault")) {
    return {
      type: "text",
      message: `🔒 **IbomOne Secure Escrow Safeguard**:\n\nAll payments are held securely in the **Sterling Bank Cooperative Escrow Vault**.\n\n1. **Buyer Pays:** Funds are locked safely.\n2. **Logistics Dispatch:** Transporter delivers cargo.\n3. **Inspection & Release:** Buyer inspects produce, clicks 'Confirm Receipt' to release funds to the farmer's wallet.`,
      items: []
    };
  }

  // 3c. Cooperative / Group buy query
  if (text.includes("pool") || text.includes("cooperative") || text.includes("group buy")) {
    const activePools = db.groupBuys?.filter(p => p.status === "Active") || [];
    const poolListText = activePools.length > 0 
      ? activePools.map(p => `- **${p.productName}** in ${p.lga} LGA (${p.currentQuantity}/${p.targetQuantity} units)`).join("\n")
      : "No active cooperative pools at this moment.";
      
    return {
      type: "text",
      message: `🌾 **Cooperative Group-Buying Pools**:\n\nGroup orders with other buyers to split bulk logistics haulage carrier fees proportionally!\n\n**Active LGA Pools:**\n${poolListText}\n\n*Navigate to the 'Cooperative Pools' tab to join a pool or start one from any bulk listing.*`,
      items: []
    };
  }

  // 3d. Transport / Logistics fee query
  if (text.includes("transport") || text.includes("cost") || text.includes("fee") || text.includes("logistics") || text.includes("delivery")) {
    return {
      type: "text",
      message: `🚚 **Platform Carrier Shipping Rates**:\n\n- 🏍️ **Local Retail (Motorcycle):** ₦1,000\n- 🛺 **Local Bulk Cargo (Tricycle):** ₦2,500\n- 📦 **Inter-LGA Light Shipping:** ₦3,500\n- 🚛 **Inter-LGA Bulk Haulage (Truck):** ₦12,000\n\n*Note: Joining Cooperative pools splits bulk delivery costs proportionally among LGA buyers!*`,
      items: []
    };
  }

  // 4. Vehicles / Cars Query
  if (text.includes("car") || text.includes("motorcycle") || text.includes("toyota") || text.includes("suzuki") || text.includes("spare parts")) {
    const results = db.products.filter(p => 
      (p.category === "Cars" || p.category === "Motorcycles" || p.category === "Parts & Accessories") && 
      p.status === "Available"
    );
    return {
      type: "products",
      message: `I found these **Vehicles & Accessories** listed in Akwa Ibom:`,
      items: results
    };
  }
  
  // 5. "Find cassava near me" or "Cassava near Uyo"
  if (text.includes("cassava") && (text.includes("near") || text.includes("in") || text.includes("around"))) {
    // Determine location if mentioned, or default to current user location
    let targetLga = db.currentUser?.lga || "Uyo";
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
  
  // 6. "Cheapest palm oil today" or "Cheapest palm oil"
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

  // 7. "Show verified fish farmers" or "verified fish"
  if (text.includes("fish") && text.includes("verified")) {
    const verifiedFarmers = db.users.filter(u => 
      (u.role === "Farmer" || u.role === "Seller") && 
      u.farmType?.toLowerCase().includes("fish") && 
      (u.verification === "Gold" || u.verification === "Silver")
    );
    
    return {
      type: "farmers",
      message: "Here are verified fish/seafood partners (Silver/Gold verification) across Akwa Ibom:",
      items: verifiedFarmers
    };
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
    message: "I couldn't find specific products matching that request. You can try asking:\n- *'Find a mechanic nearby'*\n- *'Show apartments for rent'*\n- *'Show bulk palm oil'*\n- *'Where can I buy fresh mfi?'* (periwinkles)",
    items: []
  };
};

// Storefront & Monetization Helper Mutators
export const toggleFollowStore = (sellerId) => {
  const db = getDB();
  const buyerId = db.currentUser?.id;
  if (!buyerId) return db;

  const index = db.users.findIndex(u => u.id === sellerId);
  if (index !== -1) {
    const seller = db.users[index];
    if (!seller.followersList) {
      seller.followersList = [];
    }
    const idx = seller.followersList.indexOf(buyerId);
    if (idx !== -1) {
      seller.followersList.splice(idx, 1);
      seller.followers = Math.max(0, seller.followers - 1);
    } else {
      seller.followersList.push(buyerId);
      seller.followers = (seller.followers || 0) + 1;
    }
    saveDB(db);
  }
  return db;
};

export const updateBusinessStorefront = (storefrontData) => {
  const db = getDB();
  const index = db.users.findIndex(u => u.id === db.currentUser.id);
  if (index !== -1) {
    db.users[index] = {
      ...db.users[index],
      ...storefrontData
    };
    db.currentUser = db.users[index];
    addAuditLog(db, "Storefront Updated", `${db.currentUser.name} updated digital storefront details`);
    saveDB(db);
  }
  return db;
};

export const subscribeToPlan = (planName, price) => {
  const db = getDB();
  const user = db.currentUser;
  if (!user) return db;

  const userIdx = db.users.findIndex(u => u.id === user.id);
  if (userIdx !== -1) {
    db.users[userIdx].subscriptionPlan = planName;
    db.users[userIdx].verification = planName === "Premium" ? "Gold" : planName === "Pro" ? "Silver" : "Bronze";
    db.currentUser = db.users[userIdx];
  }

  // Log subscription payment
  const newSubPayment = {
    id: "sub-" + Date.now(),
    companyId: user.id,
    name: user.name,
    plan: planName,
    amount: price,
    date: new Date().toISOString().split("T")[0],
    status: "Active"
  };
  
  if (!db.subscriptionPayments) db.subscriptionPayments = [];
  db.subscriptionPayments.push(newSubPayment);

  addAuditLog(db, "Subscription Activated", `${user.name} subscribed to ${planName} Plan (₦${price.toLocaleString()})`);
  addNotification(db, user.id, "Subscription Activated", `Welcome to your ${planName} Plan. Enjoy expanded listings and premium features!`);
  saveDB(db);
  return db;
};

export const purchaseAd = (adType, price) => {
  const db = getDB();
  const user = db.currentUser;
  if (!user) return db;

  const newAdPayment = {
    id: "ad-" + Date.now(),
    companyId: user.id,
    name: user.name,
    type: adType,
    amount: price,
    date: new Date().toISOString().split("T")[0]
  };

  if (!db.adPayments) db.adPayments = [];
  db.adPayments.push(newAdPayment);

  addAuditLog(db, "Ad Space Purchased", `${user.name} purchased ${adType} advertising (₦${price.toLocaleString()})`);
  addNotification(db, user.id, "Ad Campaign Active", `Your ${adType} campaign has been launched successfully!`);
  saveDB(db);
  return db;
};

export const createGroupBuyPool = (productId, targetQuantity, deadline) => {
  const db = getDB();
  const product = db.products.find(p => p.id === productId);
  if (!product) return db;

  const user = db.currentUser;
  if (!user) return db;

  const poolId = "gb-" + Date.now();
  const newPool = {
    id: poolId,
    productId: product.id,
    productName: product.name,
    farmerId: product.farmerId,
    farmerName: db.users.find(u => u.id === product.farmerId)?.name || "Farmer",
    lga: user.lga || "Uyo",
    targetQuantity: parseInt(targetQuantity),
    currentQuantity: 0,
    price: product.price,
    unit: product.unit,
    deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "Active",
    contributors: []
  };

  if (!db.groupBuys) db.groupBuys = [];
  db.groupBuys.push(newPool);

  addAuditLog(db, "Group Buy Created", `${user.name} created group buy pool ${poolId} for ${product.name}`);
  addNotification(db, product.farmerId, "Group Buy Pool Started", `A group buy pool has been started for your product ${product.name} targeting ${targetQuantity} units.`);
  saveDB(db);
  return db;
};

export const joinGroupBuyPool = (poolId, quantity) => {
  const db = getDB();
  const poolIndex = db.groupBuys.findIndex(p => p.id === poolId);
  if (poolIndex === -1) return db;

  const pool = db.groupBuys[poolIndex];
  const user = db.currentUser;
  if (!user) return db;

  const qty = parseInt(quantity);
  const totalQuantityAfterJoin = pool.currentQuantity + qty;

  // Split delivery fee proportionally. LGA bulk cargo = 2500, inter-LGA haulage = 12000.
  const product = db.products.find(p => p.id === pool.productId);
  const farmerLga = product ? product.lga : pool.lga;
  const isLocal = pool.lga.toLowerCase() === farmerLga.toLowerCase();
  const totalDeliveryFee = isLocal ? 2500 : 12000;

  const existingContribIndex = pool.contributors.findIndex(c => c.buyerId === user.id);
  if (existingContribIndex !== -1) {
    pool.contributors[existingContribIndex].quantity += qty;
  } else {
    pool.contributors.push({
      buyerId: user.id,
      buyerName: user.name,
      buyerPhone: user.phone || "08000000000",
      quantity: qty,
      deliveryFeeShare: 0
    });
  }

  pool.currentQuantity = totalQuantityAfterJoin;

  // Recalculate delivery fee share for all contributors
  pool.contributors.forEach(c => {
    c.deliveryFeeShare = Math.round((c.quantity / pool.targetQuantity) * totalDeliveryFee);
  });

  addAuditLog(db, "Joined Group Buy", `${user.name} contributed ${qty} units to group buy pool ${poolId}`);
  
  if (pool.currentQuantity >= pool.targetQuantity) {
    pool.status = "Completed";
    
    pool.contributors.forEach(contrib => {
      const subtotal = pool.price * contrib.quantity;
      const escrowFee = Math.round(subtotal * 0.03);
      const deliveryFee = contrib.deliveryFeeShare;
      const totalAmount = subtotal + escrowFee + deliveryFee;

      const orderId = "ord-" + Math.floor(10000 + Math.random() * 90000);
      const newOrder = {
        id: orderId,
        buyerId: contrib.buyerId,
        buyerName: contrib.buyerName,
        buyerPhone: contrib.buyerPhone,
        farmerId: pool.farmerId,
        farmerName: pool.farmerName,
        productId: pool.productId,
        productName: pool.productName,
        quantity: contrib.quantity,
        price: pool.price,
        subtotal,
        discount: 0,
        escrowFee,
        deliveryFee,
        deliveryType: isLocal ? "Local Bulk Cargo (Pooled)" : "Inter-LGA Haulage (Pooled)",
        totalAmount,
        status: "Paid",
        date: new Date().toISOString().split("T")[0],
        deliveryPartnerId: null,
        deliveryStatus: "Pending Accept",
        paymentReceipt: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        poolId: pool.id,
        isGroupBuy: true,
        transitPercentage: 0
      };

      db.orders.unshift(newOrder);
      addNotification(db, contrib.buyerId, "Group Buy Succeeded!", `Your pool for ${pool.productName} has succeeded! Order ${orderId} has been created and escrow payment is locked.`);
    });

    addNotification(db, pool.farmerId, "Group Buy Pool Filled", `Group buy pool for ${pool.productName} is filled. ${pool.currentQuantity} units ordered!`);
    addAuditLog(db, "Group Buy Completed", `Pool ${poolId} completed. Generated orders.`);
  } else {
    addNotification(db, pool.farmerId, "Group Buy Progress", `Group buy pool for ${pool.productName} is now at ${pool.currentQuantity}/${pool.targetQuantity} units.`);
  }

  saveDB(db);
  return db;
};

export const updateShipmentProgress = (orderId, transitPercentage, status) => {
  const db = getDB();
  const index = db.orders.findIndex(o => o.id === orderId);
  if (index !== -1) {
    const order = db.orders[index];
    order.transitPercentage = Math.min(100, Math.max(0, parseInt(transitPercentage)));
    if (status) {
      order.deliveryStatus = status;
      if (status === "Delivered") {
        order.status = "Delivered";
        addNotification(db, order.buyerId, "Order Delivered", `Your cargo for order ${orderId} has arrived! Please confirm receipt.`);
      }
    }
    
    if (order.transitPercentage > 0 && order.transitPercentage < 100) {
      order.deliveryStatus = "In Transit";
      order.status = "In Transit";
    } else if (order.transitPercentage === 100 && order.deliveryStatus !== "Delivered") {
      order.deliveryStatus = "Out for Delivery";
      order.status = "Out for Delivery";
    }

    addAuditLog(db, "Shipment Updated", `Order ${orderId} shipment progress updated to ${order.transitPercentage}% (${order.deliveryStatus})`);
    saveDB(db);
    window.dispatchEvent(new Event("db_update"));
  }
  return db;
};
