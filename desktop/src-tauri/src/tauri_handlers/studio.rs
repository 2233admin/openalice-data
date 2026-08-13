use crate::tauri_handlers::helpers::{
    EnvSystem, FileSystem, RealEnvSystem, RealFileSystem, get_installation_directory_impl,
};
use std::path::{Path, PathBuf};

const INSPECTOR_SCRIPT: &str = include_str!("../../resources/studio_inspector.py");

fn validate_environment_name(environment: &str) -> Result<(), String> {
    if environment.is_empty()
        || !environment
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return Err("Invalid environment name".to_string());
    }
    Ok(())
}

fn environment_python_path(
    installation_directory: &Path,
    environment: &str,
    operating_system: &str,
) -> Result<PathBuf, String> {
    validate_environment_name(environment)?;
    let conda_directory = installation_directory.join("conda");
    let environment_directory = if environment == "base" {
        conda_directory
    } else {
        conda_directory.join("envs").join(environment)
    };
    Ok(if operating_system == "windows" {
        environment_directory.join("python.exe")
    } else {
        environment_directory.join("bin").join("python")
    })
}

pub fn inspect_studio_environment_impl<F: FileSystem, E: EnvSystem>(
    environment: String,
    fs: &F,
    env_sys: &E,
) -> Result<serde_json::Value, String> {
    let installation_directory = PathBuf::from(get_installation_directory_impl(fs, env_sys)?);
    let python =
        environment_python_path(&installation_directory, &environment, env_sys.consts_os())?;
    if !fs.exists(&python) {
        return Err(format!(
            "Python was not found for runtime '{environment}'. Open Runtimes to repair it."
        ));
    }

    let script_path = env_sys
        .temp_dir()
        .join(format!("openbb_studio_inspector_{}.py", std::process::id()));
    fs.write(&script_path, INSPECTOR_SCRIPT)
        .map_err(|error| format!("Could not prepare the Studio inspector: {error}"))?;

    let output = env_sys
        .new_command(python.to_string_lossy().as_ref())
        .arg(&script_path)
        .arg("--json")
        .output()
        .map_err(|error| format!("Could not run the Studio inspector: {error}"));
    let _ = fs.remove_file(&script_path.to_string_lossy());
    let output = output?;

    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "OpenBB could not inspect runtime '{environment}'. {}",
            detail
                .lines()
                .last()
                .unwrap_or("Open Runtimes and verify the installation.")
        ));
    }
    serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("OpenBB returned an invalid Studio snapshot: {error}"))
}

#[tauri::command]
pub async fn inspect_studio_environment(environment: String) -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        inspect_studio_environment_impl(environment, &RealFileSystem, &RealEnvSystem)
    })
    .await
    .map_err(|error| format!("Studio inspector task failed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_managed_environment_python_without_shell_input() {
        let path = environment_python_path(Path::new("C:/OpenBB"), "openbb", "windows").unwrap();
        assert_eq!(
            path,
            PathBuf::from("C:/OpenBB/conda/envs/openbb/python.exe")
        );
        assert!(environment_python_path(Path::new("C:/OpenBB"), "../other", "windows").is_err());
        assert!(
            environment_python_path(Path::new("C:/OpenBB"), "openbb & whoami", "windows").is_err()
        );
    }

    #[test]
    fn resolves_base_and_unix_python_paths() {
        assert_eq!(
            environment_python_path(Path::new("/opt/openbb"), "base", "linux").unwrap(),
            PathBuf::from("/opt/openbb/conda/bin/python")
        );
    }
}
