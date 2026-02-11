const fs = require("fs");
const path = require("path");
let cwd = process.env.LOTTERY_CACHE_DIR || path.join(__dirname, "cache");

function getXlsx() {
  try {
    return require("node-xlsx").default;
  } catch (e) {
    return null;
  }
}

try {
  if (!fs.existsSync(cwd)) {
    fs.mkdirSync(cwd, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create cache dir:", cwd, e.message);
}

/**
 * 读取缓存的数据内容
 */
function loadTempData() {
  let pros = [];
  pros.push(
    new Promise((resolve, reject) => {
      fs.readFile(path.join(cwd, "temp.json"), "utf8", (err, data) => {
        if (err) {
          resolve({});
          return;
        }
        resolve(JSON.parse(data));
      });
    })
  );

  pros.push(
    new Promise((resolve, reject) => {
      fs.readFile(path.join(cwd, "error.json"), "utf8", (err, data) => {
        if (err) {
          resolve([]);
          return;
        }
        resolve(JSON.parse(data));
      });
    })
  );

  return Promise.all(pros);
}

/**
 * 读取XML文件数据
 */
function loadXML(xmlPath) {
  const xlsx = getXlsx();
  if (!xlsx) throw new Error("node-xlsx not available");
  let userData = xlsx.parse(xmlPath);
  let outData = [];
  userData.forEach(item => {
    outData = item.data;
    outData.shift();
    return false;
  });
  outData = outData.filter(item => item.length > 0);
  return outData;
}

/**
 * 写入excel
 * @param {Array} data
 * @param {string} name
 */
function writeXML(data, name) {
  const xlsx = getXlsx();
  if (!xlsx) return Promise.reject(new Error("node-xlsx not available"));
  let buffer = xlsx.build([
    {
      name: "Lottery Results",
      data: data
    }
  ]);

  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(process.cwd(), name), buffer, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/**
 * 写入文件
 * @param {*} data
 */
function saveDataFile(data) {
  data = JSON.stringify(data, "", 2);

  if (!fs.existsSync(cwd)) {
    fs.mkdirSync(cwd);
  }

  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(cwd, "temp.json"), data, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
      console.log("数据写入成功");
    });
  });
}

/**
 * 错误日志文件输出
 * @param {*} data
 */
function saveErrorDataFile(data) {
  data = JSON.stringify(data, "", 2);
  if (!fs.existsSync(cwd)) {
    fs.mkdirSync(cwd);
  }

  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(cwd, "error.json"), data, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
      console.log("数据写入成功");
    });
  });
}

/**
 * 洗牌算法
 * @param {*} arr
 */
function shuffle(arr) {
  let i = arr.length;
  while (i) {
    let j = Math.floor(Math.random() * i--);
    let temp = arr[j];
    arr[j] = arr[i];
    arr[i] = temp;
  }
}

/**
 * Writable data dir (for uploads). Vercel: /tmp; local: server/data
 */
function getDataDir() {
  const path = require("path");
  if (process.env.LOTTERY_DATA_DIR) return process.env.LOTTERY_DATA_DIR;
  if (process.env.VERCEL) return "/tmp/lottery-data";
  return path.join(__dirname, "data");
}

/**
 * Parse Excel buffer to array of [Location, Employee ID, First Name]
 * Expected columns: 1-Location, 2-Employee ID number, 3-First Name
 */
function parseExcelBuffer(buffer) {
  const xlsx = getXlsx();
  if (!xlsx) throw new Error("node-xlsx not available");
  const sheets = xlsx.parse(buffer);
  let rows = [];
  sheets.forEach(sheet => {
    if (sheet.data && sheet.data.length) rows = sheet.data;
  });
  if (!rows.length) return [];
  rows.shift(); // header
  return rows
    .filter(r => r && r.length >= 3)
    .map(r => [String(r[0] || "").trim(), String(r[1] || "").trim(), String(r[2] || "").trim()])
    .filter(r => r[0] || r[1] || r[2]);
}

function saveUsersJson(rows) {
  const fs = require("fs");
  const dir = getDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const p = require("path").join(dir, "users.json");
  fs.writeFileSync(p, JSON.stringify(rows, null, 2), "utf8");
}

function loadPrizesConfig(defaultCfg) {
  const fs = require("fs");
  const path = require("path");
  const p = path.join(getDataDir(), "prizes.json");
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (e) {
      return defaultCfg;
    }
  }
  return defaultCfg;
}

function savePrizesConfig(config) {
  const fs = require("fs");
  const path = require("path");
  const dir = getDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "prizes.json"), JSON.stringify(config, null, 2), "utf8");
}

module.exports = {
  loadTempData,
  loadXML,
  shuffle,
  writeXML,
  saveDataFile,
  saveErrorDataFile,
  getDataDir,
  parseExcelBuffer,
  saveUsersJson,
  loadPrizesConfig,
  savePrizesConfig
};
