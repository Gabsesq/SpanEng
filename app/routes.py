from flask import Blueprint, request, jsonify
import openai
from google.cloud import speech, texttospeech
import os
import tempfile
from dotenv import load_dotenv
from flask import Blueprint, request, jsonify, send_file


main = Blueprint('main', __name__)

# Initialize OpenAI API key
load_dotenv() 
openai.api_key = os.getenv("OPENAI_API_KEY")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "C:\\Users\\gabby\\OneDrive\\Desktop\\SpanEng\\SpanEng\\spaneng-c26d4e863c99.json"

# Speech-to-Text function
def transcribe_audio(audio_path):
    client = speech.SpeechClient()
    with open(audio_path, "rb") as audio_file:
        audio = speech.RecognitionAudio(content=audio_file.read())
    config = speech.RecognitionConfig(language_code="es-ES")

    response = client.recognize(config=config, audio=audio)
    return " ".join(result.alternatives[0].transcript for result in response.results)


def synthesize_text(text, output_path=None):
    if output_path is None:
        # Save the file in the 'app' folder
        app_folder = os.path.dirname(os.path.abspath(__file__))  # Path to the current file (routes.py)
        output_path = os.path.join(app_folder, "output.mp3")
    print(f"Generating audio at: {output_path}")

    client = texttospeech.TextToSpeechClient()

    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code="es-ES",
        ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
    )
    audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)

    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )

    with open(output_path, "wb") as out:
        out.write(response.audio_content)
    print(f"Audio content successfully written to {output_path}")

def chat_with_gpt(prompt):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",  # Use this model instead of gpt-4
        messages=[
            {"role": "system", "content": "You are a Spanish-speaking assistant."},
            {"role": "user", "content": prompt}
        ]
    )
    return response['choices'][0]['message']['content']


@main.route('/')
def home():
    return jsonify({"message": "Welcome to the API!"})

# Route: Speech-to-Text
@main.route('/process-audio', methods=['POST'])
def process_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400

    audio_file = request.files['audio']

    # Save the audio file temporarily
    with tempfile.NamedTemporaryFile(delete=True) as temp_audio:
        audio_file.save(temp_audio.name)
        temp_audio.flush()

        # Transcribe the audio
        try:
            transcript = transcribe_audio(temp_audio.name)
            return jsonify({"transcript": transcript})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# Route: Chat with GPT
@main.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    print("Incoming request:", data)  # Log incoming request

    if not data or 'message' not in data:
        return jsonify({"error": "No message provided"}), 400

    user_message = data['message']
    print("User message:", user_message)  # Log the user message

    try:
        response = chat_with_gpt(user_message)
        print("GPT response:", response)  # Log the GPT response
        return jsonify({"reply": response})
    except Exception as e:
        print("Error during GPT processing:", e)  # Log any errors
        return jsonify({"error": str(e)}), 500

@main.route('/synthesize', methods=['POST'])
def synthesize():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data['text']

    try:
        # Synthesize text to speech
        client = texttospeech.TextToSpeechClient()

        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="es-ES",
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )
        audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)

        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )

        # Return the audio content directly
        return response.audio_content, 200, {'Content-Type': 'audio/mpeg'}
    except Exception as e:
        print("Error in /synthesize route:", e)
        return jsonify({"error": str(e)}), 500
