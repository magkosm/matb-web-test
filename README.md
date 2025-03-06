# MATB-II: Multi-Attribute Task Battery

MATB-II is a cognitive workload assessment tool designed to measure multitasking ability and cognitive load. This application is a web-based implementation of the NASA Multi-Attribute Task Battery, featuring multiple interactive tasks that must be managed simultaneously.

## Game Modes

### Custom Training
- Configure and practice each task at your own pace
- Adjust difficulty settings for each task individually
- Focus on specific tasks by enabling/disabling others
- Perfect for learning the mechanics of each task

### Normal Mode
- Timed game mode with configurable duration (1-20 minutes)
- Score is calculated by summing health percentage every second
- Focus on maintaining high health by responding to all tasks correctly
- Best for controlled assessment with a defined endpoint

### Infinite Mode
- Survival-based game mode with progressively increasing difficulty
- Difficulty increases every 30 seconds
- Score is based on survival time in seconds
- Great for measuring performance degradation under increasing cognitive load

## Tasks

The application includes four primary tasks that must be managed simultaneously:

### System Monitoring
Monitor for system anomalies and respond quickly to deviations.

### Communications
Listen for and respond to communications requests directed at your call sign.

### Resource Management
Maintain fuel levels in tanks by managing pumps and flow rates.

### Tracking
Keep a moving target centered in a box with manual control.

## Health System

- Each task contributes to the overall system health
- Poor performance in any task decreases health
- When health reaches zero in Infinite Mode, the game ends
- In Normal Mode, health directly impacts your score

## Leaderboards

The application includes leaderboards for both Normal and Infinite modes:
- Normal Mode: Highest scores based on cumulative health
- Infinite Mode: Longest survival times with level reached
- Enter your name to save your scores
- Top 10 scores for each mode are saved

## Keyboard Shortcuts

- **Ctrl+Q**: Return to main menu from any game mode

## Installation and Running the App

1. Ensure you have Node.js installed (v14+ recommended)
2. Clone the repository
3. Install dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm start
   ```
5. Open http://localhost:3000 in your browser

## Built With

- React.js - Front-end framework
- JavaScript - Programming language
- CSS - Styling

## Performance Considerations

- The application uses requestAnimationFrame for smooth animations
- Health is calculated with high precision for accurate scoring
- Local storage is used to persist leaderboard data

## License

This project is educational in nature and is not affiliated with NASA's official MATB-II software.
