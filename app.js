const API_URL = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/";
const STORAGE_KEY = "currency-uz-cache-v1";
const THEME_KEY = "currency-uz-theme";

const amountEl = document.getElementById("amount");
const fromEl = document.getElementById("fromCurrency");
const toEl = document.getElementById("toCurrency");
const resultEl = document.getElementById("result");
const rateDateEl = document.getElementById("rateDate");
const quickRatesEl = document.getElementById("quickRates");
const swapBtn = document.getElementById("swapBtn");
const refreshBtn = document.getElementById("refreshBtn");
const themeToggle = document.getElementById("themeToggle");

let ratesMap = new Map();
let latestDate = "";

function formatNumber(value, max = 4) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: max });
}

function normalizeRate(value) {
  return Number(String(value).replace(",", "."));
}

function setResult(html, type = "") {
  resultEl.className = "result-box";
  if (type === "ok") resultEl.classList.add("result-ok");
  if (type === "error") resultEl.classList.add("result-error");
  resultEl.innerHTML = html;
}

function getRateToUZS(code) {
  if (code === "UZS") return 1;
  return ratesMap.get(code) ?? null;
}

function convert() {
  const amount = Number(amountEl.value);
  const from = fromEl.value;
  const to = toEl.value;

  if (!Number.isFinite(amount) || amount < 0) {
    setResult("Iltimos, miqdorni to'g'ri kiriting.", "error");
    return;
  }

  const fromRate = getRateToUZS(from);
  const toRate = getRateToUZS(to);
  if (!fromRate || !toRate) {
    setResult("Tanlangan valyuta kursi topilmadi.", "error");
    return;
  }

  const inUzs = amount * fromRate;
  const converted = inUzs / toRate;
  const crossRate = fromRate / toRate;

  setResult(
    `<strong>${formatNumber(amount)} ${from}</strong> = <strong>${formatNumber(converted, 6)} ${to}</strong>
     <div class="meta-value">1 ${from} = ${formatNumber(crossRate, 8)} ${to}</div>
     <div class="meta-label">Manba: O'zbekiston Markaziy Banki (${latestDate || "noma'lum"})</div>`,
    "ok"
  );
}

function renderQuickRates() {
  const popular = ["USD", "EUR", "RUB", "GBP", "JPY", "KZT"];
  quickRatesEl.innerHTML = "";

  popular.forEach((code) => {
    const rate = getRateToUZS(code);
    if (!rate) return;
    const item = document.createElement("article");
    item.className = "rate-item";
    item.innerHTML = `<strong>${code}</strong><p>1 ${code} = ${formatNumber(rate, 2)} UZS</p>`;
    quickRatesEl.appendChild(item);
  });
}

function fillCurrencySelects() {
  const list = [...ratesMap.keys()].sort();
  const options = list.map((code) => `<option value="${code}">${code}</option>`).join("");
  fromEl.innerHTML = options;
  toEl.innerHTML = options;

  if (list.includes("UZS")) fromEl.value = "UZS";
  if (list.includes("USD")) toEl.value = "USD";
}

function cacheRates(rawData) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      savedAt: Date.now(),
      data: rawData
    })
  );
}

function loadFromCache() {
  try {
    const payload = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!payload?.data?.length) return false;
    hydrateRates(payload.data);
    return true;
  } catch (error) {
    return false;
  }
}

function hydrateRates(data) {
  ratesMap = new Map();
  ratesMap.set("UZS", 1);
  data.forEach((item) => {
    const code = item.Ccy;
    const rate = normalizeRate(item.Rate);
    if (code && Number.isFinite(rate)) {
      ratesMap.set(code, rate);
    }
  });
  latestDate = data[0]?.Date || "noma'lum";
  rateDateEl.textContent = latestDate;
  fillCurrencySelects();
  renderQuickRates();
  convert();
}

async function fetchLiveRates() {
  setResult("Kurslar yuklanmoqda...");
  const response = await fetch(API_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP xato: ${response.status}`);

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Bo'sh javob qaytdi.");
  }

  hydrateRates(data);
  cacheRates(data);
}

async function init() {
  applyTheme();

  const hadCache = loadFromCache();
  if (!hadCache) {
    setResult("Kurslar birinchi marta yuklanmoqda...");
  }

  try {
    await fetchLiveRates();
  } catch (error) {
    if (hadCache) {
      setResult(
        `Internetda xatolik bor, oxirgi saqlangan kurslar ishlatilmoqda. <br><span class="meta-label">${error.message}</span>`,
        "error"
      );
      convert();
    } else {
      setResult(`Kurslarni olishda xatolik: ${error.message}`, "error");
    }
  }
}

function applyTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light") {
    document.body.classList.add("light");
  } else {
    document.body.classList.remove("light");
  }
}

function toggleTheme() {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
}

amountEl.addEventListener("input", convert);
fromEl.addEventListener("change", convert);
toEl.addEventListener("change", convert);

swapBtn.addEventListener("click", () => {
  const currentFrom = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value = currentFrom;
  convert();
});

refreshBtn.addEventListener("click", async () => {
  try {
    await fetchLiveRates();
  } catch (error) {
    setResult(`Yangilashda xatolik: ${error.message}`, "error");
  }
});

themeToggle.addEventListener("click", toggleTheme);

init();
