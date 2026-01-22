import os
import subprocess
import argparse
from elevenlabs import ElevenLabs, VoiceSettings

# Configuration
OUTPUT_BASE = "/Users/magkos/CodingWVC/matb-web-test/src/assets/nback-sounds"
API_KEY_PATH = "/Users/magkos/CodingWVC/matb-web-test/API KEY/elevenlabs_key"
LANGUAGES = ["en", "el", "sv"]

# ElevenLabs Configuration
MODEL = "eleven_multilingual_v2" 

# Voice Configuration (Language -> ID + Settings)
VOICE_CONFIG = {
    "en": {
        "voice_id": "nPczCjzI2devNBz1zQrb",  # Brian
        "settings": {
            "stability": .8,
            "similarity_boost": 1,
            "style": 0.4,
            "use_speaker_boost": True,
            "speed": 0.1
        }
    },
    "el": {
        "voice_id": "CsiIKWiAQRGMe7qh9P9q",  # Iordanis
        "settings": {
            "stability": .9,
            "similarity_boost": 1,
            "style": 0.4,
            "use_speaker_boost": True
        }
    },
    "sv": {
        "voice_id": "oJEeOXECH9V31Oci9WHK",  # Peter
        "settings": {
            "stability": 1,
            "similarity_boost": 0.5,
            "style": 0.4,
            "use_speaker_boost": True,
            "speed": 0.7
        }
    }

}

# Phonetic Mappings for Greek
GREEK_PHONETICS = {
    "C": "Σί",
    "H": "Ήττα",
    "K": "Κάππα",
    "N": "Νί",
    "R": "άρρ",
    "W": "ντάμπλιγιου",
    "X": "Χί",
    "Y": "υψιλον"
}

# Phonetic Mappings for Swedish (to prevent hallucination on short text)
SV_PHONETICS = {
    "C": "ce",
    "H": "hå",
    "K": "kå",
    "N": "en",
    "R": "er",
    "W": "dubbel-ve",
    "X": "ex",
    "Y": "y"
}


NBACK_LETTERS = ["C", "H", "K", "N", "R", "W", "X", "Y"]

# Fetch API Key
try:
    with open(API_KEY_PATH, 'r') as f:
        api_key = f.read().strip().replace('"', '').replace("'", "").replace(".", "")
except FileNotFoundError:
    print(f"Error: API Key file not found at {API_KEY_PATH}")
    exit(1)

client = ElevenLabs(api_key=api_key)

def get_phonetic_text(letter, lang):
    """Get the text to be sent to TTS based on language and letter."""
    if lang == "el":
        val = GREEK_PHONETICS.get(letter, letter)
    elif lang == "sv":
        val = SV_PHONETICS.get(letter, letter)
        # Use a carrier phrase to stabilize short utterances
        return f"Bokstaven {val}."
    elif lang == "en":
        # Use a carrier phrase for English too
        return f"Letter {letter}."
    else:
        val = letter
    
    # Prepend a comma AND a trailing period for maximum stability on Greek (short text)
    return f", {val}."

def main():
    parser = argparse.ArgumentParser(description="Generate N-Back localized audio.")
    parser.add_argument("--test", action="store_true", help="Generate only one letter per language for testing.")
    parser.add_argument("--force", action="store_true", help="Force regeneration of all files even if they exist.")
    args = parser.parse_args()

    letters_to_gen = NBACK_LETTERS[:1] if args.test else NBACK_LETTERS

    for lang in LANGUAGES:
        lang_dir = os.path.join(OUTPUT_BASE, lang)
        os.makedirs(lang_dir, exist_ok=True)
        
        conf = VOICE_CONFIG.get(lang)
        if not conf: continue

        print(f"Processing language: {lang} (Voice ID: {conf['voice_id']})")
        
        for letter in letters_to_gen:
            output_wav = os.path.join(lang_dir, f"{letter}.wav")
            
            # Skip if already exists and not empty (unless testing or forcing)
            if not args.force and not args.test:
                if os.path.exists(output_wav) and os.path.getsize(output_wav) > 0:
                    continue

            text = get_phonetic_text(letter, lang)
            
            print(f"[{lang}] Generating {letter}.wav -> Text: {text}")
            
            try:
                audio_stream = client.text_to_speech.convert(
                    voice_id=conf['voice_id'],
                    model_id=MODEL,
                    text=text,
                    voice_settings=VoiceSettings(
                        stability=conf['settings']['stability'],
                        similarity_boost=conf['settings']['similarity_boost'],
                        style=conf['settings']['style'],
                        use_speaker_boost=conf['settings']['use_speaker_boost']
                    )
                )
                
                temp_mp3 = output_wav.replace(".wav", ".mp3")
                with open(temp_mp3, "wb") as f_out:
                    for chunk in audio_stream:
                        f_out.write(chunk)
                
                if lang in ["sv", "en"]:
                    # Trim the carrier phrase ("Bokstaven" or "Letter")
                    # We remove leading silence, then skip the first word.
                    # At speed 0.5, "Bokstaven" is roughly 0.65-0.75s, "Letter" is roughly 0.4-0.5s.
                    # We'll use a safer language-specific offset.
                    offset = 0.58 if lang == "sv" else 0.36
                    
                    subprocess.run([
                        "ffmpeg", "-y", "-i", temp_mp3, 
                        "-af", f"silenceremove=start_periods=1:start_threshold=-40dB,atrim=start={offset}",
                        "-ar", "44100", "-ac", "1", output_wav
                    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                else:
                    # Convert to WAV (mono, 44.1kHz) for Greek
                    subprocess.run(["ffmpeg", "-y", "-i", temp_mp3, "-ar", "44100", "-ac", "1", output_wav], 
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                
                os.remove(temp_mp3)
                
            except Exception as e:
                print(f"Error generating {letter} in {lang}: {e}")


    print("N-Back Audio Generation Complete.")

if __name__ == "__main__":
    main()
