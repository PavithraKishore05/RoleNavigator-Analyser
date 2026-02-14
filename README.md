# � RoleNavigator - Resume Analyzer

## Overview

**RoleNavigator-Resume Analyser** is an AI-driven web application designed to evaluate resumes and provide intelligent, actionable insights to improve job readiness. The system generates a structured resume score and delivers job-specific recommendations by comparing the resume against a provided job description.
This project demonstrates the integration of AI/LLMs with modern web technologies to solve a real-world recruitment challenge.

The system evaluates resumes based on critical criteria to maximize readability and Applicant Tracking System (ATS) compatibility:

* **Contact Information**
* **Education**
* **Skills**
* **Work Experience**
* **Formatting & Structure**
* **ATS Optimization**
* **Keywords & Content Quality**

It suggests specific improvements, such as fixing section headers, improving formatting, adding bullet points, or enhancing skills and experience descriptions.

---

## 🚀 Features

* **Upload and Analyze** PDF resumes.
* **Automated PDF text extraction** using `pdfplumber`.
* **Comprehensive Scoring System** based on industry-standard resume structure.
* **AI-powered recommendations** based on job description provided.
* **Detailed Feedback** for **ATS compatibility**.
* **Clean and simple user interface** for a great user experience.
* **Fast backend processing** using **Flask**.
* **Versatile**—works effectively for both students and experienced professionals.
* **Sample Resume Testing**-Preloaded sample resumes allow users to test the system like Software Engineer,Data Scientist,UX Designer.

---

## 🏗️ Project Architecture

The system utilizes a multi-component architecture to handle file upload, data extraction, scoring, and response generation. 

### High-Level System Flow (ASCII Diagram)

```lua
+-----------------------+
|        Frontend       |
|  (HTML, CSS, JS, Vite)|
+----------+------------+
           |
           | Upload PDF
           v
+----------+------------+
|     Backend API      |
|        (Flask)       |
+----------+------------+
           |
+-----------------+------------------+
|                 |                  |
v                 v
+---------------------------+ +--------------------------+
|      PDF Processing       | |  Resume Scoring Engine   |
| (pdfplumber extraction)   | | (Rules + Checks + Score) |
+-------------+-------------+ +-------------+------------+
|             |
v             v
+-------+------------------+ +------------+-------------+
| Extracted Resume Content | | Feedback & Suggestions |
+------------+-------------+ +------------+-------------+
             |
+--------------------+--------------------+
                      |
                      v
+--------------+--------------+
| Final Response |
| JSON + Score + Feedback |
+------------------------------+
```
Mermaid Architecture Diagram (GitHub Renderable)Code snippetflowchart TD
```lua
A[User Uploads PDF] --> B[Frontend <br>HTML/CSS/JS/Vite]
B --> C[Flask Backend API]

C --> D[PDF Extraction <br> pdfplumber]
C --> E[Scoring Engine <br> Resume Rules & Checks]

D --> F[Extracted Resume Content]
E --> G[Score + Improvement Feedback]

F --> H[Final Response JSON]
G --> H

H --> I[Display Results to User]
```
## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | Python, **Flask** |
| **PDF Parsing** | **pdfplumber** |
| **Frontend** | Node.js, HTML, CSS, JavaScript, **Vite** |
| **Build Tools** | npm |

---

## 📦 Installation & Setup (Local Machine)

### Prerequisites

Make sure you have the following installed on your system:

* **Node.js** (v18 or above)
* **npm** (Node Package Manager)
* **Python**

### Steps to Run Locally

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/MayankSahu297/Anveshan-Hackathon](https://github.com/MayankSahu297/Anveshan-Hackathon)
    cd Anveshan-Hackathon
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Start the Development Server**
    ```bash
    npm run dev
    ```

4.  **Open in Browser**
    The application will be accessible at:
    ```arduino
    http://localhost:5000
    ```

### 📘 Commands Explained

| Command | Description |
| :--- | :--- |
| `npm install` | Installs all project dependencies for both frontend and backend. |
| `npm run dev` | Runs the backend (Flask) and starts the frontend development server. |
| `npm run build` | Builds the production-ready frontend bundle. |
| `npm start` | Runs the production version of the application. |

### 🤖 Optional: Setup OpenAI Integration (For AI-Powered Recommendations)

For **smarter, AI-generated recommendations** when analyzing resumes with job descriptions:

1. **Get OpenAI API Key**
   - Visit: https://platform.openai.com/api-keys
   - Create a new API key

2. **Add to Environment**
   - Open `.env.local` file in project root
   - Add your key:
     ```
     OPENAI_API_KEY=sk_your_api_key_here
     ```

3. **How It Works**
   - ✅ **Without API Key**: Uses fast, rule-based recommendations
   - ✅ **With API Key**: Generates contextual AI recommendations using Claude
   - Both provide job-specific suggestions tailored to the role

### ⚠️ Port Configuration

* **Default port:** `5000`
* To change the port, edit the configuration file: `server/index.ts` (specifically around line 62).

---

## 🔗 Demo & Links

| Type | Link |
| :--- | :--- |
| **🎥 Project Demo Video** | [https://youtu.be/UHMXX-FEbL0?si=xDkefIpPugb-mndX](https://youtu.be/UHMXX-FEbL0?si=xDkefIpPugb-mndX) |
| **🌐 Live Deployment** | [https://anveshan-hackathon.onrender.com/] |
| **📁 GitHub Repository** | [https://github.com/MayankSahu297/Anveshan-Hackathon](https://github.com/MayankSahu297/Anveshan-Hackathon) |
