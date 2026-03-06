# AI-Powered Intelligent ATS Platform

## Project Setup

Follow these steps to run the project locally.

### 1. Clone the Repository
git clone https://github.com/nivash467/AI-Powered-Intelligent-ATS-Platform.git
cd AI-Powered-Intelligent-ATS-Platform

## Backend Setup

### Install Dependencies
Navigate to the backend folder and install the required Python packages.

cd backend
pip install -r requirements.txt

### Start Backend Server
Run the FastAPI backend server.

uvicorn main:app --reload

Backend will run at:
http://localhost:8000

API documentation:
http://localhost:8000/docs

## Database Setup

Install and run MongoDB locally.

Default connection:
mongodb://localhost:27017

Database used:
ats_platform

## Frontend Setup

Navigate to the frontend folder.

cd frontend
npm install

Start the development server:

npm run dev

Frontend will run at:
http://localhost:5173

## AI Model Setup

Install and run Ollama.

Pull the Llama3 8B model:

ollama pull llama3:8b

Run the model:

ollama run llama3:8b

## Usage

1. Sign up or log in as an HR user.
2. Configure job requirements.
3. Upload candidate resumes.
4. The system extracts profile links from resumes.
5. GitHub and LeetCode profiles are analyzed.
6. AI generates candidate insights and scores.
7. Candidates are ranked using the AI-based scoring system.
8. Recruiters can shortlist the most suitable candidates.

## Technologies Used

Frontend:
React

Backend:
FastAPI

Database:
MongoDB

AI:
Ollama with Llama3

External Data Sources:
GitHub API  
LeetCode profile analysis  
LinkedIn profile evaluation
