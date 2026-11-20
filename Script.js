"use strict";

/* ========== EDIT THESE ========== */
const CONFIG = {
    BUSINESS: "Grayvon Bingwa Services",
    TILL: "3787488",
    PHONE: "0715839658",           // customer care (call/text)
    WHATSAPP: "254715839658",      // same number, international format, no + or spaces
    BALANCE_DATA: "*544#",         // ask your friend to confirm these two codes
    BALANCE_MINS_SMS: "*200#",
    APPS_SCRIPT_URL: "",           // paste your Google Apps Script link here (Step 5)
    TIMEOUT_MS: 12000              // give up on a slow request after 12 seconds
};

const GROUPS = [
    { id: "data", title: "Data deals", note: "Once per day" },
    { id: "repeat", title: "Repeatable data deals", note: "Buy multiple times" },
    { id: "sms", title: "SMS deals", note: "Buy many times a day" },
    { id: "minutes", title: "Minutes deals", note: "Buy many times a day" }
];

const OFFERS = [
    { g: "data", price: 19, text: "1GB (1hr) 23:00 to 7pm" },
    { g: "data", price: 49, text: "400MB (weekly)" },
    { g: "data", price: 20, text: "250MB (24hrs)" },
    { g: "data", price: 99, text: "1.5GB (24hrs)" },
    { g: "data", price: 53, text: "750MB (24hrs)" },
    { g: "data", price: 55, text: "1GB till midnight" },
    { g: "data", price: 52, text: "1.5GB (3hrs) midnight to 7pm" },

    { g: "repeat", price: 22, text: "1GB 1hr, 23:00 to 7pm" },
    { g: "repeat", price: 54, text: "750MB + 50 SMS + free WhatsApp (1 day)" },
    { g: "repeat", price: 23, text: "250MB + WhatsApp + 50 SMS" },
    { g: "repeat", price: 101, text: "1.5GB + WhatsApp + 50 SMS" },
    { g: "repeat", price: 110, text: "2GB (24hrs)" },

    { g: "sms", price: 5, text: "20 SMS (1 day)" },
    { g: "sms", price: 10, text: "200 SMS (1 day)" },
    { g: "sms", price: 30, text: "1000 SMS (7 days)" },

    { g: "minutes", price: 21, text: "Flex (2hrs)" },
    { g: "minutes", price: 51, text: "50 minutes + 20 SMS (till midnight)" }
];

/* Which offer groups belong to which service */
const SERVICES = {
    data: { groups: ["data", "repeat"] },
    sms: { groups: ["sms"] },
    minutes: { groups: ["minutes"] }
};

/* Problems and quick fixes for each service. Edit the wording freely. */
const WAIT = "Wait 2 to 3 minutes. Offers can arrive a little late when the network is busy.";
const AMOUNT = "Check that you paid the exact amount of the offer to Till " + CONFIG.TILL + ".";
const DAILY = "Offers marked 'once per day' can be bought only once a day. If you already bought it today, it will not be sent again. Try a repeatable offer instead.";
const RESTART = "Restart your phone, then check again.";
const TWICE = "Do not pay again. Send the report and write both M-PESA codes in the details box.";
const VALID = "Check how long the offer lasts, for example 'till midnight' or '2hrs'. It may have ended.";

const PROBLEMS = {
    data: [
        { label: "Data not received", tips: [WAIT, AMOUNT, DAILY, "Check your data balance: dial " + CONFIG.BALANCE_DATA + ".", RESTART] },
        { label: "Data received but not working", tips: [VALID, "Turn mobile data off and on, or switch aeroplane mode on and off.", "Make sure mobile data is switched on in your phone settings.", RESTART] },
        { label: "Wrong bundle received", tips: [AMOUNT, "Each amount buys one offer. Compare what you received with the price list above."] },
        { label: "Received or charged twice", tips: [TWICE] },
        { label: "Other", tips: [] }
    ],
    sms: [
        { label: "SMS not received", tips: [WAIT, AMOUNT, DAILY, "Check your SMS balance: dial " + CONFIG.BALANCE_MINS_SMS + ".", RESTART] },
        { label: "SMS received but not sending", tips: [VALID, "Check the message centre number in your phone's message settings.", RESTART] },
        { label: "Wrong bundle received", tips: [AMOUNT, "Compare what you received with the price list above."] },
        { label: "Received or charged twice", tips: [TWICE] },
        { label: "Other", tips: [] }
    ],
    minutes: [
        { label: "Minutes not received", tips: [WAIT, AMOUNT, "Check your minutes balance: dial " + CONFIG.BALANCE_MINS_SMS + ".", RESTART] },
        { label: "Minutes received but calls fail", tips: [VALID, "Check that you have signal and try the call again.", RESTART] },
        { label: "Wrong bundle received", tips: [AMOUNT, "Compare what you received with the price list above."] },
        { label: "Received or charged twice", tips: [TWICE] },
        { label: "Other", tips: [] }
    ]
};
/* ================================ */

const $ = (s) => document.querySelector(s);
function make(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
}
const offerLabel = (o) => "Ksh " + o.price + " - " + o.text;
const prettyPhone = (p) => p.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");

/* ---------- Small helpers ---------- */
function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.classList.remove("show"); }, 2400);
}

function copyText(text, okMsg) {
    function fallback() {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); toast(okMsg); }
        catch (e) { toast("Please copy by hand: " + text); }
        document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } else {
        fallback();
    }
}

function drawDigits(box, value) {
    box.textContent = "";
    value.split("").forEach(function (d) { box.appendChild(make("span", "", d)); });
}

function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
function load(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }

function normPhone(v) {
    let p = String(v).replace(/[\s\-+]/g, "");
    if (p.indexOf("254") === 0) p = "0" + p.slice(3);
    return /^0[17]\d{8}$/.test(p) ? p : null;
}

function waLink(text) {
    return "https://wa.me/" + CONFIG.WHATSAPP + "?text=" + encodeURIComponent(text);
}

/* ---------- Page details ---------- */
drawDigits($("#tillDigits"), CONFIG.TILL);
drawDigits($("#payDigits"), CONFIG.TILL);
$("#callBtn").href = "tel:" + CONFIG.PHONE;
$("#callBtn").textContent = "Call " + prettyPhone(CONFIG.PHONE);
$("#callFallback").href = "tel:" + CONFIG.PHONE;
$("#footPhone").textContent = "Call or text " + prettyPhone(CONFIG.PHONE);
$("#footTill").textContent = "Till " + CONFIG.TILL + ". Powered by Safaricom.";
$("#copyTill").onclick = function () { copyText(CONFIG.TILL, "Till number copied"); };

/* ---------- Offers list ---------- */
let chosen = null;
const grid = $("#offerGrid");
GROUPS.forEach(function (g) {
    const card = make("div", "grp");
    card.appendChild(make("h3", "", g.title));
    card.appendChild(make("small", "", g.note));
    OFFERS.forEach(function (o, i) {
        if (o.g !== g.id) return;
        const b = make("button", "o");
        b.type = "button";
        b.appendChild(make("b", "", "Ksh " + o.price));
        b.appendChild(make("span", "", o.text));
        b.onclick = function () { openPay(i); };
        card.appendChild(b);
    });
    grid.appendChild(card);
});

/* ---------- Pay pop-up ---------- */
const modal = $("#payModal");
function openPay(i) {
    chosen = i;
    const o = OFFERS[i];
    $("#payTitle").textContent = "Ksh " + o.price + " offer";
    $("#payDesc").textContent = o.text;
    $("#payAmt").textContent = "Ksh " + o.price;
    modal.hidden = false;
    document.body.classList.add("lock");
    $("#payClose").focus();
}
function closePay() {
    modal.hidden = true;
    document.body.classList.remove("lock");
}
$("#payClose").onclick = closePay;
modal.addEventListener("click", function (e) { if (e.target === modal) closePay(); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closePay(); });
$("#payCopy").onclick = function () { copyText(CONFIG.TILL, "Till number copied"); };
$("#payReport").onclick = function () {
    const o = OFFERS[chosen];
    closePay();
    const svc = o.g === "sms" ? "sms" : o.g === "minutes" ? "minutes" : "data";
    svcSel.value = svc;
    fillService();
    offerSel.value = String(chosen);
    $("#amount").value = o.price;
    $("#report").scrollIntoView();
};

/* ---------- Service, offer, problem (the fix flow) ---------- */
const svcSel = $("#service");
const offerSel = $("#offer");
const probSel = $("#problem");
const tipsBox = $("#tips");

function fillService() {
    const key = svcSel.value;
    const s = SERVICES[key];

    offerSel.textContent = "";
    probSel.textContent = "";
    tipsBox.hidden = true;

    if (!s) {
        offerSel.appendChild(new Option("Choose the service first", ""));
        probSel.appendChild(new Option("Choose the service first", ""));
        offerSel.disabled = true;
        probSel.disabled = true;
        return;
    }
    offerSel.disabled = false;
    probSel.disabled = false;

    offerSel.appendChild(new Option("Choose an offer", ""));
    OFFERS.forEach(function (o, i) {
        if (s.groups.indexOf(o.g) > -1) offerSel.appendChild(new Option(offerLabel(o), String(i)));
    });
    offerSel.appendChild(new Option("Other / not sure", "other"));

    probSel.appendChild(new Option("Choose what went wrong", ""));
    PROBLEMS[key].forEach(function (p, i) { probSel.appendChild(new Option(p.label, String(i))); });
}

function showTips() {
    tipsBox.textContent = "";
    const list = PROBLEMS[svcSel.value];
    const p = list ? list[probSel.value] : null;
    if (!p || !p.tips.length) { tipsBox.hidden = true; return; }
    tipsBox.appendChild(make("b", "", "Try this first. It fixes many cases:"));
    const ol = make("ol");
    p.tips.forEach(function (t) { ol.appendChild(make("li", "", t)); });
    tipsBox.appendChild(ol);
    tipsBox.appendChild(make("p", "", "Still not fixed? Fill in the rest and send the report."));
    tipsBox.hidden = false;
}

svcSel.onchange = fillService;
probSel.onchange = showTips;
offerSel.onchange = function () {
    const o = OFFERS[offerSel.value];
    if (o) $("#amount").value = o.price;
};
fillService();

/* ---------- Talking to the server (never hangs) ---------- */
function fetchJSON(url, opts, ms) {
    return new Promise(function (resolve, reject) {
        let finished = false;
        const ctrl = ("AbortController" in window) ? new AbortController() : null;
        if (ctrl) opts.signal = ctrl.signal;

        const timer = setTimeout(function () {
            if (finished) return;
            finished = true;
            if (ctrl) ctrl.abort();
            reject(new Error("timeout"));
        }, ms);

        fetch(url, opts)
            .then(function (r) { if (!r.ok) throw new Error("http"); return r.json(); })
            .then(function (j) { if (finished) return; finished = true; clearTimeout(timer); resolve(j); })
            .catch(function (e) { if (finished) return; finished = true; clearTimeout(timer); reject(e); });
    });
}

/* Tries twice. A repeated POST is safe: the server ignores a repeated M-PESA code. */
async function callServer(method, data) {
    let lastErr = new Error("failed");
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            if (method === "POST") {
                return await fetchJSON(CONFIG.APPS_SCRIPT_URL, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify(data)
                }, CONFIG.TIMEOUT_MS);
            }
            return await fetchJSON(CONFIG.APPS_SCRIPT_URL + "?" + new URLSearchParams(data).toString(),
                { method: "GET" }, CONFIG.TIMEOUT_MS);
        } catch (e) { lastErr = e; }
    }
    throw lastErr;
}

/* ---------- Report form ---------- */
const form = $("#reportForm");
const errBox = $("#formError");
const sendBtn = $("#sendBtn");
let busy = false;

function showError(msg, field) {
    errBox.textContent = msg;
    errBox.hidden = false;
    Array.prototype.forEach.call(form.querySelectorAll(".bad"), function (x) { x.classList.remove("bad"); });
    if (field) { field.classList.add("bad"); field.focus(); }
}

function buildMessage(ref, p) {
    return "Hello " + CONFIG.BUSINESS + ". I have a problem.\n" +
        (ref ? "Ref: " + ref + "\n" : "") +
        "Service: " + p.service + "\nProblem: " + p.problem +
        "\nPhone: " + p.phone + "\nM-PESA code: " + p.code +
        "\nOffer: " + p.offer + "\nAmount: Ksh " + p.amount +
        (p.note ? "\nDetails: " + p.note : "");
}

form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (busy) return;
    errBox.hidden = true;
    $("#result").hidden = true;
    $("#fallback").hidden = true;
    if ($("#website").value) return;                 // spam bot

    const phone = normPhone($("#phone").value);
    const code = $("#code").value.trim().toUpperCase();
    const amount = $("#amount").value.trim();

    if (!svcSel.value) return showError("Choose if the problem is with Data, SMS or Minutes.", svcSel);
    if (probSel.value === "") return showError("Choose what went wrong.", probSel);
    if (offerSel.value === "") return showError("Choose the offer you paid for.", offerSel);
    if (!/^\d{1,5}$/.test(amount)) return showError("Enter the amount you paid, in numbers only.", $("#amount"));
    if (!phone) return showError("Enter a valid phone number, like 0712345678.", $("#phone"));
    if (!/^[A-Z0-9]{10}$/.test(code)) return showError("The M-PESA code has 10 letters and numbers. Copy it from your payment message.", $("#code"));

    const o = OFFERS[offerSel.value];
    const payload = {
        phone: phone,
        code: code,
        amount: amount,
        service: svcSel.options[svcSel.selectedIndex].text,
        offer: o ? offerLabel(o) : "Other / not sure",
        problem: PROBLEMS[svcSel.value][probSel.value].label,
        note: $("#note").value.trim().slice(0, 300)
    };

    busy = true;
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";

    try {
        if (!navigator.onLine) throw new Error("offline");
        let ref, demo = false;
        if (CONFIG.APPS_SCRIPT_URL) {
            const r = await callServer("POST", payload);
            if (!r || !r.ok) throw new Error((r && r.error) || "save failed");
            ref = r.ref;
            if (r.duplicate) toast("This M-PESA code was already reported. Here is its reference.");
        } else {
            demo = true;                                 // no server connected yet
            ref = "GBS-T" + Math.floor(1000 + Math.random() * 9000);
            save("gb_demo_" + ref, JSON.stringify({ offer: payload.offer, status: "Received" }));
        }
        save("gb_ref", ref);
        showResult(ref, payload, demo);
    } catch (err) {
        showFallback(payload);
    } finally {
        busy = false;
        sendBtn.disabled = false;
        sendBtn.textContent = "Send my report";
    }
});

function showResult(ref, p, demo) {
    $("#refText").textContent = ref;
    $("#refHint").textContent = demo
        ? "Test mode: this report was not saved online yet. Use the WhatsApp button to send it."
        : "Keep this number. Use 'Check my request' below to see progress.";
    $("#waBtn").href = waLink(buildMessage(ref, p));
    $("#copyRef").onclick = function () { copyText(ref, "Reference copied"); };
    $("#result").hidden = false;
    $("#ref").value = ref;
    form.reset();
    fillService();
    $("#result").scrollIntoView({ block: "center" });
}

function showFallback(p) {
    $("#waFallback").href = waLink(buildMessage("", p));
    $("#fallback").hidden = false;
    $("#fallback").scrollIntoView({ block: "center" });
}

/* ---------- Check status ---------- */
const STEPS = ["Received", "Being fixed", "Solved"];

function setTimeline(status) {
    const tl = $("#timeline");
    const idx = STEPS.indexOf(status);
    Array.prototype.forEach.call(tl.children, function (el, i) {
        el.className = idx > -1 && i <= idx ? (i === idx ? "on cur" : "on") : "";
    });
    tl.hidden = idx < 0;
}

$("#ref").value = load("gb_ref");

$("#statusForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const q = $("#ref").value.trim();
    const msg = $("#statusMsg");
    const btn = $("#checkBtn");
    msg.hidden = true;
    $("#timeline").hidden = true;

    if (!q) return toast("Enter your reference number or phone number.");
    const isRef = /^GBS-/i.test(q);
    const phone = normPhone(q);
    if (!isRef && !phone) return toast("Enter a reference like GBS-0421 or a phone like 0712345678.");

    btn.disabled = true;
    btn.textContent = "Checking...";
    try {
        let r;
        if (CONFIG.APPS_SCRIPT_URL) {
            r = await callServer("GET", isRef ? { ref: q.toUpperCase() } : { phone: phone });
        } else {
            const local = load("gb_demo_" + q.toUpperCase());
            r = local ? Object.assign({ ok: true, found: true, ref: q.toUpperCase() }, JSON.parse(local)) : { ok: true, found: false };
        }
        if (!r || !r.ok) throw new Error("bad answer");
        if (!r.found) {
            msg.textContent = "We could not find that request. Check the number and try again, or call " + prettyPhone(CONFIG.PHONE) + ".";
        } else {
            msg.textContent = r.ref + ": " + r.offer + ". Status: " + r.status + "." + (r.fixedNote ? " " + r.fixedNote : "");
            setTimeline(r.status);
        }
        msg.hidden = false;
    } catch (err) {
        msg.textContent = "We could not check right now because the network is slow. Try again in a minute, or call " + prettyPhone(CONFIG.PHONE) + ".";
        msg.hidden = false;
    } finally {
        btn.disabled = false;
        btn.textContent = "Check status";
    }
});
