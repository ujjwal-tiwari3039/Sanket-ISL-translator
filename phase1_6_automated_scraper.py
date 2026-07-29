import os
import time
import subprocess
from bs4 import BeautifulSoup

# We use SeleniumBase with UC (Undetected Chromedriver) mode to bypass Cloudflare
try:
    import undetected_chromedriver as uc
except ImportError:
    print("undetected-chromedriver not installed. Please run: pip install undetected-chromedriver bs4 yt-dlp")
    exit()

def download_video(url, output_path):
    # yt-dlp is incredible at downloading from almost any video source (YouTube, Vimeo, raw MP4, etc.)
    print(f"Downloading video from {url}...")
    command = [
        "yt-dlp",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "-o", output_path,
        url
    ]
    subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Saved to {output_path}")

def scrape_isl(word, download_dir="Raw_Videos"):
    os.makedirs(download_dir, exist_ok=True)
    
    print(f"\n[{word}] Starting scraper...")
    
    # Start Stealth Browser using undetected_chromedriver directly
    options = uc.ChromeOptions()
    driver = uc.Chrome(
        driver_executable_path="/home/samash/chromedriver",
        browser_executable_path="/opt/brave-bin/brave",
        user_data_dir="/tmp/brave_scraper",
        options=options
    )
    
    try:
        url = f"https://indiansignlanguage.org/{word.lower()}/"
        driver.get(url)
        
        # 2. Wait for Cloudflare Turnstile to verify our browser
        print(f"[{word}] Waiting for Cloudflare verification...")
        time.sleep(8) # Give it 8 seconds to solve the Javascript challenge
        
        # 3. Parse the page
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # 4. Find the video link
        video_url = None
        
        # Scenario A: It's an embedded YouTube/Vimeo video
        iframes = soup.find_all('iframe')
        for iframe in iframes:
            src = iframe.get('src', '')
            if 'youtube' in src or 'vimeo' in src:
                video_url = src
                break
                
        # Scenario B: It's a raw HTML5 video tag
        if not video_url:
            video_tags = soup.find_all('video')
            for video in video_tags:
                source = video.find('source')
                if source and source.get('src'):
                    video_url = source.get('src')
                    break

        # 5. Download the video if found
        if video_url:
            print(f"[{word}] Found video source: {video_url}")
            output_file = os.path.join(download_dir, f"{word.lower()}.mp4")
            download_video(video_url, output_file)
        else:
            print(f"[{word}] Could not find a video on the page.")

    except Exception as e:
        print(f"[{word}] Error: {e}")
    finally:
        driver.quit()

def main():
    # Our vocabulary based on the ISL dictionary PDF
    words_to_learn = ["hello", "thanks", "apple"] 
    
    print("Starting Automated ISL Scraper Pipeline...")
    for word in words_to_learn:
        scrape_isl(word)
        
    print("\nScraping complete! Check the Raw_Videos/ folder.")

if __name__ == "__main__":
    main()
