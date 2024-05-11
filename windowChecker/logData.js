import express from "express";
import { readFile } from "fs/promises";
import fs from "fs";
import cors from "cors";
import { WebSocketServer } from "ws";
import { OpenAI } from "openai";
import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import { dirname } from "path";
import jsdom from "jsdom";
const { JSDOM } = jsdom;
import dotenv from 'dotenv';


dotenv.config();

import * as d3 from "d3";

const wss = new WebSocketServer({ port: 8081 });
const app = express();
const port = 8080;

app.use(cors());
app.set("view engine", "ejs");
app.set(
  "views",
  path.join(path.dirname(new URL(import.meta.url).pathname), "views")
);

const mappingAppType = {
  Chrome: "Productive",
  VSCode: "Productive",
  Word: "Productive",
  Excel: "Productive",
  Postman: "Productive",
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API,
});

let timesData = null;

app.get("/getAppData", async (req, res) => {
  try {
    const data = await readFile("time_log.txt", "utf-8");
    const logLines = data.trim().split("\n");
    const appTimes = {};

    logLines.forEach((line) => {
      const [_, appName, timeStr] =
        line.match(/Time spent on (.+?): (.+)/) || [];
      if (appName && timeStr) {
        const [hours, minutes, seconds] = timeStr.split(":").map(parseFloat);
        const totalTimeInSeconds = hours * 3600 + minutes * 60 + seconds;
        appTimes[appName] = (appTimes[appName] || 0) + totalTimeInSeconds;
      }
    });

    const formattedAppTimes = Object.entries(appTimes).map(
      ([appName, totalTimeInSeconds]) => {
        const totalHours = Math.floor(totalTimeInSeconds / 3600);
        const totalMinutes = Math.floor((totalTimeInSeconds % 3600) / 60);
        const totalSeconds = Math.floor(totalTimeInSeconds % 60);
        const timeFormatted = `${totalHours
          .toString()
          .padStart(2, "0")}:${totalMinutes
          .toString()
          .padStart(2, "0")}:${totalSeconds.toString().padStart(2, "0")}`;
        return { app: appName, time: timeFormatted };
      }
    );
    timesData = formattedAppTimes;
    console.log(timesData);
    res.json(timesData);
  } catch (err) {
    console.error("Error reading the file:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/getSuggestions", async (req, res) => {
  const prompt = `This is my screen time how to reduce my screen time based on the apps I use can you tell me how productive I was  and give me some health tips as well give my productivity and other activity percentage as well give me detailed analysis


${JSON.stringify(timesData)}  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: prompt }],
  });

  let dataToSend = {
    data: `${completion.choices[0].message.content}`,
    prompt: prompt,
  };

  console.log(dataToSend);

  res.send(dataToSend);
});

async function generatePDFFromHTML(htmlFilePath, pdfFilePath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const fileUrl = `file://${htmlFilePath}`;
  await page.goto(fileUrl, { waitUntil: "networkidle0" });

  await page.pdf({ path: pdfFilePath, format: "A4" });

  await browser.close();
}

const getTotalSeconds = (timeString) => {
  const [hours, minutes, seconds] = timeString.split(":").map(parseFloat);
  return hours * 3600 + minutes * 60 + seconds;
};

app.get("/getproductivetime", (req, res) => {
  let productiveTime = 0;
  let unproductiveTime = 0;

  timesData.forEach((item) => {
    const appName = item.app.split(".")[2];
    if (mappingAppType[appName] === "Productive") {
      productiveTime += getTotalSeconds(item.time) / 60;
    } else {
      unproductiveTime += getTotalSeconds(item.time) / 60;
    }
  });

  res.json({ productive: productiveTime, unproductive: unproductiveTime });
});

app.get("/getreport", async (req, res) => {
  try {
    const sortedTimes = timesData.sort((a, b) => {
      const timeA = a.time
        .split(":")
        .reduce((acc, cur, i) => acc + parseInt(cur) * Math.pow(60, 2 - i), 0);
      const timeB = b.time
        .split(":")
        .reduce((acc, cur, i) => acc + parseInt(cur) * Math.pow(60, 2 - i), 0);
      return timeB - timeA;
    });

    const data = fs.readFileSync("time_log.txt", "utf-8");
    const logLines = data.trim().split("\n");

    const firstMostUsed = sortedTimes[0];
    const secondMostUsed = sortedTimes[1];
    const thirdMostUsed = sortedTimes[2];

    const dataString = {
      firstMostUsed,
      secondMostUsed,
      thirdMostUsed,
      logLines,
    };

    const htmlContent = await ejs.renderFile(
      "views/d3.ejs",
      dataString,
      (err, htmlContent) => {
        if (err) {
          console.error("Error rendering EJS file:", err);
          return;
        }

        fs.writeFileSync("rendered_d3.html", htmlContent);
        console.log("Rendered HTML file saved successfully");
      }
    );

    const outputPath = "./report.pdf";

    console.log(
      "this is path name",
      path.join(
        path.dirname(new URL(import.meta.url).pathname),
        "rendered_d3.html"
      )
    );
    generatePDFFromHTML(
      path.join(
        path.dirname(new URL(import.meta.url).pathname),
        "rendered_d3.html"
      ),
      "report.pdf"
    )
      .then(() => {
        console.log("PDF generated successfully!");
        res.sendFile(
          path.join(
            path.dirname(new URL(import.meta.url).pathname),
            "report.pdf"
          )
        );
      })
      .catch((error) => {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
      });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF");
  }
});

app.get("/data", (req, res) => {
  res.json(timesData);
});

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    console.log(`Received message: ${message}`);
  });
});

function sendNotification(ws, message) {
  ws.send(
    JSON.stringify({ type: "notification", message, desc: "App exceeded" })
  );
}

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    console.log(`Received message: ${message}`);
  });

  setInterval(() => {
    timesData.forEach((time) => {
      const timeParts = time.time.split(":");
      const hours = parseInt(timeParts[0]);
      if (hours > 2) {
        console.log("limit exceeded...");
        console.log("log");

        sendNotification(
          ws,
          `App '${time.app.split(".")[2]}' has exceeded 1 hour: ${time.time}`
        );
      }
    });
  }, 1800000);
});

app.listen(port, () => {
  console.log(`Express server running on port ${port}`);
});
