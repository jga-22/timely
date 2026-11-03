/* Prototype A2 (alive). Same IA, flows and dummy data as prototype-a.html; the moving parts are the lively layer.
   Mockup only: no business logic, nothing is saved except the theme, the motion choice and the first-run flag (localStorage). */
(function () {
  'use strict';

  /* ── 0. Helpers ─────────────────────────────────────────── */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var key = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parse = function (k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var addDays = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
  var dow = function (d) { return (d.getDay() + 6) % 7; };
  var monday = function (d) { return addDays(d, -dow(d)); };
  var MON1 = new Date(2025, 11, 29);                       // Monday of ISO week 1, 2026
  var weekOf = function (d) { return Math.round((monday(d) - MON1) / 864e5 / 7) + 1; };
  var weekMon = function (w) { return addDays(MON1, (w - 1) * 7); };
  var weekDates = function (w) { var m = weekMon(w), o = []; for (var i = 0; i < 7; i++) o.push(addDays(m, i)); return o; };
  var TODAY = new Date(2026, 10, 4), TK = key(TODAY), THIS_WEEK = weekOf(TODAY);   // fixed sample date: Wed 4 Nov 2026, week 45
  var DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var DL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  var DS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var AWAKE = 105;                                          // awake hours a week: 7 AM to 10 PM
  var DAY_FROM = 7, DAY_TO = 22;                            // the day line and the week grid run 7 AM to 10 PM
  var hr = function (h) { var x = h % 12 === 0 ? 12 : h % 12; return x + (h % 24 < 12 ? ' AM' : ' PM'); };
  var span = function (a, b) { return hr(a) + ' to ' + hr(b); };
  var hash01 = function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };
  var pct = function (n) { return Math.max(0, Math.min(100, Math.round(n || 0))); };
  var clamp = function (n, a, b) { return Math.max(a, Math.min(b, n)); };
  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
  var icon = function (id, cls) { return '<svg class="' + (cls || 'ic') + '" aria-hidden="true" focusable="false"><use href="#i-' + id + '"/></svg>'; };
  var stage = function (p) { return p == null ? 'No target yet' : p >= 100 ? 'Reached' : p >= 75 ? 'Strong' : p >= 50 ? 'Steady' : p >= 25 ? 'Building' : 'Starting'; };
  var inWords = function (r) { return r >= 0.85 ? 'nearly all' : r >= 0.7 ? 'about three in four' : r >= 0.45 ? 'about half' : 'fewer than half'; };
  var dot = function (id) { return '<i class="dot" style="--c:var(--c-' + id + ')" aria-hidden="true"></i>'; };
  var bar = function (p, id) { return '<span class="bar-t" style="--c:var(--c-' + id + ');--v:' + (pct(p) / 100).toFixed(3) + '"><i></i></span>'; };
  var ring = function (p, px, label, cu) {
    var C = 97.39, v = pct(p), off = C * (1 - v / 100), ok = v >= 100;
    return '<span class="ring' + (ok ? ' ok' : '') + '" style="width:' + px + 'px;height:' + px + 'px" role="img" aria-label="' + esc(label) + '">' +
      '<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="rt" cx="18" cy="18" r="15.5"/>' +
      '<circle class="ra" cx="18" cy="18" r="15.5" stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '" style="--c:' + C + ';--o:' + off + '"/></svg>' +
      '<span class="rc"' + (cu ? ' data-countup="' + cu + '" data-to="' + v + '"' : '') + '>' + (ok ? icon('check') : v + '%') + '</span></span>';
  };
  var needOf = function (h) { return h.period === 'day' ? 'Every day' : h.period === 'month' ? (h.count === 1 ? 'Once a month' : h.count + ' times a month') : (h.count === 1 ? 'Once a week' : h.count + ' times a week'); };
  var calm = function () { return document.documentElement.getAttribute('data-motion') !== 'lively'; };

  /* The clock. Live: the real time of day, applied to the sample date. ?now=9:20 freezes it (for captures). */
  var NOW_PARAM = null;
  try { NOW_PARAM = new URLSearchParams(location.search).get('now'); } catch (e) {}
  function clockMin() {
    if (NOW_PARAM && /^\d{1,2}:\d{2}$/.test(NOW_PARAM)) { var p = NOW_PARAM.split(':'); return (+p[0]) * 60 + (+p[1]); }
    var d = new Date(); return d.getHours() * 60 + d.getMinutes();
  }
  function partOf(m) { var h = Math.floor(m / 60); return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : 'evening'; }
  var GREET = { morning: 'Good morning, Sam.', afternoon: 'Good afternoon, Sam.', evening: 'Good evening, Sam.' };
  function fmtDur(m) { if (m < 60) return m + ' min'; var h = Math.floor(m / 60), r = m % 60; return h + ' h' + (r ? ' ' + r + ' min' : ''); }
  // Countdown to a block, in minutes from midnight.
  function cdFrom(s, e, m) {
    if (m < s) { var diff = s - m; return diff <= 180 ? { state: 'soon', text: 'In ' + fmtDur(diff) } : { state: 'later', text: 'Starts at ' + hr(Math.floor(s / 60)) }; }
    if (m < e) return { state: 'now', text: 'On now · ' + fmtDur(e - m) + ' left' };
    return { state: 'ended', text: 'Ended at ' + hr(Math.floor(e / 60)) + '. Tick it if it happened.' };
  }

  /* ── 1. Sample data (invented person, dummy plan; the same as prototype A) ─── */
  var AREA_DEFS = [
    { id: 'phys', name: 'Physical', goal5: 'Feel strong, rested and energetic.', target: 'Exercise at least three times a week, all year.', progress: 62 },
    { id: 'spir', name: 'Spiritual', goal5: 'Keep a calm, clear mind and clear values.', target: 'Read something inspiring at least three times a week.', progress: 30 },
    { id: 'rel', name: 'Relational & emotional', goal5: 'Be present for the people I love.', target: 'A regular time together with family and friends, every week.', progress: 55 },
    { id: 'eco', name: 'Economic', goal5: 'Manage money with confidence and calm.', target: '', progress: null },
    { id: 'cog', name: 'Cognitive', goal5: 'Keep learning and growing in my field.', target: 'Finish one course and share what I learn.', progress: 40 },
    { id: 'soc', name: 'Social', goal5: 'Belong to a few circles where I can give and receive.', target: '', progress: null },
    { id: 'prof', name: 'Professional', goal5: 'Do work that uses my best skills and makes sense.', target: 'Ship the Q1 project and keep focused mornings.', progress: 48 },
    { id: 'env', name: 'Environment', goal5: 'Live and work in a calm, tidy space.', target: 'A tidy home and one walk outside every day.', progress: 20 }
  ];
  var ACT_DEFS = [
    ['focus', 'Focused work', 'prof'], ['planning', 'Weekly planning', 'prof'], ['run', 'Run', 'phys'], ['yoga', 'Yoga', 'phys'],
    ['walk', 'Walk', 'phys'], ['family', 'Family time', 'rel'], ['dinner', 'Family dinner', 'rel'], ['call', 'Call a friend', 'rel'],
    ['quiet', 'Quiet time', 'spir'], ['reading', 'Reading', 'cog'], ['study', 'Study', 'cog'], ['tidy', 'Tidy the flat', 'env']
  ].map(function (a) { return { id: a[0], name: a[1], area: a[2] }; });
  var HABIT_DEFS = [
    ['run', 'phys', 'Run', 3, 'week', 'run'], ['water', 'phys', 'Drink enough water', 1, 'day', null],
    ['quiet', 'spir', 'Quiet time to reflect', 1, 'day', 'quiet'], ['read', 'spir', 'Read for inspiration', 3, 'week', 'reading'],
    ['call', 'rel', 'Call a friend or relative', 2, 'week', 'call'], ['family', 'rel', 'Plan a family activity', 1, 'week', 'family'],
    ['budget', 'eco', 'Review the monthly budget', 1, 'month', null], ['study', 'cog', 'Study a new topic', 3, 'week', 'study'],
    ['project', 'cog', 'Work on a personal project', 2, 'week', null], ['meeting', 'soc', 'Attend a community meeting', 1, 'month', null],
    ['focus', 'prof', 'Focused work', 5, 'week', 'focus'], ['planning', 'prof', 'Weekly planning', 1, 'week', 'planning'],
    ['errands', 'env', 'Run errands with a plan', 1, 'week', 'tidy']
  ].map(function (h) { return { id: h[0], area: h[1], name: h[2], count: h[3], period: h[4], act: h[5] }; });
  var BASE = { phys: .82, spir: .55, rel: .86, eco: .6, cog: .7, soc: .6, prof: .78, env: .6 };   // share ticked in the sample history
  var MY = [
    [0, 9, 12, 'focus'], [0, 18, 19, 'run'], [0, 20, 21, 'reading'],
    [1, 9, 12, 'focus'], [1, 18, 19, 'dinner'], [1, 20, 21, 'study'],
    [2, 9, 10, 'planning'], [2, 13, 15, 'focus'], [2, 18, 19, 'run'],
    [3, 9, 12, 'focus'], [3, 12, 13, 'walk'], [3, 18, 20, 'family'],
    [4, 7, 8, 'yoga'], [4, 9, 11, 'focus'], [4, 17, 18, 'call'], [4, 18, 19, 'run'],
    [5, 8, 9, 'walk'], [5, 10, 12, 'walk'], [5, 15, 18, 'family'], [5, 19, 20, 'dinner'],
    [6, 8, 9, 'quiet'], [6, 10, 12, 'family'], [6, 15, 16, 'tidy'], [6, 17, 18, 'reading']
  ];
  var DEEP = MY.concat([[0, 13, 16, 'focus'], [1, 13, 15, 'focus'], [3, 15, 17, 'focus'], [4, 13, 15, 'focus']]);
  var HOLIDAY = [[0, 8, 9, 'walk'], [1, 8, 9, 'walk'], [2, 8, 9, 'walk'], [3, 8, 9, 'walk'], [4, 8, 9, 'walk'],
    [5, 10, 12, 'walk'], [5, 15, 18, 'family'], [6, 8, 9, 'quiet'], [6, 15, 18, 'family']];
  var STARTER_AMB = 'Stronger, calmer, and able to keep up with my kids.';
  var AMB = 'Stronger, calmer, and able to keep up with my kids.';

  // The first-run rule table (ux-proposal 6a). Every area has a rule, so every area gets a follow-up.
  var FOLLOW = {
    phys: { q: 'What would a good month look like for Physical?', opts: [
      { label: 'Run, three times a week', habit: 'Run', count: 3, period: 'week', act: 'run' },
      { label: 'Walk, every day', habit: 'Walk', count: 7, period: 'week', act: 'walk' }] },
    prof: { q: 'Which piece of work would make this year count?', opts: [
      { label: 'Focused work, three mornings a week', habit: 'Focused work', count: 3, period: 'week', act: 'focus' },
      { label: 'Weekly planning, once a week', habit: 'Weekly planning', count: 1, period: 'week', act: 'planning' }] },
    rel: { q: 'Who do you want more time with?', opts: [
      { label: 'Family evening, twice a week', habit: 'Family evening', count: 2, period: 'week', act: 'dinner' },
      { label: 'A call with a friend, twice a week', habit: 'Call a friend or relative', count: 2, period: 'week', act: 'call' }] },
    spir: { q: 'Which habit would you like to start?', opts: [{ label: 'Quiet time, three times a week', habit: 'Quiet time to reflect', count: 3, period: 'week', act: 'quiet' }] },
    cog: { q: 'Which habit would you like to start?', opts: [{ label: 'Study a new topic, three times a week', habit: 'Study a new topic', count: 3, period: 'week', act: 'study' }] },
    env: { q: 'Which habit would you like to start?', opts: [{ label: 'Tidy the flat, once a week', habit: 'Run errands with a plan', count: 1, period: 'week', act: 'tidy' }] },
    eco: { q: 'Which habit would you like to start?', opts: [{ label: 'Review the monthly budget', habit: 'Review the monthly budget', count: 1, period: 'month', act: null }] },
    soc: { q: 'Which habit would you like to start?', opts: [{ label: 'Attend a community meeting', habit: 'Attend a community meeting', count: 1, period: 'month', act: null }] }
  };

  function sampleSched() {
    return { my: { name: 'My week', slots: MY.map(function (s) { return s.slice(); }) },
      deep: { name: 'Deep work', slots: DEEP.map(function (s) { return s.slice(); }) },
      holiday: { name: 'Holiday', slots: HOLIDAY.map(function (s) { return s.slice(); }) } };
  }
  function emptyState() {
    return {
      ambition: '', areas: AREA_DEFS.map(function (a) { return { id: a.id, name: a.name, goal5: '', target: '', progress: null }; }),
      acts: ACT_DEFS.map(function (a) { return { id: a.id, name: a.name, area: a.area }; }), habits: [],
      schedules: { my: { name: 'My week', slots: [] } }, weekSched: {}, done: {}, extra: {}, dayOff: {}, journal: {},
      set: { recap: true, milestones: true, celebrate: true }, recap: 'open', showSleep: false
    };
  }
  function sampleState() {
    var s = emptyState();
    s.ambition = AMB;
    s.areas = AREA_DEFS.map(function (a) { return { id: a.id, name: a.name, goal5: a.goal5, target: a.target, progress: a.progress }; });
    s.habits = HABIT_DEFS.map(function (h) { return { id: h.id, area: h.area, name: h.name, count: h.count, period: h.period, act: h.act }; });
    s.schedules = sampleSched();
    s.weekSched = { 28: 'holiday', 29: 'holiday', 47: 'deep', 48: 'deep', 49: 'deep' };
    s.journal = { '2026-11-03': 'Skipped the run. Too much at work, and that is fine.' };
    seedHistory(s);
    return s;
  }

  /* ── 2. State and rules (pure over S) ───────────────────── */
  var S = emptyState();
  var FR = null;
  var UI = { route: 'today', sub: 'dreams', day: TK, sel: null, choose: false, wkSched: 'my', wkDay: 2,
    showAll: false, edit: null, lastEdit: null, dream: 'phys', paint: 'holiday', focusKey: null, firstRoute: true,
    motion: null, counted: {}, cer: null, nav: false };

  function areaOf(id) { for (var i = 0; i < S.areas.length; i++) if (S.areas[i].id === id) return S.areas[i]; return null; }
  function actOf(id) { for (var i = 0; i < S.acts.length; i++) if (S.acts[i].id === id) return S.acts[i]; return null; }
  function schedOf(w) { return S.schedules[S.weekSched[w] || 'my'] || S.schedules.my; }
  function isDone(dk, k) { var a = S.done[dk]; return !!a && a.indexOf(k) >= 0; }
  function setDone(dk, k, on) {
    var a = S.done[dk] || (S.done[dk] = []), i = a.indexOf(k);
    if (on && i < 0) a.push(k);
    if (!on && i >= 0) a.splice(i, 1);
  }
  function slotsHours(slots) { return slots.reduce(function (s, x) { return s + x[2] - x[1]; }, 0); }
  function areaHours(slots) {
    var o = {};
    slots.forEach(function (x) { var a = actOf(x[3]); var id = a ? a.area : 'none'; o[id] = (o[id] || 0) + x[2] - x[1]; });
    return o;
  }

  // Blocks for one day: the week's schedule slots plus any extra block added that day.
  function blocksOn(dk) {
    if (S.dayOff[dk]) return [];
    var d = parse(dk), wd = dow(d);
    var list = schedOf(weekOf(d)).slots.filter(function (s) { return s[0] === wd; })
      .map(function (s) { return { act: s[3], start: s[1], end: s[2] }; });
    (S.extra[dk] || []).forEach(function (e) { list.push(e); });
    list.sort(function (a, b) { return a.start - b.start; });
    return list.map(function (b) {
      var a = actOf(b.act) || { name: 'Activity', area: null };
      return { kind: 'block', key: 'a:' + b.act + '@' + b.start, act: b.act, start: b.start, end: b.end, title: a.name, area: a.area, hours: b.end - b.start };
    });
  }
  // Everything due on a day: blocks first, then daily habits that no block already stands for.
  function itemsOn(dk) {
    if (S.dayOff[dk]) return [];
    var blocks = blocksOn(dk);
    var habits = S.habits.filter(function (h) {
      return h.period === 'day' && !(h.act && blocks.some(function (b) { return b.act === h.act; }));
    }).map(function (h) { return { kind: 'habit', key: 'h:' + h.id, title: h.name, area: h.area, habit: h, start: 99, end: 99, hours: 0 }; });
    return blocks.concat(habits);
  }
  function firstUndone(dk) {
    var items = itemsOn(dk);
    for (var i = 0; i < items.length; i++) if (!isDone(dk, items[i].key)) return items[i];
    return null;
  }
  function dayStats(dk) {
    var items = itemsOn(dk);
    return { n: items.length, d: items.filter(function (it) { return isDone(dk, it.key); }).length };
  }
  // Week totals up to today: planned and ticked hours (blocks) and counts (all items).
  function weekStats(w) {
    var st = { pH: 0, dH: 0, pN: 0, dN: 0 };
    weekDates(w).forEach(function (d) {
      if (d > TODAY) return;
      var dk = key(d);
      itemsOn(dk).forEach(function (it) {
        var ok = isDone(dk, it.key);
        st.pN++; if (ok) st.dN++;
        if (it.kind === 'block') { st.pH += it.hours; if (ok) st.dH += it.hours; }
      });
    });
    return st;
  }
  function areaWeek(w) {
    var o = {};
    weekDates(w).forEach(function (d) {
      if (d > TODAY) return;
      var dk = key(d);
      blocksOn(dk).forEach(function (b) {
        var r = o[b.area] || (o[b.area] = { p: 0, d: 0 });
        r.p += b.hours; if (isDone(dk, b.key)) r.d += b.hours;
      });
    });
    return o;
  }
  // Ticks in a week that count toward a habit (its own tick, or a block of its activity).
  function habitWeek(h, w) {
    var n = 0;
    weekDates(w).forEach(function (d) {
      if (d > TODAY) return;
      var dk = key(d);
      (S.done[dk] || []).forEach(function (k) {
        if (k === 'h:' + h.id || (h.act && k.indexOf('a:' + h.act + '@') === 0)) n++;
      });
    });
    return n;
  }
  function seedHistory(s) {
    var saved = S; S = s;
    for (var d = new Date(2026, 8, 7); d < TODAY; d = addDays(d, 1)) {
      var dk = key(d);
      itemsOn(dk).forEach(function (it) {
        var base = it.kind === 'block' ? (BASE[it.area] || .6) : .7;
        if (hash01(dk + it.key) < base) setDone(dk, it.key, true);
      });
    }
    S = saved;
  }
  function avgTarget() {
    var v = S.areas.filter(function (a) { return a.progress != null; });
    if (!v.length) return null;
    return v.reduce(function (s, a) { return s + a.progress; }, 0) / v.length;
  }
  // The next action when today is empty: the weekly habit furthest behind, with an activity.
  function nextAction() {
    var best = null, gap = -1;
    S.habits.forEach(function (h) {
      if (!h.act || h.period === 'day') return;
      var g = h.count - habitWeek(h, THIS_WEEK);
      if (g > gap) { gap = g; best = h; }
    });
    return best;
  }

  /* ── 3. The first-run draft (rules, no AI) ──────────────── */
  function freeSpot(order, start, occ) {
    for (var i = 0; i < order.length; i++) {
      for (var h = start; h <= start + 3 && h + 1 <= 22; h++) {
        var k = order[i] + '-' + h;
        if (!occ[k]) { occ[k] = 1; return { wd: order[i], h: h }; }
      }
    }
    return null;
  }
  function buildDraft(fr) {
    var order = fr.week.weekend && !fr.week.working ? [5, 6, 0, 1, 2, 3, 4] : [0, 2, 4, 1, 3, 5, 6];
    var start = fr.week.evenings ? 18 : 9, occ = {}, slots = [], habits = [], targets = {}, budget = fr.hours, placed = 0, asked = 0;
    fr.areas.slice(0, 3).forEach(function (aid, i) {
      var rule = FOLLOW[aid], pick = i === 0 ? fr.fol[aid] : 0, opt = rule.opts[typeof pick === 'number' ? pick : 0];
      var src = i === 0 && pick === 'unsure' ? 'Not sure, so we used the default: ' + opt.label + '.'
        : i === 0 ? 'From your answer: ' + opt.label + '.' : 'A default for ' + areaOf(aid).name + '. You can change it.';
      var h = { id: 'd' + i, area: aid, name: opt.habit, count: opt.count, period: opt.period, act: opt.act, src: src };
      habits.push(h);
      targets[aid] = (areaOf(aid).target || ('First step: ' + opt.habit + '.'));
      if (h.act && h.period === 'week') {
        for (var k = 0; k < h.count; k++) {
          asked++;
          if (budget <= 0) break;
          var spot = freeSpot(order, start, occ);
          if (!spot) break;
          slots.push([spot.wd, spot.h, spot.h + 1, h.act]); budget--; placed++;
        }
      }
    });
    slots.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    return { ambition: fr.amb.trim(), areas: fr.areas.slice(0, 3), habits: habits, targets: targets, slots: slots,
      note: placed + ' of ' + asked + ' sessions fit your ' + fr.hours + ' hours. You can add more later in Week.' };
  }
  function starterDraft() {
    return { ambition: STARTER_AMB, areas: ['phys', 'rel'],
      habits: [{ id: 'd0', area: 'phys', name: 'Run', count: 3, period: 'week', act: 'run', src: 'Starter: three runs a week.' },
        { id: 'd1', area: 'rel', name: 'Family evening', count: 2, period: 'week', act: 'dinner', src: 'Starter: two family evenings a week.' }],
      targets: { phys: areaOf('phys').target, rel: areaOf('rel').target },
      slots: [[0, 18, 19, 'run'], [1, 18, 19, 'dinner'], [2, 18, 19, 'run'], [3, 18, 19, 'dinner'], [4, 18, 19, 'run']],
      note: 'Starter: a week already set. Edit anything before you accept.' };
  }
  function firstActionOf(d) {
    var sl = d.slots.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var pick = sl.filter(function (s) { return s[0] >= 2; })[0] || sl[0];
    if (!pick) return null;
    var a = ACT_DEFS.filter(function (x) { return x.id === pick[3]; })[0];
    return { name: a ? a.name : 'Activity', wd: pick[0], h: pick[1] };
  }

  /* ── 4. Lively helpers: illustrations, the day line, the path, the copy ─ */
  function illFree() {
    return '<svg class="ill f-ill" viewBox="0 0 120 90" aria-hidden="true" focusable="false"><circle class="s2" cx="60" cy="72" r="40"/><circle class="s1" cx="60" cy="72" r="24"/><path d="M8 72h104" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>';
  }
  function illPath() {
    return '<svg class="ill" viewBox="0 0 120 90" aria-hidden="true" focusable="false"><path class="ln" d="M8 70C30 18 46 18 60 46S96 76 112 22"/><circle cx="8" cy="70" r="4.5" style="fill:var(--accent)"/><circle cx="60" cy="46" r="4.5" style="fill:var(--accent-tint)"/><circle cx="112" cy="22" r="4.5" style="fill:var(--accent)"/></svg>';
  }
  function illRing() {
    return '<svg class="ill" viewBox="0 0 120 90" aria-hidden="true" focusable="false"><circle cx="60" cy="45" r="32" style="fill:none;stroke:var(--accent);stroke-width:3"/><path class="ill-check" d="M46 46l10 10 20-22" style="fill:none;stroke:var(--accent);stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round"/></svg>';
  }
  // The day line: the day's blocks on a 7 AM to 10 PM track, the now marker on today.
  var DL_POS = function (h) { return (h - DAY_FROM) / (DAY_TO - DAY_FROM) * 100; };
  function dayLine(dk, items, isT) {
    var blocks = items.filter(function (it) { return it.kind === 'block'; }), d = dayStats(dk);
    var segs = blocks.map(function (b) {
      var on = isDone(dk, b.key), fresh = UI.motion && UI.motion.key === b.key && UI.motion.dk === dk;
      return '<span class="dl-seg' + (on ? ' on' : '') + (fresh ? ' fresh' : '') + '" data-k="' + esc(b.key) + '" style="--c:var(--c-' + b.area + ');left:' + DL_POS(b.start).toFixed(2) + '%;width:' + (b.hours / (DAY_TO - DAY_FROM) * 100).toFixed(2) + '%"></span>';
    }).join('');
    var m = clockMin(), now = isT ? '<span class="dl-now" data-marker style="left:' + clamp((m - DAY_FROM * 60) / ((DAY_TO - DAY_FROM) * 60) * 100, 0, 100).toFixed(2) + '%"' + (m < DAY_FROM * 60 || m > DAY_TO * 60 ? ' hidden' : '') + '></span>' : '';
    return '<p class="dl-cap"><b data-dn>' + d.d + '</b> of ' + d.n + ' done' + (isT ? ' today' : ' that day') + '</p>' +
      (blocks.length ? '<div class="dl-track" aria-hidden="true">' + segs + now + '</div>' +
        '<div class="dl-axis" aria-hidden="true"><span style="left:0%">7 AM</span><span style="left:' + DL_POS(12).toFixed(2) + '%">12 PM</span><span style="left:' + DL_POS(18).toFixed(2) + '%">6 PM</span><span style="left:100%">10 PM</span></div>' : '');
  }
  // The one pill next to the focal block: the countdown (live), the last item, or "any time".
  function focalPill(f, dk, last) {
    var isT = dk === TK;
    if (f.kind === 'block' && isT) {
      var c = cdFrom(f.start * 60, f.end * 60, clockMin());
      return '<span class="pill" data-state="' + c.state + '" data-start="' + f.start * 60 + '" data-end="' + f.end * 60 + '" data-countdown><i class="live-dot" aria-hidden="true"></i><span data-cd-text>' + esc(c.text) + '</span></span>';
    }
    if (last && isT) return '<span class="pill quiet-pill">Last one for today</span>';
    if (f.kind === 'habit' && isT) return '<span class="pill" data-state="later" data-countdown><i class="live-dot" aria-hidden="true"></i><span data-cd-text>Any time today</span></span>';
    return '';
  }
  // A short line after a tick. Warm, never a score, and nothing after the day is done.
  function cheerFor(dk) {
    var st = dayStats(dk);
    if (st.n && st.d === st.n) return '';
    if (st.n - st.d === 1) return 'Last one for today. You are nearly there.';
    if (st.d === 1) return 'A first one is a real start.';
    return ['Steady. Nicely paced.', 'That is how a week gets built.', 'Good rhythm. No rush.'][st.d % 3];
  }
  // The dream path: one winding line from today through the eight life areas (percent coordinates).
  function dpathPoints(wide) {
    var pts = [], i;
    if (wide) {
      pts.push({ x: 6, y: 74, start: true });
      for (i = 0; i < AREA_DEFS.length; i++) {
        var up = i % 2 === 0;
        pts.push({ x: 16 + i * 11.2, y: up ? 26 : 68, id: AREA_DEFS[i].id, side: up ? 'up' : 'down', d: (i * 0.12).toFixed(2) });
      }
    } else {
      pts.push({ x: 50, y: 3, start: true });
      for (i = 0; i < AREA_DEFS.length; i++) {
        var left = i % 2 === 0;
        pts.push({ x: left ? 30 : 70, y: 11 + i * 11, id: AREA_DEFS[i].id, side: left ? 'right' : 'left', d: (i * 0.12).toFixed(2) });
      }
    }
    return pts;
  }
  function smoothD(p) {
    var d = 'M' + p[0].x + ' ' + p[0].y;
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6, c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) + ' ' + c2x.toFixed(2) + ' ' + c2y.toFixed(2) + ' ' + p2.x + ' ' + p2.y;
    }
    return d;
  }
  function dpathHTML(wide) {
    var pts = dpathPoints(wide), st = pts[0];
    var html = '<svg class="dpath-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="dp-path" pathLength="1" d="' + smoothD(pts) + '"/></svg>' +
      '<span class="dp-start" style="left:' + st.x + '%;top:' + st.y + '%"></span>' +
      '<span class="dp-start-lab" style="left:' + st.x + '%;top:' + st.y + '%;' + (wide ? '' : 'transform:translate(14px,-50%)') + '">Today</span>';
    pts.slice(1).forEach(function (p) {
      var a = areaOf(p.id), pr = a.progress, none = pr == null;
      html += '<button class="dp-node ' + p.side + '" type="button" style="left:' + p.x + '%;top:' + p.y + '%;--c:var(--c-' + p.id + ');--p:' + (none ? 0 : pr) + ';--d:' + p.d + 's" data-a="dream" data-area="' + p.id + '" data-fk="dream-' + p.id + '" aria-label="' + esc(a.name + ': ' + (none ? 'no 1-year target yet' : pr + ' percent, ' + stage(pr) + '. Open in Dreams')) + '">' +
        '<span class="dp-dot' + (none ? ' none' : '') + '" aria-hidden="true"></span>' +
        '<span class="dp-lab" aria-hidden="true"><b>' + esc(a.name) + '</b>' + (none ? 'No target yet' : pr + '% · ' + stage(pr)) + '</span></button>';
    });
    return html;
  }
  function layoutDpath() {
    var c = $('[data-dpath]'); if (!c) return;
    var wide = window.matchMedia('(min-width: 761px)').matches;
    if (c.getAttribute('data-wide') === String(wide) && c.childElementCount) return;
    c.setAttribute('data-wide', String(wide));
    c.style.height = (wide ? 300 : 640) + 'px';
    c.innerHTML = dpathHTML(wide);
  }

  /* ── 5. Renderers ───────────────────────────────────────── */
  function head(eyebrow, title, lede, extra) {
    return '<header class="page-head"><p class="eyebrow">' + eyebrow + '</p><h1 id="h1" tabindex="-1">' + title + '</h1>' +
      (lede ? '<p class="lede">' + lede + '</p>' : '') + (extra || '') + '</header>';
  }
  function behindOf(it) {
    var a = areaOf(it.area);
    if (!a) return '';
    if (!a.target) return 'Behind this: ' + esc(a.name) + '. No 1-year target yet.';
    return 'Behind this: ' + esc(a.target) + (a.progress != null ? ' ' + a.progress + '% of the way there.' : '');
  }
  function itemRow(it, dk) {
    var ok = isDone(dk, it.key), a = areaOf(it.area);
    var fresh = UI.motion && UI.motion.key === it.key && UI.motion.dk === dk;
    var meta = it.kind === 'block' ? span(it.start, it.end) : 'Habit, every day';
    return '<li class="item' + (ok ? ' is-done' : '') + '"><button class="tk' + (ok ? ' on' : '') + (fresh ? ' burst' : '') + '" type="button" data-area="' + it.area + '" data-a="tick" data-k="' + esc(it.key) + '" data-d="' + dk + '" data-fk="' + esc(it.key) + '" aria-label="' + esc(it.title) + (ok ? ', done. Undo' : ', not done yet. Mark done') + '"><span class="tk-ring">' + icon('check') + '</span></button>' +
      '<div class="it-text"><p class="it-name">' + esc(it.title) + '</p><p class="it-meta">' + meta + (a ? ' · ' + dot(a.id) + esc(a.name) : '') + '</p></div></li>';
  }
  function todayView() {
    var dk = UI.day, d = parse(dk), isT = dk === TK, items = itemsOn(dk), M = UI.motion, focal = firstUndone(dk);
    var floor = key(addDays(TODAY, -60));
    var nav = '<div class="daynav" role="group" aria-label="Choose a day">' +
      '<button class="icon" type="button" data-a="day" data-step="-1" aria-label="Previous day"' + (dk <= floor ? ' disabled' : '') + '>' + icon('left') + '</button>' +
      (isT ? '' : '<button class="chip" type="button" data-a="day" data-step="0" data-fk="today-btn">Back to today</button>') +
      '<button class="icon" type="button" data-a="day" data-step="1" aria-label="Next day"' + (isT ? ' disabled' : '') + '>' + icon('right') + '</button></div>';
    var avg = avgTarget();
    var amb = '<div class="amb">' + (avg == null ? '' : ring(avg, 64, 'Ambition: ' + pct(avg) + ' percent', 'amb')) +
      '<p><b>Toward your ambition</b>' + (avg == null ? 'Set a 1-year target to see it here.' : 'Average of your 1-year targets') + '</p></div>';
    var html = '<header class="t-head"><div><p class="eyebrow">' + (isT ? 'Today' : 'A past day') + ' · ' + DAY[dow(d)] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + ' · week ' + weekOf(d) + '</p>' + nav + '</div>' + amb + '</header>';
    html += isT ? '<p class="greet" data-greet>' + GREET[partOf(clockMin())] + '</p>' : '<p class="greet">Looking back at this day.</p>';
    html += '<p class="dream">' + (S.ambition ? 'For: <span>' + esc(S.ambition) + '</span>' : 'Your ambition is not written yet.') + '</p>';
    if (!items.length) {
      var nx = nextAction();
      html += '<section class="focus nothing" aria-labelledby="h1">' + illFree() + '<div class="f-text"><p class="eyebrow">Nothing planned</p><h1 id="h1" class="f-title" tabindex="-1">Nothing planned for today.</h1>' +
        '<p class="f-line">' + (S.ambition ? 'A free day counts too. One small step is there if you want it.' : 'Your plan is empty. Setting it up takes about three minutes.') + '</p>' +
        '<div class="f-act">' + (S.ambition && nx ? '<button class="btn primary" type="button" data-a="add-next" data-fk="add-next">Add ' + esc(nx.name) + ' this evening</button>' : '<button class="btn primary" type="button" data-a="setup" data-fk="setup">Set up my plan</button>') + '</div></div></section>';
    } else if (!focal) {
      html += '<section class="focus done" aria-labelledby="h1"><div class="f-text"><p class="eyebrow">Today</p><h1 id="h1" class="f-title" tabindex="-1">Today is done.</h1>' +
        '<p class="f-line">' + plural(items.length, 'thing', 'things') + ' ticked. Rest counts. The rest of the week can wait.</p>' +
        '<div class="f-act"><a class="btn quiet" href="#plan/week">Plan tomorrow</a></div></div>' +
        '<div class="dl">' + dayLine(dk, items, isT) + '</div></section>';
    } else {
      var last = items.filter(function (it) { return !isDone(dk, it.key); }).length === 1;
      var when = focal.kind === 'block' ? 'Next · ' + span(focal.start, focal.end) + ' · ' + (areaOf(focal.area) ? areaOf(focal.area).name : '') : 'Next · a habit for today';
      var glide = M && M.glide;
      html += '<section class="focus' + (glide ? ' glide' : '') + '" aria-labelledby="h1" data-parallax>' +
        '<button class="tick" type="button" id="focalTick" data-a="tick" data-k="' + esc(focal.key) + '" data-d="' + dk + '" data-fk="' + esc(focal.key) + '" aria-label="Mark ' + esc(focal.title) + ' done"><span class="tk-ring">' + icon('check') + '</span></button>' +
        '<div class="f-text"><p class="eyebrow-row"><span>' + esc(when) + '</span>' + focalPill(focal, dk, last) + '</p><h1 id="h1" class="f-title" tabindex="-1">' + esc(focal.title) + '</h1><p class="f-line">' + behindOf(focal) + '</p></div>' +
        '<div class="dl">' + dayLine(dk, items, isT) + '</div>' +
        '<p class="cheer" data-cheer>' + (M && M.cheer ? esc(M.cheer) : '') + '</p></section>';
    }
    var rest = items.filter(function (it) { return !focal || it.key !== focal.key; });
    if (rest.length) {
      html += '<h2 class="sec">' + (focal ? 'Also today' : 'Ticked today') + '</h2><ul class="items">' + rest.map(function (it) { return itemRow(it, dk); }).join('') + '</ul>';
    }
    var m = weekMon(THIS_WEEK), cells = '', pN = 0, dN = 0;
    for (var j = 0; j < 7; j++) {
      var day = addDays(m, j), k2 = key(day), fut = day > TODAY, st = dayStats(k2);
      if (!fut) { pN += st.n; dN += st.d; }
      var cls = fut ? 'fut' : st.n === 0 ? 'free' : st.d === st.n ? 'full' : st.d > 0 ? 'part' : 'none';
      var word = fut ? 'not yet' : st.n === 0 ? 'nothing planned' : st.d === st.n ? 'all done' : st.d > 0 ? 'some done' : 'not ticked';
      var fresh = M && M.dk === k2 ? ' fresh' : '';
      cells += '<li class="' + cls + (k2 === TK ? ' now' : '') + fresh + '"><span class="pip" aria-hidden="true">' + (cls === 'full' ? icon('check') : '') + '</span><span>' + DL[j] + '</span><span class="sr">' + DAY[j] + ': ' + word + '</span></li>';
    }
    html += '<section class="weekrow" aria-labelledby="wk-h"><h2 class="sec" id="wk-h">This week</h2><ul class="strip">' + cells + '</ul>' +
      '<p class="strip-note">' + dN + ' of ' + pN + ' planned so far. A missed one costs only itself; nothing resets.</p></section>';
    html += '<section class="jr"><label for="jr-in">One line for ' + (isT ? 'today' : 'this day') + '</label><input id="jr-in" class="line-in" data-in="journal" data-d="' + dk + '" value="' + esc(S.journal[dk] || '') + '" placeholder="What got in the way? One line is enough."><span class="saved" id="jr-saved" role="status"></span></section>';
    var byArea = S.areas.filter(function (a) { return S.habits.some(function (h) { return h.area === a.id; }); });
    html += '<details class="all" data-all' + (UI.showAll ? ' open' : '') + '><summary>All habits (' + S.habits.length + ')</summary><div>' +
      byArea.map(function (a) {
        return '<h3>' + esc(a.name) + '</h3><ul class="hrows">' + S.habits.filter(function (h) { return h.area === a.id; }).map(function (h) {
          var linked = h.act && blocksOn(dk).some(function (b) { return b.act === h.act; });
          var wk = h.period === 'day' ? (isDone(dk, 'h:' + h.id) ? 'Done today' : 'Not yet today') : habitWeek(h, THIS_WEEK) + ' of ' + h.count + ' this week';
          var right = linked ? '<span class="ok">Planned as a block</span>' :
            '<button class="chip" type="button" data-a="tick" data-k="h:' + h.id + '" data-d="' + dk + '" data-fk="h:' + h.id + '" aria-pressed="' + isDone(dk, 'h:' + h.id) + '">' + (isDone(dk, 'h:' + h.id) ? 'Ticked' : 'Tick') + '</button>';
          return '<li><div class="hn">' + esc(h.name) + '<span>' + needOf(h) + ' · ' + wk + '</span></div>' + right + '</li>';
        }).join('') + '</ul>';
      }).join('') + '</div></details>';
    return html;
  }

  /* Dreams */
  function fieldHTML(kind, label, value, a) {
    var id = kind + ':' + a.id;
    if (UI.edit === id) {
      return '<form class="field-v" data-form="' + kind + '" data-area="' + a.id + '"><label class="f-label" for="f-' + kind + '">' + label + '</label>' +
        '<textarea id="f-' + kind + '" class="line-in" name="v" rows="2">' + esc(value) + '</textarea>' +
        '<div class="row-btns"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" data-a="edit-cancel">Cancel</button></div></form>';
    }
    var prog = kind === 'target' && a.progress != null ? bar(a.progress, a.id) : '';
    return '<div class="field-v"><p class="f-label">' + label + '</p><p class="f-value">' + (value ? esc(value) : '<span class="muted">Not set yet.</span>') + '</p>' + prog +
      '<button class="btn quiet" type="button" data-a="edit" data-f="' + kind + '" data-area="' + a.id + '" data-fk="edit:' + id + '">Edit ' + label.toLowerCase() + '</button></div>';
  }
  function detailHTML(a) {
    var hs = S.habits.filter(function (h) { return h.area === a.id; }), ac = S.acts.filter(function (x) { return x.area === a.id; });
    var sched = schedOf(THIS_WEEK).slots;
    return '<section class="detail" aria-labelledby="d-h"><p class="eyebrow">' + stage(a.progress) + '</p><h2 id="d-h" class="d-title" tabindex="-1">' + dot(a.id) + esc(a.name) + '</h2>' +
      fieldHTML('goal', '5-year goal', a.goal5, a) + fieldHTML('target', '1-year target', a.target, a) +
      '<h3>Habits</h3>' + (hs.length ? '<ul class="hrows">' + hs.map(function (h) {
        return '<li><div class="hn">' + esc(h.name) + '<span>' + needOf(h) + (h.act ? ' · in the plan as ' + esc((actOf(h.act) || {}).name || '') : '') + '</span></div></li>';
      }).join('') + '</ul>' : '<p class="empty">No habits yet.</p>') +
      '<form class="addrow" data-form="habit" data-area="' + a.id + '"><label class="sr" for="nh">New habit</label><input id="nh" class="line-in" name="name" placeholder="New habit">' +
      '<select name="count" aria-label="Times a week">' + [1, 2, 3, 4, 5, 6, 7].map(function (n) { return '<option value="' + n + '"' + (n === 3 ? ' selected' : '') + '>' + n + ' a week</option>'; }).join('') + '</select>' +
      '<button class="btn" type="submit">Add habit</button></form>' +
      '<h3>Activities</h3>' + (ac.length ? '<ul class="hrows">' + ac.map(function (x) {
        var n = sched.filter(function (s) { return s[3] === x.id; }).length;
        return '<li><div class="hn">' + esc(x.name) + '<span>' + (n ? plural(n, 'block', 'blocks') + ' a week in My week' : 'Not in a week yet') + '</span></div></li>';
      }).join('') + '</ul>' : '<p class="empty">No activities yet. Add one in Week.</p>') + '</section>';
  }
  function dreamsView() {
    var sel = areaOf(UI.dream) || S.areas[0];
    var amb = UI.edit === 'amb'
      ? '<form class="amb-card" data-form="amb" style="display:grid"><label class="f-label" for="f-amb">Your ambition, in a sentence</label><textarea id="f-amb" class="line-in" name="v" rows="3">' + esc(S.ambition) + '</textarea><div class="row-btns"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" data-a="edit-cancel">Cancel</button></div></form>'
      : '<div class="amb-card"><p class="amb-big">' + (S.ambition ? esc(S.ambition) : '<span class="muted">Not written yet.</span>') + '</p><button class="btn quiet" type="button" data-a="edit" data-f="amb" data-fk="edit:amb">Edit</button></div>';
    var rows = S.areas.map(function (a) {
      var st = a.progress == null ? '<span class="muted">No 1-year target yet</span>' : bar(a.progress, a.id) + '<span>' + a.progress + '%</span> <span class="muted">' + stage(a.progress) + '</span>';
      return '<li><button class="area-row lift" type="button" data-a="area" data-area="' + a.id + '" data-fk="area-' + a.id + '"' + (a.id === sel.id ? ' aria-current="true"' : '') + '>' + dot(a.id) +
        '<span class="ar-name">' + esc(a.name) + '</span><span class="ar-goal">' + (a.goal5 ? esc(a.goal5) : 'No 5-year goal yet') + '</span><span class="ar-status">' + st + '</span></button></li>';
    }).join('');
    return head('Plan · Dreams', 'Dreams', 'The why. Each life area has a 5-year goal and a 1-year target. The habits and activities below serve them.') +
      amb + '<div class="dreams"><ul class="areas" aria-label="Life areas">' + rows + '</ul>' + detailHTML(sel) + '</div>';
  }

  /* Week */
  // The donut: one slice per life area with planned hours, then the free part. Each slice has a tooltip.
  function donutHTML(by, free) {
    var segs = Object.keys(by).filter(function (k) { return k !== 'none'; }).sort(function (a, b) { return by[b] - by[a]; });
    var cum = 0, out = '';
    var slice = function (h, col, label) {
      var p = h / AWAKE * 100;
      if (p <= 0) return;
      out += '<circle tabindex="0" data-tip="' + esc(label) + '" cx="21" cy="21" r="15.9155" pathLength="100" stroke="' + col + '" stroke-dasharray="' + p.toFixed(2) + ' ' + (100 - p).toFixed(2) + '" stroke-dashoffset="' + (-cum).toFixed(2) + '"/>';
      cum += p;
    };
    segs.forEach(function (k) { var a = areaOf(k); slice(by[k], 'var(--c-' + k + ')', (a ? a.name : '') + ': ' + by[k] + ' hours a week'); });
    slice(free, 'var(--line)', 'Free: ' + free + ' hours, not planned');
    return { svg: out, segs: segs };
  }
  function weekView() {
    var sid = UI.wkSched, sc = S.schedules[sid], slots = sc.slots;
    var hrs = slotsHours(slots), by = areaHours(slots), free = Math.max(0, AWAKE - hrs);
    var used = 0; for (var w = 1; w <= 53; w++) if ((S.weekSched[w] || 'my') === sid) used++;
    var chips = Object.keys(S.schedules).map(function (id) {
      return '<button class="chip" type="button" data-a="sched" data-id="' + id + '" data-fk="sched-' + id + '" aria-pressed="' + (id === sid) + '">' + esc(S.schedules[id].name) + '</button>';
    }).join('');
    var dn = donutHTML(by, free);
    var legend = dn.segs.map(function (k) { var a = areaOf(k); return '<li>' + dot(k) + '<span>' + esc(a ? a.name : '') + '</span><span class="hr num">' + by[k] + ' h</span><span class="pc num">' + Math.round(by[k] / AWAKE * 100) + '%</span></li>'; }).join('') +
      '<li><span class="free" aria-hidden="true"></span><span>Free</span><span class="hr num">' + free + ' h</span><span class="pc num">' + Math.round(free / AWAKE * 100) + '%</span></li>';
    var where = '<section class="where" aria-labelledby="wh"><div class="where-grid"><div class="dn-wrap"><svg class="dn" viewBox="0 0 42 42" role="group" aria-label="' + hrs + ' hours planned, ' + free + ' hours free">' + dn.svg + '</svg>' +
      '<div class="dn-c"><b class="num">' + hrs + ' h</b><span>planned</span></div></div>' +
      '<div><p class="eyebrow" id="wh">Where the week goes</p><p class="where-sum"><b class="num">' + hrs + ' h</b> planned · <b class="num">' + free + ' h</b> free · ' + AWAKE + ' h awake</p>' +
      '<ul class="legend">' + legend + '</ul>' +
      '<p class="muted" style="font-size:14px;margin-top:14px">Sleep is not counted. Awake time is 7 AM to 10 PM. ' + esc(sc.name) + ' is used in ' + used + ' weeks of 2026.</p></div></div></section>';
    var days = '<div class="daytabs" role="group" aria-label="Day">' + DS.map(function (n, i) {
      return '<button type="button" data-a="wkday" data-d="' + i + '" aria-pressed="' + (UI.wkDay === i) + '" aria-label="' + DAY[i] + '">' + DL[i] + '</button>';
    }).join('') + '</div>';
    var hl = '', h0 = 7, h1 = 21;
    hl += '<div class="colhead"></div>';
    for (var h = h0; h <= h1; h++) hl += '<div>' + hr(h) + '</div>';
    if (S.showSleep) hl += '<div class="sleepl">Sleep</div>';
    var cols = DS.map(function (n, d) {
      var c = '<div class="col" data-d="' + d + '"><div class="col-head' + (addDays(weekMon(THIS_WEEK), d).getTime() === TODAY.getTime() ? ' today' : '') + '">' + n + '</div>';
      for (var hh = h0; hh <= h1; hh++) {
        var s = slots.filter(function (x) { return x[0] === d && x[1] <= hh && hh < x[2]; })[0];
        var a = s ? actOf(s[3]) : null, first = s && s[1] === hh;
        c += '<button class="cell' + (s ? ' on' : '') + (first ? ' start' : '') + '" type="button" data-cell data-d="' + d + '" data-h="' + hh + '" aria-label="' + DAY[d] + ' ' + hr(hh) + ', ' + (a ? esc(a.name) : 'free') + '"' +
          (a ? ' style="--c:var(--c-' + a.area + ')"' : '') + ' aria-pressed="false">' + (first ? '<span class="lbl">' + esc(a ? a.name : '') + '</span>' : '') + '</button>';
      }
      if (S.showSleep) c += '<div class="sleepband" aria-hidden="true">Sleep</div>';
      return c + '</div>';
    }).join('');
    return head('Plan · Week ' + THIS_WEEK + ', 2 to 8 November 2026', 'This week',
      'Schedule: <b>' + esc(sc.name) + '</b>. Every week uses it unless Year says otherwise. Tap or drag hours on the grid, then choose what goes there.') +
      '<div class="wk-top"><div class="chips" role="group" aria-label="Schedules">' + chips + '<button class="chip" type="button" data-a="sched-new">+ New schedule</button></div></div>' +
      where +
      '<div class="gridbar"><button class="switch" type="button" role="switch" aria-checked="' + S.showSleep + '" data-a="sleep" data-fk="sleep"><span class="track" aria-hidden="true"></span><span>Show sleep</span></button>' + days + '</div>' +
      '<div class="wk" id="wk" data-day="' + UI.wkDay + '"><div class="hrs" aria-hidden="true">' + hl + '</div>' + cols + '<div class="ghost" id="ghost" aria-hidden="true" hidden><span></span></div></div>' +
      '<div class="selbar" id="selbar" role="region" aria-label="Selected hours" aria-live="polite"></div>' +
      '<p class="wk-msg" id="wkmsg" role="status"></p>';
  }
  function selbarHTML() {
    if (!UI.sel) return '';
    var s = UI.sel, n = s.b - s.a + 1;
    var head = '<p><b>' + DAY[s.d] + '</b>, ' + span(s.a, s.b + 1) + ' · <span class="num">' + n + ' h</span> selected</p>';
    if (UI.choose) {
      return head + '<p class="muted" style="font-size:15px">Choose what goes in these hours. It replaces what is there.</p><div class="chooser">' +
        S.acts.map(function (a) { return '<button class="chip" type="button" data-a="wk-apply" data-act="' + a.id + '" data-fk="act-' + a.id + '">' + dot(a.area) + esc(a.name) + '</button>'; }).join('') +
        '</div><div class="row-btns"><button class="btn" type="button" data-a="wk-back" data-fk="wk-back">Back</button></div>';
    }
    return head + '<div class="row-btns"><button class="btn primary" type="button" data-a="wk-choose" data-fk="wk-choose">Add to these hours</button>' +
      '<button class="btn" type="button" data-a="wk-clear" data-fk="wk-clear">Clear these hours</button><button class="btn quiet" type="button" data-a="wk-cancel" data-fk="wk-cancel">Cancel</button></div>';
  }
  // The ghost block: a dashed preview over the selected hours. It snaps to whole hours (the cells) as the drag moves.
  function positionGhost() {
    var g = $('#ghost'), wk = $('#wk');
    if (!g || !wk) return;
    var a = UI.sel && wk.querySelector('.cell[data-d="' + UI.sel.d + '"][data-h="' + UI.sel.a + '"]');
    var b = UI.sel && wk.querySelector('.cell[data-d="' + UI.sel.d + '"][data-h="' + UI.sel.b + '"]');
    if (!a || !b || a.offsetParent === null) { g.hidden = true; return; }
    var wr = wk.getBoundingClientRect(), ar = a.getBoundingClientRect(), br = b.getBoundingClientRect(), col = a.parentNode.getBoundingClientRect();
    g.hidden = false;
    g.style.left = (col.left - wr.left) + 'px';
    g.style.width = col.width + 'px';
    g.style.top = (ar.top - wr.top) + 'px';
    g.style.height = (br.bottom - ar.top) + 'px';
    g.firstChild.textContent = (UI.sel.b - UI.sel.a + 1) + ' h';
  }
  function renderSel() {
    var bar = $('#selbar'); if (!bar) return;
    bar.innerHTML = selbarHTML();
    $$('.cell', $('#wk')).forEach(function (c) {
      var on = UI.sel && +c.dataset.d === UI.sel.d && +c.dataset.h >= UI.sel.a && +c.dataset.h <= UI.sel.b;
      c.classList.toggle('sel', !!on);
      c.setAttribute('aria-pressed', !!on);
    });
    positionGhost();
  }
  function setSel(d, a, b) {
    UI.sel = { d: d, a: Math.min(a, b), b: Math.max(a, b) };
    UI.choose = false;
    renderSel();
  }
  function applyWeek(act) {
    var sc = S.schedules[UI.wkSched], s = UI.sel;
    sc.slots = sc.slots.filter(function (x) { return !(x[0] === s.d && x[1] <= s.b && x[2] > s.a); });
    sc.slots.push([s.d, s.a, s.b + 1, act]);
    var a = actOf(act);
    UI.sel = null; UI.choose = false;
    render();
    var m = $('#wkmsg'); if (m) m.textContent = 'Added ' + (a ? a.name : 'it') + ' on ' + DAY[s.d] + ', ' + span(s.a, s.b + 1) + '.';
  }
  function clearWeek() {
    var sc = S.schedules[UI.wkSched], s = UI.sel;
    sc.slots = sc.slots.filter(function (x) { return !(x[0] === s.d && x[1] <= s.b && x[2] > s.a); });
    UI.sel = null; UI.choose = false;
    render();
    var m = $('#wkmsg'); if (m) m.textContent = 'Cleared ' + DAY[s.d] + ', ' + span(s.a, s.b + 1) + '.';
  }

  /* Year */
  var YEAR_ROWS = 4, YEAR_COLS = 14;
  function yearView() {
    var counts = {}, paintHTML = '';
    for (var w = 1; w <= 53; w++) { var id = S.weekSched[w] || 'my'; counts[id] = (counts[id] || 0) + 1; }
    var ids = Object.keys(S.schedules);
    var tools = ids.map(function (id) {
      return '<button class="chip" type="button" data-a="paint" data-id="' + id + '" data-fk="paint-' + id + '" aria-pressed="' + (UI.paint === id) + '">' + esc(S.schedules[id].name) + '</button>';
    }).join('') + '<button class="chip" type="button" data-a="paint" data-id="clear" data-fk="paint-clear" aria-pressed="' + (UI.paint === 'clear') + '">Clear to My week</button>';
    var rows = '';
    var starts = ['Jan', 'Apr', 'Jul', 'Oct'];
    for (var r = 0; r < YEAR_ROWS; r++) {
      var sq = '';
      for (var c = 0; c < YEAR_COLS; c++) {
        var wk = r * YEAR_COLS + c + 1;
        if (wk > 53) { sq += '<span></span>'; continue; }
        var sid = S.weekSched[wk] || 'my', mon = weekMon(wk);
        var label = 'Week ' + wk + ', from ' + mon.getDate() + ' ' + MS[mon.getMonth()] + ': ' + S.schedules[sid].name + (wk === THIS_WEEK ? ', this week' : '');
        sq += '<button class="sq ' + (sid === 'my' ? 'mine' : sid) + (wk === THIS_WEEK ? ' now' : '') + '" type="button" data-w="' + wk + '" style="--i:' + (wk - 1) + '" data-tip="' + esc(label) + '" aria-label="' + esc(label) + '"></button>';
      }
      rows += '<div class="yrow"><span>' + starts[r] + '</span>' + sq + '</div>';
    }
    var awake = 53 * AWAKE, planned = 0, byA = {};
    for (var q = 1; q <= 53; q++) {
      var sc = schedOf(q), h = areaHours(sc.slots);
      Object.keys(h).forEach(function (k) { if (k === 'none') return; byA[k] = (byA[k] || 0) + h[k]; planned += h[k]; });
    }
    var keys = Object.keys(byA).sort(function (a, b) { return byA[b] - byA[a]; });
    var segs = keys.map(function (k, i) { return '<i style="--c:var(--c-' + k + ');width:' + (byA[k] / awake * 100).toFixed(3) + '%;--i:' + i + '" tabindex="0" data-tip="' + esc(areaOf(k).name) + ': ' + byA[k] + ' hours of ' + awake + ' awake, ' + Math.round(byA[k] / awake * 100) + ' percent"></i>'; }).join('');
    var list = keys.map(function (k) {
      return '<li>' + dot(k) + '<span>' + esc(areaOf(k).name) + '</span><span class="hr num">' + byA[k].toLocaleString('en-GB') + ' h</span><span class="pc num">' + Math.round(byA[k] / awake * 100) + '%</span></li>';
    }).join('') + '<li><span class="free" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--hatch);border:1px solid var(--line)"></span><span>Free</span><span class="hr num">' + (awake - planned).toLocaleString('en-GB') + ' h</span><span class="pc num">' + Math.round((awake - planned) / awake * 100) + '%</span></li>';
    return head('Plan · Year', 'The year', 'Most weeks use My week. Paint the exceptions, such as a holiday. The bar shows what the year holds.') +
      '<section class="paint"><div class="paint-row" role="group" aria-label="Paint with"><span>Paint with</span>' + tools + '</div></section>' +
      '<section class="yearcard lift" aria-labelledby="yw-h"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline"><h2 id="yw-h">Which weeks use which schedule</h2><span class="muted num" id="yw-count">' + (counts.my || 0) + ' My week · ' + (counts.holiday || 0) + ' Holiday · ' + (counts.deep || 0) + ' Deep work</span></div>' +
        '<p class="muted" style="margin-top:6px;font-size:15px">Pick a schedule above, then click or drag across the weeks. Week ' + THIS_WEEK + ' is outlined.</p>' +
        '<div class="ygrid" id="ygrid">' + rows + '</div>' +
        '<div class="ylegend"><span><i style="background:var(--accent-soft)"></i>My week</span><span><i style="background:var(--accent)"></i>Deep work</span><span><i style="background:var(--sand)"></i>Holiday</span><span><i style="background:transparent;box-shadow:0 0 0 2px var(--surface),0 0 0 3.5px var(--ink)"></i>This week</span></div></section>' +
      '<section class="yearcard lift" aria-labelledby="yb-h"><p class="eyebrow" id="yb-h">Planned hours in 2026</p><p class="bigyear">' + planned.toLocaleString('en-GB') + ' h <span class="muted" style="font-size:18px;font-weight:400;letter-spacing:0">of ' + awake.toLocaleString('en-GB') + ' awake hours</span></p>' +
        '<div class="bar stack" role="img" aria-label="' + planned + ' hours planned of ' + awake + ' awake">' + segs + '</div>' +
        '<ul class="yshares">' + list + '</ul><p class="muted" style="font-size:14px;margin-top:14px">Sleep is not counted. Awake time is 7 AM to 10 PM each day.</p></section>';
  }
  function paintWeek(w) {
    if (UI.paint === 'clear') delete S.weekSched[w];
    else S.weekSched[w] = UI.paint;
    var sq = $('.sq[data-w="' + w + '"]');
    if (sq) { sq.className = 'sq ' + ((S.weekSched[w] || 'my') === 'my' ? 'mine' : S.weekSched[w]) + (w === THIS_WEEK ? ' now' : ''); }
  }

  /* Progress */
  function progressView() {
    var weeks = [38, 39, 40, 41, 42, 43, 44, 45], tp = 0, td = 0;
    var bars = weeks.map(function (w, i) {
      var st = weekStats(w); tp += st.pH; td += st.dH;
      var r = st.pH ? st.dH / st.pH : 0, now = w === THIS_WEEK, v = Math.max(0.06, r);
      var tip = 'Week ' + w + (now ? ' so far' : '') + ': ' + Math.round(r * 100) + ' percent of ' + Math.round(st.pH) + ' planned hours ticked.';
      return '<div class="tcol' + (now ? ' now' : '') + '" tabindex="0" data-tip="' + esc(tip) + '"><span class="pct num">' + (st.pH ? Math.round(r * 100) + '%' : '-') + '</span><span class="tbar" aria-hidden="true"><i style="--v:' + v.toFixed(3) + ';--i:' + i + '"></i></span><span class="wkl">' + (now ? 'So far' : 'Wk ' + w) + '</span><span class="sr">' + esc(tip) + '</span></div>';
    }).join('');
    var rec = weekStats(THIS_WEEK), areas = areaWeek(THIS_WEEK), top = null, low = null;
    Object.keys(areas).forEach(function (k) {
      var a = areas[k]; if (!a.p) return;
      var r = a.d / a.p, an = areaOf(k);
      if (!top || r > top.r) top = { r: r, n: an.name };
      if (!low || r < low.r) low = { r: r, n: an.name };
    });
    var recapBody = !S.set.recap ? '<p class="recap-p">The weekly recap is off. Turn it on in the settings below.</p>' :
      S.recap === 'closed' ? '<p class="recap-t">Week 45 is closed.</p><p class="recap-p">Nothing is lost. Week 46 is ready when you are.</p>' +
        '<div class="row-btns"><a class="btn primary" href="#plan/week">Plan next week</a><button class="btn quiet" type="button" data-a="recap-open" data-fk="recap-open">Reopen</button></div>' :
      '<p class="recap-t">This week, so far</p><p class="recap-p"><span class="big num">' + Math.round(rec.dH) + ' of ' + Math.round(rec.pH) + '</span> planned hours ticked.' +
        (top && low && top.n !== low.n ? ' ' + esc(top.n) + ' was the steadiest. ' + esc(low.n) + ' had the most misses.' : '') + '</p>' +
        '<div class="row-btns"><button class="btn primary" type="button" data-a="recap-start" data-fk="recap-start">Start the recap</button></div>';
    var ms = S.set.milestones ? '<ul class="ms"><li><span>9 Oct</span><span>First planned hour ticked.</span></li><li><span>18 Oct</span><span>Physical had a full week.</span></li><li><span>28 Oct</span><span>Relational reached Steady.</span></li></ul>' :
      '<p class="muted" style="margin-top:12px;font-size:15px">Milestone lines are off. Your progress is still here.</p>';
    var sw = function (k, label, note) {
      return '<div><span>' + label + (note ? '<small>' + note + '</small>' : '') + '</span><button class="switch" type="button" role="switch" aria-checked="' + !!S.set[k] + '" data-a="set" data-set="' + k + '" data-fk="set-' + k + '"><span class="track" aria-hidden="true"></span><span class="sr">' + label + '</span></button></div>';
    };
    return head('Progress · weeks 38 to 45', 'Progress', '') +
      '<p class="headline">Over the last eight weeks you ticked <b>' + inWords(td / tp) + '</b> of the hours you planned.</p>' +
      '<section class="card lift" aria-labelledby="tr-h"><h2 id="tr-h">Week by week</h2><p class="muted" style="font-size:15px;margin-top:4px">Share of planned hours ticked. This week is dashed until it ends. Hover or focus a week for its figure.</p><div class="trend">' + bars + '</div></section>' +
      '<section class="card lift" aria-labelledby="dp-h"><h2 id="dp-h">Your dream path</h2><p class="muted" style="font-size:15px;margin-top:4px">From today to each 1-year target. Each dot fills with how far that area has come. Select one to open it in Dreams.</p><div class="dpath" data-dpath></div></section>' +
      '<div class="grid2"><div class="stack">' +
      '<section class="card lift" aria-labelledby="rc-h"><p class="eyebrow" id="rc-h">Weekly recap</p>' + recapBody + '</section>' +
      '<section class="card lift" aria-labelledby="ms-h"><h2 id="ms-h">Milestones</h2>' + ms + '</section></div>' +
      '<section class="card lift" aria-labelledby="st-h"><h2 id="st-h">Settings</h2><p class="muted" style="font-size:14px;margin-top:4px">Each one switches off on its own. Nothing here compares you with anyone.</p><div class="setlist">' +
      sw('recap', 'Weekly recap', 'A short summary of your own week') + sw('milestones', 'Milestone lines', 'One calm line at a time, never blocking a tick') + sw('celebrate', 'Calm line when a day is done', 'No sound, no confetti') + '</div></section></div>';
  }

  /* The recap ceremony: a short overlay, one slide at a time, then a closing moment. */
  function cerData() {
    var rec = weekStats(THIS_WEEK), areas = areaWeek(THIS_WEEK);
    var list = Object.keys(areas).filter(function (k) { return areas[k].p; }).map(function (k) {
      return { id: k, name: areaOf(k).name, d: Math.round(areas[k].d), p: Math.round(areas[k].p), r: areas[k].d / areas[k].p };
    }).sort(function (a, b) { return b.r - a.r; });
    return { dH: Math.round(rec.dH), pH: Math.round(rec.pH), list: list, next: nextAction() };
  }
  var CER_LAST = 3;
  function cerHTML() {
    var c = UI.cer, D = c.data, s = c.step, body = '';
    if (s === 0) {
      body = '<div class="cer-slide enter"><p class="eyebrow">Week 45 · so far</p><h2 id="cer-h" tabindex="-1">Here is your week so far.</h2><p class="cer-big num">' + D.dH + ' of ' + D.pH + '</p><p>planned hours ticked. A missed hour costs only itself; nothing resets.</p></div>';
    } else if (s === 1) {
      var rows = D.list.slice(0, 4).map(function (x) { return '<li>' + dot(x.id) + '<span>' + esc(x.name) + '</span><span class="num">' + x.d + ' of ' + x.p + ' h</span></li>'; }).join('');
      var low = D.list[D.list.length - 1], top = D.list[0];
      body = '<div class="cer-slide enter"><p class="eyebrow">Where it went</p><h2 id="cer-h" tabindex="-1">Steady where it counted.</h2>' +
        (rows ? '<ul class="cer-list">' + rows + '</ul>' + (top && low && top.id !== low.id ? '<p>' + esc(top.name) + ' was the steadiest. ' + esc(low.name) + ' had the most misses, and that is fine for one week.</p>' : '') : '<p>No planned hours were due yet this week.</p>') + '</div>';
    } else if (s === 2) {
      var nx = D.next;
      body = '<div class="cer-slide enter"><p class="eyebrow">Carry forward</p><h2 id="cer-h" tabindex="-1">One thing for next week.</h2>' +
        (nx ? '<p>Start next week with <b>' + esc(nx.name) + '</b>. It is planned ' + nx.count + ' ' + (nx.count === 1 ? 'time' : 'times') + ' a week, and it fits your plan.</p>' : '<p>Keep the plan you have. Nothing needs changing.</p>') + '</div>';
    } else {
      body = '<div class="cer-slide enter">' + illRing() + '<h2 id="cer-h" tabindex="-1">Week 45 is closed.</h2><p>Nothing is lost. Week 46 is ready when you are.</p></div>';
    }
    var dots = '<span class="cer-dots" aria-hidden="true">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i === s ? 'on' : '') + '"></i>'; }).join('') + '</span>';
    var foot = '<div class="cer-foot">' + dots + '<div class="row-btns" style="margin-top:0">' +
      (s > 0 ? '<button class="btn quiet" type="button" data-a="cer-back">Back</button>' : '') +
      (s < CER_LAST ? '<button class="btn primary" type="button" data-a="cer-next">Next</button>' : '<a class="btn" href="#plan/week" data-a="cer-plan">Plan next week</a><button class="btn primary" type="button" data-a="cer-done">Done for the week</button>') +
      '</div></div>';
    return '<div class="cer-card" role="dialog" aria-modal="true" aria-labelledby="cer-h">' +
      '<div class="cer-top"><p class="eyebrow">Weekly recap · week 45</p><button class="btn quiet" type="button" data-a="cer-close">Close</button></div>' +
      body + foot + '</div>';
  }
  function cerRender(focus) {
    var el = $('#cer'); el.hidden = false; el.innerHTML = cerHTML();
    if (focus) { var h = $('#cer-h'); if (h) h.focus({ preventScroll: true }); }
  }
  function openCer(trigger) { UI.cer = { step: 0, data: cerData(), from: trigger || 'recap-start' }; cerRender(true); }
  function closeCer(done) {
    var from = UI.cer ? UI.cer.from : null;
    UI.cer = null;
    var el = $('#cer'); el.hidden = true; el.innerHTML = '';
    if (done) S.recap = 'closed';
    UI.focusKey = done ? 'recap-open' : from;
    render();
  }

  /* First run */
  function frHead(title, lede) {
    return '<h1 id="h1" tabindex="-1" data-fk="fr-h">' + title + '</h1>' + (lede ? '<p class="lede">' + lede + '</p>' : '');
  }
  function setupView() {
    var step = FR.step, total = 6, out = '';
    var prog = step === 0 ? 0 : Math.round(step / total * 100);
    var top = '<div class="su-top"><a class="brand" href="#today" style="font-size:18px"><svg aria-hidden="true" style="width:24px;height:24px"><use href="#i-brand"/></svg><span>Timely</span></a>' +
      (step === 0 ? '<span class="eyebrow">First visit</span>' : '<span class="eyebrow">Step ' + step + ' of ' + total + '</span>') + '</div><div class="su-prog" aria-hidden="true"><i style="width:' + prog + '%"></i></div>';
    var err = FR.err ? '<p class="err" role="alert">' + esc(FR.err) + '</p>' : '';
    var foot = '';
    var enter = FR.shown !== step ? ' enter' : '';
    FR.shown = step;
    if (step === 0) {
      out = illPath() + frHead('Set up your plan in about three minutes.', 'Five short questions. You read the draft before anything is saved, and you can change anything in it.') +
        '<div class="row-btns"><button class="btn primary" type="button" data-a="fr-next" data-fk="fr-next">Start</button><button class="btn" type="button" data-a="fr-starter" data-fk="fr-starter">Use a starter instead</button></div>';
    } else if (step === 1) {
      out = frHead('What do you want to become?', 'One sentence. It can be rough, and you can change it later.') + err +
        '<label class="sr" for="fr-amb">Your ambition</label><textarea id="fr-amb" class="line-in" data-fr-in="amb" data-fk="fr-amb" rows="3" placeholder="For example: Stronger, calmer, and able to keep up with my kids.">' + esc(FR.amb) + '</textarea>';
      foot = '<button class="btn quiet" type="button" data-a="fr-back" data-fk="fr-back">Back</button><span class="end"><button class="btn primary" type="button" data-a="fr-next" data-fk="fr-next">Continue</button></span>';
    } else if (step === 2) {
      out = frHead('What matters most this year?', 'Choose one to three. We start with the first one you pick.') + err +
        '<div class="chips" role="group" aria-label="Life areas">' + AREA_DEFS.map(function (a) {
          var on = FR.areas.indexOf(a.id) >= 0, full = !on && FR.areas.length >= 3;
          return '<button class="chip" type="button" data-a="fr-area" data-id="' + a.id + '" data-fk="fr-area-' + a.id + '" aria-pressed="' + on + '"' + (full ? ' disabled' : '') + '>' + dot(a.id) + esc(a.name) + '</button>';
        }).join('') + '</div>';
      foot = '<button class="btn quiet" type="button" data-a="fr-back" data-fk="fr-back">Back</button><span class="end"><button class="btn primary" type="button" data-a="fr-next" data-fk="fr-next">Continue</button></span>';
    } else if (step === 3) {
      var aid = FR.areas[0], rule = FOLLOW[aid];
      out = frHead(rule.q, 'This sets the first habit for ' + esc(areaOf(aid).name) + '. Not sure uses the default.') + err +
        '<div class="chips" role="group" aria-label="Answers">' + rule.opts.map(function (o, i) {
          return '<button class="chip" type="button" data-a="fr-opt" data-opt="' + i + '" data-fk="fr-opt-' + i + '" aria-pressed="' + (FR.fol[aid] === i) + '">' + esc(o.label) + '</button>';
        }).join('') + '<button class="chip" type="button" data-a="fr-opt" data-opt="unsure" data-fk="fr-opt-unsure" aria-pressed="' + (FR.fol[aid] === 'unsure') + '">Not sure</button></div>';
      foot = '<button class="btn quiet" type="button" data-a="fr-back" data-fk="fr-back">Back</button><span class="end"><button class="btn primary" type="button" data-a="fr-next" data-fk="fr-next">Continue</button></span>';
    } else if (step === 4) {
      out = frHead('What does a normal week look like?', 'Tick what applies. Sleep is never asked.') +
        '<div class="chips" role="group" aria-label="A normal week">' + [['working', 'Working days'], ['evenings', 'Free evenings'], ['weekend', 'Free weekends']].map(function (p) {
          return '<button class="chip" type="button" data-a="fr-week" data-w="' + p[0] + '" data-fk="fr-w-' + p[0] + '" aria-pressed="' + !!FR.week[p[0]] + '">' + p[1] + '</button>';
        }).join('') + '</div>' +
        '<label for="fr-extra" class="f-label">Anything else? (optional)</label><textarea id="fr-extra" class="line-in" data-fr-in="extra" data-fk="fr-extra" rows="2">' + esc(FR.extra) + '</textarea>';
      foot = '<button class="btn quiet" type="button" data-a="fr-back" data-fk="fr-back">Back</button><span class="end"><button class="btn primary" type="button" data-a="fr-next" data-fk="fr-next">Continue</button></span>';
    } else if (step === 5) {
      out = frHead('How many hours can you give your goals each week?', 'Sleep is not counted. Three hours is enough to start.') +
        '<div class="stepper"><button class="btn" type="button" data-a="fr-hours" data-d="-1" aria-label="Fewer hours" data-fk="fr-less">&minus;</button><output id="fr-h" aria-live="polite">' + FR.hours + ' h</output><button class="btn" type="button" data-a="fr-hours" data-d="1" aria-label="More hours" data-fk="fr-more">+</button></div>' +
        (FR.hours < 3 ? '<p class="note">Three hours is enough to start. You can add more later.</p><div class="row-btns"><button class="btn" type="button" data-a="fr-starter" data-fk="fr-starter">Use a starter instead</button></div>' : '');
      foot = '<button class="btn quiet" type="button" data-a="fr-back" data-fk="fr-back">Back</button><span class="end"><button class="btn primary" type="button" data-a="fr-next" data-fk="fr-next">See my draft</button></span>';
    } else {
      var d = FR.draft;
      out = frHead('Your draft plan', 'A draft from your answers. Edit anything. Nothing is saved until you accept.') +
        '<p class="note">' + esc(d.note) + '</p>' +
        '<div class="draft"><div><p class="f-label">Your ambition</p><textarea class="line-in" data-fr-in="d-amb" aria-label="Ambition" rows="2">' + esc(d.ambition) + '</textarea></div>' +
        d.areas.map(function (aid, i) {
          var h = d.habits.filter(function (x) { return x.area === aid; })[0], a = areaOf(aid);
          return '<div><p class="area-h">' + dot(aid) + esc(a.name) + '</p>' +
            '<label class="f-label" for="dt-' + i + '">1-year target</label><input id="dt-' + i + '" class="line-in" data-fr-in="d-target" data-i="' + aid + '" value="' + esc(d.targets[aid]) + '">' +
            '<label class="f-label" for="dh-' + i + '">Habit</label><input id="dh-' + i + '" class="line-in" data-fr-in="d-habit" data-i="' + i + '" value="' + esc(h.name) + '">' +
            '<p class="src">' + needOf(h) + (h.act ? ' · with ' + esc((actOf(h.act) || {}).name || '') : '') + '. ' + esc(h.src) + '</p></div>';
        }).join('') +
        '<div><p class="f-label">Your week, as a draft</p>' + miniWeek(d) + '</div></div>' +
        (function () { var fa = firstActionOf(d); return '<p class="fa">' + (fa ? 'Your first action: <b>' + esc(fa.name) + '</b>, ' + DAY[fa.wd] + ' at ' + hr(fa.h) + '.' : 'Your first action: add one habit in Week.') + '</p>'; })();
      foot = '<button class="btn quiet" type="button" data-a="fr-back" data-fk="fr-back">Back</button><span class="end"><button class="btn quiet" type="button" data-a="fr-starter" data-fk="fr-starter">Use a starter instead</button><button class="btn primary" type="button" data-a="fr-accept" data-fk="fr-accept">Accept plan</button></span>';
    }
    return '<div class="su-wrap">' + top + '<div class="su-body' + enter + '">' + out + '</div>' + (foot ? '<div class="su-foot">' + foot + '</div>' : '') + '</div>';
  }
  function miniWeek(d) {
    var i = 0;
    var cols = DS.map(function (n, wd) {
      var b = d.slots.filter(function (s) { return s[0] === wd; }).map(function (s) {
        var a = actOf(s[3]) || { name: '', area: 'prof' };
        return '<div class="mb" style="--c:var(--c-' + a.area + ');--i:' + (i++) + '">' + esc(a.name) + ' ' + hr(s[1]).replace(' ', '') + '</div>';
      }).join('');
      return '<div><span class="dh">' + n + '</span>' + b + '</div>';
    }).join('');
    return '<div class="mini">' + cols + '</div>';
  }

  /* ── 6. Render, routes and the lively layer ──────────────── */
  function render() {
    var route = UI.route;
    $$('[data-nav]').forEach(function (a) {
      var on = (route === 'today' && a.dataset.nav === 'today') || (route === 'plan' && a.dataset.nav === 'plan') || (route === 'progress' && a.dataset.nav === 'progress');
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var app = $('#app'), setup = $('#setup');
    if (route === 'setup') {
      app.hidden = true; setup.hidden = false;
      setup.innerHTML = setupView();
      document.title = 'Set up your plan · Timely prototype A2';
      afterRender(); return;
    }
    app.hidden = false; setup.hidden = true;
    var html;
    if (route === 'today') { html = todayView(); document.title = 'Today · Timely prototype A2'; }
    else if (route === 'progress') { html = progressView(); document.title = 'Progress · Timely prototype A2'; }
    else {
      var subs = [['dreams', 'Dreams'], ['week', 'Week'], ['year', 'Year']];
      var nav = '<nav class="subnav" aria-label="Plan views">' + subs.map(function (s) {
        return '<a href="#plan/' + s[0] + '"' + (UI.sub === s[0] ? ' aria-current="page"' : '') + '>' + s[1] + '</a>';
      }).join('') + '</nav>';
      html = nav + (UI.sub === 'week' ? weekView() : UI.sub === 'year' ? yearView() : dreamsView());
      document.title = (UI.sub === 'week' ? 'Week' : UI.sub === 'year' ? 'Year' : 'Dreams') + ' · Timely prototype A2';
    }
    paint(html);
  }
  // Route changes cross-fade with the View Transitions API; without it, a short CSS fade. Ticks re-render in place.
  function paint(html) {
    var v = $('#view'), nav = UI.nav, lively = !calm();
    UI.nav = false;
    // Draw-ins play on a route change only; a tick or a recap step re-renders without replaying the charts.
    var put = function () { v.innerHTML = html; v.classList.toggle('still', !nav); afterRender(); };
    if (nav && lively && document.startViewTransition) {
      // A quick second navigation skips the first transition; its promises reject, so they are caught here.
      var vt = document.startViewTransition(put);
      [vt.ready, vt.finished, vt.updateCallbackDone].forEach(function (p) { if (p && p.catch) p.catch(function () {}); });
      return;
    }
    if (nav && lively) { v.classList.remove('view-enter'); void v.offsetWidth; v.classList.add('view-enter'); }
    put();
  }
  function afterRender() {
    var target = UI.focusKey ? document.querySelector('[data-fk="' + UI.focusKey.replace(/"/g, '') + '"]') : null;
    if (target) target.focus({ preventScroll: true });
    else if (UI.firstRoute === false && UI.route !== 'setup') { var h = document.getElementById('main'); if (h) h.focus({ preventScroll: true }); }
    UI.focusKey = null;
    if (UI.route === 'today' || UI.route === 'plan' || UI.route === 'progress') countUpAll();
    if (UI.route === 'progress') layoutDpath();
    if (UI.route === 'plan' && UI.sub === 'week') renderSel();
    celebrate();
    refreshClock();
    UI.firstRoute = false;
  }
  function route() {
    var parts = (location.hash || '#today').replace(/^#/, '').split('/');
    var r = parts[0];
    if (r !== 'plan' && r !== 'progress' && r !== 'setup') r = 'today';
    if (r === 'plan') { UI.sub = ['dreams', 'week', 'year'].indexOf(parts[1]) >= 0 ? parts[1] : 'dreams'; }
    if (r === 'setup' && !FR) frReset();
    if (r !== 'setup' && UI.route === 'setup') { FR = null; }
    UI.route = r;
    UI.sel = null; UI.choose = false;
    UI.nav = true;
    window.scrollTo(0, 0);
    render();
  }
  function frReset() { FR = { step: 0, amb: '', areas: [], fol: {}, week: { working: false, evenings: false, weekend: false }, extra: '', hours: 5, err: '', draft: null, starter: false, shown: -1 }; }

  // Count-ups: a number that climbs to its value. Calm shows the value at once.
  function countUp(el, from, to, dur, suffix) {
    suffix = suffix || '';
    if (calm() || from === to) { el.textContent = to + suffix; return; }
    var t0 = null;
    el.textContent = from + suffix;
    requestAnimationFrame(function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      el.textContent = v + suffix;
      if (p < 1) requestAnimationFrame(step);
    });
  }
  function countUpAll() {
    $$('[data-countup]').forEach(function (el) {
      var id = el.getAttribute('data-countup');
      if (UI.counted[id]) return;
      UI.counted[id] = true;
      countUp(el, 0, +el.getAttribute('data-to'), 900, '%');
    });
  }
  // After a tick: the tick's ring pulses and throws a few sparks, its day-line segment fills, the count climbs,
  // the next block glides in, and the live region says the count. Calm does the same without the motion.
  function celebrate() {
    var M = UI.motion;
    if (!M) return;
    UI.motion = null;
    var esc2 = function (s) { return s.replace(/"/g, '\\"'); };
    var btn = document.querySelector('.tk[data-k="' + esc2(M.key) + '"][data-d="' + M.dk + '"]');
    if (btn && !calm() && !M.deferred) {
      btn.classList.add('burst');
      var ar = btn.getAttribute('data-area') || 'prof', colours = ['var(--accent)', 'var(--c-' + ar + ')'];
      for (var i = 0; i < 6; i++) {
        var sp = document.createElement('span');
        sp.className = 'spark'; sp.setAttribute('aria-hidden', 'true');
        sp.style.setProperty('--a', (i * 60) + 'deg');
        sp.style.setProperty('--c', colours[i % 2]);
        btn.appendChild(sp);
      }
      setTimeout(function () { btn.classList.remove('burst'); $$('.spark', btn).forEach(function (s) { s.remove(); }); }, 900);
    }
    var seg = document.querySelector('.dl-seg[data-k="' + esc2(M.key) + '"]');
    if (seg && !calm()) seg.classList.add('fresh');
    var dn = $('[data-dn]');
    if (dn && M.dk === TK) countUp(dn, M.from, M.to, 520);
    var live = $('#live');
    if (live) live.textContent = M.to + ' of ' + M.n + ' done' + (M.dk === TK ? ' today' : '') + '.';
  }

  // The clock: the greeting, the countdown and the now marker, every 30 seconds without a re-render.
  function refreshClock() {
    var m = clockMin(), part = partOf(m), root = document.documentElement;
    if (root.getAttribute('data-part') !== part) root.setAttribute('data-part', part);
    var g = $('[data-greet]'); if (g && g.textContent !== GREET[part]) g.textContent = GREET[part];
    var mk = $('[data-marker]');
    if (mk) { var pos = (m - DAY_FROM * 60) / ((DAY_TO - DAY_FROM) * 60) * 100; mk.hidden = pos < 0 || pos > 100; mk.style.left = clamp(pos, 0, 100).toFixed(2) + '%'; }
    var pill = $('[data-countdown][data-start]');
    if (pill) {
      var c = cdFrom(+pill.getAttribute('data-start'), +pill.getAttribute('data-end'), m);
      pill.setAttribute('data-state', c.state);
      var t = pill.querySelector('[data-cd-text]'); if (t && t.textContent !== c.text) t.textContent = c.text;
    }
  }

  /* Toast: one line, fades, never blocks. A small illustration for the milestones. */
  var toastTimer = null;
  function toast(title, text, ill) {
    var t = $('#toast'); $('#toastT').textContent = title; $('#toastX').textContent = text;
    $('#toastU').setAttribute('href', '#ill-' + (ill || 'sprout'));
    t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 7000);
  }

  /* ── 7. Actions ─────────────────────────────────────────── */
  // A focal tick answers first (its check fills, the ring pulses, sparks fly), then the next block glides in.
  function sparks(el, colour) {
    if (calm()) return;
    el.classList.add("burst");
    for (var i = 0; i < 6; i++) {
      var sp = document.createElement("span");
      sp.className = "spark"; sp.setAttribute("aria-hidden", "true");
      sp.style.setProperty("--a", (i * 60) + "deg");
      sp.style.setProperty("--c", i % 2 ? colour : "var(--accent)");
      el.appendChild(sp);
    }
    setTimeout(function () { el.classList.remove("burst"); $$(".spark", el).forEach(function (s) { s.remove(); }); }, 900);
  }
  function milestones(dk, wasFirst, st) {
    if (S.set.milestones && wasFirst && weekOf(parse(dk)) === THIS_WEEK) toast("First tick this week.", "A small start counts. Nothing else is needed.", "sprout");
    if (dk === TK && S.set.celebrate && st.n && st.d === st.n) toast("All done for today.", "Nothing else needs you. Rest counts.", "ring");
  }
  function toggleTick(k, dk, btn) {
    if (UI.pending) {
      // A second click on the same tick while it answers is a double click: ignore it, so it cannot untick.
      if (UI.pending.key === k) return;
      clearTimeout(UI.pending.timer); UI.pending = null; render();
    }
    var on = !isDone(dk, k);
    var wasFirst = weekStats(weekOf(parse(dk))).dN === 0;
    var before = dayStats(dk).d, wasFocal = !!firstUndone(dk) && firstUndone(dk).key === k;
    setDone(dk, k, on);
    var st = dayStats(dk);
    UI.motion = on ? { key: k, dk: dk, from: before, to: st.d, n: st.n, cheer: cheerFor(dk), glide: wasFocal, deferred: false } : null;
    if (UI.motion && wasFocal && btn && btn.isConnected && !calm()) {
      UI.motion.deferred = true;
      btn.classList.add("on");
      sparks(btn, btn.getAttribute("data-area") ? "var(--c-" + btn.getAttribute("data-area") + ")" : "var(--accent)");
      UI.pending = { key: k, timer: setTimeout(function () { UI.pending = null; render(); milestones(dk, wasFirst, st); }, 460) };
      return;
    }
    render();
    milestones(dk, wasFirst, st);
  }
  function applyPreview(p) {
    if (p === 'setup') { S = emptyState(); frReset(); location.hash = '#setup'; return; }
    if (p === 'new') { S = emptyState(); UI.day = TK; location.hash = '#today'; if (location.hash === '#today') render(); return; }
    if (p === 'normal') { S.dayOff = {}; S.done[TK] = []; }
    if (p === 'all') { S.dayOff = {}; S.done[TK] = itemsOn(TK).map(function (it) { return it.key; }); }
    if (p === 'none') { S.dayOff = {}; S.dayOff[TK] = true; S.done[TK] = []; }
    UI.day = TK; location.hash = '#today';
    if (location.hash === '#today') render();
    $$('[data-prev]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.prev === p)); });
  }

  function act(a, t) {
    switch (a) {
      case 'tick': toggleTick(t.dataset.k, t.dataset.d, t); break;
      case 'day': {
        var st = +t.dataset.step;
        UI.day = st === 0 ? TK : key(addDays(parse(UI.day), st));
        if (UI.day > TK) UI.day = TK;
        UI.focusKey = st === 0 ? 'today-btn' : null;
        render(); break;
      }
      case 'add-next': {
        var nx = nextAction(); if (!nx) break;
        delete S.dayOff[TK];
        (S.extra[TK] = S.extra[TK] || []).push({ act: nx.act, start: 18, end: 19 });
        render(); break;
      }
      case 'setup': location.hash = '#setup'; break;
      case 'edit': UI.lastEdit = t.dataset.fk; UI.edit = t.dataset.f === 'amb' ? 'amb' : t.dataset.f + ':' + t.dataset.area; render(); break;
      case 'edit-cancel': UI.edit = null; UI.focusKey = UI.lastEdit; render(); break;
      case 'area': UI.dream = t.dataset.area; render(); break;
      case 'dream': UI.dream = t.dataset.area; UI.sub = 'dreams'; UI.focusKey = 'd-h'; if (location.hash === '#plan/dreams') render(); else location.hash = '#plan/dreams'; break;
      case 'sched': UI.wkSched = t.dataset.id; UI.sel = null; UI.choose = false; render(); break;
      case 'sched-new': {
        var id = 'n' + (Object.keys(S.schedules).length + 1);
        S.schedules[id] = { name: 'New schedule', slots: S.schedules.my.slots.map(function (s) { return s.slice(); }) };
        UI.wkSched = id; render(); break;
      }
      case 'wkday': UI.wkDay = +t.dataset.d; var wk = $('#wk'); if (wk) wk.dataset.day = UI.wkDay; $$('.daytabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.d === UI.wkDay)); }); break;
      case 'sleep': S.showSleep = !S.showSleep; UI.focusKey = 'sleep'; render(); break;
      case 'wk-choose': UI.choose = true; renderSel(); UI.focusKey = null; var f = $('[data-fk="act-' + S.acts[0].id + '"]'); if (f) f.focus(); break;
      case 'wk-back': UI.choose = false; renderSel(); document.querySelector('[data-fk="wk-choose"]').focus(); break;
      case 'wk-apply': applyWeek(t.dataset.act); break;
      case 'wk-clear': clearWeek(); break;
      case 'wk-cancel': UI.sel = null; UI.choose = false; renderSel(); break;
      case 'paint': UI.paint = t.dataset.id; render(); break;
      case 'recap-start': openCer('recap-start'); break;
      case 'recap-open': S.recap = 'open'; UI.focusKey = 'recap-start'; render(); break;
      case 'cer-next': UI.cer.step = Math.min(CER_LAST, UI.cer.step + 1); cerRender(true); break;
      case 'cer-back': UI.cer.step = Math.max(0, UI.cer.step - 1); cerRender(true); break;
      case 'cer-close': closeCer(false); break;
      case 'cer-done': closeCer(true); break;
      case 'cer-plan': S.recap = 'closed'; UI.cer = null; $('#cer').hidden = true; $('#cer').innerHTML = ''; UI.focusKey = null; location.hash = '#plan/week'; break;
      case 'set': { var k = t.dataset.set; S.set[k] = !S.set[k]; render(); break; }
      case 'toast-close': $('#toast').hidden = true; break;
      case 'replay': S = emptyState(); frReset(); $('#acct').open = false; location.hash = '#setup'; break;
      case 'reset': S = sampleState(); UI.day = TK; $('#acct').open = false; location.hash = '#today'; render(); toast('Sample data is back.', 'Sam Reyes, week 45. Nothing was sent anywhere.'); break;
      case 'fr-next': frNext(); break;
      case 'fr-back': FR.err = ''; FR.step = Math.max(0, FR.step - 1); if (FR.step < 6) FR.draft = null; UI.focusKey = 'fr-next'; render(); break;
      case 'fr-starter': FR.starter = true; FR.draft = starterDraft(); FR.step = 6; FR.err = ''; UI.focusKey = 'fr-accept'; render(); break;
      case 'fr-area': { var id2 = t.dataset.id, i = FR.areas.indexOf(id2); if (i >= 0) { FR.areas.splice(i, 1); delete FR.fol[id2]; } else if (FR.areas.length < 3) FR.areas.push(id2); FR.err = ''; render(); break; }
      case 'fr-opt': { FR.fol[FR.areas[0]] = t.dataset.opt === 'unsure' ? 'unsure' : +t.dataset.opt; FR.err = ''; render(); break; }
      case 'fr-week': { var wkk = t.dataset.w; FR.week[wkk] = !FR.week[wkk]; render(); break; }
      case 'fr-hours': { FR.hours = Math.max(1, Math.min(20, FR.hours + +t.dataset.d)); UI.focusKey = t.dataset.d > 0 ? 'fr-more' : 'fr-less'; render(); break; }
      case 'fr-accept': frAccept(); break;
    }
  }
  function frNext() {
    if (FR.step === 0) FR.step = 1;
    else if (FR.step === 1) {
      if (!FR.amb.trim()) { FR.err = 'Write one sentence to continue.'; UI.focusKey = 'fr-amb'; render(); return; }
      FR.step = 2;
    } else if (FR.step === 2) {
      if (!FR.areas.length) { FR.err = 'Choose at least one area to continue.'; render(); return; }
      FR.step = 3;
    } else if (FR.step === 3) {
      if (FR.fol[FR.areas[0]] === undefined) { FR.err = 'Choose one answer, or Not sure.'; render(); return; }
      FR.step = 4;
    } else if (FR.step === 4) FR.step = 5;
    else if (FR.step === 5) { FR.draft = buildDraft(FR); FR.step = 6; FR.starter = false; }
    FR.err = '';
    UI.focusKey = 'fr-h';
    render();
  }
  function frAccept() {
    var d = FR.draft;
    S = emptyState();
    S.ambition = d.ambition || S.ambition;
    d.areas.forEach(function (aid) { var a = areaOf(aid); a.target = d.targets[aid] || ''; a.progress = 0; });
    S.habits = d.habits.map(function (h) { return { id: h.id, area: h.area, name: h.name, count: h.count, period: h.period, act: h.act }; });
    S.schedules.my.slots = d.slots.map(function (s) { return s.slice(); });
    FR = null;
    try { localStorage.setItem('timely.a2.seen', '1'); } catch (e) {}
    UI.day = TK; UI.focusKey = 'h1'; UI.route = 'today';
    location.hash = '#today';
    render();
    toast('Your plan is saved.', 'Your first action is at the top of Today.', 'sprout');
  }

  /* Events: one delegated listener each. */
  document.addEventListener('click', function (e) {
    var mo = e.target.closest('[data-m]');
    if (mo) { setMotion(mo.getAttribute('data-m')); return; }
    var t = e.target.closest('[data-a]');
    if (t && !t.disabled) {
      if (t.dataset.a === 'wk-choose' || t.dataset.a === 'wk-back' || t.dataset.a === 'wkday' || t.dataset.a === 'cer-plan') { act(t.dataset.a, t); return; }
      UI.focusKey = t.getAttribute('data-fk') || null;
      act(t.dataset.a, t);
      return;
    }
    var pv = e.target.closest('[data-prev]');
    if (pv) { applyPreview(pv.dataset.prev); return; }
    var sq = e.target.closest('.sq[data-w]');
    if (sq && e.detail === 0) { paintWeek(+sq.dataset.w); UI.focusKey = sq.getAttribute('data-fk') || null; }
    var cell = e.target.closest('[data-cell]');
    if (cell && e.detail === 0) {
      var d = +cell.dataset.d, h = +cell.dataset.h;
      if (UI.sel && UI.sel.d === d && h >= UI.sel.a && h <= UI.sel.b) { UI.sel = null; renderSel(); }
      else { setSel(d, h, h); }
      $('#wk') && cell.focus();
    }
  });
  document.addEventListener('input', function (e) {
    var t = e.target, k = t.getAttribute('data-in'), f = t.getAttribute('data-fr-in');
    if (k === 'journal') { S.journal[t.dataset.d] = t.value; $('#jr-saved').textContent = ''; }
    if (f === 'amb') FR.amb = t.value;
    if (f === 'extra') FR.extra = t.value;
    if (f === 'd-amb' && FR.draft) FR.draft.ambition = t.value;
    if (f === 'd-target' && FR.draft) FR.draft.targets[t.dataset.i] = t.value;
    if (f === 'd-habit' && FR.draft) { var h = FR.draft.habits[+t.dataset.i]; h.name = t.value; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute('data-in') === 'journal') { $('#jr-saved').textContent = 'Saved for this day.'; }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, kind = f.getAttribute('data-form');
    if (!kind) return;
    e.preventDefault();
    if (kind === 'amb') { var v = f.querySelector('textarea').value.trim(); if (v) S.ambition = v; UI.edit = null; UI.focusKey = 'edit:amb'; render(); }
    if (kind === 'goal' || kind === 'target') {
      var a = areaOf(f.dataset.area), val = f.querySelector('textarea').value.trim();
      if (kind === 'goal') a.goal5 = val; else a.target = val;
      UI.edit = null; UI.focusKey = 'edit:' + kind + ':' + a.id; render();
    }
    if (kind === 'habit') {
      var nm = f.querySelector('input').value.trim(); if (!nm) return;
      var n = +f.querySelector('select').value;
      S.habits.push({ id: 'h' + Date.now().toString(36), area: f.dataset.area, name: nm, count: n, period: 'week', act: null });
      UI.focusKey = 'nh'; render();
    }
  });
  document.addEventListener('toggle', function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-all')) UI.showAll = e.target.open;
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (UI.cer) { closeCer(false); return; }
      var acct = $('#acct'); if (acct && acct.open) { acct.open = false; acct.querySelector('summary').focus(); }
    }
    if (e.key === 'Tab' && UI.cer) {
      // Keep Tab inside the recap ceremony.
      var nodes = $$('#cer button, #cer a[href]'), first = nodes[0], last = nodes[nodes.length - 1];
      if (!nodes.length) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* Week grid selection: press and drag within one day (the ghost follows, snapped to whole hours). */
  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    var c = e.target.closest('[data-cell]');
    if (!c || e.button > 0) return;
    drag = { d: +c.dataset.d, a: +c.dataset.h };
    setSel(drag.d, drag.a, drag.a);
    e.preventDefault();
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    var c = el && el.closest && el.closest('[data-cell]');
    if (c && +c.dataset.d === drag.d) setSel(drag.d, drag.a, +c.dataset.h);
  });
  document.addEventListener('pointerup', function () {
    if (drag) { drag = null; renderSel(); }
    yearDrag = false;
  });
  // Year: press and drag across weeks paints them with the chosen schedule.
  var yearDrag = false;
  document.addEventListener('pointerdown', function (e) {
    var q = e.target.closest('.sq[data-w]');
    if (!q) return;
    yearDrag = true; paintWeek(+q.dataset.w); e.preventDefault();
  });
  document.addEventListener('pointermove', function (e) {
    if (!yearDrag) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    var q = el && el.closest && el.closest('.sq[data-w]');
    if (q) paintWeek(+q.dataset.w);
  });

  /* Depth: the focal card tilts a little toward the pointer (mouse only, lively only). */
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || calm()) return;
    var f = e.target.closest && e.target.closest('.focus[data-parallax]');
    if (!f) return;
    var r = f.getBoundingClientRect();
    var px = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1), py = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
    f.style.transform = 'perspective(1100px) rotateX(' + (-py * 1.4).toFixed(2) + 'deg) rotateY(' + (px * 1.4).toFixed(2) + 'deg)';
  });
  document.addEventListener('pointerout', function (e) {
    var f = e.target.closest && e.target.closest('.focus[data-parallax]');
    if (f && !f.contains(e.relatedTarget)) f.style.transform = '';
  });

  /* Tooltips: hover or focus shows the figure; the same text is in the element for screen readers. */
  var tipEl = $('#tip');
  function showTip(el) {
    var t = el.getAttribute('data-tip'); if (!t) return;
    tipEl.textContent = t; tipEl.hidden = false;
    var r = el.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    var x = clamp(r.left + r.width / 2 - tw / 2, 8, window.innerWidth - tw - 8);
    var y = r.top - th - 10; if (y < 8) y = r.bottom + 10;
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function hideTip() { tipEl.hidden = true; }
  document.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse') return;
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el) showTip(el);
  });
  document.addEventListener('pointerout', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el && !el.contains(e.relatedTarget)) hideTip();
  });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el) showTip(el); else hideTip();
  });
  document.addEventListener('focusout', hideTip);
  window.addEventListener('scroll', hideTip, { passive: true });

  /* Theme: default from the system, then the saved choice. */
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('timely.a2.theme', t); } catch (e) {}
    var b = $('#themeBtn');
    if (b) b.setAttribute('aria-pressed', String(t === 'dark'));
  }
  $('#themeBtn').addEventListener('click', function () {
    var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(t);
  });

  /* Motion: Lively (default) or Calm, from the account menu. The system's reduced motion always means Calm. */
  function applyMotion() {
    var reduce = false; try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var choice = 'lively'; try { if (localStorage.getItem('timely.a2.motion') === 'calm') choice = 'calm'; } catch (e) {}
    var root = document.documentElement;
    root.setAttribute('data-choice', choice);
    root.setAttribute('data-motion', choice === 'calm' || reduce ? 'calm' : 'lively');
    $$('[data-m]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === choice)); });
    var note = $('#mot-note');
    if (note) note.textContent = reduce ? 'Your system asks for less motion, so motion stays off here. Every number and line is still shown.' : 'Lively adds gentle motion. Calm keeps every number and line and stops the moving parts.';
  }
  function setMotion(m) {
    try { localStorage.setItem('timely.a2.motion', m); } catch (e) {}
    applyMotion();
    if (m === 'calm') { var v = $('#view'); if (v) v.classList.remove('view-enter'); }
  }
  try { window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', applyMotion); } catch (e) {}
  window.addEventListener('resize', function () {
    hideTip();
    if (UI.route === 'progress') { var c = $('[data-dpath]'); if (c) { c.removeAttribute('data-wide'); layoutDpath(); } }
  });
  setTheme(document.documentElement.getAttribute('data-theme') || 'light');
  applyMotion();

  /* Start: the sample is shown once the first run has been finished on this device. */
  var seen = false;
  try { seen = localStorage.getItem('timely.a2.seen') === '1'; } catch (e) {}
  S = seen ? sampleState() : emptyState();
  if (!seen) { frReset(); if (location.hash !== '#setup') history.replaceState(null, '', '#setup'); }
  window.addEventListener('hashchange', route);
  setInterval(refreshClock, 30000);
  route();
})();
