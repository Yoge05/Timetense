import React, { useState } from 'react';
import { analyzeTense } from '../services/groqService';

function TenseShifter() {
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleAnalysis = async () => {
    try {
      const result = await analyzeTense(text);
      setFeedback(result.feedback);
    } catch (error) {
      setFeedback('Error analyzing text');
    }
  };

  return (
    <div className="tense-shifter">
      <h2>Tense Shifter Arena</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text with tense errors..."
      />
      <button onClick={handleAnalysis}>Analyze Tenses</button>
      <div className="feedback">{feedback}</div>
    </div>
  );
}

export default TenseShifter;