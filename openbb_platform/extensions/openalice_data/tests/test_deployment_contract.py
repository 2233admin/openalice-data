"""Public packaging, Compose, and CI deployment contracts."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]


def test_compose_is_a_single_service_zero_setup_entry() -> None:
    """Compose should declare the documented single-service entry."""
    compose = (REPO_ROOT / "compose.yaml").read_text(encoding="utf-8")

    assert "openalice-data:" in compose
    assert "build/docker/openalice-data.Dockerfile" in compose
    assert "${OPENALICE_PORT:-6900}:6900" in compose
    assert "/api/v1/coverage/providers" in compose
    assert "OPENALICE_DATA_SOURCES" not in compose


def test_image_contains_complete_openbb_and_the_ashare_provider() -> None:
    """The public image should preserve OpenBB and add the A-share provider."""
    dockerfile = (
        REPO_ROOT / "build" / "docker" / "openalice-data.Dockerfile"
    ).read_text(encoding="utf-8")

    assert '"/opt/openalice/openbb_platform[all]"' in dockerfile
    assert "/opt/openalice/openbb_platform/providers/ashare" in dockerfile
    assert "USER openalice" in dockerfile
    assert 'CMD ["openbb-api", "--host", "0.0.0.0", "--port", "6900"]' in dockerfile


def test_first_run_configuration_is_documented_in_chinese() -> None:
    """A Chinese reader should be able to reach the first screen from README."""
    readme = (REPO_ROOT / "README.md").read_text(encoding="utf-8")
    env_example = (REPO_ROOT / ".env.example").read_text(encoding="utf-8")

    assert "docker compose up --build -d" in readme
    assert "http://localhost:6900/docs" in readme
    assert "中国及亚洲市场 Provider" in readme
    assert "OPENALICE_PORT=6900" in env_example


def test_github_runs_contract_and_container_checks() -> None:
    """GitHub should execute both offline contracts and runtime smoke checks."""
    workflow = (
        REPO_ROOT / ".github" / "workflows" / "openalice-data.yml"
    ).read_text(encoding="utf-8")

    assert 'python-version: ["3.11", "3.12", "3.13"]' in workflow
    assert "openbb_platform/extensions/openalice_data/tests" in workflow
    assert "docker compose config -q" in workflow
    assert "docker compose build" in workflow
    assert "docker compose up -d" in workflow
    assert "python scripts/verify_openalice_beta.py" in workflow


def test_runtime_verifier_rejects_fake_green_data() -> None:
    """The release verifier must require page, health, and non-empty live data."""
    verifier = (REPO_ROOT / "scripts" / "verify_openalice_beta.py").read_text(
        encoding="utf-8"
    )

    assert "/api/v1/coverage/providers" in verifier
    assert '"ashare" in candidate' in verifier
    assert "/api/v1/equity/price/historical" in verifier
    assert "if not rows:" in verifier
    assert "return 1" in verifier
