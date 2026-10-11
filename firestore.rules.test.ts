import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";

describe("Firestore Security Rules Tests", () => {
  let testEnv: RulesTestEnvironment;

  const clientAId = "client-a";
  const clientBId = "client-b";

  beforeAll(async () => {
    const rules = fs.readFileSync(path.resolve(__dirname, "firestore.rules"), "utf8");

    testEnv = await initializeTestEnvironment({
      projectId: "ims-test-project",
      firestore: {
        rules,
        host: "localhost",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    // Setup initial test data via testEnv.withSecurityRulesDisabled
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      // Client A: Active, with products and liveOrders ON, deposits OFF
      await db.doc(`clients/${clientAId}`).set({ name: "Client A" });
      await db.doc(`clients/${clientAId}/entitlements/main`).set({
        status: "active",
        modules: {
          products: true,
          liveOrders: true,
          deposits: false, // OFF
        },
      });

      // Client B: Active
      await db.doc(`clients/${clientBId}`).set({ name: "Client B" });
      await db.doc(`clients/${clientBId}/entitlements/main`).set({
        status: "active",
        modules: { products: true },
      });

      // Client Blocked
      await db.doc("clients/client-blocked").set({ name: "Blocked Client" });
      await db.doc("clients/client-blocked/entitlements/main").set({
        status: "blocked",
        modules: { products: true },
      });

      // Client Read-Only
      await db.doc("clients/client-readonly").set({ name: "Read Only Client" });
      await db.doc("clients/client-readonly/entitlements/main").set({
        status: "read_only",
        modules: { products: true },
      });
    });
  });

  // 1. Cross-client Isolation
  test("User of Client A cannot read or write Client B data", async () => {
    const userA = testEnv.authenticatedContext("user-a", {
      role: "client_admin",
      clientId: clientAId,
    });
    const dbA = userA.firestore();

    // Can read own client data
    await assertSucceeds(dbA.doc(`clients/${clientAId}`).get());

    // CANNOT read Client B data
    await assertFails(dbA.doc(`clients/${clientBId}`).get());
    await assertFails(dbA.doc(`clients/${clientBId}/products/prod-1`).get());

    // CANNOT write to Client B
    await assertFails(
      dbA.doc(`clients/${clientBId}/products/prod-1`).set({
        name: "Hacked Beer",
      }),
    );
  });

  // 2. Cashier Permissions & Admin-Only Restrictions
  test("Cashier cannot write settings, prices or complimentary drinks", async () => {
    const cashierA = testEnv.authenticatedContext("cashier-1", {
      role: "cashier",
      clientId: clientAId,
    });
    const db = cashierA.firestore();

    // Cashier cannot create price versions
    await assertFails(
      db.doc(`clients/${clientAId}/priceVersions/pv-1`).set({
        productId: "p1",
        beerPrice: 1000,
      }),
    );

    // Cashier cannot create setting versions
    await assertFails(
      db.doc(`clients/${clientAId}/settingVersions/sv-1`).set({
        key: "defaultDueDays",
        value: 100,
      }),
    );

    // Cashier CANNOT create complimentary movement (only admin can)
    await assertFails(
      db.collection(`clients/${clientAId}/stockMovements`).add({
        type: "complimentary",
        productId: "p1",
        qty: 1,
      }),
    );

    // Cashier CAN create regular sale movement
    await assertSucceeds(
      db.collection(`clients/${clientAId}/stockMovements`).add({
        type: "sale",
        productId: "p1",
        qty: 1,
      }),
    );
  });

  // 3. Module-Off Restrictions
  test("Writes to a switched-off module are rejected", async () => {
    const adminA = testEnv.authenticatedContext("admin-a", {
      role: "client_admin",
      clientId: clientAId,
    });
    const db = adminA.firestore();

    // deposits is OFF for clientA: bottleReturns creation must FAIL
    await assertFails(
      db.collection(`clients/${clientAId}/bottleReturns`).add({
        productId: "p1",
        qty: 1,
        settlement: "cash",
      }),
    );

    // liveOrders is ON for clientA: order creation must SUCCEED
    await assertSucceeds(
      db.collection(`clients/${clientAId}/orders`).add({
        total: 120000,
        status: "open",
      }),
    );
  });

  // 4. Blocked Client
  test("Blocked client is refused both read and write access", async () => {
    const blockedUser = testEnv.authenticatedContext("user-blocked", {
      role: "client_admin",
      clientId: "client-blocked",
    });
    const db = blockedUser.firestore();

    await assertFails(db.doc("clients/client-blocked").get());
    await assertFails(db.doc("clients/client-blocked/products/p1").get());
    await assertFails(
      db.collection("clients/client-blocked/orders").add({ total: 1000 }),
    );
  });

  // 5. Read-Only Client
  test("Read-only client can read products but cannot write", async () => {
    const roUser = testEnv.authenticatedContext("user-ro", {
      role: "client_admin",
      clientId: "client-readonly",
    });
    const db = roUser.firestore();

    // Read succeeds
    await assertSucceeds(db.doc("clients/client-readonly").get());

    // Write fails
    await assertFails(
      db.collection("clients/client-readonly/products").add({
        name: "New Product",
      }),
    );
  });
});
