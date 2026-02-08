(function () {
  let editingPrizes = [];
  let editingEACH_COUNT = [];
  let COMPANY = "UTEC";

  function post(url, data) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {})
    }).then(function (r) { return r.json(); });
  }

  function loadConfig() {
    post("/getTempData").then(function (data) {
      if (data.cfgData) {
        editingPrizes = (data.cfgData.prizes || []).map(function (p) {
          return { type: p.type, text: p.text, title: p.title, count: p.count, img: p.img || "" };
        });
        editingEACH_COUNT = (data.cfgData.EACH_COUNT || []).slice();
        COMPANY = data.cfgData.COMPANY || "UTEC";
      }
      renderPrizesList();
    }).catch(function () {
      editingPrizes = [{ type: 0, text: "Special Prize", title: "", count: 1000, img: "" }];
      editingEACH_COUNT = [1];
      renderPrizesList();
    });
  }

  function renderPrizesList() {
    var list = document.getElementById("prizesList");
    if (!list) return;
    list.innerHTML = "";
    editingPrizes.forEach(function (p, i) {
      var row = document.createElement("div");
      row.className = "prize-row";
      var eachVal = editingEACH_COUNT[i] != null ? editingEACH_COUNT[i] : 1;
      row.innerHTML =
        '<input type="text" data-i="' + i + '" data-field="text" placeholder="Prize name" value="' + (p.text || "").replace(/"/g, "&quot;") + '" />' +
        '<input type="text" data-i="' + i + '" data-field="title" placeholder="Description" value="' + (p.title || "").replace(/"/g, "&quot;") + '" />' +
        '<input type="number" data-i="' + i + '" data-field="count" placeholder="Qty" min="1" value="' + (p.count || 1) + '" style="width:60px" />' +
        '<input type="number" data-i="' + i + '" data-field="each" placeholder="Winners/draw" min="1" value="' + eachVal + '" style="width:90px" />' +
        '<img class="prize-img-preview" src="' + (p.img || "") + '" onerror="this.style.display=\'none\'" alt="" />' +
        '<input type="file" data-i="' + i + '" accept="image/*" class="prize-image-input" style="width:100px" />' +
        '<button type="button" class="remove-prize" data-i="' + i + '">Remove</button>';
      list.appendChild(row);
    });

    list.querySelectorAll("input[data-field]").forEach(function (input) {
      input.addEventListener("change", function () {
        var i = parseInt(this.getAttribute("data-i"), 10);
        var field = this.getAttribute("data-field");
        if (field === "each") editingEACH_COUNT[i] = parseInt(this.value, 10) || 1;
        else editingPrizes[i][field] = this.value;
      });
    });

    list.querySelectorAll(".prize-image-input").forEach(function (input) {
      input.addEventListener("change", function () {
        var i = parseInt(this.getAttribute("data-i"), 10);
        var file = this.files[0];
        if (!file) return;
        var fd = new FormData();
        fd.append("image", file);
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/upload-prize-image?id=prize" + i);
        xhr.onload = function () {
          if (xhr.status === 200) {
            var res = JSON.parse(xhr.responseText);
            if (res.url) {
              editingPrizes[i].img = res.url;
              var preview = input.closest(".prize-row").querySelector(".prize-img-preview");
              preview.src = res.url;
              preview.style.display = "";
            }
          }
        };
        xhr.send(fd);
      });
    });

    list.querySelectorAll(".remove-prize").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = parseInt(this.getAttribute("data-i"), 10);
        if (editingPrizes.length <= 1) return;
        editingPrizes.splice(i, 1);
        editingEACH_COUNT.splice(i, 1);
        renderPrizesList();
      });
    });
  }

  document.getElementById("addPrizeBtn").addEventListener("click", function () {
    editingPrizes.push({
      type: editingPrizes.length,
      text: "New Prize",
      title: "",
      count: 1,
      img: ""
    });
    editingEACH_COUNT.push(1);
    renderPrizesList();
  });

  document.getElementById("savePrizesBtn").addEventListener("click", function () {
    var list = document.getElementById("prizesList");
    list.querySelectorAll("input[data-field]").forEach(function (input) {
      var i = parseInt(input.getAttribute("data-i"), 10);
      var field = input.getAttribute("data-field");
      if (field === "each") editingEACH_COUNT[i] = parseInt(input.value, 10) || 1;
      else editingPrizes[i][field] = input.value;
    });
    list.querySelectorAll("input[data-field=\"count\"]").forEach(function (input) {
      var i = parseInt(input.getAttribute("data-i"), 10);
      editingPrizes[i].count = parseInt(input.value, 10) || 1;
    });
    editingPrizes.forEach(function (p, i) { p.type = i; });
    while (editingEACH_COUNT.length < editingPrizes.length) editingEACH_COUNT.push(1);

    post("/save-prizes-config", {
      prizes: editingPrizes,
      EACH_COUNT: editingEACH_COUNT,
      COMPANY: COMPANY
    }).then(function (res) {
      var el = document.getElementById("prizesStatus");
      el.textContent = res.type === "success"
        ? "Prizes saved. Switch to the Lottery tab — the list will update automatically."
        : (res.message || "Failed");
      el.className = "status " + (res.type === "success" ? "ok" : "err");
    });
  });

  document.getElementById("uploadParticipantsBtn").addEventListener("click", function () {
    var fileInput = document.getElementById("participantsFile");
    var file = fileInput.files[0];
    var statusEl = document.getElementById("participantsStatus");
    if (!file) {
      statusEl.textContent = "Select a file first";
      statusEl.className = "status err";
      return;
    }
    var fd = new FormData();
    fd.append("file", file);
    statusEl.textContent = "Uploading...";
    statusEl.className = "status";
    fetch("/upload-participants", { method: "POST", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.type === "success") {
          statusEl.textContent = "Loaded " + (res.count || 0) + " participants. Go to Lottery to run the draw.";
          statusEl.className = "status ok";
        } else {
          statusEl.textContent = res.message || "Upload failed";
          statusEl.className = "status err";
        }
      })
      .catch(function () {
        statusEl.textContent = "Upload failed";
        statusEl.className = "status err";
      });
  });

  loadConfig();
})();
