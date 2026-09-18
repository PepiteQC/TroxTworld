// ============================================================================
// TroxtPrisma — Utilitaires Manager (suite)
// CRUD générique, export/import, audit, nettoyage, recherche full-text.
// ============================================================================

export type ModelName =
  | "user"
  | "session"
  | "account"
  | "verification"
  | "project"
  | "generation"
  | "model3D"
  | "asset"
  | "preference";

export interface BaseRecord {
  id: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

// In-Memory Database Store simulating Prisma client
const inMemoryStore: Record<ModelName, Map<string, BaseRecord>> = {
  user: new Map([
    ["u1", { id: "u1", name: "TroxTCristal", email: "cristal@troxt.qc.ca", createdAt: new Date() }],
  ]),
  session: new Map([
    ["s1", { id: "s1", userId: "u1", expiresAt: new Date(Date.now() + 86400000) }],
  ]),
  account: new Map(),
  verification: new Map(),
  project: new Map([
    ["p1", { id: "p1", name: "Domaine Portneuf Villa Céleste", description: "Architecture 3D TroxT", userId: "u1" }],
  ]),
  generation: new Map([
    ["g1", { id: "g1", projectId: "p1", prompt: "Villa Luxe Portneuf 3D", status: "completed", style: "modern", source: "TroxtAI", polyCount: 15400, rating: 5, createdAt: new Date() }],
  ]),
  model3D: new Map([
    ["m1", { id: "m1", generationId: "g1", name: "Supercar Quebec Red", format: "glb", polyCount: 22000 }],
  ]),
  asset: new Map(),
  preference: new Map([
    ["pref1", { id: "pref1", key: "theme", value: "cyber-portneuf" }],
  ]),
};

interface DelegateQueryOptions {
  where?: Record<string, unknown>;
  skip?: number;
  take?: number;
  orderBy?: Record<string, "asc" | "desc">;
  select?: Record<string, boolean>;
  data?: Record<string, unknown>;
}

export class ModelDelegate {
  private model: ModelName;

  constructor(model: ModelName) {
    this.model = model;
  }

  private getMap(): Map<string, BaseRecord> {
    if (!inMemoryStore[this.model]) {
      inMemoryStore[this.model] = new Map();
    }
    return inMemoryStore[this.model];
  }

  async findMany(options: DelegateQueryOptions = {}): Promise<BaseRecord[]> {
    let records = Array.from(this.getMap().values());
    
    // Filtering logic if present
    if (options.where && Object.keys(options.where).length > 0) {
      records = records.filter((rec) => {
        if (options.where?.AND && Array.isArray(options.where.AND)) {
          return options.where.AND.every((cond: Record<string, unknown>) => {
            if (cond.OR && Array.isArray(cond.OR)) {
              return cond.OR.some((orCond: Record<string, unknown>) => {
                return Object.entries(orCond).every(([field, subCond]) => {
                  const val = rec[field];
                  if (typeof subCond === "object" && subCond !== null) {
                    const sc = subCond as Record<string, unknown>;
                    if ("contains" in sc && typeof val === "string") {
                      return val.toLowerCase().includes(String(sc.contains).toLowerCase());
                    }
                  }
                  return val === subCond;
                });
              });
            }
            return Object.entries(cond).every(([field, subCond]) => {
              const val = rec[field];
              if (typeof subCond === "object" && subCond !== null) {
                const sc = subCond as Record<string, unknown>;
                if ("equals" in sc) return val === sc.equals;
                if ("contains" in sc && typeof val === "string") return val.toLowerCase().includes(String(sc.contains).toLowerCase());
                if ("startsWith" in sc && typeof val === "string") return val.toLowerCase().startsWith(String(sc.startsWith).toLowerCase());
                if ("endsWith" in sc && typeof val === "string") return val.toLowerCase().endsWith(String(sc.endsWith).toLowerCase());
                if ("not" in sc) return val !== sc.not;
                if ("gt" in sc) return Number(val) > Number(sc.gt);
                if ("lt" in sc) return Number(val) < Number(sc.lt);
                if ("gte" in sc) return Number(val) >= Number(sc.gte);
                if ("lte" in sc) return Number(val) <= Number(sc.lte);
              }
              return val === subCond;
            });
          });
        }
        if (options.where && "status" in options.where) {
          return rec.status === options.where.status;
        }
        return true;
      });
    }

    if (options.skip) records = records.slice(options.skip);
    if (options.take) records = records.slice(0, options.take);

    return records;
  }

  async findUnique(options: { where: { id: string } }): Promise<BaseRecord | null> {
    return this.getMap().get(options.where.id) || null;
  }

  async create(options: { data: Record<string, unknown> }): Promise<BaseRecord> {
    const id = (options.data.id as string) || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const record: BaseRecord = {
      ...options.data,
      id,
      createdAt: (options.data.createdAt as Date | string) || new Date(),
      updatedAt: new Date(),
    };
    this.getMap().set(id, record);
    return record;
  }

  async update(options: { where: { id: string }; data: Record<string, unknown> }): Promise<BaseRecord> {
    const map = this.getMap();
    const existing = map.get(options.where.id);
    if (!existing) throw new Error(`[Manager] Enregistrement introuvable : ${this.model}#${options.where.id}`);
    const updated: BaseRecord = {
      ...existing,
      ...options.data,
      updatedAt: new Date(),
    };
    map.set(options.where.id, updated);
    return updated;
  }

  async delete(options: { where: { id: string } }): Promise<BaseRecord> {
    const map = this.getMap();
    const existing = map.get(options.where.id);
    if (!existing) throw new Error(`[Manager] Enregistrement introuvable : ${this.model}#${options.where.id}`);
    map.delete(options.where.id);
    return existing;
  }

  async deleteMany(options: { where?: Record<string, unknown> } = {}): Promise<{ count: number }> {
    const map = this.getMap();
    const count = map.size;
    map.clear();
    return { count };
  }

  async count(options: { where?: Record<string, unknown> } = {}): Promise<number> {
    const records = await this.findMany(options);
    return records.length;
  }
}

export function getDelegate(model: ModelName): ModelDelegate {
  return new ModelDelegate(model);
}

export const db: Record<ModelName, ModelDelegate> = {
  user: new ModelDelegate("user"),
  session: new ModelDelegate("session"),
  account: new ModelDelegate("account"),
  verification: new ModelDelegate("verification"),
  project: new ModelDelegate("project"),
  generation: new ModelDelegate("generation"),
  model3D: new ModelDelegate("model3D"),
  asset: new ModelDelegate("asset"),
  preference: new ModelDelegate("preference"),
};

export async function getStats(): Promise<{ model: ModelName; count: number }[]> {
  const models: ModelName[] = ["user", "session", "account", "verification", "project", "generation", "model3D", "asset", "preference"];
  return Promise.all(models.map(async (model) => ({ model, count: await db[model].count() })));
}

// ─── Types auxiliaires ───────────────────────────────────────────────────────

export type SortOrder = "asc" | "desc";

export interface PaginationOptions {
  page: number;       // commence à 1
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface FilterOptions {
  field: string;
  operator: "equals" | "contains" | "startsWith" | "endsWith" | "gt" | "lt" | "gte" | "lte" | "not";
  value: unknown;
}

export interface QueryOptions {
  pagination?: PaginationOptions;
  sort?: { field: string; order: SortOrder };
  filters?: FilterOptions[];
  search?: { fields: string[]; term: string };
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: "CREATE" | "UPDATE" | "DELETE" | "READ";
  model: ModelName;
  recordId: string;
  userId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface ExportOptions {
  format: "json" | "csv" | "tsv";
  models?: ModelName[];
  includeRelations?: boolean;
  pretty?: boolean;
}

export interface ImportResult {
  model: ModelName;
  attempted: number;
  created: number;
  skipped: number;
  failed: number;
  errors: { row: number; reason: string }[];
}

export interface HealthReport {
  status: "healthy" | "degraded" | "critical";
  timestamp: Date;
  checks: HealthCheck[];
  summary: string;
}

export interface HealthCheck {
  name: string;
  passed: boolean;
  detail?: string;
  durationMs: number;
}

export interface CleanupResult {
  model: ModelName;
  deleted: number;
  reason: string;
}

export interface DuplicateGroup<T = BaseRecord> {
  field: string;
  value: unknown;
  count: number;
  records: T[];
}

// ─── Registre d'audit en mémoire ──────────────────────────────────────────────

const auditLog: AuditEntry[] = [];

function pushAudit(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const record: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    ...entry,
  };
  auditLog.push(record);
  if (auditLog.length > 10_000) auditLog.splice(0, auditLog.length - 10_000);
  return record;
}

/** Retourne l'historique d'audit filtré. */
export function getAuditLog(options?: {
  model?: ModelName;
  action?: AuditEntry["action"];
  userId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}): AuditEntry[] {
  let entries = [...auditLog];

  if (options?.model)   entries = entries.filter((e) => e.model === options.model);
  if (options?.action)  entries = entries.filter((e) => e.action === options.action);
  if (options?.userId)  entries = entries.filter((e) => e.userId === options.userId);
  if (options?.from)    entries = entries.filter((e) => e.timestamp >= options.from!);
  if (options?.to)      entries = entries.filter((e) => e.timestamp <= options.to!);

  entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return options?.limit ? entries.slice(0, options.limit) : entries;
}

/** Vide l'historique d'audit en mémoire. */
export function clearAuditLog(): void {
  auditLog.length = 0;
}

// ─── Construction de la clause WHERE Prisma ──────────────────────────────────

function buildWhere(filters: FilterOptions[] = [], search?: { fields: string[]; term: string }) {
  const conditions: Record<string, unknown>[] = [];

  for (const f of filters) {
    switch (f.operator) {
      case "equals":
        conditions.push({ [f.field]: { equals: f.value } });
        break;
      case "contains":
        conditions.push({ [f.field]: { contains: f.value, mode: "insensitive" } });
        break;
      case "startsWith":
        conditions.push({ [f.field]: { startsWith: f.value, mode: "insensitive" } });
        break;
      case "endsWith":
        conditions.push({ [f.field]: { endsWith: f.value, mode: "insensitive" } });
        break;
      case "not":
        conditions.push({ [f.field]: { not: f.value } });
        break;
      case "gt":
        conditions.push({ [f.field]: { gt: f.value } });
        break;
      case "lt":
        conditions.push({ [f.field]: { lt: f.value } });
        break;
      case "gte":
        conditions.push({ [f.field]: { gte: f.value } });
        break;
      case "lte":
        conditions.push({ [f.field]: { lte: f.value } });
        break;
    }
  }

  if (search && search.term.trim() !== "") {
    conditions.push({
      OR: search.fields.map((field) => ({
        [field]: { contains: search.term.trim(), mode: "insensitive" },
      })),
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

// ─── CRUD générique avec audit ────────────────────────────────────────────────

export async function listRecords<T extends BaseRecord>(
  model: ModelName,
  options: QueryOptions = {},
  currentUserId?: string
): Promise<PaginatedResult<T>> {
  const delegate = getDelegate(model);
  const { pagination = { page: 1, pageSize: 20 }, sort, filters, search } = options;

  const page     = Math.max(1, pagination.page);
  const pageSize = Math.min(Math.max(1, pagination.pageSize), 200);
  const skip     = (page - 1) * pageSize;
  const where    = buildWhere(filters, search);
  const orderBy  = sort ? { [sort.field]: sort.order } : { id: "asc" as SortOrder };

  const [data, total] = await Promise.all([
    delegate.findMany({ where, skip, take: pageSize, orderBy }) as Promise<T[]>,
    delegate.count({ where }),
  ]);

  const pageCount = Math.ceil(total / pageSize);

  pushAudit({
    action: "READ",
    model,
    recordId: "*",
    userId: currentUserId,
    meta: { page, pageSize, total },
  });

  return {
    data,
    total,
    page,
    pageSize,
    pageCount,
    hasPrev: page > 1,
    hasNext: page < pageCount,
  };
}

export async function getRecord<T extends BaseRecord>(
  model: ModelName,
  id: string,
  currentUserId?: string
): Promise<T | null> {
  const record = (await getDelegate(model).findUnique({ where: { id } })) as T | null;

  pushAudit({
    action: "READ",
    model,
    recordId: id,
    userId: currentUserId,
    meta: { found: record !== null },
  });

  return record;
}

export async function createRecord<T extends BaseRecord>(
  model: ModelName,
  data: Record<string, unknown>,
  currentUserId?: string
): Promise<T> {
  const record = (await getDelegate(model).create({ data })) as T;

  pushAudit({
    action: "CREATE",
    model,
    recordId: record.id,
    userId: currentUserId,
    after: record as unknown as Record<string, unknown>,
  });

  return record;
}

export async function updateRecord<T extends BaseRecord>(
  model: ModelName,
  id: string,
  data: Record<string, unknown>,
  currentUserId?: string
): Promise<T> {
  const before = (await getDelegate(model).findUnique({ where: { id } })) as T | null;
  if (!before) throw new Error(`[Manager] Enregistrement introuvable : ${model}#${id}`);

  const after = (await getDelegate(model).update({ where: { id }, data })) as T;

  pushAudit({
    action: "UPDATE",
    model,
    recordId: id,
    userId: currentUserId,
    before: before as unknown as Record<string, unknown>,
    after: after as unknown as Record<string, unknown>,
  });

  return after;
}

export async function deleteRecord<T extends BaseRecord>(
  model: ModelName,
  id: string,
  currentUserId?: string
): Promise<T> {
  const before = (await getDelegate(model).findUnique({ where: { id } })) as T | null;
  if (!before) throw new Error(`[Manager] Enregistrement introuvable : ${model}#${id}`);

  await getDelegate(model).delete({ where: { id } });

  pushAudit({
    action: "DELETE",
    model,
    recordId: id,
    userId: currentUserId,
    before: before as unknown as Record<string, unknown>,
  });

  return before;
}

export async function bulkDelete(
  model: ModelName,
  ids: string[],
  currentUserId?: string
): Promise<{ deleted: number; failed: { id: string; reason: string }[] }> {
  const failed: { id: string; reason: string }[] = [];
  let deleted = 0;

  await Promise.all(
    ids.map(async (id) => {
      try {
        await deleteRecord(model, id, currentUserId);
        deleted++;
      } catch (err) {
        failed.push({ id, reason: (err as Error).message });
      }
    })
  );

  return { deleted, failed };
}

export async function bulkUpdate(
  model: ModelName,
  ids: string[],
  data: Record<string, unknown>,
  currentUserId?: string
): Promise<{ updated: number; failed: { id: string; reason: string }[] }> {
  const failed: { id: string; reason: string }[] = [];
  let updated = 0;

  await Promise.all(
    ids.map(async (id) => {
      try {
        await updateRecord(model, id, data, currentUserId);
        updated++;
      } catch (err) {
        failed.push({ id, reason: (err as Error).message });
      }
    })
  );

  return { updated, failed };
}

// ─── Export ───────────────────────────────────────────────────────────────────

function recordsToCsv(records: BaseRecord[], separator = ","): string {
  if (records.length === 0) return "";
  const headers = Object.keys(records[0]);
  const escape  = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(separator) || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const rows = records.map((r) => headers.map((h) => escape(r[h as keyof typeof r])).join(separator));
  return [headers.join(separator), ...rows].join("\n");
}

export async function exportData(options: ExportOptions = { format: "json" }): Promise<string> {
  const models: ModelName[] = options.models ?? [
    "user", "session", "account", "verification",
    "project", "generation", "model3D", "asset", "preference",
  ];

  const snapshot: Record<string, BaseRecord[]> = {};
  await Promise.all(
    models.map(async (m) => {
      snapshot[m] = (await getDelegate(m).findMany({})) as BaseRecord[];
    })
  );

  switch (options.format) {
    case "json":
      return JSON.stringify(snapshot, null, options.pretty ? 2 : 0);

    case "csv": {
      const sections = models
        .filter((m) => snapshot[m].length > 0)
        .map((m) => `### ${m}\n${recordsToCsv(snapshot[m])}`);
      return sections.join("\n\n");
    }

    case "tsv": {
      const sections = models
        .filter((m) => snapshot[m].length > 0)
        .map((m) => `### ${m}\n${recordsToCsv(snapshot[m], "\t")}`);
      return sections.join("\n\n");
    }
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importData(
  jsonSnapshot: string
): Promise<ImportResult[]> {
  const snapshot = JSON.parse(jsonSnapshot) as Record<string, Record<string, unknown>[]>;
  const results: ImportResult[] = [];

  for (const [modelKey, rows] of Object.entries(snapshot)) {
    const model    = modelKey as ModelName;
    const delegate = getDelegate(model);
    const result: ImportResult = {
      model,
      attempted: rows.length,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const existing = row.id
          ? await delegate.findUnique({ where: { id: row.id as string } })
          : null;

        if (existing) {
          result.skipped++;
        } else {
          await delegate.create({ data: row });
          result.created++;
        }
      } catch (err) {
        result.failed++;
        result.errors.push({ row: i + 1, reason: (err as Error).message });
      }
    }

    results.push(result);
  }

  return results;
}

// ─── Recherche globale ────────────────────────────────────────────────────────

export interface GlobalSearchResult {
  model: ModelName;
  record: BaseRecord;
  matchedFields: string[];
}

const SEARCHABLE_FIELDS: Partial<Record<ModelName, string[]>> = {
  user:       ["name", "email"],
  project:    ["name", "description"],
  generation: ["prompt", "style", "status"],
  model3D:    ["name", "format"],
  asset:      ["name", "type"],
  preference: ["key", "value"],
};

export async function globalSearch(
  term: string,
  limit = 50
): Promise<GlobalSearchResult[]> {
  if (!term.trim()) return [];

  const results: GlobalSearchResult[] = [];

  await Promise.all(
    (Object.entries(SEARCHABLE_FIELDS) as [ModelName, string[]][]).map(
      async ([model, fields]) => {
        const where = buildWhere([], { fields, term });
        const records = (await getDelegate(model).findMany({
          where,
          take: limit,
        })) as BaseRecord[];

        for (const record of records) {
          const matchedFields = fields.filter((f) => {
            const val = record[f as keyof typeof record];
            return typeof val === "string" &&
              val.toLowerCase().includes(term.toLowerCase());
          });
          results.push({ model, record, matchedFields });
        }
      }
    )
  );

  return results.slice(0, limit);
}

// ─── Détection de doublons ────────────────────────────────────────────────────

export async function findDuplicates<T extends BaseRecord>(
  model: ModelName,
  field: string
): Promise<DuplicateGroup<T>[]> {
  const all = (await getDelegate(model).findMany({})) as T[];

  const groups = new Map<unknown, T[]>();
  for (const record of all) {
    const val = record[field as keyof T];
    if (val === null || val === undefined) continue;
    const existing = groups.get(val) ?? [];
    existing.push(record);
    groups.set(val, existing);
  }

  return Array.from(groups.entries())
    .filter(([, records]) => records.length > 1)
    .map(([value, records]) => ({ field, value, count: records.length, records }));
}

// ─── Nettoyage ────────────────────────────────────────────────────────────────

async function cleanExpiredSessions(): Promise<CleanupResult> {
  const all = (await db.session.findMany({})) as Array<{ id: string; expiresAt: Date }>;
  const now = new Date();
  const expired = all.filter((s) => new Date(s.expiresAt) < now);

  await Promise.all(expired.map((s) => db.session.delete({ where: { id: s.id } })));

  return { model: "session", deleted: expired.length, reason: "Session expirée" };
}

async function cleanExpiredVerifications(): Promise<CleanupResult> {
  const all = (await db.verification.findMany({})) as Array<{ id: string; expiresAt: Date }>;
  const now = new Date();
  const expired = all.filter((v) => new Date(v.expiresAt) < now);

  await Promise.all(expired.map((v) => db.verification.delete({ where: { id: v.id } })));

  return { model: "verification", deleted: expired.length, reason: "Vérification expirée" };
}

async function cleanFailedGenerations(olderThanDays = 7): Promise<CleanupResult> {
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
  const all = (await db.generation.findMany({
    where: { status: "failed" },
  })) as Array<{ id: string; createdAt: Date }>;

  const old = all.filter((g) => new Date(g.createdAt) < cutoff);
  await Promise.all(old.map((g) => db.generation.delete({ where: { id: g.id } })));

  return {
    model: "generation",
    deleted: old.length,
    reason: `Génération échouée > ${olderThanDays}j`,
  };
}

export async function runCleanup(options?: {
  failedGenerationDays?: number;
}): Promise<CleanupResult[]> {
  const results = await Promise.all([
    cleanExpiredSessions(),
    cleanExpiredVerifications(),
    cleanFailedGenerations(options?.failedGenerationDays ?? 7),
  ]);

  console.info(
    "[Manager] Nettoyage terminé :",
    results.map((r) => `${r.model}=${r.deleted}`).join(", ")
  );

  return results;
}

// ─── Santé de la base ─────────────────────────────────────────────────────────

export async function checkHealth(): Promise<HealthReport> {
  const checks: HealthCheck[] = [];

  // 1. Ping base de données
  await runCheck(checks, "db:ping", async () => {
    await db.user.count();
  });

  // 2. Générations sans projet parent
  await runCheck(checks, "integrity:generation→project", async () => {
    const gens = (await db.generation.findMany({})) as Array<{
      id: string;
      projectId: string;
    }>;
    const projectIds = new Set(
      ((await db.project.findMany({})) as Array<{ id: string }>).map(
        (p) => p.id
      )
    );
    const orphans = gens.filter((g) => g.projectId && !projectIds.has(g.projectId));
    if (orphans.length > 0)
      throw new Error(`${orphans.length} génération(s) orpheline(s) détectée(s)`);
  });

  // 3. Model3D sans génération parente
  await runCheck(checks, "integrity:model3D→generation", async () => {
    const models = (await db.model3D.findMany({})) as Array<{
      id: string;
      generationId: string;
    }>;
    const genIds = new Set(
      ((await db.generation.findMany({})) as Array<{ id: string }>).map(
        (g) => g.id
      )
    );
    const orphans = models.filter((m) => m.generationId && !genIds.has(m.generationId));
    if (orphans.length > 0)
      throw new Error(`${orphans.length} model3D orphelin(s) détecté(s)`);
  });

  // 4. Sessions expirées (avertissement non bloquant)
  await runCheck(checks, "warn:expired-sessions", async () => {
    const all = (await db.session.findMany({})) as unknown as Array<{ expiresAt: Date }>;
    const expired = all.filter((s) => new Date(s.expiresAt) < new Date());
    if (expired.length > 0)
      throw new Error(`${expired.length} session(s) expirée(s) non nettoyée(s)`);
  });

  const failed   = checks.filter((c) => !c.passed);
  const critical = failed.some((c) => c.name.startsWith("db:") || c.name.startsWith("integrity:"));
  const status   = critical ? "critical" : failed.length > 0 ? "degraded" : "healthy";

  return {
    status,
    timestamp: new Date(),
    checks,
    summary: status === "healthy"
      ? "Tous les contrôles sont passés."
      : `${failed.length} contrôle(s) en échec : ${failed.map((c) => c.name).join(", ")}`,
  };
}

async function runCheck(
  checks: HealthCheck[],
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const t0 = performance.now();
  try {
    await fn();
    checks.push({ name, passed: true, durationMs: performance.now() - t0 });
  } catch (err) {
    checks.push({
      name,
      passed: false,
      detail: (err as Error).message,
      durationMs: performance.now() - t0,
    });
  }
}

// ─── Statistiques avancées ────────────────────────────────────────────────────

export interface AdvancedStats {
  global: { model: ModelName; count: number }[];
  generations: {
    byStatus: Record<string, number>;
    byStyle: Record<string, number>;
    bySource: Record<string, number>;
    avgPolyCount: number;
    avgRating: number;
    completionRate: number;
  };
  users: {
    total: number;
    withProjects: number;
    avgProjectsPerUser: number;
  };
  storage: {
    model3DCount: number;
    assetCount: number;
  };
}

export async function getAdvancedStats(): Promise<AdvancedStats> {
  const [global, generations, users, projects, model3Ds, assets] = await Promise.all([
    getStats(),
    (db.generation.findMany({}) as unknown) as Promise<
      Array<{ status: string; style: string; source: string; polyCount: number; rating: number | null }>
    >,
    (db.user.findMany({}) as unknown) as Promise<Array<{ id: string }>>,
    (db.project.findMany({}) as unknown) as Promise<Array<{ userId: string }>>,
    db.model3D.count(),
    db.asset.count(),
  ]);

  const byStatus: Record<string, number> = {};
  const byStyle:  Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let totalPoly = 0, polyCount = 0, totalRating = 0, ratingCount = 0;

  for (const g of generations) {
    if (g.status) byStatus[g.status] = (byStatus[g.status] ?? 0) + 1;
    if (g.style)  byStyle[g.style]   = (byStyle[g.style]   ?? 0) + 1;
    if (g.source) bySource[g.source] = (bySource[g.source] ?? 0) + 1;
    if (g.polyCount && g.polyCount > 0) { totalPoly += g.polyCount; polyCount++; }
    if (g.rating !== null && g.rating !== undefined) { totalRating += g.rating; ratingCount++; }
  }

  const completed      = byStatus["completed"] ?? 0;
  const completionRate = generations.length > 0 ? completed / generations.length : 0;

  const projectsPerUser = new Map<string, number>();
  for (const p of projects) {
    if (p.userId) projectsPerUser.set(p.userId, (projectsPerUser.get(p.userId) ?? 0) + 1);
  }
  const withProjects = projectsPerUser.size;

  return {
    global,
    generations: {
      byStatus,
      byStyle,
      bySource,
      avgPolyCount:    polyCount   > 0 ? Math.round(totalPoly   / polyCount)   : 0,
      avgRating:       ratingCount > 0 ? totalRating / ratingCount             : 0,
      completionRate,
    },
    users: {
      total:               users.length,
      withProjects,
      avgProjectsPerUser:  users.length > 0 ? projects.length / users.length   : 0,
    },
    storage: {
      model3DCount: model3Ds,
      assetCount:   assets,
    },
  };
}

// ─── Réinitialisation ─────────────────────────────────────────────────────────

export async function resetDatabase(confirm: "RESET_ALL_DATA"): Promise<{ deleted: Record<string, number> }> {
  if (confirm !== "RESET_ALL_DATA") {
    throw new Error('[Manager] Confirmation invalide. Passez "RESET_ALL_DATA".');
  }

  const order: ModelName[] = [
    "asset",
    "preference",
    "model3D",
    "generation",
    "project",
    "verification",
    "account",
    "session",
    "user",
  ];

  const deleted: Record<string, number> = {};

  for (const model of order) {
    const count  = await getDelegate(model).count();
    await getDelegate(model).deleteMany({});
    deleted[model] = count;
  }

  clearAuditLog();
  console.warn("[Manager] Base de données réinitialisée :", deleted);
  return { deleted };
}

// ─── Direct Helper Instance Export ───────────────────────────────────────────

export const troxtPrisma = {
  create: async (model: string, data: Record<string, unknown>) => {
    const delegate = getDelegate(model as ModelName);
    return delegate.create({ data });
  },
  findMany: async (model: string, options?: any) => {
    const delegate = getDelegate(model as ModelName);
    const list = await delegate.findMany(options || {});
    return {
      data: list,
      total: list.length,
      page: 1,
      pageSize: 20,
      pageCount: 1,
      hasPrev: false,
      hasNext: false
    };
  },
  search: async (model: string, query: string, fields: string[]) => {
    const delegate = getDelegate(model as ModelName);
    const list = await delegate.findMany({});
    const q = query.toLowerCase();
    return list.filter((item: any) =>
      fields.some((f) => item[f] && String(item[f]).toLowerCase().includes(q))
    );
  },
  delete: async (model: string, id: string) => {
    const delegate = getDelegate(model as ModelName);
    return delegate.delete({ where: { id } });
  }
};


