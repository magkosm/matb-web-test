import os
import subprocess

def convert_wav_to_m4a(directory):
    """
    Converts all .wav files in the specified directory to .m4a format using ffmpeg.
    The .m4a files are saved in the same directory.
    """
    if not os.path.exists(directory):
        print(f"Directory not found: {directory}")
        return

    files = [f for f in os.listdir(directory) if f.lower().endswith('.wav')]
    if not files:
        print(f"No .wav files found in {directory}")
        return

    print(f"Found {len(files)} .wav files in {directory}. Starting conversion...")

    for filename in files:
        wav_path = os.path.join(directory, filename)
        m4a_filename = os.path.splitext(filename)[0] + '.m4a'
        m4a_path = os.path.join(directory, m4a_filename)

        # Check if m4a already exists to avoid re-converting if run multiple times
        if os.path.exists(m4a_path):
             print(f"Skipping {filename}, {m4a_filename} already exists.")
             continue

        print(f"Converting {filename} to {m4a_filename}...")
        
        try:
            # -y overwrites output file if it exists
            # -i input file
            # -c:a aac sets audio codec to AAC (standard for m4a)
            # -b:a 192k sets bitrate to 192k (high quality)
            command = ['ffmpeg', '-y', '-i', wav_path, '-c:a', 'aac', '-b:a', '192k', m4a_path]
            
            # Run ffmpeg command, suppressing output unless there's an error
            subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            
        except subprocess.CalledProcessError as e:
            print(f"Error converting {filename}: {e.stderr.decode()}")
        except Exception as e:
            print(f"An unexpected error occurred for {filename}: {e}")

    print("Conversion complete.")

if __name__ == "__main__":
    target_directory = "src/assets/sounds/en"
    convert_wav_to_m4a(target_directory)
