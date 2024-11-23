import axios from "axios";
import { useState } from "react";

const useChatGPT = () => {
  const [reply, setReply] = useState("");

  const sendToChatGPT = async (message) => {
    try {
      const response = await axios.post("http://127.0.0.1:5000/chat", {
        message,
      });
      setReply(response.data.reply);
      return response.data.reply;
    } catch (error) {
      console.error("Error with ChatGPT interaction:", error);
      throw error;
    }
  };

  return { reply, sendToChatGPT };
};

export default useChatGPT;
