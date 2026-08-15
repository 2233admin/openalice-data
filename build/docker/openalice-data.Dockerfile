FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /opt/openalice

COPY openbb_platform /opt/openalice/openbb_platform

RUN python -m pip install \
      "/opt/openalice/openbb_platform[all]" \
      /opt/openalice/openbb_platform/providers/ashare \
    && groupadd --system openalice \
    && useradd --system --gid openalice --home-dir /opt/openalice openalice \
    && chown -R openalice:openalice /opt/openalice

EXPOSE 6900

USER openalice

CMD ["openbb-api", "--host", "0.0.0.0", "--port", "6900"]
