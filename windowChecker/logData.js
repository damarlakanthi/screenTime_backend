import express from 'express';
import { readFile } from 'fs/promises'; 
import cors from 'cors'; 

const app = express();
const port = 8080; 

app.use(cors());

app.get('/getAppData', async (req, res) => {
  try {
    const data = await readFile('time_log.txt', 'utf-8');
    const logLines = data.trim().split('\n');
    const appTimes = {};

    logLines.forEach((line) => {
      const [_, appName, timeStr] =
        line.match(/Time spent on (.+?): (.+)/) || [];
      if (appName && timeStr) {
        const [hours, minutes, seconds] = timeStr.split(':').map(parseFloat);
        const totalTimeInSeconds = hours * 3600 + minutes * 60 + seconds;
        appTimes[appName] = (appTimes[appName] || 0) + totalTimeInSeconds;
      }
    });

    const formattedAppTimes = Object.entries(appTimes).map(
      ([appName, totalTimeInSeconds]) => {
        const totalHours = Math.floor(totalTimeInSeconds / 3600);
        const totalMinutes = Math.floor((totalTimeInSeconds % 3600) / 60);
        const totalSeconds = Math.floor(totalTimeInSeconds % 60);
        const timeFormatted = `${totalHours.toString().padStart(2, '0')}:${totalMinutes.toString().padStart(2, '0')}:${totalSeconds.toString().padStart(2, '0')}`;
        return { app: appName, time: timeFormatted };
      }
    );
    console.log(formattedAppTimes)
    res.json(formattedAppTimes);
  } catch (err) {
    console.error('Error reading the file:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Express server running on port ${port}`);
});
