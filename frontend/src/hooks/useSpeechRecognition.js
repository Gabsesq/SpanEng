import { useState } from "react";

const useSpeechRecognition = (language = "es-ES") => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = language;
  recognition.interimResults = false;

  const startListening = (onSpeechResult) => {
    setTranscript(""); // Clear previous transcript
    recognition.start();
    setListening(true);

    recognition.onresult = (event) => {
      const speechResult = event.results[event.results.length - 1][0].transcript;
      console.log("Speech recognition result:", speechResult); // Debug log
      setTranscript(speechResult); // Update transcript state
      if (onSpeechResult) onSpeechResult(speechResult); // Pass the result to the callback
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };
  };

  const stopListening = () => {
    recognition.stop();
    setListening(false);
  };

  return { listening, transcript, startListening, stopListening };
};

export default useSpeechRecognition;
