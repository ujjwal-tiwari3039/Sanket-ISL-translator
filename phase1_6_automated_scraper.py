import os
import time
import subprocess
from bs4 import BeautifulSoup

try:
    from DrissionPage import ChromiumPage, ChromiumOptions
except ImportError:
    print("Please install DrissionPage: pip install DrissionPage")
    exit()

def download_video(url, output_path):
    print(f"Downloading video from {url}...")
    command = ["yt-dlp", "-f", "best", "-o", output_path, url]
    subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Saved to {output_path}")

def scrape_isl(word, download_dir="Raw_Videos"):
    os.makedirs(download_dir, exist_ok=True)
    print(f"\n[{word}] Starting scraper...")
    
    # DrissionPage directly controls the browser via CDP, bypassing webdriver bugs entirely!
    co = ChromiumOptions().set_browser_path('/opt/brave-bin/brave')
    
    try:
        page = ChromiumPage(co)
    except Exception as e:
        print(f"Failed to launch browser: {e}")
        return
        
    try:
        url = f"https://indiansignlanguage.org/{word.lower()}/"
        page.get(url)
        
        print(f"[{word}] Waiting for Cloudflare verification...")
        time.sleep(8) # Wait for CF Turnstile to automatically pass
        
        soup = BeautifulSoup(page.html, 'html.parser')
        video_url = None
        
        iframes = soup.find_all('iframe')
        for iframe in iframes:
            src = iframe.get('src', '')
            if 'youtube' in src or 'vimeo' in src:
                video_url = src
                break
                
        if not video_url:
            video_tags = soup.find_all('video')
            for video in video_tags:
                source = video.find('source')
                if source and source.get('src'):
                    video_url = source.get('src')
                    break
                    
        if video_url:
            print(f"[{word}] Found video source: {video_url}")
            output_file = os.path.join(download_dir, f"{word.lower()}.mp4")
            download_video(video_url, output_file)
        else:
            print(f"[{word}] Could not find a video on the page.")
            
    except Exception as e:
        print(f"[{word}] Error: {e}")
    finally:
        page.quit()

def main():
    words_to_learn = ["hello", "thanks", "apple"] 
    print("Starting Automated ISL Scraper Pipeline...")
    for word in words_to_learn:
        scrape_isl(word)
    print("\nScraping complete! Check the Raw_Videos/ folder.")

if __name__ == "__main__":
    main()
