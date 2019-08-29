const Obniz = require("obniz");
const axios = require("axios");
const { createCanvas } = require("canvas");
require("dotenv").config();

const THRESHOLD = 120;
let currentState = "close";
const obniz = new Obniz(process.env.OBNIZ_ID);

obniz.onconnect = async function() {
  const hcsr04 = obniz.wired("HC-SR04", {
    gnd: 0,
    echo: 1,
    trigger: 2,
    vcc: 3
  });
  obniz.repeat(async () => {
    const avg = await measureAvg(hcsr04);

    // console.log(avg);
    displayAvg(obniz, avg);

    const state = avg > THRESHOLD ? "open" : "close";
    console.info(state);
    postToIFTTT(state);
  }, 1000);
};

async function measureAvg(device) {
  let avg = 0;
  let count = 0;
  for (let i = 0; i < 3; i++) {
    // measure three time. and calculate average
    const val = await device.measureWait();
    if (val) {
      count++;
      avg += val;
    }
  }
  if (count > 1) {
    avg /= count;
  }

  return avg
}

function displayAvg(obniz, avg) {
  try {
    const canvas = createCanvas(obniz.display.width, obniz.display.height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, obniz.display.width, obniz.display.height);
    ctx.fillStyle = "#FFF";
    ctx.strokeStyle = "#FFF";
    obniz.display.clear();
    obniz.display.draw(ctx);
    obniz.display.font("Avenir", 18);
    obniz.display.pos(0, 0);
    obniz.display.print(`${avg}`);
  } catch (error) {
    console.error(error);
  }
}

function postToIFTTT(state) {
  const endpoint = `https://maker.ifttt.com/trigger/${state}_desk/with/key/${process.env.IFTTT_WEBHOOK_KEY}`;

  if (currentState === state) {
    return;
  }
  currentState = state;
  if (state === "open") {
    axios.post(endpoint);
  }
}
