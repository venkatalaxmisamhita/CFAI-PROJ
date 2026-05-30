/**
 * engine.js  (frontend-only stub)
 *
 * The Bayesian inference logic (diagnose, checkEmergency, parseFreText,
 * SYNONYMS, DISEASES) has been moved to the Python backend.
 *
 * Only the two pure-math classifiers are kept here because they are
 * called on every keystroke and must remain synchronous.
 */

function classifyBP(systolic, diastolic) {
  if (systolic < 90 || diastolic < 60) return "Low";
  if (systolic <= 120 && diastolic <= 80) return "Normal";
  if (systolic <= 139 || diastolic <= 89) return "Elevated";
  return "High";
}

function classifyCholesterol(mgdl) {
  if (mgdl < 150) return "Low";
  if (mgdl < 200) return "Normal";
  if (mgdl < 240) return "Elevated";
  return "High";
}
