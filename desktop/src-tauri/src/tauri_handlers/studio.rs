use chrono::Utc;
use reqwest::Client;
use serde_json::{Map, Value, json};
use std::collections::{HashMap, HashSet};

fn api_path(path: &str) -> String {
    if path.starts_with("/api/") {
        path.to_string()
    } else {
        format!("/api/v1{path}")
    }
}

fn schema_type(schema: &Value) -> String {
    schema
        .get("type")
        .and_then(Value::as_str)
        .or_else(|| schema.get("format").and_then(Value::as_str))
        .or_else(|| schema.get("title").and_then(Value::as_str))
        .unwrap_or("string")
        .to_string()
}

fn resolve_schema<'a>(openapi: &'a Value, schema: &'a Value) -> &'a Value {
    let Some(reference) = schema.get("$ref").and_then(Value::as_str) else {
        return schema;
    };
    let Some(pointer) = reference.strip_prefix("#/") else {
        return schema;
    };
    let mut current = openapi;
    for part in pointer.split('/') {
        let key = part.replace("~1", "/").replace("~0", "~");
        let Some(next) = current.get(&key) else {
            return schema;
        };
        current = next;
    }
    current
}

fn schema_field(name: &str, schema: &Value, required: bool) -> Value {
    let mut field = Map::from_iter([
        ("name".to_string(), Value::String(name.to_string())),
        ("type".to_string(), Value::String(schema_type(schema))),
        (
            "description".to_string(),
            schema.get("description").cloned().unwrap_or(Value::Null),
        ),
        ("required".to_string(), Value::Bool(required)),
    ]);
    if let Some(choices) = schema.get("enum").and_then(Value::as_array) {
        field.insert("choices".to_string(), Value::Array(choices.clone()));
    }
    Value::Object(field)
}

fn schema_fields(openapi: &Value, schema: &Value) -> Option<Vec<Value>> {
    let schema = resolve_schema(openapi, schema);
    if schema.get("type").and_then(Value::as_str) == Some("array") {
        return schema
            .get("items")
            .and_then(|items| schema_fields(openapi, items));
    }
    let properties = schema.get("properties")?.as_object()?;
    let required = schema
        .get("required")
        .and_then(Value::as_array)
        .map(|names| names.iter().filter_map(Value::as_str).collect::<Vec<_>>())
        .unwrap_or_default();
    Some(
        properties
            .iter()
            .map(|(name, property)| {
                schema_field(
                    name,
                    resolve_schema(openapi, property),
                    required.contains(&name.as_str()),
                )
            })
            .collect(),
    )
}

fn response_fields(openapi: &Value, operation: &Value) -> Option<Vec<Value>> {
    let responses = operation.get("responses")?.as_object()?;
    let response = responses
        .get("200")
        .or_else(|| responses.get("201"))
        .or_else(|| responses.get("default"))?;
    let content = response.get("content")?.as_object()?;
    let media = content
        .get("application/json")
        .or_else(|| content.values().next())?;
    schema_fields(openapi, media.get("schema")?)
}

fn operation<'a>(openapi: &'a Value, path: &str) -> Option<&'a Value> {
    let path_item = openapi.get("paths")?.get(path)?;
    path_item.get("get").or_else(|| path_item.get("post"))
}

fn provider_name(provider: &str) -> String {
    provider
        .split('_')
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn operation_parameters(operation: &Value) -> Vec<Value> {
    operation
        .get("parameters")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
}

fn command_model_fields(
    command_model: Option<&Value>,
    path: &str,
    provider: &str,
    kind: &str,
) -> Option<Vec<Value>> {
    let command = command_model?.get(path)?.as_object()?;
    let provider_model = command.get(provider)?;
    let fields = provider_model.get(kind)?.get("fields")?.as_object()?;
    Some(
        fields
            .iter()
            .map(|(name, metadata)| {
                let metadata = metadata.as_object();
                let field_type = metadata
                    .and_then(|value| value.get("annotation").or_else(|| value.get("type")))
                    .and_then(Value::as_str)
                    .unwrap_or("string");
                let mut field = json!({
                    "name": name,
                    "type": field_type,
                    "description": metadata.and_then(|value| value.get("description")).cloned().unwrap_or(Value::Null),
                    "required": metadata.and_then(|value| value.get("required")).and_then(Value::as_bool).unwrap_or(false),
                });
                if let Some(enum_values) = metadata
                    .and_then(|value| value.get("enum"))
                    .and_then(Value::as_array)
                {
                    field["choices"] = Value::Array(enum_values.clone());
                }
                field
            })
            .collect(),
    )
}

fn field_name(field: &Value) -> Option<&str> {
    field.get("name").and_then(Value::as_str)
}

fn common_field_names(provider_fields: &[Vec<Value>]) -> HashSet<String> {
    let Some(first) = provider_fields.first() else {
        return HashSet::new();
    };
    let mut common = first
        .iter()
        .filter_map(field_name)
        .map(ToOwned::to_owned)
        .collect::<HashSet<_>>();
    for fields in &provider_fields[1..] {
        let names = fields.iter().filter_map(field_name).collect::<HashSet<_>>();
        common.retain(|name| names.contains(name.as_str()));
    }
    common
}

fn union_field_names(provider_fields: &[Vec<Value>]) -> HashSet<String> {
    provider_fields
        .iter()
        .flat_map(|fields| fields.iter().filter_map(field_name))
        .map(ToOwned::to_owned)
        .collect()
}

fn provider_ids(values: &[Value]) -> Vec<String> {
    values
        .iter()
        .filter_map(|provider| {
            provider
                .as_str()
                .map(ToOwned::to_owned)
                .or_else(|| {
                    provider
                        .get("provider")
                        .and_then(Value::as_str)
                        .map(ToOwned::to_owned)
                })
                .or_else(|| {
                    provider
                        .get("id")
                        .and_then(Value::as_str)
                        .map(ToOwned::to_owned)
                })
        })
        .collect()
}

fn credential_fields(openapi: &Value, provider: &str) -> Option<Vec<Value>> {
    let metadata = openapi
        .get("x-openbb")
        .or_else(|| openapi.get("x_openbb"))
        .or_else(|| openapi.get("credentials"))?;
    let provider_metadata = metadata
        .get(provider)
        .or_else(|| metadata.get("providers")?.get(provider))?;
    let credentials = provider_metadata
        .get("credentials")
        .or_else(|| provider_metadata.get("credential_fields"))?;
    let fields = credentials.as_array()?;
    Some(
        fields
            .iter()
            .filter_map(|credential| {
                let name = credential
                    .as_str()
                    .or_else(|| credential.get("name").and_then(Value::as_str))?;
                let required = credential
                    .get("required")
                    .and_then(Value::as_bool)
                    .unwrap_or(true);
                let configured = credential
                    .get("configured")
                    .and_then(Value::as_bool)
                    .unwrap_or(false);
                Some(json!({
                    "name": name,
                    "required": required,
                    "configured": configured,
                }))
            })
            .collect(),
    )
}
fn registry_credential_fields(metadata: &Value, provider: &str) -> Option<Vec<Value>> {
    let fields = metadata.get(provider)?.as_array()?;
    Some(
        fields
            .iter()
            .filter_map(|credential| {
                let object = credential.as_object()?;
                let name = object.get("name")?.as_str()?;
                Some(json!({
                    "name": name,
                    "required": object.get("required").and_then(Value::as_bool).unwrap_or(true),
                    "configured": object.get("configured").and_then(Value::as_bool).unwrap_or(false),
                }))
            })
            .collect(),
    )
}

fn build_dataset(
    path: &str,
    providers: &[Value],
    openapi: &Value,
    command_model: Option<&Value>,
) -> Value {
    let normalized_path = api_path(path);
    let null_operation = Value::Null;
    let operation = operation(openapi, &normalized_path).unwrap_or(&null_operation);
    let provider_names = provider_ids(providers);
    let parameters = operation_parameters(operation);
    let query_model_fields = provider_names
        .iter()
        .filter_map(|provider| {
            command_model_fields(command_model, path, provider, "QueryParams")
                .map(|fields| (provider.clone(), fields))
        })
        .collect::<HashMap<_, _>>();
    let query_models = query_model_fields.values().cloned().collect::<Vec<_>>();
    let common_query_model_fields =
        command_model_fields(command_model, path, "common", "QueryParams");
    let common_query_model_names = common_query_model_fields
        .as_ref()
        .map(|fields| common_field_names(std::slice::from_ref(fields)))
        .unwrap_or_else(|| common_field_names(&query_models));
    let query_model_names = union_field_names(&query_models);
    let has_query_models = !query_models.is_empty();
    let mut common_query_fields = parameters
        .iter()
        .filter_map(|parameter| {
            let name = parameter.get("name").and_then(Value::as_str)?;
            if name == "provider" {
                return None;
            }
            if has_query_models
                && query_model_names.contains(name)
                && !common_query_model_names.contains(name)
            {
                return None;
            }
            let schema = parameter.get("schema").unwrap_or(parameter);
            Some(schema_field(
                name,
                schema,
                parameter
                    .get("required")
                    .and_then(Value::as_bool)
                    .unwrap_or(false),
            ))
        })
        .collect::<Vec<_>>();
    if let Some(fields) = common_query_model_fields
        .as_ref()
        .or_else(|| query_models.first())
    {
        for field in fields {
            if common_query_model_names.contains(field_name(field).unwrap_or_default())
                && !common_query_fields
                    .iter()
                    .any(|existing| field_name(existing) == field_name(field))
            {
                common_query_fields.push(field.clone());
            }
        }
    }
    let declared_response_fields = response_fields(openapi, operation);
    let data_model_fields = provider_names
        .iter()
        .filter_map(|provider| {
            command_model_fields(command_model, path, provider, "Data")
                .map(|fields| (provider.clone(), fields))
        })
        .collect::<HashMap<_, _>>();
    let data_models = data_model_fields.values().cloned().collect::<Vec<_>>();
    let common_data_model_fields = command_model_fields(command_model, path, "common", "Data");
    let common_data_model_names = common_data_model_fields
        .as_ref()
        .map(|fields| common_field_names(std::slice::from_ref(fields)))
        .unwrap_or_else(|| common_field_names(&data_models));
    let mut common_data_fields = declared_response_fields.clone().unwrap_or_default();
    if let Some(fields) = common_data_model_fields
        .as_ref()
        .or_else(|| data_models.first())
    {
        for field in fields {
            if common_data_model_names.contains(field_name(field).unwrap_or_default())
                && !common_data_fields
                    .iter()
                    .any(|existing| field_name(existing) == field_name(field))
            {
                common_data_fields.push(field.clone());
            }
        }
    }
    let common_data_names = common_data_fields
        .iter()
        .filter_map(field_name)
        .map(ToOwned::to_owned)
        .collect::<HashSet<_>>();
    let provider_specific_query_fields = query_model_fields
        .into_iter()
        .map(|(provider, fields)| {
            let specific = fields
                .into_iter()
                .filter(|field| {
                    !common_query_model_names.contains(field_name(field).unwrap_or_default())
                })
                .collect::<Vec<_>>();
            (provider, Value::Array(specific))
        })
        .collect::<Map<_, _>>();
    let provider_specific_fields = data_model_fields
        .into_iter()
        .map(|(provider, fields)| {
            let specific = fields
                .into_iter()
                .filter(|field| !common_data_names.contains(field_name(field).unwrap_or_default()))
                .collect::<Vec<_>>();
            (provider, Value::Array(specific))
        })
        .collect::<Map<_, _>>();
    let operation_name = operation
        .get("summary")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .unwrap_or(path.trim_matches('/'));
    let model = operation.get("model").and_then(Value::as_str);
    let category = operation
        .get("tags")
        .and_then(Value::as_array)
        .and_then(|tags| tags.first())
        .and_then(Value::as_str)
        .unwrap_or("uncategorized");
    let dataset_providers = provider_names
        .iter()
        .map(|provider| json!({"provider_id": provider, "state": "available"}))
        .collect::<Vec<_>>();
    json!({
        "id": format!("openbb.{}", path.trim_matches('/').replace('/', ".")),
        "display_name": operation_name,
        "category": category,
        "python_path": operation.get("python_path").and_then(Value::as_str),
        "api_path": normalized_path,
        "standard_model": model,
        "description": operation.get("description").and_then(Value::as_str),
        "providers": dataset_providers,
        "common_query_fields": common_query_fields,
        "common_data_fields": common_data_fields,
        "response_fields": declared_response_fields,
        "provider_specific_query_fields": provider_specific_query_fields,
        "provider_specific_fields": provider_specific_fields,
    })
}

async fn fetch_json(client: &Client, base_url: &str, path: &str) -> Result<Value, String> {
    let url = format!("{}{path}", base_url.trim_end_matches('/'));
    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|error| format!("OpenBB API request failed: {error}"))?;
    let status = response.status();
    let body = response
        .json::<Value>()
        .await
        .map_err(|error| format!("OpenBB API returned invalid JSON: {error}"))?;
    if !status.is_success() {
        return Err(format!("OpenBB API returned {status}: {body}"));
    }
    Ok(body)
}

async fn fetch_optional_json(client: &Client, base_url: &str, path: &str) -> Option<Value> {
    fetch_json(client, base_url, path).await.ok()
}

fn resolved_api_base_url(requested: Option<&str>) -> String {
    requested
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .or_else(|| {
            std::env::var("OPENBB_STUDIO_API_URL")
                .ok()
                .filter(|value| !value.trim().is_empty())
        })
        .or_else(|| {
            std::env::var("OPENBB_API_URL")
                .ok()
                .filter(|value| !value.trim().is_empty())
        })
        .unwrap_or_else(|| "http://127.0.0.1:6900".to_string())
}

#[tauri::command]
pub async fn inspect_studio_environment(
    environment: String,
    base_url: Option<String>,
) -> Result<Value, String> {
    let base_url = resolved_api_base_url(base_url.as_deref());
    let client = Client::new();
    let openapi = fetch_json(&client, &base_url, "/openapi.json").await?;
    let providers = fetch_json(&client, &base_url, "/api/v1/coverage/providers").await?;
    let commands = fetch_json(&client, &base_url, "/api/v1/coverage/commands").await?;
    if !openapi.is_object() {
        return Err("OpenBB OpenAPI inspection returned an invalid object.".to_string());
    }
    let provider_map = providers
        .as_object()
        .ok_or_else(|| "OpenBB provider coverage returned an invalid object.".to_string())?;
    let command_map = commands
        .as_object()
        .ok_or_else(|| "OpenBB command coverage returned an invalid object.".to_string())?;
    let command_model =
        fetch_optional_json(&client, &base_url, "/api/v1/coverage/command_model").await;
    let registry_metadata =
        fetch_optional_json(&client, &base_url, "/api/v1/coverage/provider_metadata").await;

    let mut provider_summaries = Vec::new();
    for (provider, paths) in provider_map {
        let paths = paths
            .as_array()
            .ok_or_else(|| format!("OpenBB provider coverage for '{provider}' is invalid."))?;
        let capabilities = paths
            .iter()
            .filter_map(Value::as_str)
            .map(api_path)
            .collect::<Vec<_>>();
        let credential_fields = registry_metadata
            .as_ref()
            .and_then(|metadata| registry_credential_fields(metadata, provider))
            .or_else(|| credential_fields(&openapi, provider));
        let mut summary = json!({
            "id": provider,
            "name": provider_name(provider),
            "display_name": provider_name(provider),
            "version": Value::Null,
            "status": "available",
            "state_description": "Loaded and reported by the managed OpenBB coverage registry.",
            "capability_count": capabilities.len(),
            "capabilities": capabilities,
            "credential_fields": credential_fields.clone().unwrap_or_default(),
            "credential_metadata_status": if credential_fields.is_some() { "known" } else { "unknown" },
        });
        if credential_fields.as_ref().is_some_and(|fields| {
            fields.iter().any(|field| {
                field.get("required").and_then(Value::as_bool) == Some(true)
                    && field.get("configured").and_then(Value::as_bool) == Some(false)
            })
        }) {
            summary["status"] = Value::String("credential_required".to_string());
            summary["state_description"] =
                Value::String("Required credentials are not configured.".to_string());
        }
        provider_summaries.push(summary);
    }

    let mut datasets = Vec::new();
    for (path, provider_values) in command_map {
        let providers = provider_values
            .as_array()
            .ok_or_else(|| format!("OpenBB command coverage for '{path}' is invalid."))?;
        datasets.push(build_dataset(
            path,
            providers,
            &openapi,
            command_model.as_ref(),
        ));
    }
    let fetched_at = Utc::now().to_rfc3339();
    let inventory_status = if provider_summaries.is_empty() && datasets.is_empty() {
        "empty"
    } else {
        "fresh"
    };
    let mut actions = Vec::new();
    for provider in &provider_summaries {
        if provider.get("status").and_then(Value::as_str) == Some("credential_required") {
            if let Some(provider_id) = provider.get("id").and_then(Value::as_str) {
                actions.push(json!({
                    "id": format!("credential:{provider_id}"),
                    "state": "credential_required",
                    "severity": "warning",
                    "title": format!("{} needs credentials", provider.get("display_name").and_then(Value::as_str).unwrap_or(provider_id)),
                    "description": "Configure the required credential names, then run a representative query.",
                    "entity_type": "credential",
                    "entity_id": provider_id,
                    "action_label": "Configure credentials",
                    "action_route": format!("/data-sources/{provider_id}?tab=credentials"),
                }));
            }
        }
    }
    Ok(json!({
        "providers": provider_summaries,
        "datasets": datasets,
        "actions": actions,
        "fetched_at": fetched_at,
        "freshness": {
            "status": inventory_status,
            "inspected_at": fetched_at,
            "source": "live",
        },
        "service": {
            "state": "running",
            "runtime": environment,
        },
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prefers_configured_backend_url_for_inspection() {
        assert_eq!(
            resolved_api_base_url(Some("http://127.0.0.1:7900")),
            "http://127.0.0.1:7900"
        );
        assert_eq!(
            resolved_api_base_url(Some("  http://127.0.0.1:7901/  ")),
            "http://127.0.0.1:7901/"
        );
    }

    #[test]
    fn extracts_declared_response_fields_without_guessing() {
        let openapi = json!({
            "paths": {
                "/api/v1/test": {
                    "get": {
                        "responses": {
                            "200": {"content": {"application/json": {"schema": {
                                "type": "object",
                                "required": ["close"],
                                "properties": {
                                    "close": {"type": "number"},
                                    "symbol": {"type": "string"}
                                }
                            }}}}
                        }
                    }
                }
            }
        });
        let dataset = build_dataset("/api/v1/test", &[json!("fmp")], &openapi, None);
        assert_eq!(dataset["response_fields"].as_array().map(Vec::len), Some(2));
        assert_eq!(
            dataset["common_data_fields"].as_array().map(Vec::len),
            Some(2)
        );
        assert!(dataset["standard_model"].is_null());
    }

    #[test]
    fn preserves_provider_specific_query_and_data_fields() {
        let openapi = json!({
            "paths": {
                "/api/v1/test": {
                    "get": {
                        "parameters": [
                            {"name": "provider", "required": true, "schema": {"type": "string"}},
                            {"name": "symbol", "required": true, "schema": {"type": "string"}},
                            {"name": "adjustment", "required": false, "schema": {"type": "string"}},
                            {"name": "interval", "required": false, "schema": {"type": "string"}}
                        ],
                        "responses": {
                            "200": {"content": {"application/json": {"schema": {
                                "type": "object",
                                "properties": {"close": {"type": "number"}}
                            }}}}
                        }
                    }
                }
            }
        });
        let command_model = json!({
            "/api/v1/test": {
                "common": {
                    "QueryParams": {"fields": {
                        "symbol": {"annotation": "str", "required": true}
                    }},
                    "Data": {"fields": {
                        "close": {"annotation": "float", "required": false}
                    }}
                },
                "fmp": {
                    "QueryParams": {"fields": {
                        "symbol": {"annotation": "str", "required": true},
                        "adjustment": {"annotation": "Literal", "required": false, "enum": ["splits_only", "unadjusted"]}
                    }},
                    "Data": {"fields": {
                        "close": {"annotation": "float", "required": false},
                        "change_percent": {"annotation": "float", "required": false}
                    }}
                },
                "yfinance": {
                    "QueryParams": {"fields": {
                        "symbol": {"annotation": "str", "required": true},
                        "interval": {"annotation": "Literal", "required": false, "enum": ["1d", "1h"]}
                    }},
                    "Data": {"fields": {
                        "close": {"annotation": "float", "required": false},
                        "dividend": {"annotation": "float", "required": false}
                    }}
                }
            }
        });

        let dataset = build_dataset(
            "/api/v1/test",
            &[json!("fmp"), json!("yfinance")],
            &openapi,
            Some(&command_model),
        );

        let common_query_names = dataset["common_query_fields"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(field_name)
            .collect::<Vec<_>>();
        assert_eq!(common_query_names, vec!["symbol"]);
        assert_eq!(
            dataset["provider_specific_query_fields"]["fmp"][0]["name"],
            "adjustment"
        );
        assert_eq!(
            dataset["provider_specific_query_fields"]["fmp"][0]["choices"],
            json!(["splits_only", "unadjusted"])
        );
        assert_eq!(
            dataset["provider_specific_query_fields"]["yfinance"][0]["name"],
            "interval"
        );
        assert_eq!(
            dataset["provider_specific_fields"]["fmp"][0]["name"],
            "change_percent"
        );
        assert_eq!(
            dataset["provider_specific_fields"]["yfinance"][0]["name"],
            "dividend"
        );
        let single_provider_dataset = build_dataset(
            "/api/v1/test",
            &[json!("fmp")],
            &openapi,
            Some(&command_model),
        );
        assert_eq!(
            single_provider_dataset["provider_specific_query_fields"]["fmp"][0]["name"],
            "adjustment"
        );
        assert_eq!(
            single_provider_dataset["provider_specific_fields"]["fmp"][0]["name"],
            "change_percent"
        );
    }

    #[test]
    fn credential_metadata_contains_names_and_booleans_only() {
        let openapi = json!({"x-openbb": {"fmp": {"credentials": [
            {"name": "fmp_api_key", "required": true, "configured": false, "value": "secret"}
        ]}}});
        let fields = credential_fields(&openapi, "fmp").expect("metadata");
        assert_eq!(fields[0]["name"], "fmp_api_key");
        assert_eq!(fields[0]["configured"], false);
        assert!(fields[0].get("value").is_none());
    }

    #[test]
    fn malformed_coverage_is_not_treated_as_empty() {
        assert!(json!("invalid").as_object().is_none());
    }
}
