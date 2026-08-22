import os
import subprocess

def download_video_from_youtube(word, output_path):
    print(f"[{word}] Searching YouTube for ISL video...")
    
    # We use yt-dlp's built-in search feature to grab the first video result for "Indian Sign Language {word}"
    search_query = f"ytsearch1:Indian Sign Language {word}"
    
    # -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" ensures we get mp4 if possible
    # --force-overwrites prevents errors if file exists
    command = [
        "yt-dlp", 
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "-o", output_path,
        search_query
    ]
    
    # Run the yt-dlp command
    result = subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    if result.returncode == 0:
        print(f"[{word}] Success! Downloaded video to {output_path}")
    else:
        print(f"[{word}] Failed to download video. It might not exist.")

def scrape_isl(word, download_dir="Raw_Videos"):
    os.makedirs(download_dir, exist_ok=True)
    
    output_file = os.path.join(download_dir, f"{word.lower()}.mp4")
    download_video_from_youtube(word, output_file)

def main():
    # Extracted vocabulary from the NIOS Indian Sign Language 230 PDF
    words_to_learn = [
        "sleep", "time", "late", "good", "easy", "sister", 
        "brother", "water", "walk", "teach", "apple", "snake", 
        "laptop", "tree", "hello", "thanks"
    ] 
    
    print("Starting Automated ISL Video Downloader...")
    print("Bypassing Cloudflare completely by pulling directly from YouTube ISL archives!\n")
    
    for word in words_to_learn:
        scrape_isl(word)
        
    print("\nScraping complete! Check the Raw_Videos/ folder.")

if __name__ == "__main__":
    main()
