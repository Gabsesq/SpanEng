import React, { useState } from 'react';
import './GrammarWorksheet.css';

const GrammarWorksheet = () => {
  const [verb, setVerb] = useState('');
  const [worksheetData, setWorksheetData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const generateWorksheet = async () => {
    if (!verb.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate-worksheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verb }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate worksheet');
      }

      const data = await response.json();
      const parsed = JSON.parse(data.worksheet);
      setWorksheetData(parsed);
      setUserAnswers({});
      setShowAnswers(false);
    } catch (error) {
      console.error('Error generating worksheet:', error);
      alert('Error generating worksheet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (index, value) => {
    setUserAnswers(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const checkAnswers = () => {
    setShowAnswers(true);
  };

  const renderConjugationTable = (tense, conjugations) => (
    <div className="conjugation-section">
      <h4>{tense}</h4>
      <div className="conjugation-grid">
        {conjugations.map((conj, index) => (
          <div key={index} className="conjugation-item">
            {conj}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grammar-worksheet">
      <div className="verb-input-section">
        <input
          type="text"
          value={verb}
          onChange={(e) => setVerb(e.target.value)}
          placeholder="Enter a verb (e.g., haber)"
          className="verb-input"
        />
        <button 
          onClick={generateWorksheet}
          disabled={isLoading}
          className="generate-button"
        >
          {isLoading ? 'Generating...' : 'Generate Worksheet'}
        </button>
      </div>

      {worksheetData && (
        <div className="worksheet-content">
          <section className="overview-section">
            <h3>Conjugation Overview</h3>
            {Object.entries(worksheetData.overview).map(([tense, conjugations]) => (
              renderConjugationTable(tense, conjugations)
            ))}
          </section>

          <section className="explanation-section">
            <h3>Explanation</h3>
            <p>{worksheetData.explanation}</p>
          </section>

          <section className="exercises-section">
            <h3>Exercises</h3>
            <div className="exercises-list">
              {worksheetData.exercises.map((exercise, index) => (
                <div key={index} className="exercise-item">
                  <p className="exercise-sentence">
                    {exercise.sentence.split('___').map((part, i, arr) => (
                      <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <input
                            type="text"
                            value={userAnswers[index] || ''}
                            onChange={(e) => handleAnswerChange(index, e.target.value)}
                            className={showAnswers ? 
                              (userAnswers[index]?.toLowerCase() === exercise.answer.toLowerCase() 
                                ? 'correct' 
                                : 'incorrect') 
                              : ''}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </p>
                  {showAnswers && (
                    <div className="answer-feedback">
                      <p className="correct-answer">
                        Correct answer: {exercise.answer}
                      </p>
                      <p className="answer-explanation">
                        <strong>{exercise.tense}</strong>: {exercise.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={checkAnswers} 
              className="check-answers-button"
              disabled={showAnswers}
            >
              Check Answers
            </button>
          </section>
        </div>
      )}
    </div>
  );
};

export default GrammarWorksheet; 