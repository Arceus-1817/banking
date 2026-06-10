import * as SQLite from 'expo-sqlite';

// Open (or create) the local database on the phone
const db = SQLite.openDatabaseSync('pigmypay.db');

export const initDB = () => {
    // FIXED: Removed DROP TABLE IF EXISTS to prevent critical data loss on app restarts.
    db.execSync(`
    CREATE TABLE IF NOT EXISTS local_customers (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT,
      accountNumber TEXT,
      phoneNumber TEXT,
      currentBalance REAL,
      routeSequence INTEGER,
      activeMonthlyEmi REAL
    );
    
    CREATE TABLE IF NOT EXISTS pending_sync (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerId INTEGER,
      amount REAL,
      paymentMode TEXT,
      type TEXT, 
      status TEXT,
      syncStatus TEXT DEFAULT 'PENDING',
      timestamp TEXT
    );
  `);
    // Migration check block
    try { 
        db.execSync('ALTER TABLE local_customers ADD COLUMN outstandingLoan REAL;'); 
    } catch{}
    try { 
        db.execSync('ALTER TABLE local_customers ADD COLUMN activeMonthlyEmi REAL;'); 
    } catch{}
    try { 
        db.execSync("ALTER TABLE pending_sync ADD COLUMN syncStatus TEXT DEFAULT 'PENDING';"); 
    } catch{}
    console.log("✅ Local SQLite Database Initialized");
};

// Wipe yesterday's route and save today's fresh route
export const saveRouteToLocal = (customers) => {
    db.withTransactionSync(() => {
        db.execSync('DELETE FROM local_customers;');
        const statement = db.prepareSync(
            // FIXED: Naming aligned to activeMonthlyEmi and outstandingLoan
            'INSERT INTO local_customers (id, name, accountNumber, phoneNumber, currentBalance, routeSequence, activeMonthlyEmi, outstandingLoan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        for (const c of customers) {
            statement.executeSync([
                c.id, c.name, c.accountNumber, c.phoneNumber || '',
                c.currentBalance || 0, c.routeSequence || 99,
                c.activeMonthlyEmi || 0, c.outstandingLoan || 0
            ]);
        }
    });
};

// 🚨 Safely record an offline transaction to the queue
export const saveOfflineTransaction = (customerId, amount, paymentMode, type, status = 'PENDING') => {
    const statement = db.prepareSync(
        'INSERT INTO pending_sync (customerId, amount, paymentMode, type, status, syncStatus, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    statement.executeSync([
        customerId,
        parseFloat(amount),
        paymentMode,
        type,
        status,
        'PENDING',
        new Date().toISOString()
    ]);
};

// Wipe the phone clean when an agent logs out!
export const clearLocalData = () => {
    db.execSync('DELETE FROM local_customers;');
    db.execSync('DELETE FROM pending_sync;');
    console.log("🧹 Device memory completely wiped.");
};

// Fetch customers instantly from the phone (no internet required)
export const getLocalRoute = () => {
    return db.getAllSync('SELECT * FROM local_customers ORDER BY routeSequence ASC');
};

// Get the number of transactions waiting to be synced to the cloud
export const getPendingSyncCount = () => {
    const result = db.getFirstSync("SELECT COUNT(*) as count FROM pending_sync WHERE syncStatus = 'PENDING'");
    return result.count;
};

// Only grab transactions that haven't been synced yet
export const getPendingTransactions = () => {
  return db.getAllSync("SELECT * FROM pending_sync WHERE syncStatus = 'PENDING'");
};

// FIXED: Parameterized query to avoid SQL Injection vulnerability
export const markTransactionSynced = (id) => {
  const statement = db.prepareSync("UPDATE pending_sync SET syncStatus = 'SYNCED' WHERE id = ?");
  statement.executeSync([id]);
};

// 3. ADD THIS: The math engine for the Ledger
// 🚨 UPGRADED ADVANCED MATH ENGINE
export const getLedgerStats = () => {
  const cashResult = db.getFirstSync("SELECT SUM(amount) as total FROM pending_sync WHERE paymentMode = 'CASH' AND status != 'SKIPPED_CLOSED'");
  const upiResult = db.getFirstSync("SELECT SUM(amount) as total FROM pending_sync WHERE paymentMode = 'UPI' AND status != 'SKIPPED_CLOSED'");
  
  const skippedCount = db.getFirstSync("SELECT COUNT(*) as total FROM pending_sync WHERE status = 'SKIPPED_CLOSED'");
  const collectedCount = db.getFirstSync("SELECT COUNT(*) as total FROM pending_sync WHERE status != 'SKIPPED_CLOSED' AND amount > 0");
  const totalRoute = db.getFirstSync("SELECT COUNT(*) as total FROM local_customers");

  return { 
    cash: cashResult.total || 0, 
    upi: upiResult.total || 0,
    skipped: skippedCount.total || 0,
    collected: collectedCount.total || 0,
    totalAssigned: totalRoute.total || 0
  };
};

// 🚨 ADD THIS: Get the full daily log with customer names attached
export const getDailyLog = () => {
  return db.getAllSync(`
    SELECT p.*, c.name as customerName, c.accountNumber 
    FROM pending_sync p
    LEFT JOIN local_customers c ON p.customerId = c.id
    ORDER BY p.id DESC
  `);
};

