# AROS – Ingestion Agent (Final Clean Version)

import psycopg2
import pandas as pd
import numpy as np
from datetime import datetime
import json
from config import CONFIG


# -------------------------------
# DB CONNECTION
# -------------------------------
def get_connection():
    return psycopg2.connect(**CONFIG["db"])


# -------------------------------
# SAFE FETCH
# -------------------------------
def safe_fetch_table(conn, table_name):
    try:
        return pd.read_sql(f"SELECT * FROM {table_name};", conn)
    except Exception as e:
        print(f"⚠️ Skipping table {table_name}: {e}")
        return pd.DataFrame()


# -------------------------------
# SAFE UTILS
# -------------------------------
def safe_avg(series):
    return float(series.mean()) if series is not None and not series.empty else 0.0


def safe_sum(series):
    return float(series.sum()) if series is not None and not series.empty else 0.0


def compute_slope(series):
    if series is None or len(series.dropna()) < 2:
        return 0.0
    x = np.arange(len(series))
    y = series.values
    return float(np.polyfit(x, y, 1)[0])


def compute_distribution(series):
    if series is None or series.dropna().empty:
        return {"p10": 0.0, "p50": 0.0, "p90": 0.0}

    cleaned = series.dropna()

    return {
        "p10": float(np.percentile(cleaned, 10)),
        "p50": float(np.percentile(cleaned, 50)),
        "p90": float(np.percentile(cleaned, 90)),
    }


# -------------------------------
# DOMAIN METRICS
# -------------------------------
def compute_payment_failure_rate(df):
    if df.empty or "status" not in df:
        return 0.0
    failures = len(df[df["status"] == "failed"])
    return round((failures / len(df)) * 100, 2)


def compute_cart_abandonment(df):
    if df.empty or "action" not in df:
        return 0.0
    adds = len(df[df["action"] == "add_to_cart"])
    drops = len(df[df["action"] == "drop"])
    return round((drops / adds) * 100, 2) if adds > 0 else 0.0


def compute_conversion_rate(df):
    if df.empty or "status" not in df:
        return 0.0
    completed = len(df[df["status"] == "completed"])
    return round((completed / len(df)) * 100, 2)


# -------------------------------
# MAIN INGESTION
# -------------------------------
def run_ingestion():

    conn = get_connection()

    try:
        now = datetime.utcnow()

        # -------------------------------
        # FETCH ALL TABLES (SAFE)
        # -------------------------------
        kpi_df = safe_fetch_table(conn, "kpi_metrics")
        payment_df = safe_fetch_table(conn, "payment_logs")
        behavior_df = safe_fetch_table(conn, "user_behavior")
        orders_df = safe_fetch_table(conn, "order_fulfillment")
        cart_df = safe_fetch_table(conn, "cart_abandonment")
        pricing_df = safe_fetch_table(conn, "product_pricing")
        fraud_df = safe_fetch_table(conn, "risk_fraud")
        campaign_df = safe_fetch_table(conn, "campaign_marketing")

        # -------------------------------
        # SORT KPI
        # -------------------------------
        if not kpi_df.empty and "ts" in kpi_df:
            kpi_df = kpi_df.sort_values("ts")

        # -------------------------------
        # SPLIT CURRENT vs PREVIOUS
        # -------------------------------
        mid = len(kpi_df) // 2

        current_kpi = kpi_df.iloc[mid:]
        previous_kpi = kpi_df.iloc[:mid]

        # -------------------------------
        # KPI SUMMARY
        # -------------------------------
        current_summary = {
            "revenue": safe_sum(current_kpi.get("revenue")),
            "conversion_rate": safe_avg(current_kpi.get("conversion_rate")),
            "cart_abandonment_rate": safe_avg(current_kpi.get("cart_abandonment_rate")),
            "latency_ms": safe_avg(current_kpi.get("avg_latency_ms")),
            "payment_failure_rate": compute_payment_failure_rate(payment_df),
            "records": len(current_kpi),
        }

        previous_summary = {
            "revenue": safe_sum(previous_kpi.get("revenue")),
            "conversion_rate": safe_avg(previous_kpi.get("conversion_rate")),
            "cart_abandonment_rate": safe_avg(previous_kpi.get("cart_abandonment_rate")),
            "latency_ms": safe_avg(previous_kpi.get("avg_latency_ms")),
            "payment_failure_rate": compute_payment_failure_rate(payment_df),
            "records": len(previous_kpi),
        }

        # -------------------------------
        # OTHER DOMAIN METRICS
        # -------------------------------
        behavior_metrics = {
            "total_events": len(behavior_df),
            "avg_latency": safe_avg(behavior_df.get("latency_ms")),
            "drop_actions": len(behavior_df[behavior_df.get("action") == "drop"]) if not behavior_df.empty else 0,
        }

        order_metrics = {
            "total_orders": len(orders_df),
            "conversion_rate": compute_conversion_rate(orders_df),
            "total_revenue": safe_sum(orders_df.get("amount")),
        }

        cart_metrics = {
            "abandonment_rate": compute_cart_abandonment(cart_df),
            "events": len(cart_df),
        }

        fraud_metrics = {
            "fraud_cases": len(fraud_df),
        }

        # -------------------------------
        # TRENDS
        # -------------------------------
        trends = {
            "revenue_slope": compute_slope(kpi_df.get("revenue")),
            "conversion_slope": compute_slope(kpi_df.get("conversion_rate")),
            "latency_slope": compute_slope(kpi_df.get("avg_latency_ms")),
        }

        # -------------------------------
        # DISTRIBUTION
        # -------------------------------
        distribution = {
            "revenue": compute_distribution(kpi_df.get("revenue")),
            "conversion_rate": compute_distribution(kpi_df.get("conversion_rate")),
            "latency": compute_distribution(kpi_df.get("avg_latency_ms")),
        }

        # -------------------------------
        # FINAL OUTPUT
        # -------------------------------
        result = {
            "kpi": {
                "current": current_summary,
                "previous": previous_summary,
            },
            "behavior": behavior_metrics,
            "orders": order_metrics,
            "cart": cart_metrics,
            "fraud": fraud_metrics,
            "trends": trends,
            "distribution": distribution,
            "meta": {
                "records_processed": len(kpi_df),
                "timestamp_utc": now.isoformat() + "Z",
            },
        }

        print("\n=== INGESTION OUTPUT (FINAL) ===\n")
        print(json.dumps(result, indent=2))

        return result

    finally:
        conn.close() 


# -------------------------------
# ENTRY POINT
# -------------------------------
if __name__ == "__main__":
    run_ingestion()