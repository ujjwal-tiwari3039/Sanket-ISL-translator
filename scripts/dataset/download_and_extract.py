import os
import sys
import glob
import shutil
import zipfile
import signal
import urllib.request
import json
import subprocess
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from ml.src.data.process_include import process_video as canonical_process_video

# --- CONFIGURATION ---
DATA_PATH = 'data/include'
TEMP_ZIP = 'temp_dataset.zip'
TEMP_DIR = 'temp_videos'
PROGRESS_FILE = 'data/include/completed_zips.txt'
SEQUENCE_LENGTH = 30
API_URL = "https://zenodo.org/api/records/4010759"

os.makedirs(DATA_PATH, exist_ok=True)

# Clean up on exit or interrupt
def cleanup(signum=None, frame=None):
    print("\n[CLEANUP] Cleaning temporary download files...")
    if os.path.exists(TEMP_ZIP):
        try: os.remove(TEMP_ZIP)
        except Exception: pass
    if os.path.exists(TEMP_DIR):
        try: shutil.rmtree(TEMP_DIR, ignore_errors=True)
        except Exception: pass
    if signum is not None:
        sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def process_video(video_path, word, seq_num):
    # seq_num is retained for downloader progress messages; samples use UUIDs.
    canonical_process_video(video_path, word.split('. ', 1)[-1].strip(), DATA_PATH)
    return True

def get_completed_zips():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return set(line.strip() for line in f if line.strip())
    return set()

def mark_zip_completed(zip_name):
    with open(PROGRESS_FILE, 'a') as f:
        f.write(f"{zip_name}\n")

USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

def download_archive(dl_url, target_path, expected_size):
    # Remove any broken or small leftover file
    if os.path.exists(target_path) and os.path.getsize(target_path) < 1024 * 1024:
        try: os.remove(target_path)
        except Exception: pass

    # Pick the best available downloader (single tool per attempt to avoid hammering Zenodo)
    if shutil.which('wget'):
        try:
            print("   [INFO] Connecting to Zenodo via wget (IPv4)...")
            res = subprocess.run([
                'wget', '-4', '-c', '--timeout=45', '--tries=1',
                '--progress=bar:force',
                '--limit-rate=30M',
                f'--user-agent={USER_AGENT}',
                '-O', target_path, dl_url
            ])
            if res.returncode == 0 and os.path.exists(target_path) and os.path.getsize(target_path) > 1024 * 1024:
                return True
        except Exception as e:
            print(f"[WARN] wget attempt failed: {e}")
        return False

    elif shutil.which('curl'):
        try:
            print("   [INFO] Connecting to Zenodo via curl (IPv4)...")
            res = subprocess.run([
                'curl', '-4', '-f', '-L', '-C', '-',
                '--connect-timeout', '45',
                '--max-time', '3600',
                '-A', USER_AGENT,
                '--progress-bar',
                '-o', target_path, dl_url
            ])
            if res.returncode == 0 and os.path.exists(target_path) and os.path.getsize(target_path) > 1024 * 1024:
                return True
        except Exception as e:
            print(f"[WARN] curl attempt failed: {e}")
        return False

    else:
        print("[INFO] Attempting download with Python stream...")
        try:
            req = urllib.request.Request(dl_url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as response, open(target_path, 'wb') as out_f:
                shutil.copyfileobj(response, out_f)
            if os.path.exists(target_path) and os.path.getsize(target_path) > 1024 * 1024:
                return True
        except Exception as e:
            print(f"[WARN] Python stream attempt failed: {e}")
        return False

def main():
    json_path = 'zenodo_files.json'
    if not os.path.exists(json_path) or os.path.getsize(json_path) == 0:
        print("[INFO] Fetching INCLUDE dataset file list from Zenodo via curl...")
        subprocess.run(['curl', '-s', API_URL, '-o', json_path])

    with open(json_path, 'r') as f:
        data = json.load(f)

    # Only process .zip archives
    all_files = [f for f in data.get('files', []) if f['key'].endswith('.zip')]
    all_files.sort(key=lambda x: x['key'])

    completed = get_completed_zips()
    remaining = [f for f in all_files if f['key'] not in completed]

    print(f"[STATUS] Total zip archives: {len(all_files)}")
    print(f"[STATUS] Already completed:  {len(completed)}")
    print(f"[STATUS] Remaining to process: {len(remaining)}\n")

    if not remaining:
        print("[SUCCESS] All dataset archives have already been processed!")
        return

    import time

    for idx, file_info in enumerate(remaining, 1):
        zip_name = file_info['key']
        dl_url = file_info['links']['self']
        expected_size = file_info['size']
        size_mb = expected_size / (1024 * 1024)

        print(f"\n=======================================================")
        print(f"[{idx}/{len(remaining)}] Processing {zip_name} ({size_mb:.1f} MB)")
        print(f"=======================================================")

        # Step 1: Download and Extract with retry backoff (prevents rate limits from skipping zips)
        MAX_RETRIES = 5
        unpacked = False

        for attempt in range(1, MAX_RETRIES + 1):
            cleanup()
            print(f"-> Downloading {zip_name} (Attempt {attempt}/{MAX_RETRIES})...")
            download_ok = download_archive(dl_url, TEMP_ZIP, expected_size)

            # Check if file exists and is reasonably sized (not an error page)
            if not download_ok or not os.path.exists(TEMP_ZIP) or os.path.getsize(TEMP_ZIP) < 1024 * 1024:
                print(f"[WARN] Incomplete download for {zip_name}.")
                if os.path.exists(TEMP_ZIP):
                    try:
                        with open(TEMP_ZIP, 'r', errors='ignore') as f:
                            preview = f.read(300).strip()
                            if '<html' in preview.lower() or '403' in preview or 'rate limit' in preview.lower():
                                print(f"       Server response: Rate limited / access restricted (403 Forbidden).")
                    except Exception:
                        pass
                cleanup()
                if attempt < MAX_RETRIES:
                    wait_sec = 30 * attempt
                    print(f"-> Waiting {wait_sec}s for rate limit to clear before retrying...")
                    time.sleep(wait_sec)
                continue

            # Verify it is a genuine zip archive before extracting
            if not zipfile.is_zipfile(TEMP_ZIP):
                print(f"[ERROR] Received corrupted or non-zip file for {zip_name}.")
                cleanup()
                if attempt < MAX_RETRIES:
                    wait_sec = 20 * attempt
                    print(f"-> Waiting {wait_sec}s before retrying...")
                    time.sleep(wait_sec)
                continue

            # Step 2: Extract zip
            print(f"-> Unpacking {zip_name}...")
            os.makedirs(TEMP_DIR, exist_ok=True)
            try:
                with zipfile.ZipFile(TEMP_ZIP, 'r') as zip_ref:
                    zip_ref.extractall(TEMP_DIR)
                unpacked = True
                break
            except Exception as e:
                print(f"[ERROR] Extraction failed for {zip_name}: {e}.")
                cleanup()
                if attempt < MAX_RETRIES:
                    time.sleep(15)

        if not unpacked:
            print(f"\n[PAUSED] Zenodo is temporarily rate-limiting this network or connection timed out.")
            print(f"         Could not download {zip_name} after {MAX_RETRIES} attempts.")
            print(f"         Stopping now so no archives are skipped.")
            print(f"         Please wait a few minutes and re-run to resume.\n")
            cleanup()
            break

        # Step 3: Find all videos
        video_files = glob.glob(os.path.join(TEMP_DIR, '**', '*.MOV'), recursive=True) + \
                      glob.glob(os.path.join(TEMP_DIR, '**', '*.mp4'), recursive=True)
        video_files.sort()

        print(f"-> Found {len(video_files)} videos in {zip_name}. Extracting MediaPipe landmarks...")

        processed_count = 0
        for vid_path in video_files:
            # The parent folder name is the sign word
            word = os.path.basename(os.path.dirname(vid_path)).lower()
            if not word or word == 'temp_videos':
                continue

            word_out_path = os.path.join(DATA_PATH, word)
            seq_num = 0
            if os.path.exists(word_out_path):
                existing_seqs = [int(s) for s in os.listdir(word_out_path) if s.isdigit()]
                if existing_seqs:
                    seq_num = max(existing_seqs) + 1

            if process_video(vid_path, word, seq_num):
                processed_count += 1
                if processed_count % 10 == 0 or processed_count == len(video_files):
                    print(f"   [{processed_count}/{len(video_files)}] Processed '{word}' (seq {seq_num})")

        # Step 4: Cleanup & mark as done
        print(f"-> Successfully extracted {processed_count} video sequences from {zip_name}!")
        cleanup()
        mark_zip_completed(zip_name)

        # Brief cooldown pause so Zenodo's storage node resets before the next massive archive
        COOLDOWN = 30
        print(f"-> Pausing {COOLDOWN}s to respect Zenodo rate limits before next archive...")
        time.sleep(COOLDOWN)

    print("\n[COMPLETE] INCLUDE extraction run finished; inspect progress and failures above.")

if __name__ == '__main__':
    main()
