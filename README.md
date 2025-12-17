<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1EYrWfgpGnG1nJJ25LjP4JzXY1tntt2it

## Run Locally

**Prerequisites:**  Node.js

### Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Key (Required):**
   
   Create a `.env.local` file from the example:
   ```bash
   cp .env.example .env.local
   ```
   
   Set your Gemini API key in `.env.local`:
   ```bash
   API_KEY=your_api_key_here
   ```
   
   - Get your API key from: https://aistudio.google.com/app/apikey
   - **Important:** Never commit your `.env.local` file to git
   - You can specify multiple keys separated by commas for load balancing

3. **Optional: Configure API Base URL**
   
   By default, the app uses `https://router.shengsuanyun.com/api` for better accessibility in Mainland China. To use a different endpoint, set:
   ```bash
   API_BASE_URL=https://your-custom-endpoint.com
   ```

4. **Run the app:**
   ```bash
   npm run dev
   ```

### Security Note

🔒 **API keys must NEVER be committed to the repository.** Always use environment variables or `.env.local` files for sensitive configuration. The `.gitignore` file is configured to prevent accidental commits of these files.
