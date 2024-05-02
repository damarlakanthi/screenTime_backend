import { activeWindow } from 'get-windows';
import { appendFileSync } from 'fs';

const logFilePath = 'time_log.txt';
let activeAppStartTime = null; 
let activeAppTitle = ''; 

// Function to format the time in HH:MM:SS format
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Function to log the time spent on the active app
async function logActiveAppTime() {
  try {
    const windowInfo = await activeWindow();
    const activeWindowTitle = windowInfo && windowInfo.owner.bundleId ? windowInfo.owner.bundleId : '';

    // Check if the active window title has changed
    if (activeWindowTitle !== activeAppTitle) {
        console.log('new window open')
      // If a new app becomes active, calculate the time spent on the previous app
      if (activeAppStartTime && activeAppTitle) {
        console.log("setting old window time ")
        const currentTime = new Date();
        const timeDiffInSeconds = (currentTime - activeAppStartTime) / 1000; // Convert to seconds
        const formattedTime = formatTime(timeDiffInSeconds);
        appendFileSync(logFilePath, `Time spent on ${activeAppTitle}: ${formattedTime}\n`);
        console.log(`Time spent on ${activeAppTitle}: ${formattedTime}`);
      }

      // Update the active app title and start time
      activeAppTitle = activeWindowTitle;
      activeAppStartTime = new Date();

      console.log("Data :",activeAppStartTime, activeAppTitle)
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Log time every minute for the active app
setInterval(logActiveAppTime, 60000); // 60 seconds * 1000 milliseconds

console.log('Tracking time on each application. Press Ctrl+C to stop.');

// Log time when the script starts
logActiveAppTime();
