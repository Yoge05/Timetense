import { useState } from 'react';
import './App.css';
import TenseOptions from './components/TenseOptions';

function App() {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('start');
  const [userAnswer, setUserAnswer] = useState('');
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState({ isWorking: true, message: '' });
  const [options, setOptions] = useState([]);

  // Fallback challenges
  const fallbackChallenges = {
    1: {
      text: "Yesterday, I go to the store and buys some milk. Then I comes home and drink it.",
      correctText: "Yesterday, I went to the store and bought some milk. Then I came home and drank it.",
      errors: ["'go' should be 'went'", "'buys' should be 'bought'", "'comes' should be 'came'", "'drink' should be 'drank'"],
      source: 'fallback',
      options: [
        "Yesterday, I went to the store and bought some milk. Then I came home and drank it.",
        "Yesterday, I go to the store and buys some milk. Then I comes home and drink it.",
        "Yesterday, I will go to the store and buy some milk. Then I will come home and drink it.",
        "Yesterday, I have gone to the store and bought some milk. Then I have come home and drank it."
      ]
    },
    2: {
      text: "While I am walking to school this morning, I see my friend. She tells me she has finished the project yesterday.",
      correctText: "While I was walking to school this morning, I saw my friend. She told me she had finished the project yesterday.",
      errors: ["'am walking' should be 'was walking'", "'see' should be 'saw'", "'tells' should be 'told'"],
      source: 'fallback',
      options: [
        "While I was walking to school this morning, I saw my friend. She told me she had finished the project yesterday.",
        "While I am walking to school this morning, I see my friend. She tells me she has finished the project yesterday.",
        "While I walked to school this morning, I saw my friend. She told me she finished the project yesterday.",
        "While I have walked to school this morning, I have seen my friend. She has told me she finished the project yesterday."
      ]
    },
    3: {
      text: "Next week, I went to Paris. I am visiting the Eiffel Tower and had taken many photos.",
      correctText: "Next week, I will go to Paris. I will visit the Eiffel Tower and take many photos.",
      errors: ["'went' should be 'will go'", "'am visiting' should be 'will visit'", "'had taken' should be 'take'"],
      source: 'fallback',
      options: [
        "Next week, I will go to Paris. I will visit the Eiffel Tower and take many photos.",
        "Next week, I went to Paris. I am visiting the Eiffel Tower and had taken many photos.",
        "Next week, I have gone to Paris. I have visited the Eiffel Tower and have taken many photos.",
        "Next week, I go to Paris. I visit the Eiffel Tower and take many photos."
      ]
    }
  };

  const generateChallenge = async () => {
    setIsLoading(true);
    const maxRetries = 3;
    const baseDelay = 1000;
    let retryCount = 0;

    const makeRequest = async () => {
      try {
        const apiKey = process.env.REACT_APP_GROQ_API_KEY;
        if (!apiKey) {
          throw new Error('API key not found in environment variables');
        }

        const prompts = {
          1: `Generate a paragraph with 3-4 tense errors mixing present and past tenses. Also generate 3 incorrect options that are common mistakes. Format response as strict JSON:
              {
                "text": "paragraph with errors",
                "correctText": "corrected paragraph",
                "errors": ["error1", "error2"],
                "options": [
                  "corrected paragraph",
                  "incorrect option 1",
                  "incorrect option 2",
                  "incorrect option 3"
                ]
              }`,
          2: `Generate a paragraph with mixed tense errors (present/past/future). Also generate 3 incorrect options that are common mistakes. Format response as strict JSON:
              {
                "text": "paragraph with errors",
                "correctText": "corrected paragraph",
                "errors": ["error1", "error2"],
                "options": [
                  "corrected paragraph",
                  "incorrect option 1",
                  "incorrect option 2",
                  "incorrect option 3"
                ]
              }`,
          3: `Generate a paragraph with complex tense errors (present perfect, future perfect, past perfect). Also generate 3 incorrect options that are common mistakes. Format response as strict JSON:
              {
                "text": "paragraph with errors",
                "correctText": "corrected paragraph",
                "errors": ["error1", "error2"],
                "options": [
                  "corrected paragraph",
                  "incorrect option 1",
                  "incorrect option 2",
                  "incorrect option 3"
                ]
              }`
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama3-70b-8192',
            messages: [
              {
                role: 'system',
                content: 'You are an English grammar tutor. Respond ONLY with valid JSON matching the requested format.'
              },
              {
                role: 'user',
                content: prompts[level]
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 1000
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.text();
          console.error('API Error:', errorData);
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('Raw API Response:', data);

        let challengeData;
        try {
          const content = data.choices[0].message.content;
          const jsonStart = content.indexOf('{');
          const jsonEnd = content.lastIndexOf('}') + 1;
          const jsonString = content.slice(jsonStart, jsonEnd);
          
          challengeData = JSON.parse(jsonString);
          
          if (!challengeData.text || !challengeData.correctText || !challengeData.errors || !challengeData.options) {
            throw new Error('Incomplete response from API');
          }
          
          // Shuffle options
          challengeData.options = shuffleArray(challengeData.options);
          challengeData.source = 'groq';
          setApiStatus({ isWorking: true, message: '' });
          return challengeData;
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          throw new Error('Failed to parse API response');
        }

      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        throw error;
      }
    };

    try {
      while (retryCount < maxRetries) {
        try {
          const challengeData = await makeRequest();
          setCurrentChallenge(challengeData);
          setOptions(challengeData.options);
          setGameState('playing');
          return;
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          const delay = baseDelay * Math.pow(2, retryCount - 1);
          console.log(`Retrying in ${delay}ms... (Attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      console.error('Challenge generation failed after retries:', error);
      setCurrentChallenge(fallbackChallenges[level]);
      setOptions(fallbackChallenges[level].options);
      setApiStatus({ 
        isWorking: false, 
        message: `Connection issue: ${error.message}. Using practice questions. Retrying in background...`
      });

      setTimeout(() => {
        setApiStatus({ 
          isWorking: true, 
          message: 'Connection restored. Next challenge will use AI generation.'
        });
      }, 30000);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to shuffle array
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Enhanced answer validation for multiple choice
  const checkAnswer = (selectedOption, challenge) => {
    if (!selectedOption || !challenge) return false;
    return selectedOption === challenge.correctText;
  };

  // Improved evaluateAnswer function for multiple choice
  const evaluateAnswer = (selectedOption) => {
    setIsLoading(true);
    try {
      const isCorrect = checkAnswer(selectedOption, currentChallenge);
      
      const feedbackData = {
        isCorrect,
        feedback: isCorrect 
          ? "✨ Excellent! You've chosen the correct tense usage." 
          : "Keep trying! Check the correct version and errors below:",
        userAnswer: selectedOption,
        correctAnswer: currentChallenge.correctText,
        errors: currentChallenge.errors,
        score: isCorrect ? 100 : 0
      };

      setFeedback(feedbackData);
      
      if (isCorrect) {
        setScore(prev => prev + feedbackData.score);
      }
      
      setGameState('feedback');
    } catch (error) {
      console.error('Evaluation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextLevel = () => {
    if (level < 3) {
      setLevel(prev => prev + 1);
      setUserAnswer('');
      setFeedback(null);
      generateChallenge();
    } else {
      setGameState('complete');
    }
  };

  const generateExplanation = (challenge, userAnswer) => {
    if (!challenge || !userAnswer) return "";

    let explanation = "";
    
    switch (level) {
      case 1:
        explanation = {
          correct: "Great job! You've correctly used past tense forms throughout the paragraph. Remember that when describing past events (indicated by 'yesterday'), all verbs should be in past tense.",
          incorrect: "When describing past events (indicated by 'yesterday'), all verbs should be in past tense. Check each verb and make sure it matches the time of the action."
        };
        break;
      case 2:
        explanation = {
          correct: "Excellent! You've maintained proper tense sequence. In complex sentences, the main action uses simple past tense, while earlier actions use past perfect ('had + verb').",
          incorrect: "For events that happened before another past action, use past perfect tense ('had + verb'). The main narrative should use simple past tense."
        };
        break;
      case 3:
        explanation = {
          correct: "Perfect! You've correctly aligned verb tenses with time markers. Future events use 'will' or 'going to', present actions use present tense, and past events use past tense.",
          incorrect: "Pay attention to time markers (next week, now, yesterday, etc.) and match your verb tenses accordingly. Future events need 'will' or 'going to'."
        };
        break;
      default:
        explanation = {
          correct: "Well done! Your tense usage is correct.",
          incorrect: "Review the tense usage and try again."
        };
    }

    const isCorrect = checkAnswer(userAnswer, challenge);
    return isCorrect ? explanation.correct : explanation.incorrect;
  };

  return (
    <div className="App">
      <header className="App-header">
        {gameState === 'start' && (
          <div className="start-container">
            <div className="title-section">
              <h1 className="main-title">Tense Master Challenge</h1>
              <p className="subtitle">Master English Tenses Through Interactive Challenges</p>
            </div>

            <div className="level-preview">
              <h2 className="level-title">Level 1: Choose the Correct Tense</h2>
              <div className="level-description">
                <p>Choose the correct tense from the given options.</p>
                <ul className="level-features">
                  <li>✓ Practice tense usage</li>
                  <li>✓ Learn through immediate feedback</li>
                </ul>
              </div>
              <button className="start-button" onClick={() => {
                setGameState('playing');
                generateChallenge();
              }}>
                Start Challenge
              </button>
            </div>

            <div className="instructions">
              <h3>How to Play</h3>
              <ol className="instruction-list">
                <li>Read the paragraph carefully</li>
                <li>Choose the correct tense from the given options</li>
                <li>Submit your answer for feedback</li>
              </ol>
            </div>
          </div>
        )}

        <div className="score-display">Score: {score}</div>

        {gameState === 'playing' && currentChallenge && (
          <div className="game-container">
            <h2>Level {level}: Choose the Correct Tense</h2>
            <div className="challenge-box">
              <p className="challenge-text">{currentChallenge.text}</p>
              <div className="options-container">
                {options.map((option, index) => (
                  <button
                    key={index}
                    className={`option-button ${isLoading ? 'disabled' : ''}`}
                    onClick={() => evaluateAnswer(option)}
                    disabled={isLoading}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === 'feedback' && feedback && (
          <div className="feedback-container">
            <div className={`feedback-header ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
              <div className="feedback-icon">
                {feedback.isCorrect ? '✨' : '❌'}
              </div>
              <h3>{feedback.isCorrect ? 'Excellent!' : 'Not Quite Right'}</h3>
              <p className="feedback-message">
                {feedback.isCorrect 
                  ? "Your answer demonstrates perfect tense usage! Here's why it's correct:" 
                  : "Keep practicing! Let's review your answer:"}
              </p>
            </div>

            <div className="answer-comparison">
              <div className="comparison-box">
                <h4>Your Answer:</h4>
                <div className="answer-text">
                  {feedback.userAnswer || "No answer provided"}
                </div>
              </div>

              <div className="comparison-box">
                <h4>Correct Version:</h4>
                <div className="answer-text correct">
                  {feedback.correctAnswer}
                </div>
              </div>

              <div className="detailed-feedback">
                <h4>Detailed Analysis:</h4>
                <div className="analysis-content">
                  {feedback.isCorrect ? (
                    <>
                      <div className="success-points">
                        <h5>What You Did Right:</h5>
                        <ul>
                          <li>✓ Used correct past tense forms</li>
                          <li>✓ Maintained tense consistency</li>
                          <li>✓ Proper time sequence</li>
                        </ul>
                      </div>
                      <div className="learning-tip">
                        <h5>Learning Tip:</h5>
                        <p>{generateExplanation(currentChallenge, userAnswer)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="error-list">
                        <h5>Areas to Improve:</h5>
                        <ul>
                          {currentChallenge.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="improvement-tip">
                        <h5>How to Fix:</h5>
                        <p>{generateExplanation(currentChallenge, userAnswer)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="score-section">
              <div className="points-earned">
                <h4>Points Earned:</h4>
                <p className="points">{feedback.isCorrect ? '+100' : '0'}</p>
              </div>
              <div className="total-score">
                <h4>Total Score:</h4>
                <p className="score">{score}</p>
              </div>
            </div>

            <button 
              className={`next-level-button ${feedback.isCorrect ? 'enabled' : 'disabled'}`}
              onClick={nextLevel}
              disabled={!feedback.isCorrect}
            >
              {level < 3 ? 'Next Level' : 'Complete Game'}
            </button>
          </div>
        )}

        {gameState === 'complete' && (
          <div className="complete-container">
            <h2>Game Complete!</h2>
            <p>Final Score: {score}</p>
            <button className="restart-button" onClick={generateChallenge}>
              Play Again
            </button>
          </div>
        )}

        {/* Add API status message if needed */}
        {!apiStatus.isWorking && (
          <div className="api-status-message">
            {apiStatus.message}
          </div>
        )}

        {/* Remove TenseOptions component since it's not being used properly */}
        {/* <TenseOptions /> */}

        <style jsx>{`
          .App {
            text-align: center;
            padding: 20px;
          }

          .game-container {
            width: 90%;
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
          }

          .challenge-box {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }

          .challenge-text {
            font-size: 1.2em;
            color: #333;
            line-height: 1.6;
            margin: 0 0 20px 0;
          }

          .options-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin: 20px 0;
          }

          .option-button {
            padding: 15px;
            background: #f5f5f5;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 1.1em;
            text-align: left;
            cursor: pointer;
            transition: all 0.3s;
          }

          .option-button:hover:not(:disabled) {
            background: #e3f2fd;
            border-color: #2196f3;
          }

          .option-button.disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .submit-button {
            padding: 12px 24px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1.1em;
            cursor: pointer;
            transition: all 0.3s;
          }

          .submit-button:hover:not(:disabled) {
            background: #45a049;
          }

          .feedback-container {
            background: #ffffff;
            border-radius: 16px;
            padding: 30px;
            margin: 30px auto;
            max-width: 800px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            color: #333333;
          }

          .feedback-header {
            text-align: center;
            padding: 24px;
            border-radius: 12px;
            margin-bottom: 30px;
          }

          .feedback-header.correct {
            background: #e8f5e9;
            border: 3px solid #4caf50;
          }

          .feedback-header.incorrect {
            background: #ffebee;
            border: 3px solid #f44336;
          }

          .feedback-icon {
            font-size: 3em;
            margin-bottom: 15px;
          }

          .feedback-header h3 {
            font-size: 2em;
            margin: 10px 0;
            color: #1a237e;
          }

          .feedback-message {
            font-size: 1.2em;
            color: #424242;
            margin: 10px 0;
          }

          .comparison-box {
            background: #f5f5f5;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            border: 2px solid #e0e0e0;
          }

          .comparison-box h4 {
            color: #1a237e;
            font-size: 1.3em;
            margin-bottom: 15px;
          }

          .answer-text {
            font-size: 1.2em;
            line-height: 1.6;
            padding: 15px;
            background: white;
            border-radius: 6px;
            border-left: 4px solid #2196f3;
          }

          .answer-text.correct {
            border-left: 4px solid #4caf50;
          }

          .detailed-feedback {
            background: #e3f2fd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }

          .detailed-feedback h4 {
            color: #1a237e;
            font-size: 1.3em;
            margin-bottom: 15px;
          }

          .analysis-content {
            background: white;
            border-radius: 6px;
            padding: 20px;
          }

          .success-points, .error-list {
            margin-bottom: 20px;
          }

          .success-points h5, .error-list h5, .learning-tip h5, .improvement-tip h5 {
            color: #1976d2;
            font-size: 1.1em;
            margin-bottom: 10px;
          }

          .success-points ul, .error-list ul {
            list-style-type: none;
            padding-left: 0;
          }

          .success-points li, .error-list li {
            margin: 10px 0;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 4px;
            font-size: 1.1em;
          }

          .success-points li {
            color: #2e7d32;
            border-left: 4px solid #4caf50;
          }

          .error-list li {
            color: #c62828;
            border-left: 4px solid #f44336;
          }

          .learning-tip, .improvement-tip {
            background: #fff3e0;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
          }

          .learning-tip p, .improvement-tip p {
            color: #424242;
            font-size: 1.1em;
            line-height: 1.6;
          }

          .score-section {
            display: flex;
            justify-content: space-around;
            background: #e8eaf6;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            text-align: center;
          }

          .points-earned, .total-score {
            padding: 15px;
          }

          .points-earned h4, .total-score h4 {
            color: #1a237e;
            font-size: 1.2em;
            margin-bottom: 10px;
          }

          .points, .score {
            font-size: 2em;
            font-weight: bold;
            color: #2196f3;
          }

          .next-level-button {
            display: block;
            width: 250px;
            margin: 30px auto 0;
            padding: 15px 30px;
            font-size: 1.3em;
            border: none;
            border-radius: 30px;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .next-level-button.enabled {
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
          }

          .next-level-button.enabled:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
          }

          .next-level-button.disabled {
            background: #cccccc;
            color: #666666;
            cursor: not-allowed;
          }

          .complete-container {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin: 20px auto;
            max-width: 400px;
          }

          .restart-button {
            padding: 12px 24px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1.1em;
            cursor: pointer;
            transition: all 0.3s;
          }

          .restart-button:hover {
            background: #1976D2;
          }

          .start-container {
            width: 90%;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            text-align: center;
            color: #ffffff;
          }

          .title-section {
            margin-bottom: 40px;
            animation: fadeInDown 0.8s ease-out;
          }

          .main-title {
            font-size: 3.5em;
            font-weight: bold;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #2196F3, #4CAF50);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
          }

          .subtitle {
            font-size: 1.4em;
            color: #90caf9;
            margin-bottom: 30px;
          }

          .level-preview {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 30px;
            margin: 20px 0;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            animation: fadeInUp 0.8s ease-out;
          }

          .level-title {
            font-size: 2.2em;
            color: #4CAF50;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
          }

          .level-description {
            font-size: 1.2em;
            margin: 20px 0;
            color: #e3f2fd;
          }

          .level-features {
            list-style: none;
            padding: 0;
            margin: 20px 0;
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: center;
          }

          .level-features li {
            font-size: 1.1em;
            color: #81c784;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
          }

          .start-button {
            padding: 15px 40px;
            font-size: 1.4em;
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 30px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
            margin: 30px 0;
          }

          .start-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
          }

          .instructions {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 25px;
            margin-top: 40px;
            animation: fadeInUp 1s ease-out;
          }

          .instructions h3 {
            color: #90caf9;
            font-size: 1.6em;
            margin-bottom: 20px;
          }

          .instruction-list {
            text-align: left;
            padding-left: 30px;
            color: #e3f2fd;
            font-size: 1.1em;
            line-height: 1.8;
          }

          .instruction-list li {
            margin: 10px 0;
          }

          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Make sure your App.js has this background */
          .App {
            min-height: 100vh;
            background: linear-gradient(135deg, #1a237e, #0d47a1);
          }

          /* Responsive design */
          @media (max-width: 768px) {
            .main-title {
              font-size: 2.5em;
            }

            .subtitle {
              font-size: 1.2em;
            }

            .level-title {
              font-size: 1.8em;
            }

            .level-description {
              font-size: 1.1em;
            }

            .start-button {
              padding: 12px 30px;
              font-size: 1.2em;
            }
          }

          .api-status-message {
            background: #fff3e0;
            color: #e65100;
            padding: 10px 20px;
            border-radius: 4px;
            margin: 10px auto;
            max-width: 800px;
            text-align: center;
            font-size: 0.9em;
          }

          .tense-options {
            width: 100%;
            max-width: 800px;
            margin: 20px auto;
          }

          .options-grid {
            display: grid;
            gap: 15px;
            margin-top: 20px;
          }

          .option-button {
            padding: 15px;
            border: 2px solid #ccc;
            border-radius: 8px;
            background-color: white;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
            font-size: 16px;
            line-height: 1.4;
          }

          .option-button:hover {
            background-color: #f0f0f0;
            border-color: #999;
          }

          .loading {
            text-align: center;
            padding: 20px;
            color: #666;
          }
        `}</style>
      </header>
    </div>
  );
}

export default App;
