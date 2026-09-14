// ============ Shared config ============
// Nach dem Bereitstellen des Apps-Script-Backends (siehe apps-script-code.gs)
// die dortige Web-App-URL (endet auf ".../exec") hier eintragen.
var WALDKOMPASS_SCRIPT_URL = 'https://script.google.com/a/macros/wald-kompass.de/s/AKfycbyK5WOLtJWuMuKlQny_kO9XVc7TyOrfCTvgG-Ta9s3R04dkKdmVTpsrCeq9EwPU4GK5/exec';

// ============ Mobile nav ============
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
      var expanded = links.classList.contains('open');
      toggle.setAttribute('aria-expanded', expanded);
    });
  }
});

// ============ Cookie consent ============
(function () {
  var STORAGE_KEY = 'waldkompass_cookie_consent';

  function getConsent() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  function setConsent(consent) {
    consent.timestamp = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    applyConsent(consent);
  }

  function applyConsent(consent) {
    // Hook point: load statistics/marketing scripts here only if the
    // corresponding category has been accepted by the visitor.
    if (consent && consent.statistics) {
      // e.g. init privacy-friendly analytics
    }
    if (consent && consent.marketing) {
      // e.g. init marketing pixels
    }
  }

  function buildBanner() {
    var banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie-Einstellungen');
    banner.innerHTML =
      '<div class="cookie-inner">' +
        '<p class="cookie-text">Wir verwenden Cookies. Notwendige Cookies sind für den Betrieb der Website erforderlich. ' +
        'Mit Ihrer Einwilligung nutzen wir zusätzlich Statistik-Cookies, um die Website zu verbessern. ' +
        'Details finden Sie in unserer <a href="datenschutz.html">Datenschutzerklärung</a>.</p>' +
        '<div class="cookie-actions">' +
          '<button class="btn" id="cookie-settings-toggle" type="button">Einstellungen</button>' +
          '<button class="btn" id="cookie-reject" type="button">Nur notwendige</button>' +
          '<button class="btn btn-primary" id="cookie-accept" type="button">Alle akzeptieren</button>' +
        '</div>' +
      '</div>' +
      '<div class="cookie-settings" id="cookie-settings-panel">' +
        '<div class="cookie-cat"><strong>Notwendig</strong>Für die Grundfunktionen der Website erforderlich. Immer aktiv.</div>' +
        '<div class="cookie-cat"><label><input type="checkbox" id="cat-statistics"> <strong style="display:inline">Statistik</strong></label>Hilft uns zu verstehen, wie die Website genutzt wird.</div>' +
        '<div class="cookie-cat"><label><input type="checkbox" id="cat-marketing"> <strong style="display:inline">Marketing</strong></label>Für personalisierte Inhalte und Anzeigen Dritter.</div>' +
        '<div class="cookie-cat"><button class="btn btn-primary btn-block" id="cookie-save">Auswahl speichern</button></div>' +
      '</div>';
    document.body.appendChild(banner);

    document.getElementById('cookie-settings-toggle').addEventListener('click', function () {
      document.getElementById('cookie-settings-panel').classList.toggle('show');
    });
    document.getElementById('cookie-accept').addEventListener('click', function () {
      setConsent({ necessary: true, statistics: true, marketing: true });
      banner.classList.remove('show');
    });
    document.getElementById('cookie-reject').addEventListener('click', function () {
      setConsent({ necessary: true, statistics: false, marketing: false });
      banner.classList.remove('show');
    });
    document.getElementById('cookie-save').addEventListener('click', function () {
      setConsent({
        necessary: true,
        statistics: document.getElementById('cat-statistics').checked,
        marketing: document.getElementById('cat-marketing').checked
      });
      banner.classList.remove('show');
    });
    return banner;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var consent = getConsent();
    if (consent) {
      applyConsent(consent);
      return;
    }
    var banner = buildBanner();
    // small delay so it doesn't flash before first paint settles
    setTimeout(function () { banner.classList.add('show'); }, 400);
  });

  // Expose a way for the "Cookie-Einstellungen" footer link to reopen the banner
  window.waldkompassOpenCookieSettings = function () {
    var existing = document.getElementById('cookie-banner');
    if (existing) {
      existing.classList.add('show');
      document.getElementById('cookie-settings-panel').classList.add('show');
      existing.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  };
})();

// ============ Custom weekend-only date picker ============
document.addEventListener('DOMContentLoaded', function () {
  var dateHidden = document.getElementById('date');
  var trigger = document.getElementById('date-display');
  var popover = document.getElementById('date-picker-popover');
  if (!dateHidden || !trigger || !popover) return;

  var monthLabel = document.getElementById('date-picker-month-label');
  var grid = document.getElementById('date-picker-grid');
  var prevBtn = document.getElementById('date-picker-prev');
  var nextBtn = document.getElementById('date-picker-next');
  var tourSelect = document.getElementById('tour-type');
  var dateHint = document.getElementById('date-hint');
  var dateHintDefault = dateHint ? dateHint.textContent : '';

  var MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var viewYear = today.getFullYear();
  var viewMonth = today.getMonth();
  var selected = null;

  function isDayAllowed(date) {
    if (date < today) return false;
    var day = date.getDay();
    if (tourSelect && tourSelect.value === '2-tage') return day === 6;
    return day === 6 || day === 0;
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function formatISO(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()); }
  function formatDisplay(date) {
    return date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function resetDateHint() {
    if (dateHint) { dateHint.textContent = dateHintDefault; dateHint.style.color = ''; }
  }

  function render() {
    monthLabel.textContent = MONTH_NAMES[viewMonth] + ' ' + viewYear;
    grid.innerHTML = '';
    var firstOfMonth = new Date(viewYear, viewMonth, 1);
    var startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (var i = 0; i < startOffset; i++) {
      var filler = document.createElement('span');
      filler.className = 'date-picker-day other-month';
      grid.appendChild(filler);
    }
    for (var d = 1; d <= daysInMonth; d++) {
      (function (d) {
        var date = new Date(viewYear, viewMonth, d);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'date-picker-day';
        btn.textContent = d;
        var allowed = isDayAllowed(date);
        btn.disabled = !allowed;
        if (selected && formatISO(selected) === formatISO(date)) btn.classList.add('selected');
        if (allowed) {
          btn.addEventListener('click', function () {
            selected = date;
            dateHidden.value = formatISO(date);
            trigger.textContent = formatDisplay(date);
            resetDateHint();
            dateHidden.dispatchEvent(new Event('change', { bubbles: true }));
            closePopover();
          });
        }
        grid.appendChild(btn);
      })(d);
    }
  }

  function openPopover() {
    render();
    popover.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
  }
  function closePopover() {
    popover.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    if (popover.hidden) openPopover(); else closePopover();
  });
  document.addEventListener('click', function (e) {
    if (!popover.hidden && !popover.contains(e.target) && e.target !== trigger) closePopover();
  });
  prevBtn.addEventListener('click', function () {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    render();
  });
  nextBtn.addEventListener('click', function () {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    render();
  });

  // Clear the selected date if it's no longer valid after switching tour type
  // (e.g. a Sunday selected for the 1-day tour is invalid once 2-day is chosen).
  if (tourSelect) {
    tourSelect.addEventListener('change', function () {
      if (selected && !isDayAllowed(selected)) {
        selected = null;
        dateHidden.value = '';
        trigger.textContent = 'Datum wählen';
        dateHidden.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (!popover.hidden) render();
    });
  }

  // Expose for the booking-form submit handler below.
  window.waldkompassDateHint = function (message) {
    if (!dateHint) return;
    dateHint.textContent = message;
    dateHint.style.color = 'var(--ember-dark)';
    dateHint.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
});

// ============ Booking form ============
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('booking-form');
  if (!form) return;

  var PRICE_1_DAY_ADULT = 99;
  var PRICE_1_DAY_TEEN = 79;   // unter 18
  var PRICE_1_DAY_CHILD = 69;  // unter 14
  var PRICE_2_DAY = 189;
  var ADDON_PRICES = { kochen: 25, kanu: 25, angeln: 55 };
  var ADDON_LABELS = { kochen: 'Kochen am Lagerfeuer', kanu: 'Kanu-Tour & Natur entdecken', angeln: 'Angeln & Fisch essen am Lagerfeuer' };

  var tourSelect = document.getElementById('tour-type');
  var overnightField = document.getElementById('overnight-field');
  var anglingField = document.getElementById('angling-field');
  var kochenField = document.getElementById('kochen-field');
  var kochenCheckbox = document.getElementById('addon-kochen');
  var kanuCheckbox = document.getElementById('addon-kanu');
  var anglingCheckbox = document.getElementById('addon-angeln');
  var kochenIncludedNote = document.getElementById('kochen-included-note');
  var kidsPricingField = document.getElementById('kids-pricing-field');
  var participants = document.getElementById('participants');
  var participantsU18 = document.getElementById('participants-u18');
  var participantsU14 = document.getElementById('participants-u14');
  var participantsWarning = document.getElementById('participants-warning');
  var kidsWarning = document.getElementById('kids-warning');
  var dateInput = document.getElementById('date');
  var weekendWarning = document.getElementById('weekend-warning');
  var priceEstimate = document.getElementById('price-estimate');

  var contactWarning = document.getElementById('contact-warning');
  var emailInput = document.getElementById('email');
  var phoneInput = document.getElementById('phone');

  function generateBookingNumber() {
    var now = new Date();
    var datePart = now.getFullYear().toString().slice(2) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    var randomPart = Math.floor(1000 + Math.random() * 9000);
    return 'WK-' + datePart + '-' + randomPart;
  }

  function hasContactMethod() {
    return !!((emailInput && emailInput.value.trim()) || (phoneInput && phoneInput.value.trim()));
  }

  function isWeekendDateString(value) {
    if (!value) return null; // unknown yet
    // Parse as local date (avoid UTC off-by-one for date-only strings)
    var parts = value.split('-');
    if (parts.length !== 3) return null;
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.getDay(); // 0 = Sunday, 6 = Saturday
  }

  function dateIsValidForTour() {
    var day = isWeekendDateString(dateInput ? dateInput.value : '');
    if (day === null) return true; // no date chosen yet – nothing to flag
    if (tourSelect.value === '2-tage') return day === 6; // 2-day tour must start on Saturday
    return day === 6 || day === 0; // 1-day tour: Saturday or Sunday
  }

  function currentAddonKeys() {
    var is2Day = tourSelect.value === '2-tage';
    var keys = [];
    if (kanuCheckbox && kanuCheckbox.checked) keys.push('kanu');
    if (is2Day && anglingCheckbox && anglingCheckbox.checked) keys.push('angeln');
    if (!is2Day && kochenCheckbox && kochenCheckbox.checked) keys.push('kochen');
    return keys;
  }

  // Reads and clamps the age-tier counts against the total participant count.
  function getAgeCounts() {
    var total = parseInt(participants.value, 10) || 0;
    var u18 = participantsU18 ? Math.min(parseInt(participantsU18.value, 10) || 0, total) : 0;
    var u14 = participantsU14 ? Math.min(parseInt(participantsU14.value, 10) || 0, u18) : 0;
    var children = u14;
    var teens = u18 - u14;
    var adults = total - u18;
    return { total: total, adults: adults, teens: teens, children: children };
  }

  function computeBreakdown() {
    var is2Day = tourSelect.value === '2-tage';
    var counts = getAgeCounts();
    var base;
    if (is2Day) {
      base = counts.total * PRICE_2_DAY;
    } else {
      base = counts.adults * PRICE_1_DAY_ADULT + counts.teens * PRICE_1_DAY_TEEN + counts.children * PRICE_1_DAY_CHILD;
    }
    var addonKeys = currentAddonKeys();
    var addonPerPerson = addonKeys.reduce(function (sum, k) { return sum + ADDON_PRICES[k]; }, 0);
    var addonTotal = addonPerPerson * counts.total;
    return {
      is2Day: is2Day, counts: counts, base: base,
      addonKeys: addonKeys, addonPerPerson: addonPerPerson, addonTotal: addonTotal,
      grandTotal: base + addonTotal
    };
  }

  function syncTourFields() {
    var is2Day = tourSelect.value === '2-tage';
    if (overnightField) overnightField.style.display = is2Day ? 'block' : 'none';
    if (anglingField) anglingField.style.display = is2Day ? 'block' : 'none';
    if (kidsPricingField) kidsPricingField.style.display = is2Day ? 'none' : 'block';

    // Cooking is included in the 2-day base price again, so hide it as a
    // separate paid addon there and show an "included" note instead.
    if (kochenField) kochenField.style.display = is2Day ? 'none' : 'flex';
    if (kochenIncludedNote) kochenIncludedNote.style.display = is2Day ? 'block' : 'none';
    if (is2Day && kochenCheckbox) kochenCheckbox.checked = false;
    if (!is2Day && anglingCheckbox) anglingCheckbox.checked = false;

    updateWeekendWarning();
    updatePriceEstimate();
  }

  function updateWeekendWarning() {
    if (!weekendWarning) return;
    weekendWarning.style.display = dateIsValidForTour() ? 'none' : 'block';
  }

  function updateKidsWarning() {
    if (!kidsWarning || !participantsU18 || !participantsU14) return;
    var total = parseInt(participants.value, 10) || 0;
    var u18 = parseInt(participantsU18.value, 10) || 0;
    var u14 = parseInt(participantsU14.value, 10) || 0;
    var invalid = u18 > total || u14 > u18;
    kidsWarning.style.display = invalid ? 'block' : 'none';
  }

  function updatePriceEstimate() {
    if (!priceEstimate) return;
    var isSet = tourSelect.value === '1-tag' || tourSelect.value === '2-tage';
    var b = computeBreakdown();
    if (!isSet || !b.counts.total || b.counts.total < 1) {
      priceEstimate.style.display = 'none';
      return;
    }

    var lines = [];
    if (b.is2Day) {
      lines.push(b.counts.total + ' × 189&nbsp;€ = <strong>' + b.base + '&nbsp;€</strong>');
    } else {
      if (b.counts.adults > 0) lines.push(b.counts.adults + ' Erwachsene × 99&nbsp;€ = ' + (b.counts.adults * PRICE_1_DAY_ADULT) + '&nbsp;€');
      if (b.counts.teens > 0) lines.push(b.counts.teens + ' Jugendliche (unter 18) × 79&nbsp;€ = ' + (b.counts.teens * PRICE_1_DAY_TEEN) + '&nbsp;€');
      if (b.counts.children > 0) lines.push(b.counts.children + ' Kinder (unter 14) × 69&nbsp;€ = ' + (b.counts.children * PRICE_1_DAY_CHILD) + '&nbsp;€');
    }
    if (b.addonKeys.length > 0) {
      var addonNames = b.addonKeys.map(function (k) { return ADDON_LABELS[k]; }).join(', ');
      lines.push(b.counts.total + ' × ' + b.addonPerPerson + '&nbsp;€ Zusatzleistungen (' + addonNames + ') = ' + b.addonTotal + '&nbsp;€');
    }

    priceEstimate.innerHTML =
      lines.join('<br>') +
      '<br>Gesamt: <strong>' + b.grandTotal + '&nbsp;€</strong>' +
      '<br><span class="small">Richtwert auf Basis eurer Auswahl – der Betrag in eurer Buchungsbestätigung ist maßgeblich.</span>';
    priceEstimate.style.display = 'block';
  }

  if (tourSelect) {
    tourSelect.addEventListener('change', syncTourFields);
    syncTourFields();
  }
  ['addon-kochen', 'addon-kanu', 'addon-angeln'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', function () { updateWeekendWarning(); updatePriceEstimate(); });
  });
  if (dateInput) dateInput.addEventListener('change', updateWeekendWarning);

  if (participants) {
    participants.addEventListener('input', function () {
      var val = parseInt(participants.value, 10);
      participantsWarning.style.display = (val && val < 5) ? 'block' : 'none';
      updateKidsWarning();
      updatePriceEstimate();
    });
  }
  [participantsU18, participantsU14].forEach(function (el) {
    if (el) el.addEventListener('input', function () { updateKidsWarning(); updatePriceEstimate(); });
  });

  if (emailInput) emailInput.addEventListener('input', function () { contactWarning.style.display = 'none'; });
  if (phoneInput) phoneInput.addEventListener('input', function () { contactWarning.style.display = 'none'; });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!dateInput.value) {
      if (window.waldkompassDateHint) window.waldkompassDateHint('⚠️ Bitte wählt zuerst einen Termin aus.');
      return;
    }

    if (!dateIsValidForTour()) {
      updateWeekendWarning();
      weekendWarning.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    updateKidsWarning();
    if (kidsWarning && kidsWarning.style.display === 'block') {
      kidsWarning.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!hasContactMethod()) {
      contactWarning.style.display = 'block';
      contactWarning.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var bookingNumber = generateBookingNumber();
    var data = new FormData(form);
    var b = computeBreakdown();
    var addons = b.addonKeys.length > 0
      ? b.addonKeys.map(function (k) { return ADDON_LABELS[k] + ' (+' + ADDON_PRICES[k] + '€/Person)'; }).join(', ')
      : 'keine';
    if (b.is2Day) addons = 'Kochen in der Natur (inklusive)' + (addons === 'keine' ? '' : ', ' + addons);

    var priceBreakdownText = b.is2Day
      ? b.counts.total + ' Personen × 189 €'
      : [
          b.counts.adults > 0 ? b.counts.adults + ' Erwachsene × 99 €' : '',
          b.counts.teens > 0 ? b.counts.teens + ' Jugendliche (u18) × 79 €' : '',
          b.counts.children > 0 ? b.counts.children + ' Kinder (u14) × 69 €' : ''
        ].filter(Boolean).join(', ');

    var lines = [
      'Neue Buchungsanfrage – Waldkompass',
      '=================================',
      'Anfrage-/Buchungsnummer: ' + bookingNumber,
      'Tour: ' + (data.get('tour-type') || '-'),
      'Wunschtermin: ' + (data.get('date') || '-'),
      'Teilnehmerzahl: ' + (data.get('participants') || '-') + ' (' + priceBreakdownText + ')',
      'Zusatzleistungen: ' + addons,
      'Übernachtung: ' + (data.get('overnight') || '-'),
      'Gesamtpreis: ' + b.grandTotal + ' € – Zahlung bitte erst nach unserer Bestätigung',
      '',
      'Name: ' + (data.get('name') || '-'),
      'E-Mail: ' + (data.get('email') || '-'),
      'Telefon: ' + (data.get('phone') || '-'),
      '',
      'Nachricht: ' + (data.get('message') || '-')
    ];

    // Anfrage automatisch an das Apps-Script-Backend senden (sendet E-Mails
    // an euch und – falls angegeben – eine Bestätigung an die Kund:innen).
    if (WALDKOMPASS_SCRIPT_URL.indexOf('PASTE_YOUR') === -1) {
      var payload = new URLSearchParams();
      payload.set('formType', 'booking');
      payload.set('bookingNumber', bookingNumber);
      payload.set('tourType', data.get('tour-type') || '');
      payload.set('date', data.get('date') || '');
      payload.set('participants', data.get('participants') || '');
      payload.set('participantsBreakdown', priceBreakdownText);
      payload.set('addons', addons);
      payload.set('overnight', data.get('overnight') || '');
      payload.set('pricePerPerson', b.is2Day ? PRICE_2_DAY : '');
      payload.set('priceTotal', b.grandTotal);
      payload.set('name', data.get('name') || '');
      payload.set('email', data.get('email') || '');
      payload.set('phone', data.get('phone') || '');
      payload.set('message', data.get('message') || '');
      fetch(WALDKOMPASS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: payload }).catch(function () {});
    }

    var summaryBox = document.getElementById('booking-summary');
    if (summaryBox) {
      summaryBox.innerHTML =
        '<h3 style="color:inherit">Ihre Anfrage im Überblick</h3><dl>' +
        lines.map(function (l) {
          if (l === '' || l.indexOf('=') === 0 || l.indexOf('Neue') === 0) return '';
          var parts = l.split(': ');
          return '<dt>' + parts[0] + '</dt><dd>' + (parts[1] || '') + '</dd>';
        }).join('') + '</dl>' +
        '<div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(242,234,217,.25)">' +
          '<h3 style="color:inherit">Nächster Schritt: Bestätigung abwarten</h3>' +
          '<p style="color:#d9d2bd">Wir prüfen jetzt die Verfügbarkeit eures Termins und melden uns <strong>innerhalb von 24 Stunden</strong> mit einer Bestätigung und den Zahlungsinformationen (PayPal/Überweisung).</p>' +
          '<p style="color:#d9d2bd;font-size:.85rem"><strong>Bitte noch nichts überweisen</strong> – wartet auf unsere Bestätigungs-E-Mail, bevor ihr zahlt.' +
          (emailInput.value.trim() ? '' : ' Da ihr keine E-Mail angegeben habt, melden wir uns telefonisch.') +
          '</p>' +
        '</div>';
      summaryBox.style.display = 'block';
      summaryBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    var subject = encodeURIComponent('Buchungsanfrage Waldkompass – ' + (data.get('tour-type') || ''));
    var body = encodeURIComponent(lines.join('\n'));
    var mailLink = document.getElementById('booking-mailto');
    if (mailLink) {
      mailLink.href = 'mailto:info@wald-kompass.de?subject=' + subject + '&body=' + body;
      mailLink.style.display = 'inline-flex';
    }
  });
});

// ============ Reviews page ============
document.addEventListener('DOMContentLoaded', function () {
  var list = document.getElementById('reviews-list');
  var form = document.getElementById('review-form');
  if (!list && !form) return; // not on this page

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  function starString(rating) {
    var full = Math.round(Number(rating) || 0);
    var str = '';
    for (var i = 1; i <= 5; i++) str += (i <= full ? '★' : '☆');
    return str;
  }

  // ---- Star rating picker (submission form) ----
  var ratingPicker = document.getElementById('rating-picker');
  var ratingInput = document.getElementById('review-rating');
  var ratingHint = document.getElementById('rating-hint');
  var starButtons = ratingPicker ? ratingPicker.querySelectorAll('button') : [];

  function resetStarPicker() {
    starButtons.forEach(function (b) { b.classList.remove('filled'); });
    if (ratingInput) ratingInput.value = '';
  }

  starButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = parseInt(btn.getAttribute('data-value'), 10);
      ratingInput.value = value;
      starButtons.forEach(function (b) {
        b.classList.toggle('filled', parseInt(b.getAttribute('data-value'), 10) <= value);
      });
      if (ratingHint) { ratingHint.style.display = 'none'; }
    });
  });

  // ---- Load and render approved reviews ----
  function loadReviews() {
    if (!list) return;
    if (WALDKOMPASS_SCRIPT_URL.indexOf('PASTE_YOUR') !== -1) {
      list.innerHTML = '<p class="review-empty">Bewertungen sind bald verfügbar.</p>';
      return;
    }
    fetch(WALDKOMPASS_SCRIPT_URL + '?action=reviews')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var reviews = (data && data.reviews) || [];
        if (reviews.length === 0) {
          list.innerHTML = '<p class="review-empty">Noch keine Bewertungen – seid die Ersten!</p>';
          return;
        }
        var sum = 0;
        list.innerHTML = reviews.map(function (r) {
          sum += Number(r.rating) || 0;
          var tourLabel = r.tour === '1-tag' ? '1-Tages-Tour' : (r.tour === '2-tage' ? '2-Tages-Tour' : '');
          var dateLabel = '';
          try { dateLabel = new Date(r.date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long' }); } catch (e) {}
          return '<div class="review-card">' +
            '<div class="review-card__head">' +
              '<span class="review-card__name">' + escapeHtml(r.name || 'Anonym') + '</span>' +
              '<span class="review-card__stars">' + starString(r.rating) + '</span>' +
            '</div>' +
            '<div class="review-card__meta">' + [tourLabel, dateLabel].filter(Boolean).join(' · ') + '</div>' +
            (r.comment ? '<p>' + escapeHtml(r.comment) + '</p>' : '') +
          '</div>';
        }).join('');

        var avg = sum / reviews.length;
        var summaryBox = document.getElementById('review-summary');
        if (summaryBox) {
          document.getElementById('review-avg').textContent = avg.toFixed(1);
          document.getElementById('review-avg-stars').textContent = starString(avg);
          document.getElementById('review-count').textContent =
            'basierend auf ' + reviews.length + (reviews.length === 1 ? ' Bewertung' : ' Bewertungen');
          summaryBox.style.display = 'flex';
        }
      })
      .catch(function () {
        list.innerHTML = '<p class="review-empty">Bewertungen konnten nicht geladen werden.</p>';
      });
  }
  loadReviews();

  // ---- Submit a new review ----
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!ratingInput || !ratingInput.value) {
        if (ratingHint) {
          ratingHint.style.display = 'block';
          ratingHint.style.color = 'var(--ember-dark)';
          ratingHint.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      var data = new FormData(form);
      var payload = new URLSearchParams();
      payload.set('formType', 'review');
      payload.set('name', data.get('name') || '');
      payload.set('tour', data.get('tour') || '');
      payload.set('rating', data.get('rating') || '');
      payload.set('comment', data.get('comment') || '');

      if (WALDKOMPASS_SCRIPT_URL.indexOf('PASTE_YOUR') === -1) {
        fetch(WALDKOMPASS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: payload }).catch(function () {});
      }

      var pendingNote = document.getElementById('review-pending-note');
      if (pendingNote) pendingNote.style.display = 'block';
      form.reset();
      resetStarPicker();
      if (ratingHint) ratingHint.style.display = 'none';
    });
  }
});

// ============ Contact form ============
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  var statusEl = document.getElementById('contact-form-status');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = new FormData(form);

    var payload = new URLSearchParams();
    payload.set('formType', 'contact');
    payload.set('name', data.get('name') || '');
    payload.set('email', data.get('email') || '');
    payload.set('message', data.get('message') || '');

    if (WALDKOMPASS_SCRIPT_URL.indexOf('PASTE_YOUR') !== -1) {
      if (statusEl) {
        statusEl.textContent = '⚠️ Formular ist noch nicht mit dem Postfach verbunden (Apps-Script-URL fehlt in script.js).';
        statusEl.style.color = 'var(--ember-dark)';
      }
      return;
    }

    // no-cors: wir können die Antwort nicht auslesen, aber der Request kommt an
    // und das Skript verschickt die E-Mail serverseitig.
    fetch(WALDKOMPASS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: payload }).catch(function () {});

    if (statusEl) {
      statusEl.textContent = '✅ Danke! Eure Nachricht wurde verschickt – wir melden uns in der Regel innerhalb von 2 Werktagen.';
      statusEl.style.color = 'var(--moss)';
    }
    form.reset();
  });
});
