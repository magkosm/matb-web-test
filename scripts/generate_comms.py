import os
import subprocess
import itertools
import re
import argparse
from elevenlabs import ElevenLabs, VoiceSettings

# Configuration
LEGACY_DIR = "/Users/magkos/CodingWVC/matb-web-test/src/assets/sounds/legacy"
OUTPUT_BASE = "/Users/magkos/CodingWVC/matb-web-test/src/assets/sounds"
API_KEY_PATH = "/Users/magkos/CodingWVC/matb-web-test/API KEY/elevenlabs_key"
LANGUAGES = ["en", "el", "sv"]

# ElevenLabs Configuration
MODEL = "eleven_multilingual_v2" 

# Voice Configuration (Language -> ID + Settings)
VOICE_CONFIG = {
    "en": {
        "voice_id": "nPczCjzI2devNBz1zQrb",  # Brian - Deep, Resonant
        "settings": {
            "stability": .9,
            "similarity_boost": 0.6,
            "style": 0.4,
            "use_speaker_boost": True,
            "speed": 1.4,
            "language": "en_US"
        }
    },
    "el": {
        "voice_id": "CsiIKWiAQRGMe7qh9P9q",  # Iordanis - Warm, Captivating
        "settings": {
            "stability": .9,
            "similarity_boost": 0.6,
            "style": 0.4,
            "use_speaker_boost": True,
            "speed": 1.0,
            "language": "el_GR"
        }
    },
    "sv": {
        "voice_id": "a2RZfOPKpyNO38vDv3DD",  # Annie - Deep and Serious
        "settings": {
            "stability": .9,
            "similarity_boost": 0.8,
            "style": 0.4,
            "use_speaker_boost": True,
            "speed": 1.0,
            "language": "sv_SE"
        }
    }
}

DIGIT_WORDS = {
    "en": ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
    "el": ["μηδέν", "ένα", "δύο", "τρία", "τέσσερα", "πέντε", "έξι", "επτά", "οκτώ", "εννέα"],
    "sv": ["noll", "ett", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio"]
}

# Fetch API Key
try:
    with open(API_KEY_PATH, 'r') as f:
        api_key = f.read().strip().replace('"', '').replace("'", "").replace(".", "")
except FileNotFoundError:
    print(f"Error: API Key file not found at {API_KEY_PATH}")
    exit(1)

client = ElevenLabs(api_key=api_key)

OTHER_CALLOUTS = ["A 33395", "Citrus 211", "AC5171", "SK 580"]
callout_cycle = itertools.cycle(OTHER_CALLOUTS)

def format_digits(freq_str, lang):
    """Format frequency digits for natural reading with words."""
    digits = freq_str.replace("-", "").replace(".", "")
    words = []
    for d in digits:
        if d.isdigit():
            words.append(DIGIT_WORDS[lang][int(d)])
        else:
            words.append(d)
    return " ".join(words)

def format_callout(callout, lang):
    """Format callouts for natural reading with language-specific phonetics."""
    parts = re.findall(r'[A-Za-z]+|\d+', callout)
    formatted_parts = []
    for part in parts:
        if part.isdigit():
            # Convert digits to words
            digit_words = [DIGIT_WORDS[lang][int(d)] for d in part]
            formatted_parts.append(" ".join(digit_words))
        else:
            val = part
            if part == "ESA":
                if lang == "en":
                    val = "eeza"
                elif lang == "el":
                    val = "ίσα"
                elif lang == "sv":
                    val = "isa"
            elif part == "A":
                if lang == "el":
                    val = " άλφα"
                elif lang == "sv" or lang == "en":
                    val = "(A)"
            elif len(part) == 1 and (lang == "en" or lang == "sv"):
                val = f"({part})"
            formatted_parts.append(val)
    return " ".join(formatted_parts)

def generate_text(filename, lang):
    name = filename.replace(".wav", "")
    parts = name.split("_")
    if len(parts) != 3: return None
    
    msg_type, radio, freq = parts
    radio_type = "".join(re.findall(r'[A-Za-z]+', radio))
    radio_num = "".join(re.findall(r'\d+', radio))
    
    # Translate radio type
    if lang == "el":
        rt = "κομ" if radio_type == "COM" else ("Nav" if radio_type == "NAV" else radio_type)
    else:
        rt = "Comm" if radio_type == "COM" else ("Nav" if radio_type == "NAV" else radio_type)

    # Translate radio number to word
    if radio_num.isdigit():
        rn = DIGIT_WORDS[lang][int(radio_num)]
    else:
        rn = radio_num

    # Add comma after radio number in Greek
    if lang == "el":
        rn = f"{rn},"

    # Join radio type and number (space for EN/EL, hyphen for SV)
    if lang == "sv":
        formatted_radio = f"{rt}-{rn}"
    else:
        formatted_radio = f"{rt} {rn}"
    
    callout = "ESA504" if msg_type == "OWN" else next(callout_cycle)
    formatted_callout = format_callout(callout, lang)
    
    main_freq, sec_freq = freq.split("-")
    fmt_main = format_digits(main_freq, lang)
    fmt_sec = format_digits(sec_freq, lang)
    
    # Use a leading ellipsis for a pause and add a final period.
    if lang == "en":
        return f"... {formatted_callout}, {formatted_callout}, turn your {formatted_radio} radio to frequency {fmt_main} point {fmt_sec}."
    elif lang == "el":
        return f"... {formatted_callout}, {formatted_callout}, γυρίστε το ράδιο {formatted_radio} στη συχνότητα {fmt_main} τελεία {fmt_sec}."
    elif lang == "sv":
        return f"... {formatted_callout}, {formatted_callout}, ställ in din {formatted_radio} radio på frekvens {fmt_main} punkt {fmt_sec}."
    return None

def list_available_voices():
    print("\n--- Available ElevenLabs Voices ---")
    voices = client.voices.get_all().voices
    for v in voices:
        print(f"Name: {v.name:30} | ID: {v.voice_id}")
    print("-----------------------------------\n")

def main():
    parser = argparse.ArgumentParser(description="Generate MATB communication audio.")
    parser.add_argument("--test", action="store_true", help="Generate only 2 files per language for testing.")
    parser.add_argument("--list-voices", action="store_true", help="List all available ElevenLabs voices and exit.")
    args = parser.parse_args()

    if args.list_voices:
        list_available_voices()
        return

    files = sorted([f for f in os.listdir(LEGACY_DIR) if f.endswith(".wav")])
    if args.test:
        files = [f for f in files if "OWN" in f][:1] + [f for f in files if "OTHER" in f][:1]
        print(f"Test Mode: generating {len(files)} files per language.")

    for lang in LANGUAGES:
        lang_dir = os.path.join(OUTPUT_BASE, lang)
        os.makedirs(lang_dir, exist_ok=True)
        
        global callout_cycle
        callout_cycle = itertools.cycle(OTHER_CALLOUTS)
        
        transcripts = []
        conf = VOICE_CONFIG.get(lang)
        if not conf: continue

        print(f"Processing language: {lang} (Voice ID: {conf['voice_id']})")
        
        for f in files:
            output_wav = os.path.join(lang_dir, f)
            text = generate_text(f, lang)
            if not text: continue
            
            transcripts.append(f"{f}: {text}")
            
            if os.path.exists(output_wav) and os.path.getsize(output_wav) > 0 and not args.test:
                continue
                
            print(f"[{lang}] Generating {f}")
            print(f"      Text: {text}")
            
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
                
                subprocess.run(["ffmpeg", "-y", "-i", temp_mp3, "-ar", "44100", "-ac", "1", output_wav], 
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                os.remove(temp_mp3)
                
            except Exception as e:
                print(f"Error generating {f}: {e}")

        if not args.test:
            with open(os.path.join(lang_dir, "transcript.txt"), "w", encoding="utf-8") as tf:
                tf.write("\n".join(transcripts))

    print("Generation Complete.")

if __name__ == "__main__":
    main()
