// ═══════════════════════════════════════════════════════════════════════════
//  ETHERWORLD QC — INTÉGRATION BASE DE DONNÉES (Drizzle Mock)
//  src/db/index.ts
// ═══════════════════════════════════════════════════════════════════════════

export const db: any = {
  transaction: async (callback: (tx: any) => Promise<any>) => {
    return callback(db);
  },
  select: (fields?: any) => ({
    from: (table: any) => ({
      where: (condition: any) => ({
        limit: async (n: number) => [] as any[]
      }),
      innerJoin: (table2: any, cond: any) => ({
        where: (condition: any) => ({
          limit: async (n: number) => [] as any[]
        })
      })
    })
  }),
  query: {
    inventoryItems: { findMany: async () => [] as any[] },
    vehicles: { findMany: async () => [] as any[] },
  },
  update: (table: any) => ({
    set: (values: any) => ({
      where: async (cond: any) => {}
    })
  })
};