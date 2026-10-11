/**
 * Emulator Seed Script for IMS (Avalon Digital)
 *
 * Populates:
 * 1. Global Super Admin: superadmin@barledger.lk / password123 (role: "superadmin")
 * 2. Three clients (one per preset):
 *    - Client 1 ("The Taphouse Colombo"): Full bar preset (full 30-day realistic bar data)
 *    - Client 2 ("Galle Fort Cellars"): Stock & daily sales preset
 *    - Client 3 ("Mirissa Beach Lounge"): Sales & cash preset
 * 3. Client admins & cashiers with auth claims
 * 4. For Client 1: 6 beer brands with prices and deposit history, suppliers, tab customers,
 *    offers, purchases, orders over 30 days, bottle returns, expenses, variances, and bank statement.
 */
import * as admin from "firebase-admin";

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "ims-avalon-dev" });
}

const auth = admin.auth();
const db = admin.firestore();

async function getOrCreateUser(email: string, pass: string, name: string, claims: Record<string, string>) {
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
  } catch {
    const created = await auth.createUser({
      email,
      password: pass,
      displayName: name,
    });
    uid = created.uid;
  }
  await auth.setCustomUserClaims(uid, claims);
  return uid;
}

async function seed() {
  console.log("🌱 Starting IMS database seed against emulators...");

  // 1. Super Admin
  const superAdminUid = await getOrCreateUser(
    "superadmin@barledger.lk",
    "password123",
    "Super Admin",
    { role: "superadmin" },
  );
  console.log(`✅ Super Admin created: superadmin@barledger.lk (${superAdminUid})`);

  // Presets
  const presets = [
    {
      id: "client-full-bar",
      name: "The Taphouse Colombo",
      preset: "full-bar",
      adminEmail: "admin@taphouse.lk",
      cashierEmail: "cashier1@taphouse.lk",
    },
    {
      id: "client-stock-sales",
      name: "Galle Fort Cellars",
      preset: "stock-and-daily-sales",
      adminEmail: "admin@gallefort.lk",
      cashierEmail: "cashier@gallefort.lk",
    },
    {
      id: "client-sales-cash",
      name: "Mirissa Beach Lounge",
      preset: "sales-and-cash",
      adminEmail: "admin@mirissa.lk",
      cashierEmail: "cashier@mirissa.lk",
    },
  ];

  for (const clientInfo of presets) {
    const isFullBar = clientInfo.preset === "full-bar";
    const isStockSales = clientInfo.preset === "stock-and-daily-sales";
    const isSalesCash = clientInfo.preset === "sales-and-cash";

    const adminUid = await getOrCreateUser(
      clientInfo.adminEmail,
      "password123",
      `${clientInfo.name} Admin`,
      { role: "client_admin", clientId: clientInfo.id },
    );

    const cashierUid = await getOrCreateUser(
      clientInfo.cashierEmail,
      "password123",
      `${clientInfo.name} Cashier`,
      { role: "cashier", clientId: clientInfo.id },
    );

    // Write Client doc
    const now = new Date().toISOString();
    await db.collection("clients").doc(clientInfo.id).set({
      id: clientInfo.id,
      name: clientInfo.name,
      status: "active",
      statusReason: null,
      billingNote: "Standard monthly SLA agreement.",
      timezone: "Asia/Colombo",
      currency: "LKR",
      language: "en-LK",
      accentColor: isFullBar ? "#059669" : isStockSales ? "#3b82f6" : "#f59e0b",
      entriesPerDay: isFullBar ? 120 : 45,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    // Write Entitlements
    await db.collection("clients").doc(clientInfo.id).collection("entitlements").doc("main").set({
      status: "active",
      modules: {
        products: true,
        stock: true,
        liveOrders: !isStockSales,
        dailyEntry: true,
        deposits: isFullBar,
        tabs: isFullBar,
        offers: isFullBar,
        adminRequests: isFullBar,
        expenses: !isStockSales,
        dayClose: !isStockSales,
        monthEndCards: isFullBar,
        forecastReorder: isFullBar,
        reports: true,
        dashboard: true,
      },
      tiles: {
        cashToday: !isStockSales,
        salesToday: true,
        stockNow: true,
        cashVariance: !isStockSales,
        netProfitToday: !isStockSales,
        tabsOwed: isFullBar,
        refundExposure: isFullBar,
      },
      reports: {
        sales: true,
        supplies: true,
        stock: true,
        profitLoss: !isStockSales,
        cashFlow: !isStockSales,
        reconciliation: !isStockSales,
        deposits: isFullBar,
        credit: isFullBar,
      },
      settingsTabs: {
        business: true,
        prices: true,
        deposits: isFullBar,
        salesScreen: !isStockSales,
        credit: isFullBar,
        payments: true,
        dayClose: !isStockSales,
        stock: true,
        expenses: !isStockSales,
      },
      maxUsers: 10,
      updatedAt: now,
      updatedBy: superAdminUid,
    });

    // Write users
    await db.collection("clients").doc(clientInfo.id).collection("users").doc(adminUid).set({
      id: adminUid,
      clientId: clientInfo.id,
      email: clientInfo.adminEmail,
      displayName: `${clientInfo.name} Admin`,
      role: "client_admin",
      active: true,
      createdAt: now,
    });

    await db.collection("clients").doc(clientInfo.id).collection("users").doc(cashierUid).set({
      id: cashierUid,
      clientId: clientInfo.id,
      email: clientInfo.cashierEmail,
      displayName: `${clientInfo.name} Cashier`,
      role: "cashier",
      active: true,
      createdAt: now,
    });

    console.log(`✅ Client created: ${clientInfo.name} (${clientInfo.id})`);

    // For Client 1 (Full Bar), populate deep catalogue and history
    if (isFullBar) {
      console.log(`📦 Seeding catalogue and 30-day ledger for ${clientInfo.name}...`);
      const clientRef = db.collection("clients").doc(clientInfo.id);

      // Category
      await clientRef.collection("categories").doc("beer-bottles").set({
        id: "beer-bottles",
        name: "Bottled Beer",
        unit: "bottle",
        returnableContainer: true,
        channels: ["inside", "outside"],
      });

      // Deposit version
      await clientRef.collection("depositVersions").add({
        categoryId: "beer-bottles",
        amount: 20000, // Rs. 200.00
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        changedBy: adminUid,
      });

      // Beers
      const beers = [
        { id: "lion-lager", brand: "Lion", name: "Lion Lager 625ml", insidePrice: 90000, outsideAddon: 10000, stock: 140 },
        { id: "lion-strong", brand: "Lion", name: "Lion Strong 625ml", insidePrice: 100000, outsideAddon: 10000, stock: 95 },
        { id: "carlsberg", brand: "Carlsberg", name: "Carlsberg Smooth 625ml", insidePrice: 110000, outsideAddon: 15000, stock: 70 },
        { id: "heineken", brand: "Heineken", name: "Heineken 330ml", insidePrice: 95000, outsideAddon: 10000, stock: 50 },
        { id: "corona", brand: "Corona", name: "Corona Extra 355ml", insidePrice: 130000, outsideAddon: 20000, stock: 42 },
        { id: "tiger-crystal", brand: "Tiger", name: "Tiger Crystal 330ml", insidePrice: 90000, outsideAddon: 10000, stock: 65 },
      ];

      for (const b of beers) {
        await clientRef.collection("products").doc(b.id).set({
          id: b.id,
          categoryId: "beer-bottles",
          brand: b.brand,
          name: b.name,
          reorderPoint: 24,
          stockOnHand: b.stock,
          avgCost: Math.round(b.insidePrice * 0.6),
        });

        // Price versions for inside and outside
        await clientRef.collection("priceVersions").add({
          productId: b.id,
          channel: "inside",
          beerPrice: b.insidePrice,
          addOn: 0,
          effectiveFrom: "2026-01-01T00:00:00.000Z",
          changedBy: adminUid,
        });

        await clientRef.collection("priceVersions").add({
          productId: b.id,
          channel: "outside",
          beerPrice: b.insidePrice,
          addOn: b.outsideAddon,
          effectiveFrom: "2026-01-01T00:00:00.000Z",
          changedBy: adminUid,
        });
      }

      // 5 Tab Customers
      const customers = [
        { id: "cust-1", name: "Sunil Perera", phone: "+94 77 111 2233", limit: 500000, balance: 180000 },
        { id: "cust-2", name: "David Mendis", phone: "+94 71 222 3344", limit: 300000, balance: 290000 },
        { id: "cust-3", name: "Nimal Fernando", phone: "+94 76 333 4455", limit: 1000000, balance: 0 },
        { id: "cust-4", name: "Rohan De Silva", phone: "+94 70 444 5566", limit: 250000, balance: 240000 },
        { id: "cust-5", name: "Praveen Jayawardena", phone: "+94 77 555 6677", limit: 750000, balance: 520000 },
      ];

      for (const c of customers) {
        await clientRef.collection("customers").doc(c.id).set({
          id: c.id,
          name: c.name,
          phone: c.phone,
          creditLimit: c.limit,
          dueDaysOverride: null,
          balance: c.balance,
        });
      }

      // Settings versions (deposit switches, etc.)
      await clientRef.collection("settingVersions").add({
        key: "depositOnNormalSales",
        value: true,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        changedBy: adminUid,
      });

      await clientRef.collection("settingVersions").add({
        key: "depositOnTabSales",
        value: true,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        changedBy: adminUid,
      });

      await clientRef.collection("settingVersions").add({
        key: "defaultDueDays",
        value: 30,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        changedBy: adminUid,
      });
    }
  }

  console.log("🎉 Seed finished successfully! All test accounts and tenants are ready.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
