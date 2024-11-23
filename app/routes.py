from flask import Blueprint, request, jsonify
import os
import base64
import openai
from google.cloud import texttospeech
from google.cloud import speech_v1p1beta1 as speech

# Create the Blueprint
main = Blueprint("main", __name__)

# Set API keys
openai.api_key = os.getenv("OPENAI_API_KEY")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "C:\\Users\\gabby\\OneDrive\\Desktop\\SpanEng\\SpanEng\\spaneng-c26d4e863c99.json"

@main.route("/api/speech-to-text", methods=["POST"])
def speech_to_text():
    audio_data = request.files["audio"]
    client = speech.SpeechClient()

    audio = speech.RecognitionAudio(content=audio_data.read())
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        language_code="es-ES",
    )

    response = client.recognize(config=config, audio=audio)
    transcription = response.results[0].alternatives[0].transcript
    return jsonify({"transcription": transcription})

@main.route("/api/generate-response", methods=["POST"])
def generate_response():
    data = request.get_json()
    user_input = data["text"]

    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",  # Updated model
        messages=[
            {"role": "system", "content": "You are a helpful assistant who responds in Spanish."},
            {"role": "user", "content": user_input}
        ],
        max_tokens=150
    )

    response_text = completion.choices[0].message['content'].strip()
    return jsonify({"response": response_text})

import base64  # Add this import at the top

@main.route("/api/text-to-speech", methods=["POST"])
def text_to_speech():
    data = request.get_json()
    text = data["text"]

    client = texttospeech.TextToSpeechClient()
    input_text = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code="es-ES",
        ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    response = client.synthesize_speech(
        input=input_text, voice=voice, audio_config=audio_config
    )

    # Encode the audio content in Base64
    audio_base64 = base64.b64encode(response.audio_content).decode('utf-8')

    return jsonify({"audioContent": audio_base64})
