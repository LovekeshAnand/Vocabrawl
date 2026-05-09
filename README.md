# VocaBrawl ⚔️

**The Ultimate High-Octane Word Arena.**

VocaBrawl is a premium, real-time multiplayer platform designed for word enthusiasts and competitive gamers. Built with a focus on speed, aesthetics, and smooth gameplay, it offers multiple ways to test your vocabulary, drawing skills, and mental agility.

---

## 🎮 Game Modes

### 1. The Arena (Ranked 1v1)
Face off against opponents in high-stakes word duels.
*   **Word Brawl**: A competitive twist on the classic word-guessing game.
*   **Word Chain**: Keep the chain going! Each word must start with the last letter of the previous one.
*   **Anagram Clash**: Scramble and unscramble words faster than your opponent.
*   **ELO Ranking**: Climb the global leaderboards and claim your spot among the masters.

### 2. Scribbl (Multiplayer Party)
Classic drawing and guessing fun with a professional polish.
*   **Live Drawing**: Watch sketches appear instantly with smooth, auto-polished lines.
*   **Private Rooms**: Create custom lobbies to play with friends using unique room codes.
*   **Dynamic Chat**: Guess words in real-time and chat with other players.

### 3. The Gauntlet (Solo PvE)
A test of endurance and speed.
*   Solve as many words as possible against a ticking clock.
*   Every correct guess adds precious seconds to your time.
*   Compete for the highest daily survival score.

---

## ✨ Features

*   **Premium Aesthetics**: A custom-designed "Indigo & Ink" theme with smooth glassmorphism, dynamic animations (Framer Motion), and a crisp hand-drawn feel.
*   **Real-Time Performance**: Powered by Socket.io for sub-100ms latency in drawings and guesses.
*   **Persistent Sessions**: Secure cookie-based authentication keeps you in the game even after a refresh.
*   **Responsive Design**: Play on your desktop, tablet, or phone. The UI adapts perfectly to any screen.
*   **Global Presence**: Live online player counts and worldwide leaderboards.

---

## 🛠️ Tech Stack

### Frontend
*   **Next.js 15**: App Router, Server Components, and optimized hydration.
*   **TypeScript**: Type-safe development across the entire board.
*   **Zustand**: Lightweight, blazing-fast state management.
*   **Framer Motion**: Premium, physics-based animations and transitions.
*   **Lucide React**: Crisp, modern iconography.

### Backend
*   **Node.js & Express**: High-performance API and server logic.
*   **Socket.io**: Bidirectional real-time communication.
*   **MongoDB & Mongoose**: Scalable persistence for users, matches, and ranks.
*   **JWT**: Secure, stateless authentication with cookie support.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   MongoDB Atlas account or local MongoDB instance

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/LovekeshAnand/Vocabrawl.git
    cd Vocabrawl
    ```

2.  **Setup Backend**
    ```bash
    cd backend
    npm install
    ```
    Create a `.env` file in `backend/`:
    ```env
    PORT=3001
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_secret_key
    ```
    Start the server:
    ```bash
    npm run dev
    ```

3.  **Setup Frontend**
    ```bash
    cd ../frontend
    npm install
    ```
    Create a `.env.local` file in `frontend/`:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:3001
    NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
    ```
    Start the app:
    ```bash
    npm run dev
    ```

---

## 👨‍💻 Author
**Lovekesh Anand**  
[GitHub](https://github.com/LovekeshAnand) | [LinkedIn](https://linkedin.com/in/lovekeshanand) | [Portfolio](https://lovekeshanand.com)

---

## 📄 License
VocaBrawl @2026 Lovekesh Anand. All rights reserved.
