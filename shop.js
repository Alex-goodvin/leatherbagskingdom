// Корзина и оформление заказа. Подключается на странице: <script src="../shop.js" defer></script>
// Настройки (адрес Worker, доставка) берутся из products.json, который создаёт генератор.
(function () {
  "use strict";

  var KEY = "wb_cart_v1";
  var TAX_RATE = 0.07; // налог штата Флорида, только при оплате через Stripe
  var me = document.currentScript || document.querySelector('script[src*="shop.js"]');
  var BASE = me && me.src ? me.src.replace(/shop\.js.*$/, "") : "/";
  var catalog = null, cart = {}, els = {};

  var COUNTRIES = ("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW").split(" ");
  var REGIONS = {
    US: "AL:Alabama,AK:Alaska,AZ:Arizona,AR:Arkansas,CA:California,CO:Colorado,CT:Connecticut,DE:Delaware,DC:District of Columbia,FL:Florida,GA:Georgia,HI:Hawaii,ID:Idaho,IL:Illinois,IN:Indiana,IA:Iowa,KS:Kansas,KY:Kentucky,LA:Louisiana,ME:Maine,MD:Maryland,MA:Massachusetts,MI:Michigan,MN:Minnesota,MS:Mississippi,MO:Missouri,MT:Montana,NE:Nebraska,NV:Nevada,NH:New Hampshire,NJ:New Jersey,NM:New Mexico,NY:New York,NC:North Carolina,ND:North Dakota,OH:Ohio,OK:Oklahoma,OR:Oregon,PA:Pennsylvania,RI:Rhode Island,SC:South Carolina,SD:South Dakota,TN:Tennessee,TX:Texas,UT:Utah,VT:Vermont,VA:Virginia,WA:Washington,WV:West Virginia,WI:Wisconsin,WY:Wyoming",
    CA: "AB:Alberta,BC:British Columbia,MB:Manitoba,NB:New Brunswick,NL:Newfoundland and Labrador,NS:Nova Scotia,NT:Northwest Territories,NU:Nunavut,ON:Ontario,PE:Prince Edward Island,QC:Quebec,SK:Saskatchewan,YT:Yukon"
  };

  function loadCart() { try { cart = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cart = {}; } }
  function saveCart() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  function toCents(v) { return Math.round(parseFloat(v) * 100); }
  function usd(c) { return "$" + (c / 100).toFixed(2); }
  function maxQty(id) { var m = catalog.products[id].max_qty; return m != null ? Number(m) : 1; }
  function has(id) { return catalog && Object.prototype.hasOwnProperty.call(catalog.products, id); }
  function track(name, params) { try { if (window.gtag) window.gtag("event", name, params); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var ready = fetch(BASE + "products.json", { cache: "no-cache" })
    .then(function (r) { return r.json(); })
    .then(function (c) { catalog = c; })
    .catch(function () { catalog = null; });

  function countryOptions() {
    var dn; try { dn = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) {}
    var list = COUNTRIES.filter(function (c) { return c !== "US"; }).map(function (c) {
      var n = c; try { n = (dn && dn.of(c)) || c; } catch (e) {}
      return { c: c, n: n };
    });
    list.sort(function (a, b) { return a.n.localeCompare(b.n); });
    var h = '<option value="">Country *</option><option value="US">United States</option>';
    list.forEach(function (x) { h += '<option value="' + x.c + '">' + esc(x.n) + "</option>"; });
    return h;
  }

  function build() {
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<button type="button" class="wb-fab" hidden>Cart (<span class="wb-count">0</span>)</button>' +
      '<div class="wb-overlay" hidden></div>' +
      '<aside class="wb-drawer" hidden role="dialog" aria-label="Shopping cart">' +
        '<div class="wb-head"><strong>Your cart</strong><button type="button" class="wb-close" aria-label="Close">&times;</button></div>' +
        '<div class="wb-notice" hidden></div>' +
        '<div class="wb-items"></div>' +
        '<form class="wb-form">' +
          '<h3>Contact</h3>' +
          '<input name="email" type="email" placeholder="Email *" required autocomplete="email">' +
          '<input name="phone" type="tel" placeholder="Phone *" required autocomplete="tel">' +
          '<h3>Delivery address</h3>' +
          '<div class="wb-two"><input name="first_name" placeholder="First name *" required autocomplete="given-name"><input name="last_name" placeholder="Last name *" required autocomplete="family-name"></div>' +
          '<select name="country" required autocomplete="country">' + countryOptions() + '</select>' +
          '<input name="address1" placeholder="Address *" required autocomplete="address-line1">' +
          '<input name="address2" placeholder="Apartment, suite (optional)" autocomplete="address-line2">' +
          '<div class="wb-two"><input name="city" placeholder="City *" required autocomplete="address-level2"><div class="wb-state"></div></div>' +
          '<input name="zip" placeholder="ZIP / postal code *" required autocomplete="postal-code">' +
          '<h3>Payment method</h3>' +
          '<fieldset class="wb-methods">' +
            '<label><input type="radio" name="gate" value="paypal" checked> PayPal</label>' +
            '<label><input type="radio" name="gate" value="stripe.com"> Credit / debit card (Stripe)</label>' +
          '</fieldset>' +
          '<div class="wb-totals"></div>' +
          '<p class="wb-disclaimer">International customers are responsible for any customs duties, import taxes, VAT, brokerage fees, or other charges imposed by their country&rsquo;s customs authorities unless duties and taxes are explicitly stated as prepaid (DDP). See our <a href="' + BASE + 'shipping-policy.html" target="_blank" rel="noopener">Shipping Policy</a> and <a href="' + BASE + 'user-agreement.html" target="_blank" rel="noopener">User Agreement</a>.</p>' +
          '<button type="submit" class="btn wb-pay">Pay securely</button>' +
          '<p class="wb-msg"></p>' +
          '<p class="wb-note">You will be redirected to a secure payment page. Your PayPal or card statement will show &quot;WESTERN BID&quot; as the payee.</p>' +
        '</form>' +
      '</aside>';
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

    els.fab = document.querySelector(".wb-fab");
    els.count = document.querySelector(".wb-count");
    els.overlay = document.querySelector(".wb-overlay");
    els.drawer = document.querySelector(".wb-drawer");
    els.items = document.querySelector(".wb-items");
    els.notice = document.querySelector(".wb-notice");
    els.form = document.querySelector(".wb-form");
    els.totals = document.querySelector(".wb-totals");
    els.msg = document.querySelector(".wb-msg");
    els.pay = document.querySelector(".wb-pay");

    els.fab.addEventListener("click", openDrawer);
    els.overlay.addEventListener("click", closeDrawer);
    document.querySelector(".wb-close").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

    els.items.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var id = b.getAttribute("data-id"), act = b.getAttribute("data-act");
      if (act === "inc") addOne(id);
      if (act === "dec") cart[id] = (cart[id] || 1) - 1;
      if (act === "rm" || cart[id] <= 0) delete cart[id];
      saveCart(); refresh();
      if (!Object.keys(cart).length) closeDrawer();
    });

    els.form.elements.country.addEventListener("change", function () { renderState(); renderTotals(); });
    els.form.addEventListener("change", renderTotals);
    els.form.addEventListener("submit", submit);
    renderState();
  }

  function renderState() {
    var c = els.form.elements.country.value, box = els.form.querySelector(".wb-state");
    if (REGIONS[c]) {
      var h = '<select name="state" required><option value="">' + (c === "US" ? "State" : "Province") + " *</option>";
      REGIONS[c].split(",").forEach(function (s) { var p = s.split(":"); h += '<option value="' + p[0] + '">' + p[1] + "</option>"; });
      box.innerHTML = h + "</select>";
    } else {
      box.innerHTML = '<input name="state" placeholder="State / region" maxlength="40" autocomplete="address-level1">';
    }
  }

  // Та же формула, что в Worker (там она главная): самый дорогой по доставке товар - полная цена,
  // каждый следующий - заданный процент.
  function shippingCents() {
    var pct = Number(catalog.shipping_additional_percent != null ? catalog.shipping_additional_percent : 100), units = [];
    Object.keys(cart).forEach(function (id) {
      var p = catalog.products[id];
      var c = toCents(p.shipping != null ? p.shipping : (catalog.shipping_default || "0"));
      for (var i = 0; i < cart[id]; i++) units.push(c);
    });
    units.sort(function (a, b) { return b - a; });
    return units.reduce(function (t, c, i) { return t + (i === 0 ? c : Math.round(c * pct / 100)); }, 0);
  }

  function totals() {
    var sub = 0;
    Object.keys(cart).forEach(function (id) { sub += toCents(catalog.products[id].price) * cart[id]; });
    var ship = shippingCents(), f = els.form.elements;
    var fl = f.gate.value === "stripe.com" && f.country.value === "US" && f.state && f.state.value === "FL";
    var tax = fl ? Math.round((sub + ship) * TAX_RATE) : 0;
    return { sub: sub, ship: ship, tax: tax, total: sub + ship + tax };
  }

  function renderItems() {
    var box = els.items;
    box.textContent = "";
    var ids = Object.keys(cart);
    if (!ids.length) { box.textContent = "Your cart is empty."; return; }
    ids.forEach(function (id) {
      var p = catalog.products[id];
      var row = document.createElement("div"); row.className = "wb-row";
      var img = document.createElement("img"); img.src = BASE + p.image; img.alt = "";
      var info = document.createElement("div"); info.className = "wb-info";
      var nm = document.createElement("div"); nm.className = "wb-name"; nm.textContent = p.name;
      var pr = document.createElement("div"); pr.textContent = usd(toCents(p.price));
      var q = document.createElement("div"); q.className = "wb-qty";
      if (maxQty(id) === 1) {
        q.innerHTML =
          '<span class="wb-unique">One-of-a-kind item &middot; 1 available</span>' +
          '<button type="button" class="wb-rm" data-act="rm" data-id="' + id + '">Remove</button>';
      } else {
        q.innerHTML =
          '<button type="button" data-act="dec" data-id="' + id + '" aria-label="Less">−</button>' +
          "<span>" + cart[id] + "</span>" +
          '<button type="button" data-act="inc" data-id="' + id + '" aria-label="More">+</button>' +
          '<button type="button" class="wb-rm" data-act="rm" data-id="' + id + '">Remove</button>';
      }
      info.appendChild(nm); info.appendChild(pr); info.appendChild(q);
      row.appendChild(img); row.appendChild(info);
      box.appendChild(row);
    });
  }

  function renderTotals() {
    if (!Object.keys(cart).length) { els.totals.innerHTML = ""; return; }
    var t = totals();
    function r(a, b) { return '<div class="wb-trow"><span>' + a + "</span><span>" + b + "</span></div>"; }
    var h = r("Subtotal", usd(t.sub)) + r("Shipping", t.ship ? usd(t.ship) : "Free");
    if (t.tax) h += r("Sales tax (Florida, 7%)", usd(t.tax));
    els.totals.innerHTML = h + '<div class="wb-trow wb-total"><span>Total</span><span>' + usd(t.total) + "</span></div>";
  }

  function notice(text) {
    els.notice.textContent = text || "";
    els.notice.hidden = !text;
  }

  // добавляет единицу товара с учётом лимита; возвращает false, если лимит достигнут
  function addOne(id) {
    var max = maxQty(id), name = catalog.products[id].name;
    if ((cart[id] || 0) >= max) {
      notice(max === 1
        ? "\u201c" + name + "\u201d is a one-of-a-kind item: only 1 is available, and it is already in your cart."
        : "Only " + max + " of this item can be ordered at once.");
      return false;
    }
    cart[id] = (cart[id] || 0) + 1;
    notice("");
    return true;
  }

  function refresh() {
    var n = 0;
    Object.keys(cart).forEach(function (id) {
      if (!has(id)) { delete cart[id]; return; }
      if (cart[id] > maxQty(id)) cart[id] = maxQty(id);
      n += cart[id];
    });
    saveCart();
    els.count.textContent = n;
    els.fab.hidden = n === 0 || !els.drawer.hidden;
    els.form.hidden = n === 0;
    renderItems(); renderTotals();
  }

  function openDrawer() {
    notice("");
    refresh();
    els.overlay.hidden = false; els.drawer.hidden = false; els.fab.hidden = true;
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    if (!els.drawer || els.drawer.hidden) return;
    els.overlay.hidden = true; els.drawer.hidden = true;
    document.body.style.overflow = "";
    refresh();
  }

  async function submit(e) {
    e.preventDefault();
    els.msg.textContent = "";
    els.pay.disabled = true;
    try {
      var customer = {};
      new FormData(els.form).forEach(function (v, k) { customer[k] = v; });
      var gate = customer.gate; delete customer.gate;
      var items = Object.keys(cart).map(function (id) { return { id: id, qty: cart[id] }; });
      var r = await fetch(catalog.api + "/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items, customer: customer, gate: gate })
      });
      var data = await r.json();
      if (!r.ok) throw new Error(data.error || "error");
      track("begin_checkout", { value: totals().total / 100, currency: "USD" });
      var f = document.createElement("form");
      f.method = "post"; f.action = data.action;
      Object.keys(data.fields).forEach(function (k) {
        var i = document.createElement("input");
        i.type = "hidden"; i.name = k; i.value = data.fields[k];
        f.appendChild(i);
      });
      document.body.appendChild(f);
      f.submit();
    } catch (err) {
      els.msg.textContent = "Could not start payment: " + err.message;
      els.pay.disabled = false;
    }
  }

  // Кнопка Buy now: <a data-buy-now="LISTING_ID">
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-buy-now]") : null;
    if (!t) return;
    e.preventDefault();
    var id = t.getAttribute("data-buy-now");
    ready.then(function () {
      if (!has(id) || !els.drawer) {
        alert("Online checkout is temporarily unavailable. Please use the Buy on Etsy button.");
        return;
      }
      var added = addOne(id), msg = els.notice.textContent;
      saveCart();
      if (added) track("click_buy_now", { listing_id: id });
      openDrawer();
      if (!added) notice(msg);
    });
  });

  loadCart();
  ready.then(function () {
    if (!catalog) return;
    build();
    refresh();
  });
})();
