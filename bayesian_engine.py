"""
bayesian_engine.py
Pure-Python port of engine.js — Bayesian inference + free-text parsing.
"""

import json
import math
import os
import re

# ── Load disease knowledge base ──────────────────────────────────────────────
_DATA_PATH = os.path.join(os.path.dirname(__file__), "diseases_data.json")
with open(_DATA_PATH, encoding="utf-8") as _f:
    DISEASES = json.load(_f)

# ── Synonym map (ported verbatim from engine.js) ─────────────────────────────
SYNONYMS = {
    # Fatigue
    "tired": "fatigue", "tiredness": "fatigue", "exhausted": "fatigue",
    "no energy": "fatigue", "lethargic": "fatigue", "lethargy": "fatigue",
    "worn out": "fatigue", "run down": "fatigue", "sluggish": "fatigue",
    "drained": "fatigue", "weak": "fatigue", "weakness": "fatigue",
    "no strength": "fatigue", "wiped out": "fatigue", "burnt out": "fatigue",
    # Vomiting
    "throwing up": "vomiting", "threw up": "vomiting", "puked": "vomiting",
    "sick to stomach": "vomiting", "puke": "vomiting", "puking": "vomiting",
    "vomit": "vomiting", "retching": "vomiting", "heaving": "vomiting",
    "tossed cookies": "vomiting",
    # Difficulty breathing
    "cant breathe": "difficulty_breathing", "can't breathe": "difficulty_breathing",
    "shortness of breath": "difficulty_breathing", "breathless": "difficulty_breathing",
    "short of breath": "difficulty_breathing", "hard to breathe": "difficulty_breathing",
    "trouble breathing": "difficulty_breathing", "labored breathing": "difficulty_breathing",
    "winded": "difficulty_breathing", "gasping": "difficulty_breathing",
    "cant catch my breath": "difficulty_breathing", "wheezing": "difficulty_breathing",
    "wheeze": "difficulty_breathing",
    # Runny nose
    "stuffy nose": "runny_nose", "blocked nose": "runny_nose", "congestion": "runny_nose",
    "stuffed up": "runny_nose", "nasal congestion": "runny_nose", "runny nose": "runny_nose",
    "dripping nose": "runny_nose", "postnasal drip": "runny_nose",
    # Fever
    "temp": "fever", "temperature": "fever", "hot": "fever", "burning up": "fever",
    "running a fever": "fever", "high temp": "fever", "high temperature": "fever",
    "febrile": "fever", "pyrexia": "fever", "feverish": "fever",
    # Body aches
    "ache": "body_aches", "aching": "body_aches", "sore muscles": "body_aches",
    "muscle pain": "body_aches", "body pain": "body_aches", "myalgia": "body_aches",
    "muscle ache": "body_aches", "muscles hurt": "body_aches", "hurting all over": "body_aches",
    "all over pain": "body_aches",
    # Abdominal pain
    "stomach ache": "abdominal_pain", "tummy ache": "abdominal_pain",
    "belly pain": "abdominal_pain", "gut pain": "abdominal_pain",
    "stomach pain": "abdominal_pain", "stomach cramps": "abdominal_pain",
    "cramps": "abdominal_pain", "abdominal cramps": "abdominal_pain",
    "belly ache": "abdominal_pain", "tummy pain": "abdominal_pain",
    # Palpitations
    "heart racing": "palpitations", "racing heart": "palpitations",
    "fast heartbeat": "palpitations", "fluttering": "palpitations",
    "heart pounding": "palpitations", "pounding heart": "palpitations",
    "heart skipping": "palpitations", "irregular heartbeat": "palpitations",
    "rapid heart": "palpitations", "tachycardia": "palpitations",
    # Loss of taste/smell
    "cant taste": "loss_of_taste_smell", "can't taste": "loss_of_taste_smell",
    "no taste": "loss_of_taste_smell", "no smell": "loss_of_taste_smell",
    "lost smell": "loss_of_taste_smell", "lost taste": "loss_of_taste_smell",
    "anosmia": "loss_of_taste_smell", "ageusia": "loss_of_taste_smell",
    "cant smell": "loss_of_taste_smell", "can't smell": "loss_of_taste_smell",
    # Sweating
    "sweating": "sweating", "sweaty": "sweating", "drenched": "sweating",
    "perspiring": "sweating", "perspiration": "sweating", "night sweats": "night_sweats",
    "clammy": "sweating",
    # Blurred vision
    "blurry": "blurred_vision", "blurry vision": "blurred_vision",
    "cant see clearly": "blurred_vision", "foggy vision": "blurred_vision",
    "can't see clearly": "blurred_vision", "vision blurry": "blurred_vision",
    "double vision": "blurred_vision", "vision problems": "blurred_vision",
    # Dizziness
    "dizzy": "dizziness", "lightheaded": "dizziness", "spinning": "dizziness",
    "vertigo": "dizziness", "off balance": "dizziness", "unsteady": "dizziness",
    "woozy": "dizziness", "lightheadedness": "dizziness", "giddiness": "dizziness",
    # Joint pain
    "stiff joints": "joint_pain", "swollen joints": "joint_pain",
    "joint swelling": "joint_pain", "achy joints": "joint_pain",
    "joints hurt": "joint_pain", "arthralgia": "joint_pain",
    # Rash
    "bumps": "rash", "spots": "rash", "hives": "rash",
    "skin reaction": "rash", "welts": "rash", "breakout": "rash",
    "skin rash": "rash", "eruption": "rash",
    # Itching
    "scratching": "itching", "itchy": "itching", "itchy skin": "itching",
    "pruritus": "itching", "itch": "itching",
    # Frequent urination
    "peeing a lot": "frequent_urination", "urinating frequently": "frequent_urination",
    "bathroom a lot": "frequent_urination", "urinary frequency": "frequent_urination",
    "frequent peeing": "frequent_urination", "pee a lot": "frequent_urination",
    "dysuria": "frequent_urination",
    # Numbness
    "pins and needles": "numbness", "tingling": "numbness", "numb": "numbness",
    "cant feel": "numbness", "can't feel": "numbness", "paresthesia": "numbness",
    "loss of sensation": "numbness",
    # Weight loss
    "losing weight": "weight_loss", "weight dropping": "weight_loss",
    "not eating": "weight_loss", "losing appetite": "loss_of_appetite",
    "unintentional weight loss": "weight_loss",
    # Chest pain
    "chest tightness": "chest_pain", "pressure in chest": "chest_pain",
    "chest heaviness": "chest_pain", "chest pressure": "chest_pain",
    "tight chest": "chest_pain", "chest discomfort": "chest_pain",
    "angina": "chest_pain",
    # Emergency flag
    "coughing up blood": "EMERGENCY_FLAG", "blood in cough": "EMERGENCY_FLAG",
    "coughing blood": "EMERGENCY_FLAG", "hemoptysis": "EMERGENCY_FLAG",
    "vomiting blood": "EMERGENCY_FLAG", "blood in vomit": "EMERGENCY_FLAG",
    "chest pain radiating arm": "EMERGENCY_FLAG",
    # Cough
    "coughing": "cough", "coughs": "cough", "dry cough": "cough",
    "persistent cough": "cough", "productive cough": "cough",
    # Chills
    "chills": "chills", "shivering": "chills", "rigors": "chills",
    "shaking": "chills",
    # Headache
    "headache": "headache", "head pain": "headache", "migraine": "headache",
    "head hurts": "headache", "cephalgia": "headache",
    # Sore throat
    "sore throat": "sore_throat", "throat pain": "sore_throat",
    "throat hurts": "sore_throat", "painful swallowing": "sore_throat",
    "pharyngitis": "sore_throat", "tonsillitis": "sore_throat",
    # Nausea
    "nauseous": "nausea", "queasy": "nausea", "feel like vomiting": "nausea",
    "upset stomach": "nausea", "feel sick": "nausea",
    # Diarrhea
    "diarrhea": "diarrhea", "loose stools": "diarrhea", "watery stool": "diarrhea",
    "runs": "diarrhea", "loose bowels": "diarrhea",
    # Back pain
    "back pain": "back_pain", "backache": "back_pain", "back hurts": "back_pain",
    "lower back pain": "back_pain", "lumbar pain": "back_pain",
    # Swollen lymph nodes
    "swollen glands": "swollen_lymph_nodes", "lymph nodes": "swollen_lymph_nodes",
    "glands swollen": "swollen_lymph_nodes", "swollen neck": "swollen_lymph_nodes",
    # Night sweats
    "wake up sweating": "night_sweats", "sweating at night": "night_sweats",
    "nocturnal sweating": "night_sweats",
    # Sneezing
    "sneeze": "sneezing", "sneezing": "sneezing", "sneezes": "sneezing",
    # Loss of appetite
    "no appetite": "loss_of_appetite", "not hungry": "loss_of_appetite",
    "loss of appetite": "loss_of_appetite", "anorexia": "loss_of_appetite",
}

_MEDICAL_NOISE = {
    "i", "me", "my", "have", "has", "had", "am", "is", "are", "was",
    "been", "feel", "feeling", "some", "bit", "little", "really", "very",
    "and", "or", "but", "the", "a", "an", "in", "on", "at", "to", "of",
    "with", "for", "its", "it", "also", "since", "days", "weeks", "bad",
    "quite", "experiencing", "getting", "got", "lot", "lots", "severe",
}


def parse_free_text(text: str) -> dict:
    """
    Parse free-text symptom input, identical logic to parseFreText() in engine.js.
    Returns { matched: {symptom: True}, unknown: [...], emergency: bool }
    """
    if not text or not isinstance(text, str):
        return {"matched": {}, "unknown": [], "emergency": False}

    normalized = re.sub(r"[^\w\s]", " ", text.lower())
    tokens = [t for t in normalized.split() if t]
    matched = {}
    used_indices = set()
    emergency = False

    # Try multi-word phrases (up to 4 tokens), longest first
    for window_size in range(4, 0, -1):
        for i in range(len(tokens) - window_size + 1):
            if any(k in used_indices for k in range(i, i + window_size)):
                continue
            phrase = " ".join(tokens[i:i + window_size])
            if phrase in SYNONYMS:
                mapped = SYNONYMS[phrase]
                if mapped == "EMERGENCY_FLAG":
                    emergency = True
                else:
                    matched[mapped] = True
                used_indices.update(range(i, i + window_size))

    unknown = [
        tokens[i]
        for i in range(len(tokens))
        if i not in used_indices
        and len(tokens[i]) > 2
        and tokens[i] not in _MEDICAL_NOISE
    ]

    return {"matched": matched, "unknown": unknown, "emergency": emergency}


def classify_bp(systolic: float, diastolic: float) -> str:
    if systolic < 90 or diastolic < 60:
        return "Low"
    if systolic <= 120 and diastolic <= 80:
        return "Normal"
    if systolic <= 139 or diastolic <= 89:
        return "Elevated"
    return "High"


def classify_cholesterol(mgdl: float) -> str:
    if mgdl < 150:
        return "Low"
    if mgdl < 200:
        return "Normal"
    if mgdl < 240:
        return "Elevated"
    return "High"


def _age_gaussian(age: float, mean: float, std: float) -> float:
    effective_std = max(std, 5)
    exponent = -0.5 * ((age - mean) / effective_std) ** 2
    density = math.exp(exponent) / (effective_std * math.sqrt(2 * math.pi))
    return max(density, 0.05)


def diagnose(inputs: dict) -> list:
    """
    Bayesian diagnosis engine — direct port of diagnose() from engine.js.
    inputs keys: age, bp, cholesterol, bp_confidence, chol_confidence,
                 symptoms, preexisting, unknown_symptom_count, emergency_flag
    Returns sorted list of result dicts.
    """
    age = inputs.get("age")
    bp = inputs.get("bp", "Unknown")
    cholesterol = inputs.get("cholesterol", "Unknown")
    bp_confidence = inputs.get("bp_confidence", 1.0)
    chol_confidence = inputs.get("chol_confidence", 1.0)
    symptoms = inputs.get("symptoms", {})
    preexisting = inputs.get("preexisting", [])

    results = []
    total_score = 0.0

    for disease in DISEASES:
        score = disease["prior"]
        trace = [{"label": "Prior", "value": disease["prior"]}]

        # Symptom likelihoods
        for key, p_sym in disease["symptoms"].items():
            if symptoms.get(key) is True:
                score *= p_sym
                label = "+" + key.replace("_", " ").title()
                trace.append({"label": label, "value": score})
            elif symptoms.get(key) is False:
                score *= (1 - p_sym)

        # Blood pressure modifier
        bp_mod = disease["bp_modifier"].get(bp, 1.0)
        effective_bp_mod = 1.0 + (bp_mod - 1.0) * bp_confidence
        score *= effective_bp_mod
        trace.append({"label": "+Blood Pressure", "value": score})

        # Cholesterol modifier
        chol_mod = disease["cholesterol_modifier"].get(cholesterol, 1.0)
        effective_chol_mod = 1.0 + (chol_mod - 1.0) * chol_confidence
        score *= effective_chol_mod
        trace.append({"label": "+Cholesterol", "value": score})

        # Age factor
        if age is not None:
            try:
                age_val = float(age)
                age_factor = _age_gaussian(age_val, disease["age_mean"], disease["age_std"])
                score *= age_factor
            except (TypeError, ValueError):
                pass
        trace.append({"label": "+Age", "value": score})

        # Pre-existing conditions
        pre_mods = disease.get("preexisting_modifiers", {})
        for condition in preexisting:
            if condition in pre_mods:
                score *= pre_mods[condition]
        trace.append({"label": "+Pre-existing", "value": score})

        emergency_triggered = any(
            symptoms.get(sym) is True
            for sym in disease.get("emergency_symptoms", [])
        )

        results.append({
            "disease": disease,
            "raw_score": score,
            "belief_trace": trace,
            "danger_level": disease["danger_level"],
            "emergency_triggered": emergency_triggered,
        })
        total_score += score

    # Normalize
    for r in results:
        r["probability"] = (r["raw_score"] / total_score * 100) if total_score > 0 else 0.0
        r["belief_trace"] = [
            {"label": e["label"], "value": (e["value"] / total_score * 100) if total_score > 0 else 0.0}
            for e in r["belief_trace"]
        ]
        r["belief_trace"].append({"label": "Final (normalized)", "value": r["probability"]})

    results.sort(key=lambda x: x["probability"], reverse=True)
    return results


def check_emergency(inputs: dict, top_result: dict) -> bool:
    """Port of checkEmergency() from engine.js."""
    symptoms = inputs.get("symptoms", {})

    if inputs.get("emergency_flag"):
        return True

    if top_result and top_result.get("disease"):
        for sym in top_result["disease"].get("emergency_symptoms", []):
            if symptoms.get(sym) is True:
                return True

    if symptoms.get("chest_pain") and symptoms.get("body_aches"):
        return True
    if symptoms.get("numbness") and symptoms.get("blurred_vision") and symptoms.get("headache"):
        return True
    if symptoms.get("difficulty_breathing") and symptoms.get("chest_pain"):
        return True

    return False
