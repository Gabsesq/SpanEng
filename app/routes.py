from flask import Blueprint, request, jsonify, send_from_directory
import os
import base64
import json
from openai import OpenAI
from google.cloud import texttospeech
from google.cloud import speech_v1p1beta1 as speech
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime

load_dotenv()

# Create the Blueprint
main = Blueprint("main", __name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Set up Google Cloud credentials
credentials_path = os.path.join(os.path.dirname(__file__), "..", "spaneng-b52a55f79d90.json")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
print(f"Using Google credentials from: {credentials_path}")

@main.route("/api/speech-to-text", methods=["POST"])
def speech_to_text():
    try:
        if "audio" not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
            
        audio_data = request.files["audio"]
        client = speech.SpeechClient()

        # Read the audio file content
        content = audio_data.read()
        
        # Create the recognition audio object
        audio = speech.RecognitionAudio(content=content)
        
        # Configure the recognition settings
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,  # Changed from LINEAR16 to WEBM_OPUS
            sample_rate_hertz=48000,  # Standard sample rate for WebM
            language_code="es-ES",
            enable_automatic_punctuation=True,
        )

        try:
            response = client.recognize(config=config, audio=audio)
            
            if not response.results:
                return jsonify({"error": "No transcription results"}), 400
                
            transcription = response.results[0].alternatives[0].transcript
            return jsonify({"transcription": transcription})
            
        except Exception as e:
            print(f"Recognition error: {str(e)}")
            return jsonify({"error": f"Recognition failed: {str(e)}"}), 500

    except Exception as e:
        print(f"Speech-to-text error: {str(e)}")
        return jsonify({"error": f"Speech-to-text failed: {str(e)}"}), 500

@main.route("/api/generate-response", methods=["POST"])
def generate_response():
    try:
        print("Received request to /api/generate-response")
        data = request.get_json()
        if not data:
            print("No JSON data received")
            return jsonify({"error": "No JSON data received"}), 400
        
        user_input = data.get("text")
        if not user_input:
            print("No text field in JSON data")
            return jsonify({"error": "No text field in JSON data"}), 400

        print(f"Received input: {user_input}")
        
        # Check if API key is available
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("OpenAI API key not found in environment variables")
            return jsonify({"error": "OpenAI API key not configured"}), 500

        print("Attempting OpenAI API call...")
        # Updated OpenAI API call
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant who responds in Spanish. you ask crazy questions and keep the conversation engaging."},
                {"role": "user", "content": user_input}
            ],
            max_tokens=150,
            temperature=0.9
        )

        response_text = completion.choices[0].message.content.strip()
        print(f"OpenAI response received: {response_text}")
        return jsonify({"response": response_text})

    except Exception as e:
        print(f"Unexpected error in generate_response: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@main.route("/api/text-to-speech", methods=["POST"])
def text_to_speech():
    try:
        data = request.get_json()
        text = data["text"]
        
        print(f"Attempting TTS for text: {text}")

        # Initialize with service account
        client = texttospeech.TextToSpeechClient()

        input_text = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="es-ES",
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        print("Making TTS request to Google")
        response = client.synthesize_speech(
            input=input_text, voice=voice, audio_config=audio_config
        )
        print("Received TTS response from Google")

        # Encode the audio content in Base64
        audio_base64 = base64.b64encode(response.audio_content).decode('utf-8')
        return jsonify({"audioContent": audio_base64})

    except Exception as e:
        print(f"TTS Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Text-to-speech error: {str(e)}"}), 500

@main.route("/api/translate", methods=["POST"])
def translate():
    data = request.get_json()
    word = data["word"]

    try:
        # Updated OpenAI API call
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a translation assistant. Provide only the translation of the given Spanish word into English, without any additional context, formatting, or punctuation."},
                {"role": "user", "content": f'Translate "{word}" into English.'},
            ],
            max_tokens=10,
        )

        translation = completion.choices[0].message.content.strip()
        return jsonify({"translation": translation})
    except Exception as e:
        print(f"Translation error: {str(e)}")
        return jsonify({"error": f"Translation error: {str(e)}"}), 500

@main.route("/api/process-journal", methods=["POST"])
def process_journal():
    try:
        print("\n=== Starting Journal Processing ===")
        data = request.get_json()
        text = data.get("text")
        
        if not text:
            print("Error: No text provided")
            return jsonify({"error": "No text provided"}), 400

        print(f"Input text received: {text}")

        # Call OpenAI for grammar and improvement suggestions
        print("Calling OpenAI API...")
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": """You are a Spanish language teacher correcting a student's journal entry.
                Your task is to correct any grammar mistakes, improve word choices, and make the text sound more natural in Spanish.
                
                Rules:
                1. Always maintain the original meaning
                2. Fix any grammar errors
                3. Improve word choices to sound more natural
                4. Fix any accent marks or punctuation
                
                Return your response in this exact JSON format:
                {
                    "original": "the original text",
                    "corrected": "the corrected version with all improvements",
                    "changes": [
                        {
                            "original": "original phrase or word",
                            "corrected": "corrected phrase or word",
                            "explanation": "explanation in English of why this change was made"
                        }
                    ]
                }"""},
                {"role": "user", "content": text}
            ],
            max_tokens=500,
            temperature=0.3
        )

        suggestions = completion.choices[0].message.content.strip()
        print(f"OpenAI raw response received: {suggestions}")
        
        try:
            # First validate that it's proper JSON
            parsed_suggestions = json.loads(suggestions)
            print(f"Successfully parsed suggestions: {parsed_suggestions}")
            
            # Validate the structure
            if not isinstance(parsed_suggestions, dict):
                raise ValueError("Response is not a dictionary")
            if 'original' not in parsed_suggestions:
                raise ValueError("Missing 'original' field")
            if 'corrected' not in parsed_suggestions:
                raise ValueError("Missing 'corrected' field")
            
            # If we get here, the response is valid
            print("Validation successful, returning suggestions")
            response_data = {"suggestions": suggestions}
            print(f"Sending response: {response_data}")
            return jsonify(response_data)
            
        except Exception as e:
            print(f"Error processing OpenAI response: {str(e)}")
            formatted_response = {
                "original": text,
                "corrected": f"Error processing corrections: {str(e)}"
            }
            return jsonify({"suggestions": json.dumps(formatted_response)})

    except Exception as e:
        print(f"Unexpected error in process_journal: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Processing error: {str(e)}"}), 500

@main.route("/api/generate-worksheet", methods=["POST"])
def generate_worksheet():
    try:
        data = request.get_json()
        verb = data.get("verb")
        
        if not verb:
            return jsonify({"error": "No verb provided"}), 400

        # Get grammar explanation and worksheet from OpenAI
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": """You are a Spanish language teacher creating grammar worksheets.
                For the given verb, provide a response in this exact JSON format:
                {
                    "overview": {
                        "present": ["yo form", "tú form", "él/ella/usted form", "nosotros form", "vosotros form", "ellos/ellas/ustedes form"],
                        "preterite": [...],
                        "imperfect": [...],
                        "future": [...],
                        "conditional": [...]
                    },
                    "explanation": "Clear explanation of when and how to use this verb, with English translations and common usage patterns",
                    "exercises": [
                        {
                            "sentence": "Spanish sentence with ___ for blank",
                            "answer": "correct conjugation",
                            "tense": "which tense is being tested",
                            "explanation": "brief explanation of why this is correct"
                        },
                        // 4 more exercise objects like this
                    ]
                }"""},
                {"role": "user", "content": f"Create a grammar worksheet for the verb: {verb}"}
            ],
            max_tokens=1000,
            temperature=0.7
        )

        worksheet_data = completion.choices[0].message.content.strip()
        return jsonify({"worksheet": worksheet_data})

    except Exception as e:
        print(f"Worksheet generation error: {str(e)}")
        return jsonify({"error": f"Worksheet generation failed: {str(e)}"}), 500

@main.route("/api/generate-vocabulary", methods=["POST"])
def generate_vocabulary():
    try:
        data = request.get_json()
        topic = data.get("topic")
        is_random = data.get("isRandom", False)
        
        if is_random:
            prompt = """Generate a list of 10 random Spanish vocabulary words. 
            Include a mix of nouns, verbs, and adjectives. Format as JSON:
            {
                "words": [
                    {
                        "spanish": "word",
                        "english": "translation",
                        "type": "noun/verb/adjective",
                        "example": "example sentence in Spanish",
                        "example_translation": "example translation in English"
                    }
                ]
            }"""
        else:
            prompt = f"""Generate a list of 10 Spanish vocabulary words related to '{topic}'.
            Format as JSON:
            {{
                "topic": "{topic}",
                "words": [
                    {{
                        "spanish": "word",
                        "english": "translation",
                        "type": "noun/verb/adjective",
                        "example": "example sentence in Spanish",
                        "example_translation": "example translation in English"
                    }}
                ]
            }}"""

        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a Spanish language teacher providing vocabulary lists."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )

        vocab_data = completion.choices[0].message.content.strip()
        return jsonify({"vocabulary": vocab_data})

    except Exception as e:
        print(f"Vocabulary generation error: {str(e)}")
        return jsonify({"error": f"Vocabulary generation failed: {str(e)}"}), 500

