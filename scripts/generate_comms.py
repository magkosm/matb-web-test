import os
import subprocess
import itertools
import re
from openai import OpenAI

# Configuration
LEGACY_DIR = "/Users/magkos/CodingWVC/matb-web-test/src/assets/sounds/legacy"
OUTPUT_BASE = "/Users/magkos/CodingWVC/matb-web-test/src/assets/sounds"
API_KEY_PATH = "/Users/magkos/CodingWVC/matb-web-test/API KEY/api key"
LANGUAGES = ["en", "el", "sv"]

# OpenAI Voice configuration
VOICE = "nova"  # Options: alloy, echo, fable, onyx, nova, shimmer
MODEL = "tts-1-hd"

# macOS Voice configuration
MACOS_VOICES = {
    "el": "Melina",
    "sv": "Alva"
}

# Load API Key
with open(API_KEY_PATH, 'r') as f:
    api_key = f.read().strip().replace(".", "") # Remove trailing dot if present

client = OpenAI(api_key=api_key)

# NATO-style pronunciations for English
NATO_DIGITS = {
    "0": "zero",
    "1": "one",
    "2": "two",
    "3": "tree",
    "4": "fower",
    "5": "fife",
    "6": "six",
    "7": "seven",
    "8": "eight",
    "9": "niner"
}

OTHER_CALLOUTS = ["A 33395", "Citrus 211", "AC5171", "SK 580"]
callout_cycle = itertools.cycle(OTHER_CALLOUTS)

GREEK_PHONETICS = {
    "eesah": "Ίσα",
    "Comm": "Κομ",
    "Nav": "Ναβ",
    "Citrus": "Σίτρους",
    "AC": "Έι Σι",
    "SK": "Ές Κά",
    "A": "Άλφα"
}

def format_digits(freq_str, lang):
    digits = list(freq_str.replace("-", "").replace(".", ""))
    if lang == "el":
        # For Greek, neural voices handle digits well as symbols
        return " ".join(digits)
    elif lang == "en":
        return " ".join([NATO_DIGITS.get(d, d) for d in digits])
    else:
        return " ".join(digits)

def format_callout(callout, lang):
    import re
    parts = re.findall(r'[A-Za-z]+|\d+', callout)
    formatted_parts = []
    for part in parts:
        if part.isdigit():
            formatted_parts.append(" ".join(list(part)))
        else:
            val = part
            if part == "ESA":
                val = "eesah"
            
            if lang == "el" and val in GREEK_PHONETICS:
                formatted_parts.append(GREEK_PHONETICS[val])
            else:
                formatted_parts.append(val)
    return " ".join(formatted_parts)

def generate_text(filename, lang):
    name = filename.replace(".wav", "")
    parts = name.split("_")
    if len(parts) != 3:
        return None
    
    msg_type, radio, freq = parts
    
    # Format radio: COM1 -> COMM 1, NAV1 -> NAV 1
    radio_type = "".join(re.findall(r'[A-Za-z]+', radio))
    radio_num = "".join(re.findall(r'\d+', radio))
    
    rt = "Comm" if radio_type == "COM" else ("Nav" if radio_type == "NAV" else radio_type)
    
    if lang == "el" and rt in GREEK_PHONETICS:
        phontetic_radio = GREEK_PHONETICS[rt]
    else:
        phontetic_radio = rt

    formatted_radio = f"{phontetic_radio} {radio_num}"
    
    if msg_type == "OWN":
        callout = "ESA504"
    else:
        callout = next(callout_cycle)
    
    formatted_callout = format_callout(callout, lang)
    main_freq, sec_freq = freq.split("-")
    
    fmt_main = format_digits(main_freq, lang)
    fmt_sec = format_digits(sec_freq, lang)
    
    if lang == "en":
        # Using commas sparingly for natural pauses
        return f"{formatted_callout}, {formatted_callout}, turn your {formatted_radio} radio, to frequency, {fmt_main}, point, {fmt_sec}"
    elif lang == "el":
        # Refined Greek phrasing for better neural flow
        return f"{formatted_callout}, {formatted_callout}, ρυθμίστε το ραδιόφωνο {formatted_radio}, στη συχνότητα, {fmt_main}, κόμμα, {fmt_sec}"
    elif lang == "sv":
        # FIXED TYPO HERE: frekvens instead of Greek chars
        return f"{formatted_callout}, {formatted_callout}, ställ in din {formatted_radio}-radio, på frekvens, {fmt_main}, punkt, {fmt_sec}"
    return None

def main():
    files = sorted([f for f in os.listdir(LEGACY_DIR) if f.endswith(".wav")])
    print(f"Found {len(files)} files in legacy folder.")
    
    for lang in LANGUAGES:
        lang_dir = os.path.join(OUTPUT_BASE, lang)
        os.makedirs(lang_dir, exist_ok=True)
        print(f"Processing language: {lang}")
        
        global callout_cycle
        callout_cycle = itertools.cycle(OTHER_CALLOUTS)
        
        for f in files:
            output_wav = os.path.join(lang_dir, f)
            if os.path.exists(output_wav):
                # print(f"Skipping: {output_wav}")
                continue
            
            text = generate_text(f, lang)
            if not text:
                continue
                
            temp_mp3 = output_wav.replace(".wav", ".mp3")
            temp_aiff = output_wav.replace(".wav", ".aiff")
            
            # Print text for debugging
            print(f"[{lang}] Text: {text}")
            
            if lang == "en":
                # Use OpenAI for English
                with client.audio.speech.with_streaming_response.create(
                    model=MODEL,
                    voice=VOICE,
                    input=text
                ) as response:
                    response.stream_to_file(temp_mp3)
                
                # Convert to WAV
                with open(os.devnull, 'w') as fnull:
                    subprocess.run(["ffmpeg", "-y", "-i", temp_mp3, "-ar", "44100", "-ac", "1", output_wav], 
                                   stdout=fnull, stderr=fnull, check=True)
                os.remove(temp_mp3)
            else:
                # Use macOS 'say' for Greek and Swedish
                voice = MACOS_VOICES.get(lang)
                subprocess.run(["say", "-v", voice, "-o", temp_aiff, text], check=True)
                
                # Convert AIFF (which 'say' outputs) to WAV
                with open(os.devnull, 'w') as fnull:
                    subprocess.run(["ffmpeg", "-y", "-i", temp_aiff, "-ar", "44100", "-ac", "1", output_wav], 
                                   stdout=fnull, stderr=fnull, check=True)
                os.remove(temp_aiff)
            
            print(f"[{lang}] Generated: {f}")

    print("All files generated successfully using Hybrid TTS.")

if __name__ == "__main__":
    main()
