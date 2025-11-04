// server/sqlServerConnection.ts
import sql from 'mssql';

const config: sql.config = {
  server: process.env.SQLSERVER_HOST || '192.168.1.38',
  database: process.env.SQLSERVER_DATABASE || 'INNOVACENTRO',
  user: process.env.SQLSERVER_USER || 'Inventario',
  password: process.env.SQLSERVER_PASSWORD || '*Centro2023',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool: sql.ConnectionPool | null = null;

export async function getSqlServerPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('✅ SQL Server connected');
  }
  return pool;
}

export async function closeSqlServerPool() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('✅ SQL Server disconnected');
  }
}

export async function executeQuery<T>(query: string, params?: any[]): Promise<T[]> {
  const sqlPool = await getSqlServerPool();
  const request = sqlPool.request();
  
  if (params) {
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
  }
  
  const result = await request.query(query);
  return result.recordset as T[];
}

// Función de test - AGREGAR ESTA
export async function testConnection(): Promise<boolean> {
  try {
    const result = await executeQuery('SELECT TOP 1 * FROM View_ProductosLI');
    console.log('✅ SQL Server test successful');
    return true;
  } catch (error) {
    console.error('❌ SQL Server test failed:', error);
    return false;
  }
}