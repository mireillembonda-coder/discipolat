// Envoyer ses rendez-vous vers Google Agenda (sens unique, sans compte) :
// - un rendez-vous : lien « Ajouter à Google Agenda » pré-rempli ;
// - une semaine : fichier .ics (partagé vers l'application d'agenda, ou téléchargé).
(function () {
  'use strict';
  var st = IP.store;
  var TZ = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })();

  function pad(n) { return String(n).padStart(2, '0'); }
  function stamp(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }

  // Un rendez-vous à partir d'une case d'heure : « 15h30 Dentiste » commence à 15 h 30.
  IP.eventFromCell = function (dateIso, hour, text) {
    var t = String(text || '').trim(); if (!t) return null;
    var min = 0, m = t.match(/^(\d{1,2})h(\d{2})\s+(.*)$/);
    if (m && +m[1] === +hour) { min = +m[2]; t = m[3]; }
    var start = IP.fromIso(dateIso); start.setHours(+hour, min, 0, 0);
    var end = new Date(start.getTime() + 60 * 60000);
    return { title: t, start: start, end: end };
  };

  IP.gcalLink = function (ev) {
    var q = 'action=TEMPLATE&text=' + encodeURIComponent(ev.title) +
      '&dates=' + stamp(ev.start) + '/' + stamp(ev.end) +
      (TZ ? '&ctz=' + encodeURIComponent(TZ) : '') +
      '&details=' + encodeURIComponent('Ajouté depuis Infinity Planner');
    return 'https://calendar.google.com/calendar/render?' + q;
  };

  function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }

  IP.weekEvents = function (monday) {
    var out = [];
    for (var i = 0; i < 7; i++) {
      var k = IP.iso(IP.addDays(monday, i)), d = st.state.days[k];
      if (!d || !d.h) continue;
      IP.HOURS.forEach(function (h) { var ev = IP.eventFromCell(k, h, d.h[h]); if (ev) out.push(ev); });
    }
    return out;
  };

  IP.ics = function (events) {
    var now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Infinity Planner//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    events.forEach(function (ev, i) {
      lines.push('BEGIN:VEVENT', 'UID:' + stamp(ev.start) + '-' + i + '@infinity-planner', 'DTSTAMP:' + now,
        'DTSTART' + (TZ ? ';TZID=' + TZ : '') + ':' + stamp(ev.start), 'DTEND' + (TZ ? ';TZID=' + TZ : '') + ':' + stamp(ev.end),
        'SUMMARY:' + icsText(ev.title), 'DESCRIPTION:' + icsText('Ajouté depuis Infinity Planner'), 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };

  // Partage vers l'application d'agenda du téléphone si possible, sinon téléchargement.
  IP.sendIcs = function (events, name) {
    if (!events.length) { IP.toast('Aucun rendez-vous avec une heure cette semaine.'); return; }
    var blob = new Blob([IP.ics(events)], { type: 'text/calendar' });
    var file = null; try { file = new File([blob], name, { type: 'text/calendar' }); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Mes rendez-vous Infinity' }).catch(function () {});
      return;
    }
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    IP.toast(events.length + ' rendez-vous enregistrés dans un fichier : ouvrez-le avec votre agenda.');
  };
})();
