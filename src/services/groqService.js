const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

export async function analyzeTense(text) {
  const response = await fetch('https://api.groq.com/v1/tense-analysis', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      analysis_type: "tense_consistency"
    })
  });
  return response.json();
}