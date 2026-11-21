FROM python:3.11-slim

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
COPY ml/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY ml/ /app/ml/

ENV MODEL_PATH=/app/ml/model/closure_v1.joblib
EXPOSE 8000
CMD ["sh", "-c", "uvicorn ml.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
