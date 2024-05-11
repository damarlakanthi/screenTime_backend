import { activeWindow } from 'get-windows';
import { appendFileSync } from 'fs';

const logFilePath = 'time_log.txt';
let activeAppStartTime = null; 
let activeAppTitle = ''; 


function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}


async function logActiveAppTime() {
  try {
    const windowInfo = await activeWindow();
    const activeWindowTitle = windowInfo && windowInfo.owner.bundleId ? windowInfo.owner.bundleId : '';

    
    if (activeWindowTitle !== activeAppTitle) {
        console.log('new window open')
      
      if (activeAppStartTime && activeAppTitle) {
        console.log("setting old window time ")
        const currentTime = new Date();
        const timeDiffInSeconds = (currentTime - activeAppStartTime) / 1000;
        const formattedTime = formatTime(timeDiffInSeconds);
        appendFileSync(logFilePath, `Time spent on ${activeAppTitle}: ${formattedTime}\n`);
        console.log(`Time spent on ${activeAppTitle}: ${formattedTime}`);
      }

  
      activeAppTitle = activeWindowTitle;
      activeAppStartTime = new Date();

      console.log("Data :",activeAppStartTime, activeAppTitle)
    }
  } catch (error) {
    console.error('Error:', error);
  }
}


setInterval(logActiveAppTime, 60000); 

console.log('Tracking time on each application. Press Ctrl+C to stop.');


logActiveAppTime();
