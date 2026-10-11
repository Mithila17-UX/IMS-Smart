import { onCall, HttpsError } from "firebase-functions/v2/https";
import { auth, db } from "../admin";

interface CreateClientData {
  name: string;
  presetId?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  accentColor?: string;
  billingNote?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  adminEmail: string;
  adminPassword: string;
  adminDisplayName: string;
}

export const createClient = onCall<CreateClientData>(async (request) => {
  // Only super admin can create a new client tenant
  const isSuper = request.auth?.token?.role === "superadmin";
  if (!isSuper) {
    throw new HttpsError("permission-denied", "Only super administrators can create clients.");
  }

  const data = request.data;
  if (!data.name || !data.adminEmail || !data.adminPassword) {
    throw new HttpsError("invalid-argument", "Name, admin email, and admin password are required.");
  }

  // Generate a clean slug ID from the name
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const clientId = `${slug}-${Math.random().toString(36).substring(2, 6)}`;

  const now = new Date().toISOString();

  // Create Client document
  const clientRef = db.collection("clients").doc(clientId);
  await clientRef.set({
    id: clientId,
    name: data.name,
    status: "active",
    statusReason: null,
    billingNote: data.billingNote || "",
    timezone: data.timezone || "Asia/Colombo",
    currency: data.currency || "LKR",
    language: data.language || "en-LK",
    accentColor: data.accentColor || "#1e293b",
    contactName: data.contactName || "",
    contactEmail: data.contactEmail || "",
    contactPhone: data.contactPhone || "",
    entriesPerDay: 0,
    createdAt: now,
    updatedAt: now,
  });

  // Determine preset switches
  const isStockPreset = data.presetId === "stock-and-daily-sales";
  const isSalesPreset = data.presetId === "sales-and-cash";

  const modules = {
    products: true,
    stock: true,
    liveOrders: !isStockPreset,
    dailyEntry: true,
    deposits: !isStockPreset && !isSalesPreset,
    tabs: !isStockPreset && !isSalesPreset,
    offers: !isStockPreset && !isSalesPreset,
    adminRequests: !isStockPreset && !isSalesPreset,
    expenses: !isStockPreset,
    dayClose: !isStockPreset,
    monthEndCards: !isStockPreset && !isSalesPreset,
    forecastReorder: !isStockPreset && !isSalesPreset,
    reports: true,
    dashboard: true,
  };

  // Create entitlements/main
  await clientRef.collection("entitlements").doc("main").set({
    status: "active",
    statusReason: null,
    billingNote: data.billingNote || "",
    modules,
    tiles: {
      cashToday: !isStockPreset,
      salesToday: true,
      stockNow: true,
      cashVariance: !isStockPreset,
      netProfitToday: !isStockPreset,
    },
    reports: {
      sales: true,
      supplies: true,
      stock: true,
      profitLoss: !isStockPreset,
      cashFlow: !isStockPreset,
    },
    settingsTabs: {
      business: true,
      prices: true,
      deposits: !isStockPreset && !isSalesPreset,
      salesScreen: !isStockPreset,
      credit: !isStockPreset && !isSalesPreset,
      payments: true,
      dayClose: !isStockPreset,
      stock: true,
      expenses: !isStockPreset,
    },
    maxUsers: 10,
    updatedAt: now,
    updatedBy: request.auth?.uid || "superadmin",
  });

  // Create the first client admin Firebase Auth user
  const adminUser = await auth.createUser({
    email: data.adminEmail,
    password: data.adminPassword,
    displayName: data.adminDisplayName,
  });

  // Set custom claims: role: "client_admin", clientId
  await auth.setCustomUserClaims(adminUser.uid, {
    role: "client_admin",
    clientId,
  });

  // Save admin user record under clients/{clientId}/users/{userId}
  await clientRef.collection("users").doc(adminUser.uid).set({
    id: adminUser.uid,
    clientId,
    email: data.adminEmail,
    displayName: data.adminDisplayName,
    role: "client_admin",
    active: true,
    createdAt: now,
  });

  // Audit log
  await db.collection("superAuditLog").add({
    action: "create_client",
    clientId,
    performedBy: request.auth?.uid || "system",
    at: now,
    details: { name: data.name, presetId: data.presetId },
  });

  return { clientId };
});
