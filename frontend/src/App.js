import React, { useState, useRef } from "react";
import "./App.css";
import Navbar from "./components/Navbar";



const App = () => {
  const [recording, setRecording] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState("main");
  const recognitionRef = useRef(null);
  let finalTranscript = ""; // Local variable to store the transcript

  const handleToggleRecording = async () => {
    if (isProcessing) {
      console.log("Processing is still ongoing. Try again later.");
      return;
    }

    if (!recording) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech Recognition is not supported in this browser.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "es-ES";
      recognition.interimResults = false;

      recognition.onstart = () => {
        console.log("Speech recognition started");
        finalTranscript = "";
      };

      recognition.onresult = (event) => {
        finalTranscript = event.results[0][0].transcript;
        console.log("Final Transcript:", finalTranscript);
      };

      recognition.onend = async () => {
        console.log("Speech recognition ended");

        if (finalTranscript.trim() === "") {
          console.log("No transcript available to process.");
          return;
        }

        console.log("Sending transcript to OpenAI:", finalTranscript);
        setIsProcessing(true);
        try {
          const aiResponse = await fetch("/api/generate-response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: finalTranscript }),
          });
          const aiData = await aiResponse.json();
          console.log("AI Response:", aiData.response);
          setResponseText(aiData.response);

          const ttsResponse = await fetch("/api/text-to-speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: aiData.response }),
          });
          const ttsData = await ttsResponse.json();

          console.log("Playing TTS audio.");
          const audioBlob = new Blob(
            [Uint8Array.from(atob(ttsData.audioContent), (c) => c.charCodeAt(0))],
            { type: "audio/mp3" }
          );
          const audioBlobUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioBlobUrl);
          audio.play();
        } catch (error) {
          console.error("Error during processing:", error);
        }
        setIsProcessing(false);
      };

      recognition.start();
      setRecording(true);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setRecording(false);
      }
    }
  };

  const handleSaveHighlight = async () => {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) {
      alert("Please highlight a word or phrase to save.");
      return;
    }
  
    try {
      // Request English translation from the backend
      const translationResponse = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: selectedText }),
      });
  
      const translationData = await translationResponse.json();
      const englishTranslation = translationData.translation;
  
      // Save as an object: { word, translation }
      const savedHighlights =
        JSON.parse(localStorage.getItem("highlights")) || [];
      const newEntry = { word: selectedText, translation: englishTranslation };
  
      savedHighlights.push(newEntry);
      localStorage.setItem("highlights", JSON.stringify(savedHighlights));
      alert(`Saved: "${selectedText} - ${englishTranslation}"`);
    } catch (error) {
      console.error("Error fetching translation:", error);
      alert("Failed to save the word. Please try again.");
    }
  };
  
  const handleDeleteHighlight = (word) => {
    const savedHighlights = JSON.parse(localStorage.getItem("highlights")) || [];
    const updatedHighlights = savedHighlights.filter(
      (item) => item.word !== word
    );
    localStorage.setItem("highlights", JSON.stringify(updatedHighlights));
    alert(`Deleted: "${word}"`);
  };
  
  const renderSavedWords = () => {
    const savedHighlights = JSON.parse(localStorage.getItem("highlights")) || [];
    if (savedHighlights.length === 0) {
      return <p className="saved-words-text">No saved words or phrases.</p>;
    }
  
    return (
      <ul className="saved-words-list">
        {savedHighlights.map((entry, index) => (
          <li key={index} className="saved-words-item">
            {entry.word} - {entry.translation}{" "}
            <button
              className="delete-button"
              onClick={() => handleDeleteHighlight(entry.word)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    );
  };
  
  
  
  

  return (
    <div>
      <Navbar currentView={view} setView={setView} />
      <h1>¡Hablame!</h1> {/* Re-added header */}
      {view === "main" ? (
        <div>
          <div className="button-container">
            <button onClick={handleToggleRecording} disabled={isProcessing}>
              {recording ? "Stop Listening" : "Start Speaking"}
            </button>
          </div>
          <div className="textarea">
            {responseText && (
              <div>
                <p>
                  <strong>Response:</strong> {responseText}
                </p>
                <button onClick={handleSaveHighlight}>Save Highlight</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <h2>Saved Words</h2>
          {renderSavedWords()}
        </div>
      )}
    </div>
  );
  
};

export default App;
