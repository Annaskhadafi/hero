"use server"

import { getWarehouseDbPool } from "@/lib/warehouse-mysql"

const READ_ONLY_ERROR = { success: false, error: "Mode lihat saja aktif. Perubahan data dinonaktifkan." };

// Read functions connecting to MySQL databaseics
export async function getWarehouseRepairTypes() {
  const pool = getWarehouseDbPool();
  try {
    const [rows]: any = await pool.query("SELECT * FROM tbl_jenis ORDER BY nama_jenis ASC");
    return rows.map((row: any) => ({
      id: Number(row.id_jenis),
      typeCode: `J-${row.id_jenis}`,
      typeName: row.nama_jenis,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  } catch (error) {
    console.error("[Warehouse MySQL] Error fetching types:", error);
    return [];
  }
}

export async function getWarehouseRepairUnits() {
  const pool = getWarehouseDbPool();
  try {
    const [rows]: any = await pool.query("SELECT * FROM tbl_satuan ORDER BY nama_satuan ASC");
    return rows.map((row: any) => ({
      id: Number(row.id_satuan),
      unitCode: `S-${row.id_satuan}`,
      unitName: row.nama_satuan,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  } catch (error) {
    console.error("[Warehouse MySQL] Error fetching units:", error);
    return [];
  }
}

export async function getWarehouseRepairItems() {
  const pool = getWarehouseDbPool();
  try {
    const [rows]: any = await pool.query(`
      SELECT b.*, j.nama_jenis, s.nama_satuan 
      FROM tbl_barang b
      LEFT JOIN tbl_jenis j ON b.jenis = j.id_jenis
      LEFT JOIN tbl_satuan s ON b.satuan = s.id_satuan
      ORDER BY b.id_barang DESC
    `);
    return rows.map((row: any) => ({
      id: parseInt(row.id_barang.replace(/\D/g, ""), 10) || 0,
      itemCode: row.id_barang,
      itemName: row.nama_barang,
      typeId: row.jenis ? Number(row.jenis) : null,
      typeName: row.nama_jenis || null,
      minimumStock: row.stok_minimum ? Number(row.stok_minimum) : 0,
      stock: row.stok ? Number(row.stok) : 0,
      unitId: row.satuan ? Number(row.satuan) : null,
      unitName: row.nama_satuan || null,
      photoUrl: row.foto ? `/api/uploads/${row.foto}` : "",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  } catch (error) {
    console.error("[Warehouse MySQL] Error fetching items:", error);
    return [];
  }
}

export async function getWarehouseRepairInbound() {
  const pool = getWarehouseDbPool();
  try {
    const [rows]: any = await pool.query(`
      SELECT m.*, b.nama_barang 
      FROM tbl_barang_masuk m
      LEFT JOIN tbl_barang b ON m.barang = b.id_barang
      ORDER BY m.tanggal DESC, m.id_transaksi DESC
    `);
    return rows.map((row: any) => ({
      id: parseInt(row.id_transaksi.replace(/\D/g, ""), 10) || 0,
      transactionNo: row.id_transaksi,
      transactionDate: row.tanggal ? new Date(row.tanggal).toISOString().slice(0, 10) : "",
      itemId: parseInt(row.barang.replace(/\D/g, ""), 10) || 0,
      itemCode: row.barang,
      itemName: row.nama_barang || "Barang Tidak Dikenal",
      quantity: row.jumlah ? Number(row.jumlah) : 0,
      note: row.keterangan || "",
      createdAt: row.tanggal ? new Date(row.tanggal) : new Date()
    }));
  } catch (error) {
    console.error("[Warehouse MySQL] Error fetching inbound:", error);
    return [];
  }
}

export async function getWarehouseRepairOutbound() {
  const pool = getWarehouseDbPool();
  try {
    const [rows]: any = await pool.query(`
      SELECT k.*, b.nama_barang 
      FROM tbl_barang_keluar k
      LEFT JOIN tbl_barang b ON k.barang = b.id_barang
      ORDER BY k.tanggal DESC, k.id_transaksi DESC
    `);
    return rows.map((row: any) => ({
      id: parseInt(row.id_transaksi.replace(/\D/g, ""), 10) || 0,
      transactionNo: row.id_transaksi,
      transactionDate: row.tanggal ? new Date(row.tanggal).toISOString().slice(0, 10) : "",
      itemId: parseInt(row.barang.replace(/\D/g, ""), 10) || 0,
      itemCode: row.barang,
      itemName: row.nama_barang || "Barang Tidak Dikenal",
      quantity: row.jumlah ? Number(row.jumlah) : 0,
      note: row.keterangan || "",
      createdAt: row.tanggal ? new Date(row.tanggal) : new Date()
    }));
  } catch (error) {
    console.error("[Warehouse MySQL] Error fetching outbound:", error);
    return [];
  }
}

export async function getWarehouseRepairPageData() {
  const [items, types, units, inbound, outbound] = await Promise.all([
    getWarehouseRepairItems(),
    getWarehouseRepairTypes(),
    getWarehouseRepairUnits(),
    getWarehouseRepairInbound(),
    getWarehouseRepairOutbound()
  ]);
  return { items, types, units, inbound, outbound };
}

export async function getWarehouseRepairDashboardData() {
  const data = await getWarehouseRepairPageData();
  return {
    ...data,
    metrics: {
      items: data.items.length,
      lowStock: data.items.filter((i: any) => i.stock <= i.minimumStock).length,
      inbound: data.inbound.length,
      outbound: data.outbound.length,
      totalStock: data.items.reduce((s: number, i: any) => s + i.stock, 0)
    }
  };
}

// Write/Mutation functions returning read-only error
export async function upsertWarehouseRepairType(input: any, id?: number) { return READ_ONLY_ERROR; }
export async function upsertWarehouseRepairUnit(input: any, id?: number) { return READ_ONLY_ERROR; }
export async function upsertWarehouseRepairItem(input: any, id?: number) { return READ_ONLY_ERROR; }
export async function deleteWarehouseRepairType(id: number) { return READ_ONLY_ERROR; }
export async function deleteWarehouseRepairUnit(id: number) { return READ_ONLY_ERROR; }
export async function deleteWarehouseRepairItem(id: number) { return READ_ONLY_ERROR; }

export async function createWarehouseRepairInbound(input: any) { return READ_ONLY_ERROR; }
export async function createWarehouseRepairOutbound(input: any) { return READ_ONLY_ERROR; }
export async function updateWarehouseRepairInbound(id: number, input: any) { return READ_ONLY_ERROR; }
export async function updateWarehouseRepairOutbound(id: number, input: any) { return READ_ONLY_ERROR; }
export async function deleteWarehouseRepairInbound(id: number) { return READ_ONLY_ERROR; }
export async function deleteWarehouseRepairOutbound(id: number) { return READ_ONLY_ERROR; }

// Report functions with date-range filters
export async function getWarehouseRepairStockReport(filter: "all" | "minimum" = "all") {
  const items = await getWarehouseRepairItems();
  return filter === "minimum" ? items.filter((i: any) => i.stock <= i.minimumStock) : items;
}

export async function getWarehouseRepairInboundReport(start?: string, end?: string) {
  const pool = getWarehouseDbPool();
  try {
    let sqlQuery = `
      SELECT m.*, b.nama_barang 
      FROM tbl_barang_masuk m
      LEFT JOIN tbl_barang b ON m.barang = b.id_barang
    `;
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (start) {
      conditions.push("m.tanggal >= ?");
      params.push(start);
    }
    if (end) {
      conditions.push("m.tanggal <= ?");
      params.push(end);
    }
    
    if (conditions.length > 0) {
      sqlQuery += " WHERE " + conditions.join(" AND ");
    }
    
    sqlQuery += " ORDER BY m.tanggal DESC, m.id_transaksi DESC";
    
    const [rows]: any = await pool.query(sqlQuery, params);
    return rows.map((row: any) => ({
      id: parseInt(row.id_transaksi.replace(/\D/g, ""), 10) || 0,
      transactionNo: row.id_transaksi,
      transactionDate: row.tanggal ? new Date(row.tanggal).toISOString().slice(0, 10) : "",
      itemCode: row.barang,
      itemName: row.nama_barang || "Barang Tidak Dikenal",
      quantity: row.jumlah ? Number(row.jumlah) : 0,
      note: row.keterangan || ""
    }));
  } catch (error) {
    console.error("[Warehouse MySQL] Error fetching inbound report:", error);
    return [];
  }
}

export async function getWarehouseRepairOutboundReport(start?: string, end?: string) {
  const pool = getWarehouseDbPool();
  try {
    let sqlQuery = `
      SELECT k.*, b.nama_barang 
      FROM tbl_barang_keluar k
      LEFT JOIN tbl_barang b ON k.barang = b.id_barang
    `;
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (start) {
      conditions.push("k.tanggal >= ?");
      params.push(start);
    }
    if (end) {
      conditions.push("k.tanggal <= ?");
      params.push(end);
    }
    
    if (conditions.length > 0) {
      sqlQuery += " WHERE " + conditions.join(" AND ");
    }
    
    sqlQuery += " ORDER BY k.tanggal DESC, k.id_transaksi DESC";
    
    const [rows]: any = await pool.query(sqlQuery, params);
    return rows.map((row: any) => ({
      id: parseInt(row.id_transaksi.replace(/\D/g, ""), 10) || 0,
      transactionNo: row.id_transaksi,
      transactionDate: row.tanggal ? new Date(row.tanggal).toISOString().slice(0, 10) : "",
      itemCode: row.barang,
      itemName: row.nama_barang || "Barang Tidak Dikenal",
      quantity: row.jumlah ? Number(row.jumlah) : 0,
      note: row.keterangan || ""
    }));
  } catch (error) {
    console.error("[Warehouse MySQL] Error fetching outbound report:", error);
    return [];
  }
}
