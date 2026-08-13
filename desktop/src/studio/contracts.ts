import { z } from "zod";

export const providerStatusSchema = z.enum([
  "not_installed",
  "setup_required",
  "credential_required",
  "ready_to_test",
  "available",
  "partial",
  "failed",
  "updating",
]);

const schemaFieldSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().nullable().optional(),
  required: z.boolean(),
  choices: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const credentialFieldSchema = z.object({
  name: z.string().min(1),
  required: z.boolean(),
  configured: z.boolean(),
  secret: z.literal(true),
}).strict();

const providerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  display_name: z.string().min(1),
  version: z.string().nullable().optional(),
  status: providerStatusSchema,
  capability_count: z.number().int().nonnegative(),
  capabilities: z.array(z.string()),
  credential_fields: z.array(credentialFieldSchema),
});

const datasetSchema = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  category: z.string().min(1),
  python_path: z.string().min(1),
  api_path: z.string().startsWith("/"),
  standard_model: z.string().min(1),
  description: z.string().nullable().optional(),
  providers: z.array(z.object({
    provider_id: z.string().min(1),
    state: z.enum(["available", "credential_required", "partial", "unavailable"]),
  })),
  common_query_fields: z.array(schemaFieldSchema),
  common_data_fields: z.array(schemaFieldSchema),
  provider_specific_query_fields: z.record(z.string(), z.array(schemaFieldSchema)),
  provider_specific_fields: z.record(z.string(), z.array(schemaFieldSchema)),
});

const actionSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(["info", "warning", "error"]),
  title: z.string().min(1),
  description: z.string(),
  entity_type: z.enum(["provider", "service", "extension", "credential", "dataset"]),
  entity_id: z.string().optional(),
  action_label: z.string().min(1),
  action_route: z.string().startsWith("/").optional(),
});

export const studioSnapshotSchema = z.object({
  providers: z.array(providerSchema),
  datasets: z.array(datasetSchema),
  actions: z.array(actionSchema),
  fetched_at: z.string().datetime({ offset: true }),
});

export type StudioSnapshot = z.infer<typeof studioSnapshotSchema>;
export type ProviderSummary = StudioSnapshot["providers"][number];
export type DatasetSummary = StudioSnapshot["datasets"][number];
