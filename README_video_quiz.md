# Video Quiz Generator

A Python program that uses the Google Gemini API to analyze videos and generate summaries and quizzes.

## Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Or install directly:

```bash
pip install google-genai python-dotenv
```

### 2. Get Your Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" or use an existing one
4. Copy your API key

### 3. Set Your API Key

The script will automatically look for the API key in this order:
1. `.env` file (if it exists in the same directory)
2. System environment variables
3. Hardcoded value in the script

**Option A: Using .env File (Recommended and Easiest)**

Create a `.env` file in the same directory as the script and add:

```
GOOGLE_GEMINI_API_KEY=your-api-key-here
```

The script will automatically load this file when it runs (no need to set environment variables manually).

**Option B: System Environment Variable**

Windows PowerShell:
```powershell
$env:GOOGLE_GEMINI_API_KEY='your-api-key-here'
```

Windows CMD:
```cmd
set GOOGLE_GEMINI_API_KEY=your-api-key-here
```

Linux/Mac:
```bash
export GOOGLE_GEMINI_API_KEY='your-api-key-here'
```

**Option C: Edit the Script Directly**

Open `video_quiz_generator.py` and uncomment/update the API key on line 23.

### 4. Update Video Path

Edit `video_quiz_generator.py` and update the `VIDEO_PATH` variable (line 14) with the path to your video file:

```python
VIDEO_PATH = r"C:\path\to\your\video.mp4"
```

## Usage

Run the script:

```bash
python video_quiz_generator.py
```

The program will:
1. Upload your video file to Google Gemini
2. Generate a summary of the video content
3. Create a quiz with an answer key based on the video
4. Display the results and save them to a text file

## Output

The output will be displayed in the console and saved to a text file in the same directory as your video, with the format: `[video_name]_quiz.txt`

## Requirements

- Python 3.7 or higher
- `google-genai` package
- `python-dotenv` package (for .env file support)
- Valid Google Gemini API key with video processing enabled
- Supported video formats: MP4, MOV, AVI, etc.

## Notes

- Video processing may take several minutes depending on video length
- Large video files may take longer to upload
- Make sure you have sufficient API quota for video processing
- The `gemini-2.5-flash` model is used by default for faster processing