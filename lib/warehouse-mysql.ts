import mysql from "mysql2/promise";

const warehouseDbConfig = {
  host: process.env.WAREHOUSE_DB_HOST || "31.97.187.38",
  port: Number(process.env.WAREHOUSE_DB_PORT) || 3334,
  user: process.env.WAREHOUSE_DB_USER || "userdatabaseics",
  password: process.env.WAREHOUSE_DB_PASSWORD || "userdatabaseics27693",
  database: process.env.WAREHOUSE_DB_NAME || "databaseics",
  connectTimeout: 5000,
};

// Global connection pool declaration for hot reloading in Next.js development
declare global {
  var warehouseDbPool: mysql.Pool | undefined;
}

export function getWarehouseDbPool(): mysql.Pool {
  if (!globalThis.warehouseDbPool) {
    console.log("[Warehouse MySQL] Creating new MySQL connection pool...");
    globalThis.warehouseDbPool = mysql.createPool({
      ...warehouseDbConfig,
      connectionLimit: 5,
      maxIdle: 2,
      idleTimeout: 30000, // 30 seconds idle timeout
      waitForConnections: true,
      queueLimit: 0,
    });
  }
  return globalThis.warehouseDbPool;
}
