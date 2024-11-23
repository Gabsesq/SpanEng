import React, { useState, useRef } from "react";
import './App.css';

const App = () => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState(""); // State for live transcript
  const [responseText, setResponseText] = useState("");
  const recognitionRef = useRef(null);

  const handleToggleRecording = async () => {
    if (!recording) {
      // Start speech recognition
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech Recognition is not supported in this browser.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "es-ES"; // Set language to Spanish
      recognition.interimResults = true; // Enable interim results for live updates

      recognition.onstart = () => {
        console.log("Speech recognition started");
        setTranscript(""); // Clear transcript when starting
      };

      recognition.onresult = (event) => {
        const interimTranscript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");
        console.log("Interim Transcript:", interimTranscript);
        setTranscript(interimTranscript); // Update transcript live
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };

      recognition.onend = async () => {
        console.log("Speech recognition ended");
        setRecording(false);

        // Final transcript processing
        const finalTranscript = transcript;
        console.log("Final Transcript:", finalTranscript);

        // Send transcript to the backend for a response
        const aiResponse = await fetch("/api/generate-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: finalTranscript }),
        });
        const aiData = await aiResponse.json();
        setResponseText(aiData.response);

        // Get the TTS audio for the response
        const ttsResponse = await fetch("/api/text-to-speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: aiData.response }),
        });
        const ttsData = await ttsResponse.json();

        // Decode Base64 audio and play automatically
        const audioBlob = new Blob(
          [
            Uint8Array.from(
              atob(ttsData.audioContent),
              (c) => c.charCodeAt(0)
            ),
          ],
          { type: "audio/mp3" }
        );
        const audioBlobUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioBlobUrl);
        audio.play();
      };

      recognition.start();
      setRecording(true);
    } else {
      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setRecording(false);
      }
    }
  };

  return (
    <div>
      <h1>¡Hablame!</h1>
      <div className="button-container">
        <button onClick={handleToggleRecording}>
          {recording ? "Stop Listening" : "Start Speaking"}
        </button>
      </div>
      <div className="textarea" >
      {transcript && <p><strong>Transcript:</strong> {transcript}</p>}
      {responseText && <p><strong>AI Response:</strong> {responseText}</p>}
      </div>
    </div>
  );
  
};

export default App;
