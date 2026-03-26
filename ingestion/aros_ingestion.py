import psycopg2
import pandas as pd
import json


# -------------------------------
# 1. DATABASE CONNECTION
# -------------------------------
def get_connection():
    return psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="test123",
        host="localhost",
        port="5432"
    )


# -------------------------------
# 2. KPI DATA EXTRACTION
# -------------------------------
def fetch_kpi_data(conn):
    query = """
    WITH ordered_data AS (
        SELECT *,
               ROW_NUMBER() OVER (ORDER BY ts DESC) AS rn
        FROM kpi_metrics
    ),
    current_window AS (
        SELECT * FROM ordered_data WHERE rn <= 50
    ),
    previous_window AS (
        SELECT * FROM ordered_data WHERE rn > 50 AND rn <= 100
    )
    SELECT 
        COALESCE(SUM(current_window.revenue), 0) AS current_revenue,
        COALESCE(AVG(current_window.conversion_rate), 0) AS current_conversion,
        COALESCE(AVG(current_window.cart_abandonment_rate), 0) AS current_abandonment,
        COALESCE(AVG(current_window.avg_latency_ms), 0) AS current_latency,

        COALESCE(SUM(previous_window.revenue), 0) AS previous_revenue,
        COALESCE(AVG(previous_window.conversion_rate), 0) AS previous_conversion,
        COALESCE(AVG(previous_window.cart_abandonment_rate), 0) AS previous_abandonment

    FROM current_window, previous_window;
    """
    return pd.read_sql(query, conn)


# -------------------------------
# 3. PAYMENT FAILURE RATE
# -------------------------------
def fetch_payment_data(conn):
    query = """
    WITH ordered_payments AS (
        SELECT *,
               ROW_NUMBER() OVER (ORDER BY ts DESC) AS rn
        FROM payment_logs
    )
    SELECT 
        ROUND(
            COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / NULLIF(COUNT(*), 0),
            2
        ) AS failure_rate
    FROM ordered_payments
    WHERE rn <= 50;
    """
    return pd.read_sql(query, conn)


# -------------------------------
# 4. BUILD SIGNAL INPUT JSON
# -------------------------------
def build_signal_input(kpi_df, payment_df):
    return {
        "current": {
            "revenue": float(kpi_df["current_revenue"][0]),
            "conversion_rate": float(kpi_df["current_conversion"][0]),
            "cart_abandonment_rate": float(kpi_df["current_abandonment"][0]),
            "latency_ms": float(kpi_df["current_latency"][0]),
            "payment_failure_rate": float(payment_df["failure_rate"][0])
        },
        "previous": {
            "revenue": float(kpi_df["previous_revenue"][0]),
            "conversion_rate": float(kpi_df["previous_conversion"][0]),
            "cart_abandonment_rate": float(kpi_df["previous_abandonment"][0])
        }
    }


# -------------------------------
# 5. MAIN EXECUTION
# -------------------------------
def run_ingestion():
    conn = get_connection()

    kpi_df = fetch_kpi_data(conn)
    payment_df = fetch_payment_data(conn)

    conn.close()

    data = build_signal_input(kpi_df, payment_df)

    print("\n=== SIGNAL INPUT JSON ===\n")
    print(json.dumps(data, indent=2))

    return data


# -------------------------------
# ENTRY POINT
# -------------------------------
if __name__ == "__main__":
    run_ingestion()