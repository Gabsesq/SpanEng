import React, { useState, useEffect } from 'react';

const SavedWords = () => {
  const [searchWord, setSearchWord] = useState('');
  const [savedWords, setSavedWords] = useState([]);

  useEffect(() => {
    const savedHighlights = JSON.parse(localStorage.getItem("highlights")) || [];
    setSavedWords(savedHighlights);
  }, []);

  const handleAddWord = async (e) => {
    e.preventDefault();
    if (searchWord.trim()) {
      try {
        // First, detect the language
        let detectResponse;
        try {
          detectResponse = await fetch("/api/detect-language", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({ text: searchWord.trim() }),
          });
        } catch (error) {
          throw new Error("Cannot connect to server. Please make sure the server is running.");
        }

        if (!detectResponse.ok) {
          throw new Error(`Language detection failed: ${detectResponse.status}`);
        }

        const detectData = await detectResponse.json();
        const isEnglish = detectData.language === 'en';

        // Get translation
        let translationResponse;
        try {
          translationResponse = await fetch("/api/translate", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({ 
              word: searchWord.trim(),
              to_english: !isEnglish
            }),
          });
        } catch (error) {
          throw new Error("Cannot connect to server. Please make sure the server is running.");
        }

        if (!translationResponse.ok) {
          throw new Error(`Translation failed: ${translationResponse.status}`);
        }

        const translationData = await translationResponse.json();
        
        if (translationData.error) {
          throw new Error(translationData.error);
        }

        // Create new entry with word and translation in correct order
        const newEntry = isEnglish ? {
          word: translationData.translation, // Spanish word
          translation: searchWord.trim()     // English word
        } : {
          word: searchWord.trim(),          // Spanish word
          translation: translationData.translation // English word
        };

        // Update state and localStorage
        const savedHighlights = JSON.parse(localStorage.getItem("highlights")) || [];
        if (!savedHighlights.some(entry => entry.word === newEntry.word)) {
          const updatedWords = [...savedHighlights, newEntry];
          setSavedWords(updatedWords);
          localStorage.setItem("highlights", JSON.stringify(updatedWords));
        }
        
        setSearchWord('');
      } catch (error) {
        console.error("Error:", error);
        alert(error.message || "Failed to translate word. Please try again.");
      }
    }
  };

  const handleRemoveWord = (wordToRemove) => {
    const updatedWords = savedWords.filter(entry => entry.word !== wordToRemove);
    setSavedWords(updatedWords);
    localStorage.setItem("highlights", JSON.stringify(updatedWords));
  };

  return (
    <div className="saved-words-container">
      <form onSubmit={handleAddWord} className="search-form">
        <input
          type="text"
          value={searchWord}
          onChange={(e) => setSearchWord(e.target.value)}
          placeholder="Enter a word in English or Spanish"
          className="search-input"
        />
        <button type="submit" className="add-button">Add Word</button>
      </form>

      <div className="saved-words-list">
        <h2>Saved Words</h2>
        {savedWords.length === 0 ? (
          <p>No saved words yet</p>
        ) : (
          <ul>
            {savedWords.map((entry, index) => (
              <li key={index}>
                <span className="word-entry">
                  <strong>{entry.word}</strong> - {entry.translation}
                </span>
                <button 
                  onClick={() => handleRemoveWord(entry.word)}
                  className="remove-button"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SavedWords;