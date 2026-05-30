"""
app.py — Flask backend for MedAI Diagnosis App
Run:  pip install flask && python app.py
"""

import os
from flask import Flask, request, jsonify, send_from_directory
from bayesian_engine import (
    DISEASES,
    parse_free_text,
    classify_bp,
    classify_cholesterol,
    diagnose,
    check_emergency,
)

app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), "..", "frontend"),
    static_url_path="",
)


# ── Serve frontend ────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


# ── API: parse free text ──────────────────────────────────────────────────────

@app.route("/api/parse_freetext", methods=["POST"])
def api_parse_freetext():
    """
    POST { text: "..." }
    Returns { matched: {symptom: true, ...}, unknown: [...], emergency: bool }
    """
    data = request.get_json(force=True)
    text = data.get("text", "")
    result = parse_free_text(text)
    return jsonify(result)


# ── API: classify BP ──────────────────────────────────────────────────────────

@app.route("/api/classify_bp", methods=["POST"])
def api_classify_bp():
    """
    POST { systolic: 120, diastolic: 80 }
    Returns { category: "Normal" }
    """
    data = request.get_json(force=True)
    systolic = float(data.get("systolic", 0))
    diastolic = float(data.get("diastolic", 0))
    return jsonify({"category": classify_bp(systolic, diastolic)})


# ── API: classify cholesterol ─────────────────────────────────────────────────

@app.route("/api/classify_cholesterol", methods=["POST"])
def api_classify_cholesterol():
    """
    POST { value: 190 }
    Returns { category: "Normal" }
    """
    data = request.get_json(force=True)
    value = float(data.get("value", 0))
    return jsonify({"category": classify_cholesterol(value)})


# ── API: diagnose ─────────────────────────────────────────────────────────────

@app.route("/api/diagnose", methods=["POST"])
def api_diagnose():
    """
    POST {
      age: 32,
      bp: "Normal",            # or "Unknown"
      cholesterol: "Elevated", # or "Unknown"
      bp_confidence: 1.0,
      chol_confidence: 0.7,
      symptoms: { fever: true, cough: true, fatigue: false, ... },
      preexisting: ["Diabetes"],
      unknown_symptom_count: 0,
      emergency_flag: false
    }
    Returns {
      results: [ { disease: {...}, probability: 12.3, belief_trace: [...],
                   danger_level: "high", emergency_triggered: false }, ... ],
      emergency: true | false
    }
    """
    inputs = request.get_json(force=True)

    results = diagnose(inputs)
    emergency = check_emergency(inputs, results[0] if results else {})

    # Serialise — results already contain plain dicts (disease is a dict from JSON)
    return jsonify({
        "results": results,
        "emergency": emergency,
    })


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("MedAI Flask backend starting…")
    print("Open http://localhost:5000 in your browser.")
    app.run(debug=True, port=5000)
