"""
Video Quiz Generator using Google Gemini API
This program uploads a video file and generates a summary and quiz based on its content.
"""

import os
import time
from pathlib import Path

# Try importing python-dotenv to load .env files
try:
    from dotenv import load_dotenv
    # Load environment variables from .env file if it exists
    load_dotenv()
except ImportError:
    # If python-dotenv is not installed, we'll just use system environment variables
    pass

# Try importing the google-genai package
try:
    from google import genai
except ImportError:
    print("Error: google-genai package not installed!")
    print("Please install it using: pip install google-genai")
    exit(1)

# Configuration
# Check for API key in environment variables (common names) or use hardcoded key
# Now supports .env files via python-dotenv
GOOGLE_API_KEY = os.getenv("GOOGLE_GEMINI_API_KEY") or os.getenv("GOOGLE_GEMINI_API_KEY") or os.getenv("GOOGLE_GEMINI_API_KEY") or ""

# If not set via environment variable, uncomment and set below:
# GOOGLE_API_KEY = "your-api-key-here"
# Update this path to your video file
VIDEO_PATH = r"C:\Users\benli\OneDrive - McMaster University\Pictures\Camera Roll\WIN_20260110_17_26_37_Pro.mp4"
MODEL_NAME = "gemini-2.5-flash"


def main():
    """Main function to process video and generate quiz"""
    # Check if API key is set
    if not GOOGLE_API_KEY:
        print("Error: API key not found!")
        print("Please set one of these environment variables:")
        print("  - GOOGLE_GEMINI_API_KEY (recommended)")
        print("  - GEMINI_API_KEY")
        print("  - GOOGLE_API_KEY")
        print("\nTo set as environment variable:")
        print("  Windows PowerShell: $env:GOOGLE_GEMINI_API_KEY='your-key-here'")
        print("  Windows CMD: set GOOGLE_GEMINI_API_KEY=your-key-here")
        print("  Linux/Mac: export GOOGLE_GEMINI_API_KEY='your-key-here'")
        print("\nGet your API key from: https://aistudio.google.com/app/apikey")
        return
    
    # Check if video file exists
    video_path = Path(VIDEO_PATH)
    if not video_path.exists():
        print(f"Error: Video file not found at: {VIDEO_PATH}")
        print("Please update VIDEO_PATH in the script to point to your video file.")
        return
    
    
    print("Initializing Gemini API client...")
    
    # Set environment variable so Client() can read it automatically
    # The genai.Client() reads from environment variables automatically
    os.environ['GOOGLE_GEMINI_API_KEY'] = GOOGLE_API_KEY
    os.environ['GEMINI_API_KEY'] = GOOGLE_API_KEY  # Some versions use this name
    os.environ['GOOGLE_API_KEY'] = GOOGLE_API_KEY  # Alternative name
    
    # Initialize client - try different initialization methods
    try:
        # Try with explicit API key parameter if supported
        client = genai.Client(api_key=GOOGLE_API_KEY)
    except (TypeError, AttributeError):
        # Fall back to reading from environment variable
        client = genai.Client()
    
    try:
        print(f"Uploading video file: {video_path.name}...")
        print(f"File size: {video_path.stat().st_size / (1024*1024):.2f} MB")
        print("This may take a moment depending on file size...")
        
        # Upload the video file
        myfile = client.files.upload(file=str(video_path))
        
        print(f"✓ File uploaded successfully!")
        print(f"  File URI: {myfile.uri}")
        print("Waiting for video processing to complete...")
        print("(This may take several minutes depending on video length)")
        
        # Poll until the file is processed and ready (ACTIVE state)
        max_wait_time = 600  # Maximum wait time in seconds (10 minutes)
        wait_time = 0
        
        # Check file state - handle different possible state representations
        def get_file_state(file_obj):
            """Get file state as string, handling different API response formats"""
            if hasattr(file_obj, 'state'):
                if hasattr(file_obj.state, 'name'):
                    return file_obj.state.name
                elif isinstance(file_obj.state, str):
                    return file_obj.state
            return "UNKNOWN"
        
        current_state = get_file_state(myfile)
        while current_state != "ACTIVE":
            if wait_time >= max_wait_time:
                print(f"\nError: Video processing took too long (max {max_wait_time}s). Current state: {current_state}")
                return
            
            if current_state not in ["ACTIVE", "PROCESSING"]:
                print(f"  Warning: Unexpected file state: {current_state}")
            
            print(f"  Processing... (state: {current_state}, waited: {wait_time}s)")
            time.sleep(5)  # Wait 5 seconds between checks
            wait_time += 5
            
            try:
                # Refresh file status
                myfile = client.files.get(name=myfile.name)
                current_state = get_file_state(myfile)
            except Exception as state_error:
                print(f"  Error checking file state: {state_error}")
                time.sleep(5)
                continue
        
        print(f"✓ Video processing complete! (state: ACTIVE)")
        print("\nGenerating summary and quiz...\n")
        
        # Generate content with the uploaded video and prompt
        # Using the format from your original code
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[myfile, "Summarize this video. Then give detailed feedback on the quality of the presentation. Give feedback on tone, fluency, vocabulary, and pronunciation. Highlight moments of confidence and moments of nervousness that could be improved."]
        )
        
        print("=" * 80)
        print("VIDEO SUMMARY AND QUIZ")
        print("=" * 80)
        print("\n" + response.text)
        print("=" * 80)
        
        # Save output to a file
        output_file = video_path.parent / f"{video_path.stem}_quiz.txt"
        try:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write("VIDEO SUMMARY AND QUIZ\n")
                f.write("=" * 80 + "\n\n")
                f.write(f"Source Video: {video_path.name}\n")
                f.write(f"File Path: {video_path}\n\n")
                f.write(response.text)
            
            print(f"\n✓ Output saved to: {output_file}")
        except Exception as save_error:
            print(f"\nWarning: Could not save output to file: {save_error}")
        
    except Exception as e:
        print(f"\nError occurred: {str(e)}")
        print("\nCommon issues:")
        print("1. Make sure your API key is valid and has video processing enabled")
        print("2. Ensure you have sufficient API quota")
        print("3. Check that the video file format is supported (MP4, MOV, AVI, etc.)")
        print("4. Verify the file is not corrupted")
        print("5. Check your internet connection")
        import traceback
        traceback.print_exc()
        return


if __name__ == "__main__":
    main()