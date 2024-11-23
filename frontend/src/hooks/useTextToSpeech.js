import axios from "axios";

/**
 * Hook to handle text-to-speech functionality.
 */
const useTextToSpeech = () => {
  /**
   * Converts the provided text to speech by interacting with the backend
   * and plays the generated audio.
   *
   * @param {string} text - The text to convert to speech.
   */
  const convertToSpeech = async (text) => {
    try {
      // Make a POST request to the backend synthesize endpoint
      const response = await axios.post(
        "http://127.0.0.1:5000/synthesize",
        { text }, // Pass the text as the payload
        { responseType: "arraybuffer" } // Expect binary audio data
      );

      // Create a Blob from the audio data
      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });

      // Generate a URL for the Blob
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play the audio
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error("Error with Text-to-Speech:", error);
      throw error; // Re-throw error for calling component to handle
    }
  };

  return { convertToSpeech };
};

export default useTextToSpeech;
