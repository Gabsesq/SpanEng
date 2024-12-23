import React, { useState, useRef } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import JournalEntry from './components/JournalEntry';
import GrammarWorksheet from './components/GrammarWorksheet';
import VocabularyGenerator from './components/VocabularyGenerator';
import SavedWords from './components/SavedWords';
import './components/SavedWords.css';

const App = () => {
  const [recording, setRecording] = useState(false);
  const [inputText, setInputText] = useState("");
  const [responseText, setResponseText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState("main");
  const recognitionRef = useRef(null);
  let finalTranscript = "";
  const [isHighlighting, setIsHighlighting] = useState(false);

  const startRecording = async (e) => {
    e.preventDefault();
    
    if (isProcessing) {
      console.log("Processing is still ongoing. Try again later.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "es-ES";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      finalTranscript = "";
      setInputText("");
      setRecording(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      finalTranscript = '';

      // Combine all results
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update the input text with both final and interim results
      const displayText = finalTranscript + interimTranscript;
      console.log("Current Transcript:", displayText);
      setInputText(displayText);
    };

    recognition.onend = async () => {
      console.log("Speech recognition ended");
      
      if (!recording) {
        if (finalTranscript.trim() === "") {
          console.log("No transcript available to process.");
          return;
        }

        console.log("Sending transcript to OpenAI:", finalTranscript);
        setIsProcessing(true);

        try {
          const aiResponse = await generateResponse(finalTranscript);
          console.log("AI Response:", aiResponse);
          setResponseText(aiResponse);
          
          // Fetch TTS Response
          const ttsResponse = await fetch("/api/text-to-speech", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({ text: aiResponse }),
          });

          if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            throw new Error(`TTS failed: ${ttsResponse.status} - ${errorText}`);
          }

          const ttsData = await ttsResponse.json();
          if (!ttsData.audioContent) {
            throw new Error('No audio content received from TTS service');
          }

          console.log("Playing TTS audio");
          const audioBlob = new Blob(
            [Uint8Array.from(atob(ttsData.audioContent), (c) => c.charCodeAt(0))],
            { type: "audio/mp3" }
          );
          const audioBlobUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioBlobUrl);
          await audio.play();
        } catch (error) {
          console.error("Error during processing:", error);
        } finally {
          setIsProcessing(false);
        }
      } else {
        try {
          recognition.start();
        } catch (error) {
          console.error("Error restarting recognition:", error);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'no-speech') {
        // If no speech is detected, but button is still held, restart recognition
        if (recording) {
          try {
            recognition.stop();
            recognition.start();
          } catch (error) {
            console.error("Error restarting recognition:", error);
          }
        }
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
    }
  };

  const stopRecording = () => {
    setRecording(false);  // Set recording to false before stopping
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleHighlightMode = () => {
    setIsHighlighting(!isHighlighting);
    if (!isHighlighting) {
      document.body.classList.add('highlighting');
    } else {
      document.body.classList.remove('highlighting');
    }
  };

  const handleHighlightSave = async (selectedText) => {
    try {
      // Request English translation from the backend
      const translationResponse = await fetch("http://localhost:5000/api/translate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          word: selectedText,
          to_english: true // always translate to English for highlights
        }),
      });

      if (!translationResponse.ok) {
        throw new Error('Translation failed');
      }

      const translationData = await translationResponse.json();
      
      // Save the highlight
      const savedHighlights = JSON.parse(localStorage.getItem("highlights")) || [];
      
      // Check if word already exists
      if (!savedHighlights.some(entry => entry.word === selectedText)) {
        const newEntry = { 
          word: selectedText,
          translation: translationData.translation
        };
        savedHighlights.push(newEntry);
        localStorage.setItem("highlights", JSON.stringify(savedHighlights));
      }

      // Clear the selection and exit highlight mode
      window.getSelection().removeAllRanges();
      setIsHighlighting(false);
      document.body.classList.remove('highlighting');

    } catch (error) {
      console.error("Error saving highlight:", error);
      alert("Failed to save highlighted word. Please try again.");
    }
  };

  const handleMouseUp = async () => {
    if (!isHighlighting) return;

    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      await handleHighlightSave(selectedText);
    }
  };

  // Add mousedown handler to prevent exiting highlight mode when clicking to highlight
  const handleMouseDown = (e) => {
    if (isHighlighting) {
      e.preventDefault(); // Prevents default text selection behavior
    }
  };

  const handleDeleteHighlight = (word) => {
    const savedHighlights = JSON.parse(localStorage.getItem("highlights")) || [];
    const updatedHighlights = savedHighlights.filter(
      (item) => item.word !== word
    );
    localStorage.setItem("highlights", JSON.stringify(updatedHighlights));
    // Optional: Add a subtle notification instead of alert
    console.log(`Deleted: "${word}"`);
  };

  const generateResponse = async (transcript) => {
    try {
      const response = await fetch('http://localhost:5000/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: transcript }),
      });

      if (!response.ok) {
        throw new Error(`AI Response failed: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  };

  return (
    <div onMouseUp={handleMouseUp} onMouseDown={handleMouseDown}>
      <Navbar currentView={view} setView={setView} />
      <h1>¡Hablame!</h1>
      {view === "main" ? (
        <div>
          <div className="button-container">
            <button 
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={isProcessing}
              className={recording ? "recording" : ""}
              aria-label={recording ? "Recording in progress" : "Hold to speak"}
            />
          </div>
          <div className="textarea">
            <p>
              <strong>Input:</strong> {inputText}
            </p>
            <p>
              <strong>Response:</strong> {responseText}
            </p>
          </div>
          {responseText && (
            <button 
              onClick={toggleHighlightMode}
              className={`highlight-button ${isHighlighting ? 'active' : ''}`}
              title={isHighlighting ? "Click to exit highlight mode" : "Click to highlight text"}
            >
              Highlight
            </button>
          )}
        </div>
      ) : view === "saved" ? (
        <SavedWords />
      ) : view === "journal" ? (
        <JournalEntry />
      ) : view === "worksheet" ? (
        <GrammarWorksheet />
      ) : view === "vocabulary" && (
        <VocabularyGenerator />
      )}
    </div>
  );
};

export default App;
