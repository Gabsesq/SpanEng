import React, { useState, useRef } from 'react';
import './JournalEntry.css';

const JournalEntry = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState(null);
  const [journalText, setJournalText] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = async (type) => {
    try {
      // Set up video if needed
      if (type === 'video') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      // Set up speech recognition
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

      // Reset the transcript when starting new recording
      setJournalText('');
      let finalTranscript = '';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        
        // Only look at the most recent results
        const currentTranscript = Array.from(event.results)
          .slice(event.resultIndex)
          .map(result => result[0].transcript)
          .join('');

        if (event.results[event.resultIndex].isFinal) {
          finalTranscript += currentTranscript + ' ';
          setJournalText(finalTranscript.trim());
        } else {
          interimTranscript = currentTranscript;
          setJournalText(finalTranscript + interimTranscript);
        }
      };

      recognition.onend = async () => {
        console.log("Recognition ended, isRecording:", isRecording);
        if (isRecording) {
          try {
            recognition.start();
          } catch (error) {
            console.error("Error restarting recognition:", error);
          }
        } else if (journalText.trim()) {
          console.log("Processing final transcript:", journalText);
          await processJournalEntry(journalText);
        }
      };

      recognition.start();
      setRecordingType(type);
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Error accessing media devices. Please ensure you have granted the necessary permissions.');
    }
  };

  const stopRecording = async () => {
    console.log("Stopping recording...");
    setIsRecording(false);

    // Stop speech recognition
    if (recognitionRef.current) {
      console.log("Stopping speech recognition");
      recognitionRef.current.stop();
    }

    // Stop video stream if it exists
    if (streamRef.current) {
      console.log("Stopping video stream");
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    // Process the journal entry if we have text
    if (journalText.trim()) {
      console.log("Processing journal text:", journalText);
      await processJournalEntry(journalText);
    } else {
      console.log("No journal text to process");
    }
  };

  const processJournalEntry = async (text) => {
    if (!text.trim()) {
      console.log("No text to process");
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Starting journal processing...');
      console.log('Text to process:', text);

      const response = await fetch('/api/process-journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      console.log('Response status:', response.status);
      const responseText = await response.text(); // Get raw response text
      console.log('Raw response text:', responseText);
      
      if (!response.ok) {
        throw new Error(`Failed to get suggestions: ${responseText}`);
      }

      const data = JSON.parse(responseText); // Parse the response text
      console.log('Parsed response data:', data);

      if (!data.suggestions) {
        throw new Error('No suggestions in response');
      }

      const parsedSuggestions = JSON.parse(data.suggestions);
      console.log('Parsed suggestions:', parsedSuggestions);
      console.log('Corrected text:', parsedSuggestions.corrected);

      setSuggestions(parsedSuggestions);
    } catch (error) {
      console.error('Error in processJournalEntry:', error);
      alert(`Error processing journal: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Add this helper function to highlight differences
  const HighlightedText = ({ original, corrected }) => {
    const changes = suggestions.changes || [];
    let highlightedText = corrected;

    // Replace each change with a highlighted version
    changes.forEach(change => {
      highlightedText = highlightedText.replace(
        change.corrected,
        `<span class="highlighted-correction" title="${change.explanation}">${change.corrected}</span>`
      );
    });

    return <div dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  return (
    <div className="journal-entry">
      <h2>Journal Entry</h2>
      
      {!isRecording && !isProcessing && (
        <div className="recording-options">
          <button onClick={() => startRecording('video')}>
            Record Video Journal
          </button>
          <button onClick={() => startRecording('audio')}>
            Record Audio Journal
          </button>
        </div>
      )}

      {recordingType === 'video' && (
        <video
          ref={videoRef}
          autoPlay
          muted
          className={isRecording ? 'recording' : 'hidden'}
        />
      )}

      {isRecording && (
        <div className="recording-controls">
          <div className="recording-indicator">Recording...</div>
          <button onClick={stopRecording}>Stop Recording</button>
        </div>
      )}

      <div className="journal-content">
        <div className="text-box">
          <h3>Original Text</h3>
          <div className="text-content">
            {journalText || "Your speech will appear here..."}
          </div>
        </div>

        <div className="text-box">
          <h3>Corrected Text</h3>
          <div className="text-content">
            {isProcessing ? (
              <div className="processing">Processing your journal...</div>
            ) : suggestions ? (
              <div>
                <HighlightedText 
                  original={suggestions.original} 
                  corrected={suggestions.corrected} 
                />
                {suggestions.changes && suggestions.changes.length > 0 && (
                  <div className="changes-explanation">
                    <h4>Changes Explained:</h4>
                    <ul>
                      {suggestions.changes.map((change, index) => (
                        <li key={index}>
                          <span className="change-original">{change.original}</span>
                          {" → "}
                          <span className="change-corrected">{change.corrected}</span>
                          <br />
                          <span className="change-explanation">{change.explanation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              "Corrections will appear here..."
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalEntry; 