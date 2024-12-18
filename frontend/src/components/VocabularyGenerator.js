import React, { useState } from 'react';
import './VocabularyGenerator.css';

const VocabularyGenerator = () => {
  const [topic, setTopic] = useState('');
  const [vocabData, setVocabData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateVocabulary = async (isRandom = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic,
          isRandom: isRandom
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate vocabulary');
      }

      const data = await response.json();
      const parsed = JSON.parse(data.vocabulary);
      setVocabData(parsed);
    } catch (error) {
      console.error('Error generating vocabulary:', error);
      setError('Error generating vocabulary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="vocabulary-generator">
      <div className="generator-controls">
        <div className="topic-input-section">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic (e.g., food, sports, weather)"
            className="topic-input"
          />
          <button 
            onClick={() => generateVocabulary(false)}
            disabled={isLoading || !topic.trim()}
            className="generate-button"
          >
            Generate Topic Vocabulary
          </button>
        </div>
        <div className="random-button-section">
          <button 
            onClick={() => generateVocabulary(true)}
            disabled={isLoading}
            className="random-button"
          >
            Generate Random Vocabulary
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {isLoading && <div className="loading">Generating vocabulary...</div>}

      {vocabData && (
        <div className="vocabulary-content">
          {vocabData.topic && (
            <h3 className="topic-header">Topic: {vocabData.topic}</h3>
          )}
          
          <div className="vocabulary-grid">
            {vocabData.words.map((word, index) => (
              <div key={index} className="vocabulary-card">
                <div className="card-header">
                  <span className="spanish-word">{word.spanish}</span>
                  <span className="word-type">{word.type}</span>
                </div>
                <div className="english-translation">{word.english}</div>
                <div className="example-section">
                  <p className="example">{word.example}</p>
                  <p className="example-translation">{word.example_translation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VocabularyGenerator; 