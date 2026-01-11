"""
Video Quiz Generator using Google Gemini API
This program uploads a video file and generates a summary and quiz based on its content.
"""

import os
import time
import json
import re
from pathlib import Path

# Try importing matplotlib for graph generation
try:
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False
    plt = None  # Set to None to avoid NameError if used elsewhere
    print("Warning: matplotlib not installed. Graph generation will be skipped.")
    print("Install with: pip install matplotlib")

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
VIDEO_PATH = r"C:\Users\benli\OneDrive - McMaster University\Pictures\Camera Roll\WIN_20260110_22_20_10_Pro.mp4"
MODEL_NAME = "gemini-2.5-flash"

# Gemini prompt for video analysis
GEMINI_PROMPT = """Please analyze this video presentation and provide detailed feedback. IMPORTANT CONTEXT: The speaker is an ESL (English as a Second Language) learner. You are an honest, direct coach who gives constructive feedback. Grade honestly - do not be overly generous with scores. The speaker needs honest assessment to improve.

Give comprehensive feedback on the quality of the presentation, including:

FEEDBACK AREAS:
- Tone: Is the speaker's tone appropriate? Is it too monotone, too energetic, or well-balanced?
- Fluency: How smooth is the speech? Are there frequent pauses, stutters, or hesitations?
- Vocabulary: Is the word choice appropriate? Is the language clear and understandable?
- Pronunciation: Are words pronounced clearly? Are there mispronunciations that affect understanding?
- Engagement: How engaging is the speaker? Are they enthusiastic, using gestures, varying their voice? Or are they mumbling, monotonous, or showing low energy?
- Confidence: What are the confidence indicators? Body language, posture, eye contact, voice clarity, and overall delivery.

Please provide this feedback as if I am the person giving the speech and you are directly talking to me as an honest coach, and give specific examples of what is good and what needs work. Be direct, specific, and actionable.  Give scores that reflect honest assessment.

Additionally, provide two data sets in JSON format (one data point for EVERY SECOND of the video):

{
  "confidenceData": [
    {"timestamp": 0, "confidence": <0-100>},
    {"timestamp": 1, "confidence": <0-100>},
    {"timestamp": 2, "confidence": <0-100>},
    ...
  ],
  "engagementData": [
    {"timestamp": 0, "engagement": <0-100>},
    {"timestamp": 1, "engagement": <0-100>},
    {"timestamp": 2, "engagement": <0-100>},
    ...
  ]
}

CONFIDENCE SCORES (0-100) should be based on:
- Body language and posture (open vs closed, upright vs slouched)
- Voice tone and clarity (clear vs mumbled, strong vs weak)
- Fluency and pace (smooth vs halting, appropriate pace vs too fast/slow)
- Overall presentation delivery (presence, composure, eye contact)

ENGAGEMENT SCORES (0-100) should be based on:
- Enthusiasm and energy level
- Voice variation and dynamics (monotone vs expressive)
- Gestures and body movement
- Audience connection (eye contact, presence)
- Overall interest level generated

SCORING GUIDELINES (BE STRICT AND HONEST):
- Grade harshly - this is an ESL learner who needs honest assessment
- Average presentations should score 70-80, but filler words, hesitation, and lack of clarity should have significant weight.
- Only truly excellent moments should score above 95 
- Mediocre delivery should score 40-55, not higher
- Remember: You are an strict coach but also encouraging - grade strictly to help the speaker improve

IMPORTANT: Create a data point for EVERY SECOND of the video (timestamp: 0, 1, 2, 3, ... up to the video duration). Both arrays should have the same number of data points corresponding to each second of the video. Be strict and honest with your scoring - this ESL learner needs realistic assessment.

Only include the JSON object in your response, formatted exactly as shown above."""


def parse_data_from_response(response_text):
    """Extract confidence and engagement data from Gemini response"""
    try:
        # Remove markdown code blocks if present
        cleaned_text = response_text
        if '```json' in cleaned_text:
            # Extract JSON from markdown code blocks
            json_match = re.search(r'```json\s*\n(.*?)\n```', cleaned_text, re.DOTALL)
            if json_match:
                cleaned_text = json_match.group(1)
        elif '```' in cleaned_text:
            json_match = re.search(r'```\s*\n(.*?)\n```', cleaned_text, re.DOTALL)
            if json_match:
                cleaned_text = json_match.group(1)
        
        # Try to find JSON object with both confidenceData and engagementData
        # First, try to find the complete JSON object by matching braces
        brace_start = cleaned_text.find('{')
        if brace_start != -1:
            brace_count = 0
            brace_end = -1
            for i in range(brace_start, len(cleaned_text)):
                if cleaned_text[i] == '{':
                    brace_count += 1
                elif cleaned_text[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        brace_end = i + 1
                        break
            
            if brace_end > brace_start:
                try:
                    json_str = cleaned_text[brace_start:brace_end]
                    data = json.loads(json_str)
                    confidence_data = data.get("confidenceData") or data.get("confidence_data")
                    engagement_data = data.get("engagementData") or data.get("engagement_data")
                    if confidence_data or engagement_data:
                        return confidence_data, engagement_data
                except json.JSONDecodeError:
                    pass
        
        # Try to find a larger JSON object that might contain both
        # Look for nested structure
        json_full_pattern = r'\{[^{}]*(?:"confidenceData"|"engagementData")[^{}]*\}'
        match = re.search(json_full_pattern, cleaned_text, re.DOTALL)
        if match:
            try:
                json_str = match.group(0)
                # Try to extend the match to include the full object
                brace_count = json_str.count('{') - json_str.count('}')
                if brace_count > 0:
                    # Try to find complete JSON by extending
                    start_pos = match.start()
                    end_pos = match.end()
                    while end_pos < len(cleaned_text) and brace_count > 0:
                        if cleaned_text[end_pos] == '{':
                            brace_count += 1
                        elif cleaned_text[end_pos] == '}':
                            brace_count -= 1
                        end_pos += 1
                    json_str = cleaned_text[start_pos:end_pos]
                
                data = json.loads(json_str)
                confidence_data = data.get("confidenceData") or data.get("confidence_data")
                engagement_data = data.get("engagementData") or data.get("engagement_data")
                if confidence_data or engagement_data:
                    return confidence_data, engagement_data
            except json.JSONDecodeError:
                pass
        
        # Fallback: try to find each array separately
        confidence_data = None
        engagement_data = None
        
        # Find confidence data
        conf_pattern = r'"confidenceData"\s*:\s*\[(.*?)\]'
        conf_match = re.search(conf_pattern, cleaned_text, re.DOTALL)
        if conf_match:
            try:
                array_str = '[' + conf_match.group(1) + ']'
                confidence_data = json.loads(array_str)
            except json.JSONDecodeError:
                pass
        
        # Find engagement data
        engag_pattern = r'"engagementData"\s*:\s*\[(.*?)\]'
        engag_match = re.search(engag_pattern, cleaned_text, re.DOTALL)
        if engag_match:
            try:
                array_str = '[' + engag_match.group(1) + ']'
                engagement_data = json.loads(array_str)
            except json.JSONDecodeError:
                pass
        
        return confidence_data, engagement_data
    except Exception as e:
        print(f"Error parsing data from response: {e}")
        return None, None


def generate_confidence_graph(confidence_data, output_path):
    """Generate a graph of presentation confidence over time"""
    if not confidence_data:
        return
    
    # Extract timestamps and confidence scores
    timestamps = [point["timestamp"] for point in confidence_data]
    confidences = [point["confidence"] for point in confidence_data]
    
    # Sort by timestamp to ensure proper ordering
    sorted_data = sorted(zip(timestamps, confidences), key=lambda x: x[0])
    timestamps, confidences = zip(*sorted_data)
    
    # Create the graph
    plt.figure(figsize=(12, 6))
    plt.plot(timestamps, confidences, marker='o', linewidth=2, markersize=4, color='#3b82f6', alpha=0.7)
    plt.fill_between(timestamps, confidences, alpha=0.3, color='#3b82f6')
    
    plt.xlabel('Time (seconds)', fontsize=12, fontweight='bold')
    plt.ylabel('Confidence Score (0-100)', fontsize=12, fontweight='bold')
    plt.title('Presentation Confidence Over Time', fontsize=14, fontweight='bold', pad=20)
    plt.grid(True, alpha=0.3, linestyle='--')
    plt.ylim(0, 100)
    if len(timestamps) > 0:
        plt.xlim(min(timestamps) - 1, max(timestamps) + 1)
    
    # Add horizontal reference lines
    plt.axhline(y=50, color='gray', linestyle='--', alpha=0.5, linewidth=1)
    plt.axhline(y=75, color='green', linestyle='--', alpha=0.3, linewidth=1)
    
    # Add labels for reference lines
    if len(timestamps) > 0:
        plt.text(max(timestamps) + 0.5, 50, 'Baseline', fontsize=9, alpha=0.7, verticalalignment='center')
        plt.text(max(timestamps) + 0.5, 75, 'Good', fontsize=9, alpha=0.7, color='green', verticalalignment='center')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Confidence graph generated with {len(confidence_data)} data points")


def generate_engagement_graph(engagement_data, output_path):
    """Generate a graph of presentation engagement over time"""
    if not engagement_data:
        return
    
    # Extract timestamps and engagement scores
    timestamps = [point["timestamp"] for point in engagement_data]
    engagements = [point["engagement"] for point in engagement_data]
    
    # Sort by timestamp to ensure proper ordering
    sorted_data = sorted(zip(timestamps, engagements), key=lambda x: x[0])
    timestamps, engagements = zip(*sorted_data)
    
    # Create the graph
    plt.figure(figsize=(12, 6))
    plt.plot(timestamps, engagements, marker='o', linewidth=2, markersize=4, color='#10b981', alpha=0.7)
    plt.fill_between(timestamps, engagements, alpha=0.3, color='#10b981')
    
    plt.xlabel('Time (seconds)', fontsize=12, fontweight='bold')
    plt.ylabel('Engagement Score (0-100)', fontsize=12, fontweight='bold')
    plt.title('Presentation Engagement Over Time', fontsize=14, fontweight='bold', pad=20)
    plt.grid(True, alpha=0.3, linestyle='--')
    plt.ylim(0, 100)
    if len(timestamps) > 0:
        plt.xlim(min(timestamps) - 1, max(timestamps) + 1)
    
    # Add horizontal reference lines
    plt.axhline(y=50, color='gray', linestyle='--', alpha=0.5, linewidth=1)
    plt.axhline(y=75, color='green', linestyle='--', alpha=0.3, linewidth=1)
    
    # Add labels for reference lines
    if len(timestamps) > 0:
        plt.text(max(timestamps) + 0.5, 50, 'Baseline', fontsize=9, alpha=0.7, verticalalignment='center')
        plt.text(max(timestamps) + 0.5, 75, 'Good', fontsize=9, alpha=0.7, color='green', verticalalignment='center')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Engagement graph generated with {len(engagement_data)} data points")


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
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[myfile, GEMINI_PROMPT]
        )
        
        response_text = response.text
        
        print("=" * 80)
        print("VIDEO SUMMARY AND QUIZ")
        print("=" * 80)
        print("\n" + response_text)
        print("=" * 80)
        
        # Parse confidence and engagement data from response
        confidence_data, engagement_data = parse_data_from_response(response_text)
        
        # Generate graphs if data is available and matplotlib is installed
        if HAS_MATPLOTLIB:
            # Generate confidence graph
            if confidence_data:
                confidence_graph_path = video_path.parent / f"{video_path.stem}_confidence_graph.png"
                generate_confidence_graph(confidence_data, confidence_graph_path)
                print(f"\n✓ Confidence graph saved to: {confidence_graph_path}")
            else:
                print("\nWarning: Could not extract confidence data from response")
            
            # Generate engagement graph
            if engagement_data:
                engagement_graph_path = video_path.parent / f"{video_path.stem}_engagement_graph.png"
                generate_engagement_graph(engagement_data, engagement_graph_path)
                print(f"✓ Engagement graph saved to: {engagement_graph_path}")
            else:
                print("\nWarning: Could not extract engagement data from response")
        else:
            if confidence_data or engagement_data:
                print("\nWarning: Could not generate graphs - matplotlib not installed")
            else:
                print("\nWarning: Could not extract data from response")
        
        # Save output to a file
        output_file = video_path.parent / f"{video_path.stem}_quiz.txt"
        try:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write("VIDEO SUMMARY AND QUIZ\n")
                f.write("=" * 80 + "\n\n")
                f.write(f"Source Video: {video_path.name}\n")
                f.write(f"File Path: {video_path}\n\n")
                f.write(response_text)
            
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