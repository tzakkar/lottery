const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

// Optional dependencies (may fail on serverless)
let opn, chokidar;
try { opn = require("opn"); } catch (e) { opn = null; }
try { chokidar = require("chokidar"); } catch (e) { chokidar = null; }

const {
  loadXML,
  loadTempData,
  writeXML,
  saveDataFile,
  shuffle,
  saveErrorDataFile,
  getDataDir,
  parseExcelBuffer,
  saveUsersJson,
  loadPrizesConfig,
  savePrizesConfig
} = require("./help");

const defaultCfg = require("./config");
let cfg = loadPrizesConfig(defaultCfg);

let app = express(),
  router = express.Router(),
  cwd = process.cwd(),
  dataBath = process.env.VERCEL ? path.join(process.cwd(), "server") : __dirname,
  port = 8090,
  curData = {},
  luckyData = {},
  errorData = [],
  defaultType = cfg.prizes[0]["type"],
  defaultPage = `default data`;

let multer;
try { multer = require("multer"); } catch (e) { multer = null; }

//这里指定参数使用 json 格式
app.use(
  bodyParser.json({
    limit: "1mb"
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

if (process.argv.length > 2) {
  port = process.argv[2];
}

app.use(express.static(cwd));

//请求地址为空，默认重定向到index.html文件
app.get("/", (req, res) => {
  res.redirect(301, "index.html");
});

//设置跨域访问
app.all("*", function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By", " 3.2.1");
  if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json;charset=utf-8");
  next();
});

app.post("*", (req, res, next) => {
  log(`请求内容：${JSON.stringify(req.path, 2)}`);
  next();
});

// 获取之前设置的数据 (no-cache so prizes/config are always fresh after save)
router.post("/getTempData", (req, res, next) => {
  getLeftUsers();
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  res.json({
    cfgData: cfg,
    leftUsers: curData.leftUsers,
    luckyData: luckyData
  });
});

// 获取所有用户
router.post("/reset", (req, res, next) => {
  luckyData = {};
  errorData = [];
  log(`重置数据成功`);
  saveErrorDataFile(errorData);
  return saveDataFile(luckyData).then(data => {
    res.json({
      type: "success"
    });
  });
});

// 获取所有用户
router.post("/getUsers", (req, res, next) => {
  res.json(curData.users);
  log(`成功返回抽奖用户数据`);
});

// 获取奖品信息
router.post("/getPrizes", (req, res, next) => {
  // res.json(curData.prize);
  log(`成功返回奖品数据`);
});

// 保存抽奖数据
router.post("/saveData", (req, res, next) => {
  let data = req.body;
  setLucky(data.type, data.data)
    .then(t => {
      res.json({
        type: "Success!"
      });
      log(`保存奖品数据成功`);
    })
    .catch(data => {
      res.json({
        type: "Failed!"
      });
      log(`保存奖品数据失败`);
    });
});

// 保存抽奖数据
router.post("/errorData", (req, res, next) => {
  let data = req.body;
  setErrorData(data.data)
    .then(t => {
      res.json({
        type: "Success!"
      });
      log(`保存没来人员数据成功`);
    })
    .catch(data => {
      res.json({
        type: "Failed!"
      });
      log(`保存没来人员数据失败`);
    });
});

// CSV download endpoint (GET)
router.get("/download-results", (req, res, next) => {
  let outData = [["Location", "Employee ID", "First Name"]];
  cfg.prizes.forEach(item => {
    outData.push([item.text]);
    outData = outData.concat(luckyData[item.type] || []);
  });
  const csvRows = outData.map(row => 
    row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(",")
  );
  const csvContent = csvRows.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=Lottery_Results.csv");
  res.send(csvContent);
});

// 保存数据到excel或CSV
router.post("/export", (req, res, next) => {
  let outData = [["Location", "Employee ID", "First Name"]];
  cfg.prizes.forEach(item => {
    outData.push([item.text]);
    outData = outData.concat(luckyData[item.type] || []);
  });

  writeXML(outData, "/Lottery_Results.xlsx")
    .then(dt => {
      res.status(200).json({
        type: "success",
        url: "Lottery_Results.xlsx"
      });
      log(`Export success (Excel)`);
    })
    .catch(err => {
      // Fallback: return URL to CSV endpoint
      res.status(200).json({
        type: "success",
        url: "/download-results"
      });
      log(`Export success (CSV fallback)`);
    });
});

// ----- Upload & config API -----
const dataDir = getDataDir();
const prizesDir = path.join(dataDir, "prizes");

if (multer) {
  const storage = multer.memoryStorage();
  const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

  // Upload participants Excel (columns: Location, Employee ID, First Name)
  router.post("/upload-participants", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ type: "error", message: "No file uploaded" });
    }
    try {
      const rows = parseExcelBuffer(req.file.buffer);
      saveUsersJson(rows);
      curData.users = rows;
      shuffle(curData.users);
      curData.leftUsers = curData.users.slice();
      res.json({ type: "success", message: `Loaded ${rows.length} participants`, count: rows.length });
    } catch (err) {
      res.status(500).json({ type: "error", message: err.message || "Failed to parse Excel" });
    }
  });

  // Upload prize image
  const fs = require("fs");
  if (!fs.existsSync(prizesDir)) fs.mkdirSync(prizesDir, { recursive: true });
  const prizeStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, prizesDir),
    filename: (req, file, cb) => cb(null, (req.query.id || "prize") + "-" + Date.now() + path.extname(file.originalname) || ".jpg")
  });
  const uploadPrizeImg = multer({ storage: prizeStorage, limits: { fileSize: 5 * 1024 * 1024 } });

  router.post("/upload-prize-image", uploadPrizeImg.single("image"), (req, res) => {
    if (!req.file) return res.status(400).json({ type: "error", message: "No image uploaded" });
    const url = "/data/prizes/" + path.basename(req.file.path);
    res.json({ type: "success", url });
  });

}

// Save prizes config (prizes array + EACH_COUNT; images already uploaded via upload-prize-image)
router.post("/save-prizes-config", (req, res) => {
  const body = req.body;
  if (!body.prizes || !Array.isArray(body.prizes)) {
    return res.status(400).json({ type: "error", message: "Invalid prizes array" });
  }
  const config = {
    prizes: body.prizes,
    EACH_COUNT: body.EACH_COUNT || body.prizes.map((_, i) => (i === 0 ? 1 : 1)),
    COMPANY: body.COMPANY != null ? body.COMPANY : cfg.COMPANY
  };
  if (!config.EACH_COUNT || config.EACH_COUNT.length !== config.prizes.length) {
    config.EACH_COUNT = config.prizes.map((p, i) => (i === 0 ? 1 : 1));
  }
  try {
    savePrizesConfig(config);
    cfg = loadPrizesConfig(defaultCfg);
    defaultType = cfg.prizes[0]["type"];
    res.json({ type: "success", message: "Prizes saved" });
  } catch (err) {
    res.status(500).json({ type: "error", message: err.message });
  }
});

// Serve uploaded prize images (GET); try writable dir then repo; no-cache so updates show
router.get("/data/prizes/:filename", (req, res) => {
  const fs = require("fs");
  const writablePath = path.join(getDataDir(), "prizes", req.params.filename);
  const staticPath = path.join(__dirname, "data", "prizes", req.params.filename);
  const p = fs.existsSync(writablePath) ? writablePath : (fs.existsSync(staticPath) ? staticPath : null);
  if (!p) return res.status(404).end();
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  res.sendFile(path.resolve(p));
});
try {
  const fs = require("fs");
  const writableDir = path.join(getDataDir(), "prizes");
  const staticDir = path.join(__dirname, "data", "prizes");
  if (fs.existsSync(writableDir)) {
    app.use("/data/prizes", (req, res, next) => {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.set("Pragma", "no-cache");
      next();
    }, express.static(writableDir));
  } else if (fs.existsSync(staticDir)) {
    app.use("/data/prizes", (req, res, next) => {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.set("Pragma", "no-cache");
      next();
    }, express.static(staticDir));
  }
} catch (e) {}

//对于匹配不到的路径或者请求，返回默认页面
//区分不同的请求返回不同的页面内容
router.all("*", (req, res) => {
  if (req.method.toLowerCase() === "get") {
    if (/\.(html|htm)/.test(req.originalUrl)) {
      res.set("Content-Type", "text/html");
      res.send(defaultPage);
    } else {
      res.status(404).end();
    }
  } else if (req.method.toLowerCase() === "post") {
    let postBackData = {
      error: "empty"
    };
    res.send(JSON.stringify(postBackData));
  }
});

function log(text) {
  global.console.log(text);
  global.console.log("-----------------------------------------------");
}

function setLucky(type, data) {
  if (luckyData[type]) {
    luckyData[type] = luckyData[type].concat(data);
  } else {
    luckyData[type] = Array.isArray(data) ? data : [data];
  }

  return saveDataFile(luckyData);
}

function setErrorData(data) {
  errorData = errorData.concat(data);

  return saveErrorDataFile(errorData);
}

app.use(router);

function loadData() {
  const fs = require("fs");
  const writableDataDir = getDataDir();
  const staticDataDir = process.env.VERCEL ? path.join(process.cwd(), "server", "data") : path.join(dataBath, "data");
  const jsonPaths = [
    path.join(writableDataDir, "users.json"),
    path.join(staticDataDir, "users.json")
  ];
  const xlsxPaths = [
    path.join(dataBath, "data", "users.xlsx"),
    path.join(process.cwd(), "server", "data", "users.xlsx"),
    path.join(staticDataDir, "users.xlsx")
  ];
  try {
    let jsonPath = jsonPaths.find(p => fs.existsSync(p));
    if (jsonPath) {
      curData.users = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      shuffle(curData.users);
    } else {
      let usersPath = xlsxPaths.find(p => fs.existsSync(p));
      if (usersPath) {
        curData.users = loadXML(usersPath);
        shuffle(curData.users);
      } else {
        curData.users = [];
      }
    }
  } catch (err) {
    curData.users = [];
    console.error("loadData error:", err.message);
  }
  curData.leftUsers = curData.leftUsers || Object.assign([], curData.users);

  // 读取已经抽取的结果
  loadTempData()
    .then(data => {
      luckyData = data[0];
      errorData = data[1];
    })
    .catch(data => {
      curData.leftUsers = Object.assign([], curData.users);
    });
}

function getLeftUsers() {
  if (!curData.users) curData.users = [];
  let lotteredUser = {};
  for (let key in luckyData) {
    let luckys = luckyData[key];
    luckys.forEach(item => {
      lotteredUser[item[1]] = true; // Employee ID as unique key
    });
  }
  errorData.forEach(item => {
    lotteredUser[item[1]] = true;
  });

  let leftUsers = Object.assign([], curData.users);
  leftUsers = leftUsers.filter(user => {
    return !lotteredUser[user[1]]; // Employee ID
  });
  curData.leftUsers = leftUsers;
}

loadData();

module.exports = {
  app,
  run: function(devPort, noOpen) {
    let openBrowser = true;
    if (process.argv.length > 3) {
      if (process.argv[3] && (process.argv[3] + "").toLowerCase() === "n") {
        openBrowser = false;
      }
    }

    if (noOpen) {
      openBrowser = noOpen !== "n";
    }

    if (devPort) {
      port = devPort;
    }

    let server = app.listen(port, () => {
      let host = server.address().address;
      let port = server.address().port;
      global.console.log(`lottery server listenig at http://${host}:${port}`);
      openBrowser && opn && opn(`http://127.0.0.1:${port}`);
    });
  }
};
