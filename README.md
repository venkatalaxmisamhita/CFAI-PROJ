# MedAI Diagnosis Agent

## Run locally
Double-click index.html — no install, no server needed.

## Deploy free on Netlify Drop
1. Go to netlify.com/drop
2. Drag the med_ai_agent_final folder onto the page
3. Live instantly at a public URL

## Deploy on GitHub Pages
1. Push folder to a GitHub repo
2. Settings → Pages → Source: main / root
3. Live at https://yourusername.github.io/reponame

## PEAS Framework — Software Agent
Performance:  Maximize diagnostic accuracy, minimize false negatives and
              false positives, detect critical conditions promptly,
              provide explainable predictions, achieve high confidence
              when sufficient data is available, generate timely
              recommendations.
Environment:  Patient demographics (age, gender), medical history,
              pre-existing conditions, blood pressure status, cholesterol
              levels, symptoms, lifestyle factors, vital signs, and other
              health-related information provided by the patient.
Actuators:    Generate ranked disease predictions with confidence scores,
              display risk/danger levels, provide diagnostic explanations,
              recommend medical tests, issue emergency alerts for critical
              conditions, suggest when to seek medical attention.
Sensors:      Age, gender, pre-existing conditions, blood pressure
              readings, cholesterol values, symptom selections, free-text
              symptom descriptions, vital signs, and uploaded health
              information or reports.

## PEAS Framework — Physical Robot Agent
Note:         Inflatable BP cuff is a combined sensing-and-actuation
              subsystem, so some instructors might place it differently.

## How the Bayesian engine works
P(Disease|Evidence) proportional to:
  Prior x symptoms x BP modifier x Cholesterol modifier
  x Age (Gaussian) x Pre-existing condition multipliers
All scores normalized to sum to 100%.
