import { z } from "zod";

export const normalizedStateSchema = z.enum([
  "not_installed",
  "setup_required",
  "credential_required",
  "ready_to_test",
  "available",
  "partial",
  "failed",
  "updating",
]);

export const providerStatusSchema = normalizedStateSchema;

export const inspectionStatusSchema = z.enum([
  "fresh",
  "stale",
  "failed",
  "empty",
  "not_inspected",
]);

const inspectionErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  action_route: z.string().startsWith("/").optional(),
}).strict();

const freshnessSchema = z.object({
  status: inspectionStatusSchema,
  inspected_at: z.string().datetime({ offset: true }).nullable(),
  source: z.enum(["live", "cache", "none"]),
  stale_at: z.string().datetime({ offset: true }).nullable().optional(),
  error: inspectionErrorSchema.nullable().optional(),
}).strict();

const serviceSchema = z.object({
  state: z.enum(["running", "stopped", "error"]),
  runtime: z.string().min(1).optional(),
  backend_id: z.string().min(1).optional(),
  url: z.string().url().optional(),
  error: z.string().min(1).optional(),
}).strict();

const schemaFieldSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().nullable().optional(),
  required: z.boolean(),
  choices: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
}).strict();

/**
 * `secret: true` is retained as a backwards-compatible type marker used by
 * existing fixtures. It is deliberately not a credential value; strict
 * parsing rejects values and any other fields at this boundary.
 */
const credentialFieldSchema = z.object({
  name: z.string().min(1),
  required: z.boolean(),
  configured: z.boolean(),
  secret: z.literal(true).optional(),
}).strict();

const providerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  display_name: z.string().min(1),
  version: z.string().nullable().optional(),
  status: providerStatusSchema,
  state_description: z.string().min(1).optional(),
  capability_count: z.number().int().nonnegative(),
  capabilities: z.array(z.string().min(1)),
  credential_fields: z.array(credentialFieldSchema),
  credential_metadata_status: z.enum(["known", "unknown"]).optional(),
}).strict();

const datasetProviderSchema = z.object({
  provider_id: z.string().min(1),
  state: normalizedStateSchema.or(z.literal("unavailable")),
  state_description: z.string().min(1).optional(),
}).strict();

const datasetSchema = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  category: z.string().min(1),
  python_path: z.string().min(1).nullable().optional(),
  api_path: z.string().startsWith("/"),
  standard_model: z.string().min(1).nullable().optional(),
  description: z.string().nullable().optional(),
  providers: z.array(datasetProviderSchema),
  common_query_fields: z.array(schemaFieldSchema),
  common_data_fields: z.array(schemaFieldSchema),
  /** Null means OpenBB did not declare a response schema. */
  response_fields: z.array(schemaFieldSchema).nullable().optional(),
  provider_specific_query_fields: z.record(z.string(), z.array(schemaFieldSchema)),
  provider_specific_fields: z.record(z.string(), z.array(schemaFieldSchema)),
}).strict();

const actionSchema = z.object({
  id: z.string().min(1),
  state: normalizedStateSchema.optional(),
  severity: z.enum(["info", "warning", "error"]),
  title: z.string().min(1),
  description: z.string(),
  entity_type: z.enum(["provider", "service", "extension", "credential", "dataset"]),
  entity_id: z.string().optional(),
  action_label: z.string().min(1),
  action_route: z.string().startsWith("/").optional(),
}).strict();

export const studioSnapshotSchema = z.object({
  providers: z.array(providerSchema),
  datasets: z.array(datasetSchema),
  actions: z.array(actionSchema),
  fetched_at: z.string().datetime({ offset: true }),
  freshness: freshnessSchema.optional(),
  service: serviceSchema.optional(),
}).strict().transform((snapshot) => ({
  ...snapshot,
  freshness: snapshot.freshness ?? {
    status: snapshot.providers.length || snapshot.datasets.length ? "fresh" : "empty",
    inspected_at: snapshot.fetched_at,
    source: "live" as const,
  },
}));

/**
 * The parser emits freshness metadata for every live snapshot. The output
 * type reflects the transformed, runtime-safe contract consumed by pages.
 */
export type StudioSnapshot = z.output<typeof studioSnapshotSchema>;
export type ProviderSummary = StudioSnapshot["providers"][number];
export type DatasetSummary = StudioSnapshot["datasets"][number];
export type StudioAction = StudioSnapshot["actions"][number];
export type StudioFreshness = z.infer<typeof freshnessSchema>;
