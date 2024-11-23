import React, { useState, useRef } from "react";
import "./App.css";

const App = () => {
  const [recording, setRecording] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);
  let finalTranscript = ""; // Local variable to store the transcript

  const handleToggleRecording = async () => {
    if (isProcessing) {
      console.log("Processing is still ongoing. Try again later.");
      return; // Prevent new interactions during processing
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
      recognition.lang = "es-ES"; // Set language to Spanish
      recognition.interimResults = false; // Only process final results

      recognition.onstart = () => {
        console.log("Speech recognition started");
        finalTranscript = ""; // Clear the local transcript variable
      };

      recognition.onresult = (event) => {
        finalTranscript = event.results[0][0].transcript; // Update the local transcript
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
          // Get AI response
          const aiResponse = await fetch("/api/generate-response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: finalTranscript }),
          });
          const aiData = await aiResponse.json();
          console.log("AI Response:", aiData.response);
          setResponseText(aiData.response);

          // Get the TTS audio for the response
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

  const handleSaveHighlight = () => {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) {
      alert("Please highlight a word or phrase to save.");
      return;
    }

    const savedHighlights = JSON.parse(localStorage.getItem("highlights")) || [];
    if (!savedHighlights.includes(selectedText)) {
      savedHighlights.push(selectedText);
      localStorage.setItem("highlights", JSON.stringify(savedHighlights));
      alert(`Saved: "${selectedText}"`);
    } else {
      alert(`"${selectedText}" is already saved.`);
    }
  };

  return (
    <div>
      <h1>¡Hablame!</h1>
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
  );
};

export default App;
