/* Timely prototype B: "One stream, plan on demand". Mockup only: dummy data (Sam Reyes, Wednesday 4 November 2026,
   ISO week 45) and simple view state. No business logic: the sums and rules here exist to draw the picture.
   Sections: 0 helpers, 1 dummy data, 2 state, dates and rules, 3 the stream, 4 the plan drawer, 5 the week grid and
   the year painter, 6 the first run, 7 account, theme, routing, preview and events.
   Stored in localStorage (inside try/catch): the theme, the dummy plan and a first-run flag. Nothing else. */
(function () {
  'use strict';

  /* 0. Helpers */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function keyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function dowOf(d) { return (d.getDay() + 6) % 7; }                       // 0 = Monday
  function mondayOf(d) { return addDays(d, -dowOf(d)); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function icon(id, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>'; }
  function hour(h) { var x = h % 12 === 0 ? 12 : h % 12; return x + (h < 12 ? ' AM' : ' PM'); }
  function areaStyle(id) { return ' style="--c:var(--c-' + id + ')"'; }
  function schedStyle(id) { return ' style="--c:var(--s-' + id + ');--on:var(--s-' + id + '-on)"'; }
  function longDate(d) { return LONG[dowOf(d)] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function shortDate(d) { return SH[dowOf(d)] + ' ' + d.getDate() + ' ' + MO[d.getMonth()]; }
  function range(b) { return hour(b.start) + ' to ' + hour(b.end); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // Focus rules: a phone or touch screen never gets a text field focused on open (FR-UX-9).
  function canFocusFields() {
    try { return window.matchMedia('(pointer: fine)').matches && window.innerWidth > 768; } catch (e) { return false; }
  }

  /* 1. Dummy data. Area ids and colours follow app/utils/planner/seed.ts. */
  var TODAY = new Date(2026, 10, 4);          // Wednesday 4 November 2026, ISO week 45. The prototype never reads the clock.
  var WEEK1_MON = new Date(2025, 11, 29);     // Monday of ISO week 1 of 2026
  var SH = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var AWAKE_FROM = 7, AWAKE_TO = 22;          // the grid: 7 AM to 10 PM, 15 hours a day, 105 a week
  var AWAKE = 105;
  var AMBITION = 'Stronger, calmer, and able to keep up with my kids.';
  var NAME = 'Sam Reyes';
  var WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

  var AREA_DEFS = [
    { id: 'phys', name: 'Physical', goal5: 'Feel strong, rested and energetic.', target1: 'Exercise at least three times a week, all year.', progress: 62 },
    { id: 'spir', name: 'Spiritual', goal5: 'Keep a calm, clear mind and clear values.', target1: 'Read something inspiring at least three times a week.', progress: 30 },
    { id: 'rel', name: 'Relational & emotional', goal5: 'Be present for the people I love.', target1: 'A regular time together with family and friends, every week.', progress: 55 },
    { id: 'eco', name: 'Economic', goal5: 'Manage money with confidence and calm.', target1: '', progress: null },
    { id: 'cog', name: 'Cognitive', goal5: 'Keep learning and growing in my field.', target1: 'Finish one course and share what I learn.', progress: 40 },
    { id: 'soc', name: 'Social', goal5: 'Belong to a few circles where I can give and receive.', target1: '', progress: null },
    { id: 'prof', name: 'Professional', goal5: 'Do work that uses my best skills and makes sense.', target1: 'Finish the main project of the year and keep focused mornings.', progress: 48 },
    { id: 'env', name: 'Environment', goal5: 'Live and work in a calm, tidy space.', target1: 'A tidy home and one walk outside every day.', progress: 20 }
  ];
  var ACT_DEFS = [
    { id: 'focus', name: 'Focused work', area: 'prof' },
    { id: 'planning', name: 'Weekly planning', area: 'prof' },
    { id: 'run', name: 'Run', area: 'phys' },
    { id: 'yoga', name: 'Yoga', area: 'phys' },
    { id: 'walk', name: 'Walk', area: 'phys' },
    { id: 'family', name: 'Family time', area: 'rel' },
    { id: 'dinner', name: 'Family dinner', area: 'rel' },
    { id: 'call', name: 'Call a friend', area: 'rel' },
    { id: 'quiet', name: 'Quiet time', area: 'spir' },
    { id: 'reading', name: 'Reading', area: 'spir' },
    { id: 'study', name: 'Study', area: 'cog' },
    { id: 'tidy', name: 'Tidy the flat', area: 'env' }
  ];
  var HABIT_DEFS = [
    { id: 'run', area: 'phys', name: 'Run', count: 3, period: 'week', act: 'run' },
    { id: 'water', area: 'phys', name: 'Drink enough water', count: 1, period: 'day', act: null },
    { id: 'quiet', area: 'spir', name: 'Quiet time to reflect', count: 1, period: 'day', act: 'quiet' },
    { id: 'read', area: 'spir', name: 'Read for inspiration', count: 3, period: 'week', act: 'reading' },
    { id: 'call', area: 'rel', name: 'Call a friend or relative', count: 2, period: 'week', act: 'call' },
    { id: 'family', area: 'rel', name: 'Plan a family activity', count: 1, period: 'week', act: 'family' },
    { id: 'budget', area: 'eco', name: 'Review the monthly budget', count: 1, period: 'month', act: null },
    { id: 'study', area: 'cog', name: 'Study a new topic', count: 3, period: 'week', act: 'study' },
    { id: 'project', area: 'cog', name: 'Work on a personal project', count: 2, period: 'week', act: null },
    { id: 'meeting', area: 'soc', name: 'Attend a community meeting', count: 1, period: 'month', act: null },
    { id: 'focus', area: 'prof', name: 'Focused work', count: 5, period: 'week', act: 'focus' },
    { id: 'planning', area: 'prof', name: 'Weekly planning', count: 1, period: 'week', act: 'planning' },
    { id: 'errands', area: 'env', name: 'Run errands with a plan', count: 1, period: 'week', act: 'tidy' }
  ];
  // The rule table of the first run: one question for the first area, a default for every other area.
  var FOLLOW = {
    phys: { q: 'What would a good month look like for Physical?', opts: [
      { label: 'Run, three times a week', habit: 'Run', count: 3 },
      { label: 'Walk, every day', habit: 'Walk', count: 7 }] },
    prof: { q: 'Which piece of work would make this year count?', opts: [
      { label: 'Focused work, three mornings a week', habit: 'Focused work', count: 3 },
      { label: 'A weekly planning hour', habit: 'Weekly planning', count: 1 }] },
    rel: { q: 'Who do you want more time with?', opts: [
      { label: 'Family evening, twice a week', habit: 'Family evening', count: 2 },
      { label: 'A call with a friend or relative', habit: 'Call a friend or relative', count: 2 }] }
  };
  var DEFAULT_HABIT = {
    phys: { habit: 'Run', count: 3 }, spir: { habit: 'Read for inspiration', count: 3 }, rel: { habit: 'Family evening', count: 2 },
    eco: { habit: 'Review the monthly budget', count: 1 }, cog: { habit: 'Study a new topic', count: 3 }, soc: { habit: 'Meet a friend', count: 1 },
    prof: { habit: 'Focused work', count: 3 }, env: { habit: 'Tidy the flat', count: 1 }
  };
  var PREF = {
    mornings: [[0, 9], [1, 9], [2, 9], [3, 9], [4, 9]],   // working day mornings
    evenings: [[0, 18], [1, 18], [2, 18], [3, 18], [4, 18]],
    weekends: [[5, 10], [6, 10]]
  };
  var FALLBACK = [[0, 12], [1, 12], [2, 12], [3, 12], [4, 12], [5, 12], [6, 12], [0, 16], [1, 16], [2, 16], [3, 16], [4, 16], [5, 16], [6, 16]];
  // Schedules as [weekday, start hour, end hour, activity id]. Hours are 24 hour clock.
  var LIST = {
    mine: [
      [0, 9, 12, 'focus'], [0, 18, 19, 'run'], [0, 20, 21, 'reading'],
      [1, 9, 12, 'focus'], [1, 18, 19, 'dinner'], [1, 20, 21, 'study'],
      [2, 9, 10, 'planning'], [2, 13, 15, 'focus'], [2, 18, 19, 'run'],
      [3, 9, 12, 'focus'], [3, 12, 13, 'walk'], [3, 18, 20, 'family'],
      [4, 7, 8, 'yoga'], [4, 9, 11, 'focus'], [4, 17, 18, 'call'],
      [5, 10, 12, 'walk'], [5, 15, 18, 'family'],
      [6, 8, 9, 'quiet'], [6, 15, 16, 'tidy'], [6, 17, 18, 'reading']
    ],
    holiday: [
      [0, 8, 9, 'walk'], [1, 8, 9, 'walk'], [2, 8, 9, 'walk'], [3, 8, 9, 'walk'], [4, 8, 9, 'walk'],
      [5, 10, 12, 'walk'], [5, 15, 18, 'family'], [6, 8, 9, 'quiet'], [6, 15, 18, 'family']
    ]
  };
  LIST.deep = LIST.mine.concat([[0, 13, 16, 'focus'], [1, 13, 15, 'focus'], [3, 15, 17, 'focus'], [4, 13, 15, 'focus']]);
  var SCHED_NAME = { mine: 'My week', deep: 'Deep work', holiday: 'Holiday' };
  // Done ticks by date: a:<activity>@<start> for a block, h:<habit> for a habit.
  var DONE_SAMPLE = {
    '2026-11-02': { 'a:focus@9': true, 'a:run@18': true, 'a:reading@20': true, 'h:run': true },
    '2026-11-03': { 'a:focus@9': true, 'a:dinner@18': true, 'h:water': true },
    '2026-11-04': { 'a:planning@9': true, 'h:water': true }
  };
  var TREND = [0.66, 0.71, 0.58, 0.74, 0.69, 0.77, 0.81];   // ISO weeks 38 to 44, full weeks

  /* 2. State, dates and rules */
  var S = null;                                       // the dummy plan
  var FR = null;                                      // the first run's answers and draft
  var VIEW = {
    date: TODAY, drawer: 'dreams', area: null, editing: null, adding: null, sel: null, anchor: null, chooser: false,
    cur: { d: 2, h: 9 }, paint: 'mine', weekSid: 'mine', habitsOpen: false, justDone: null, toast: '', opener: null
  };
  var DRAG = null, PAINT_DRAG = null, REFOCUS = null, TICK_T = null, SEQ = 0;

  function isoWeek(d) { return Math.round((mondayOf(d) - WEEK1_MON) / 604800000) + 1; }
  function defOf(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function areaName(id) { var d = defOf(AREA_DEFS, id); return d ? d.name : 'Area'; }
  function stateArea(id) { return defOf(S.areas, id); }
  function actOf(id) { return defOf(S.acts, id); }
  function actName(id) { var a = actOf(id); return a ? a.name : 'Activity'; }
  function actArea(id) { var a = actOf(id); return a ? a.area : 'prof'; }
  function needText(h) { return 'Needs ' + h.count + ' a ' + h.period; }
  function hasTarget(a) { return a.progress !== null && a.progress !== undefined; }
  function avgProgress() {
    var v = S.areas.filter(hasTarget).map(function (a) { return a.progress; });
    if (!v.length) return null;
    return Math.round(v.reduce(function (s, x) { return s + x; }, 0) / v.length);
  }
  function emptyYear() { var y = []; for (var n = 1; n <= 52; n++) y.push(null); return y; }

  function emptyState() {
    return {
      ambition: '',
      areas: AREA_DEFS.map(function (a) { return { id: a.id, goal5: '', target1: '', progress: null, habits: [], acts: [] }; }),
      acts: [], schedules: {}, order: [], activeSchedule: null, yearWeeks: emptyYear(),
      done: {}, journal: {}, dayOff: {}, extra: {}, lastWeek: null, trend: null,
      milestones: [], milestonesOn: true, recapOn: true, recapClosed: false, recapHidden: false, firstTickDone: false
    };
  }
  function cellsFrom(list) {
    var c = {};
    list.forEach(function (x) { for (var h = x[1]; h < x[2]; h++) c[x[0] + '-' + h] = x[3]; });
    return c;
  }
  function sampleState() {
    var s = emptyState();
    s.ambition = AMBITION;
    s.areas = AREA_DEFS.map(function (a) {
      return {
        id: a.id, goal5: a.goal5, target1: a.target1, progress: a.progress,
        habits: HABIT_DEFS.filter(function (h) { return h.area === a.id; }).map(function (h) { return { id: h.id, name: h.name, count: h.count, period: h.period, act: h.act }; }),
        acts: ACT_DEFS.filter(function (x) { return x.area === a.id; }).map(function (x) { return x.id; })
      };
    });
    s.acts = clone(ACT_DEFS);
    ['mine', 'deep', 'holiday'].forEach(function (sid) { s.schedules[sid] = { name: SCHED_NAME[sid], cells: cellsFrom(LIST[sid]) }; });
    s.order = ['mine', 'deep', 'holiday'];
    s.activeSchedule = 'mine';
    for (var n = 1; n <= 44; n++) s.yearWeeks[n - 1] = (n === 30 || n === 31) ? 'holiday' : (n >= 36 && n <= 39) ? 'deep' : 'mine';
    s.done = clone(DONE_SAMPLE);
    s.trend = TREND.slice();
    s.lastWeek = { week: 44, done: 17, planned: 21, steady: 'Run was your steadiest: three of three.' };
    s.milestones = [{ week: 43, text: 'Every Physical session ticked.' }, { week: 42, text: 'First full week of Relational & emotional.' }];
    s.firstTickDone = true;
    return s;
  }

  /* Blocks, days and weeks */
  function blocksFromCells(cells, dw) {
    var out = [], h = AWAKE_FROM;
    while (h < AWAKE_TO) {
      var a = cells[dw + '-' + h];
      if (a) {
        var s = h;
        while (h < AWAKE_TO && cells[dw + '-' + h] === a) h++;
        out.push({ act: a, start: s, end: h });
      } else h++;
    }
    return out;
  }
  function scheduleFor(d) {
    var n = isoWeek(d), sid = (n >= 1 && n <= 52 && S.yearWeeks[n - 1]) || S.activeSchedule;
    return sid && S.schedules[sid] ? S.schedules[sid] : null;
  }
  function dayBlocks(d) {
    var k = keyOf(d), sch = scheduleFor(d), out = [];
    if (sch && !S.dayOff[k]) out = blocksFromCells(sch.cells, dowOf(d));
    (S.extra[k] || []).forEach(function (b) { out.push(b); });
    return out.sort(function (a, b) { return a.start - b.start; });
  }
  function doneKey(b) { return 'a:' + b.act + '@' + b.start; }
  function isDone(d, key) { var m = S.done[keyOf(d)]; return !!(m && m[key]); }
  function setDone(d, key, on) {
    var k = keyOf(d);
    S.done[k] = S.done[k] || {};
    if (on) S.done[k][key] = true; else delete S.done[k][key];
  }
  function habitTicked(d, id) { return isDone(d, 'h:' + id); }
  // Ticks of one habit in its period up to the date (week for week habits, month for month habits, the day otherwise).
  function habitCount(h, d) {
    var n = 0, start = h.period === 'month' ? new Date(d.getFullYear(), d.getMonth(), 1) : mondayOf(d);
    if (h.period === 'day') return habitTicked(d, h.id) ? 1 : 0;
    for (var x = start; x <= d; x = addDays(x, 1)) if (habitTicked(x, h.id)) n++;
    return n;
  }
  // One day of the week, for the strip: full, part, missed, today, rest (nothing planned) or future.
  function dayInfo(d) {
    var i = dowOf(d), t = dowOf(TODAY), bl = dayBlocks(d), n = bl.length;
    var dn = bl.filter(function (b) { return isDone(d, doneKey(b)); }).length;
    var st;
    if (i > t) st = 'future';
    else if (n === 0) st = 'rest';
    else if (dn === n) st = 'full';
    else if (dn > 0) st = 'part';
    else st = i === t ? 'today' : 'missed';
    return { d: d, i: i, n: n, dn: dn, st: st, planned: i <= t ? n : 0, done: i <= t ? dn : 0 };
  }
  function weekRatio(d) {
    var m = mondayOf(d), p = 0, dn = 0;
    for (var i = 0; i < 7; i++) { var x = dayInfo(addDays(m, i)); p += x.planned; dn += x.done; }
    return p ? dn / p : null;
  }
  function areaHours(sch) {
    var t = {};
    if (!sch) return t;
    Object.keys(sch.cells).forEach(function (k) { var ar = actArea(sch.cells[k]); t[ar] = (t[ar] || 0) + 1; });
    return t;
  }
  function plannedHours(sch) { return sch ? Object.keys(sch.cells).length : 0; }

  /* 3. The stream */
  function ring(p, px, label) {
    var C = 97.39, pc = clamp(Math.round(p), 0, 100), off = C * (1 - pc / 100), ok = pc >= 100;
    return '<span class="ring' + (ok ? ' ok' : '') + '" style="width:' + px + 'px;height:' + px + 'px" role="img" aria-label="' + pc + ' percent">' +
      '<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="rt" cx="18" cy="18" r="15.5"/>' +
      '<circle class="ra" cx="18" cy="18" r="15.5" stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '"/></svg>' +
      '<span class="rc">' + (label == null ? pc + '%' : label) + '</span></span>';
  }
  var TICK_PATH = '<svg class="tk" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function renderDream() {
    var avg = avgProgress(), n = S.areas.filter(hasTarget).length;
    var head = S.ambition
      ? '<h1 id="dream-h" class="dream-h">' + esc(S.ambition) + '</h1>'
      : '<h1 id="dream-h" class="dream-h is-empty">Write the one thing you want to become.</h1>' +
        '<p class="dream-cta"><button class="pill" type="button" data-act="plan-open" data-view="dreams" data-edit="ambition">Write my dream</button></p>';
    var side = avg === null ? '' :
      '<div class="dream-ring">' + ring(avg, 80) + '<p class="cap">Average of your 1-year targets<span>' + n + ' areas with a target. Each counts the same.</span></p></div>';
    $('#dream').innerHTML = '<p class="eyebrow">' + longDate(TODAY) + ' · week ' + isoWeek(TODAY) + '</p>' +
      '<div class="dream-row"><div class="dream-txt">' + head + '</div>' + side + '</div>';
  }

  function renderToday() {
    var d = VIEW.date, k = keyOf(d), isToday = k === keyOf(TODAY);
    var yest = keyOf(addDays(TODAY, -1)), dayName = isToday ? 'Today' : k === yest ? 'Yesterday' : LONG[dowOf(d)];
    var bl = dayBlocks(d);
    var undone = bl.filter(function (b) { return !isDone(d, doneKey(b)); });
    var focal = VIEW.justDone ? bl.filter(function (b) { return doneKey(b) === VIEW.justDone; })[0] : undone[0];
    var html = '<div class="day-nav">' +
      '<button class="round" type="button" data-act="day-prev" aria-label="Previous day"' + (VIEW.date <= addDays(TODAY, -60) ? ' disabled' : '') + '>' + icon('i-left') + '</button>' +
      '<h2 id="today-h" class="day-title">' + dayName + ', ' + esc(shortDate(d)) + '</h2>' +
      '<button class="round" type="button" data-act="day-next" aria-label="Next day"' + (isToday ? ' disabled' : '') + '>' + icon('i-right') + '</button></div>';

    if (!S.activeSchedule) {
      html += '<article class="focus is-empty"><p class="focus-title">Plan your week to see today here.</p>' +
        '<p class="focus-say">Pick the hours you can give. You can change any of it later.</p>' +
        '<p class="focus-cta"><button class="pill primary" type="button" data-act="plan-open" data-view="week">Plan my week</button></p></article>';
    } else if (focal) {
      var dn = !!VIEW.justDone, fk = doneKey(focal);
      var after = bl.filter(function (b) { return b !== focal && !isDone(d, doneKey(b)); })[0];
      var nm = actName(focal.act);
      html += '<article class="focus' + (dn ? ' is-on' : '') + '"' + areaStyle(actArea(focal.act)) + ' aria-labelledby="focal-t">' +
        '<p class="focus-meta"><span class="dot"></span>' + esc(areaName(actArea(focal.act))) + ' · ' + range(focal) + '</p>' +
        '<h3 id="focal-t" class="focus-title" tabindex="-1" data-k="focal">' + esc(nm) + '</h3>' +
        '<div class="focus-act"><button class="tick' + (dn ? ' is-on' : '') + '" type="button" data-act="tick" data-key="' + fk + '" data-k="tick-' + fk + '" aria-pressed="' + dn + '" aria-label="Mark ' + esc(nm) + ', ' + range(focal) + ', done">' +
        '<span class="tick-c">' + TICK_PATH + '</span></button>' +
        '<p class="focus-say">' + (dn ? 'Done.' + (after ? ' Next: ' + esc(actName(after.act)) + ', ' + range(after) + '.' : ' That is the last one today.') : 'Mark done') + '</p></div></article>';
      if (VIEW.toast) html += '<p class="toast" role="status">' + esc(VIEW.toast) + '</p>';
    } else if (bl.length) {
      html += '<article class="focus is-done"><div class="done-mark" aria-hidden="true">' + TICK_PATH + '</div>' +
        '<p class="focus-title">' + (isToday ? 'Today is done.' : 'That day is done.') + '</p>' +
        '<p class="focus-say">Nothing else is due. Rest counts too.</p>' +
        (isToday ? '<p class="focus-cta"><button class="pill" type="button" data-act="plan-open" data-view="week">Plan tomorrow</button></p>' : '') + '</article>';
    } else {
      var sug = S.acts.filter(function (a) { return a.name === 'Walk'; })[0] || S.acts[0];
      html += '<article class="focus is-empty"><p class="focus-title">Nothing planned for ' + (isToday ? 'today' : 'that day') + '.</p>' +
        (isToday && sug ? '<p class="focus-say">Add a ' + esc(sug.name.toLowerCase()) + ' at 6 PM?</p><p class="focus-cta"><button class="pill primary" type="button" data-act="add-suggest" data-aid="' + sug.id + '">Add it</button></p>' : '') + '</article>';
    }

    var rest = bl.filter(function (b) { return b !== focal; });
    if (rest.length) {
      html += '<p class="later-h">' + (isToday ? 'Also today' : 'Also that day') + '</p><ul class="later">' + rest.map(function (b) {
        var key = doneKey(b), on = isDone(d, key), nm = actName(b.act);
        return '<li class="later-row"' + areaStyle(actArea(b.act)) + '><button class="tick sm' + (on ? ' is-on' : '') + '" type="button" data-act="tick" data-key="' + key + '" data-k="tick-' + key + '" aria-pressed="' + on + '" aria-label="Mark ' + esc(nm) + ', ' + range(b) + ', done">' +
          '<span class="tick-c">' + TICK_PATH + '</span></button><span class="dot"></span><span class="lr-name">' + esc(nm) + '</span><span class="lr-time">' + range(b) + '</span></li>';
      }).join('') + '</ul>';
    }

    var all = allHabits(), daily = all.filter(function (h) { return h.period === 'day'; });
    var dailyOn = daily.filter(function (h) { return habitTicked(d, h.id); }).length;
    var line = daily.length ? 'Daily habits: <b class="num">' + dailyOn + ' of ' + daily.length + '</b> ticked' : 'Your habits';
    html += '<div class="habit-line"><p>' + line + '</p>' + (all.length ? '<button class="link" type="button" data-act="habits-toggle" aria-expanded="' + VIEW.habitsOpen + '" aria-controls="habit-list">' + (VIEW.habitsOpen ? 'Hide habits' : 'All habits') + '</button>' : '') + '</div>';
    html += '<ul id="habit-list" class="habit-list"' + (VIEW.habitsOpen ? '' : ' hidden') + '>' + all.map(function (h) {
      var on = habitTicked(d, h.id), cnt = habitCount(h, d);
      var prog = h.period === 'day' ? '' : '<span class="hl-prog num">' + cnt + ' of ' + h.count + ' this ' + (h.period === 'month' ? 'month' : 'week') + '</span>';
      return '<li class="habit-row"><button class="tick sm' + (on ? ' is-on' : '') + '" type="button" data-act="habit-tick" data-id="' + h.id + '" data-k="h-' + h.id + '" aria-pressed="' + on + '" aria-label="Tick ' + esc(h.name) + ' for ' + (isToday ? 'today' : 'this day') + '"><span class="tick-c">' + TICK_PATH + '</span></button>' +
        '<span class="hl-main"><span class="hl-name">' + esc(h.name) + '</span><span class="hl-need">' + needText(h) + '</span></span>' + prog + '</li>';
    }).join('') + '</ul>';

    var jv = S.journal[keyOf(d)] || '';
    html += '<label class="journal"><span class="sr">A line about ' + (isToday ? 'today' : 'this day') + '</span>' +
      '<input id="journal" type="text" maxlength="200" placeholder="One line about ' + (isToday ? 'today' : 'this day') + '" value="' + esc(jv) + '" data-day="' + k + '"></label>' +
      '<p class="saved" id="saved" aria-live="polite"></p>';

    $('#today').innerHTML = html;
  }
  function allHabits() { return S.areas.reduce(function (all, a) { return all.concat(a.habits); }, []); }
  function newId() { return Math.random().toString(36).slice(2, 8); }

  function glyph(x) {
    if (x.st === 'full') return '<span class="gl-full">' + TICK_PATH + '</span>';
    if (x.st === 'part') return '<span class="gl-part"></span>';
    if (x.st === 'missed') return '<span class="gl-missed"></span>';
    if (x.st === 'today') return '<span class="gl-today"></span>';
    if (x.st === 'rest') return '<span class="gl-rest"></span>';
    return '<span class="gl-future"></span>';
  }
  function renderWeek() {
    var mon = mondayOf(TODAY), days = [], planned = 0, done = 0;
    for (var i = 0; i < 7; i++) { var x = dayInfo(addDays(mon, i)); days.push(x); planned += x.planned; done += x.done; }
    var sch = S.activeSchedule ? S.schedules[S.activeSchedule] : null;
    var lede = !sch ? 'Plan your week and the days fill in here.'
      : planned ? done + ' of ' + planned + ' planned sessions so far. A missed session costs only itself.'
      : 'Nothing is due yet this week.';
    var strip = days.map(function (x) {
      var label = LONG[x.i] + (x.st === 'future' ? ', still to come' : x.st === 'rest' ? ', nothing planned' : ', ' + x.dn + ' of ' + x.n + ' done');
      return '<li class="day is-' + x.st + '" aria-label="' + label + '"' + (x.i === dowOf(TODAY) ? ' aria-current="date"' : '') + '>' +
        '<span class="dn">' + SH[x.i] + '</span>' + glyph(x) + '<span class="dd num">' + x.d.getDate() + '</span></li>';
    }).join('');

    var cells = sch ? sch.cells : {}, shape = '';
    for (var h = AWAKE_FROM; h < AWAKE_TO; h++) for (var dd = 0; dd < 7; dd++) {
      var a = cells[dd + '-' + h];
      shape += '<i' + (a ? areaStyle(actArea(a)) + ' class="on"' : '') + '></i>';
    }
    var tot = areaHours(sch), free = AWAKE - plannedHours(sch);
    var rows = Object.keys(tot).sort(function (p, q) { return tot[q] - tot[p]; }).map(function (ar) {
      return '<li class="where-row"' + areaStyle(ar) + '><span class="dot"></span><span class="wr-name">' + esc(areaName(ar)) + '</span>' +
        '<span class="bar thin"><i style="width:' + (tot[ar] / AWAKE * 100).toFixed(1) + '%"></i></span>' +
        '<span class="wr-h num">' + tot[ar] + ' h</span></li>';
    }).join('');

    $('#week').innerHTML = '<h2 id="week-h" class="sec-h">This week</h2>' +
      '<p class="lede">' + esc(lede) + '</p>' +
      '<ol class="strip">' + strip + '</ol>' +
      (sch ? '<figure class="shape-fig"><div class="shape" role="img" aria-label="The week: ' + plannedHours(sch) + ' hours planned, ' + free + ' free">' + shape + '</div>' +
        '<figcaption class="muted">The week’s shape, 7 AM to 10 PM. Each colour is a life area; grey is free.</figcaption></figure>' : '') +
      '<h3 class="sub-h">Where the week goes</h3>' +
      (sch ? '<ul class="where">' + rows + '<li class="where-row is-free"><span class="dot"></span><span class="wr-name">Free</span><span class="bar thin"><i style="width:' + (free / AWAKE * 100).toFixed(1) + '%"></i></span><span class="wr-h num">' + free + ' h</span></li></ul>' :
        '<p class="quiet">Nothing planned yet.</p>') +
      '<p class="sec-link"><button class="link" type="button" data-act="plan-open" data-view="week">Edit my week</button></p>';
  }

  function renderProgress() {
    var has = !!(S.trend && S.trend.length);
    var cur = weekRatio(TODAY);
    var avg = has ? S.trend.reduce(function (s, x) { return s + x; }, 0) / S.trend.length : 0;
    var headline = has
      ? 'About ' + WORDS[Math.round(avg * 10)] + ' in ten planned sessions ticked over the last seven full weeks.'
      : 'Progress starts after your first full week of ticks.';
    var bars = '';
    if (has) {
      var vals = S.trend.concat([cur === null ? 0 : cur]);
      vals.forEach(function (v, j) {
        var wk = 38 + j, last = j === vals.length - 1, pct = Math.round(v * 100);
        bars += '<li class="tb' + (last ? ' is-cur' : '') + '"><span class="tb-v num">' + pct + '</span><span class="tb-bar"><i style="height:' + pct + '%"></i></span>' +
          '<span class="tb-w num">' + wk + '</span></li>';
      });
    }
    var recap = '';
    if (S.recapOn && !S.recapHidden) {
      if (!S.lastWeek) recap = '<p class="quiet recap-none">Your first recap comes after a full week.</p>';
      else if (!S.recapClosed) {
        recap = '<article class="recap" aria-labelledby="recap-t">' +
          '<p class="eyebrow">Last week · week ' + S.lastWeek.week + ' · 26 Oct to 1 Nov</p>' +
          '<h3 id="recap-t" class="recap-t">You kept ' + S.lastWeek.done + ' of ' + S.lastWeek.planned + ' planned sessions.</h3>' +
          '<p class="recap-b">' + esc(S.lastWeek.steady) + ' Missed sessions are not counted against you.</p>' +
          '<p class="recap-cta"><button class="pill primary" type="button" data-act="recap-close">Done for the week</button>' +
          '<button class="link" type="button" data-act="recap-skip">Not this week</button></p></article>';
      } else {
        recap = '<article class="recap is-closed" aria-labelledby="recap-t"><div class="done-mark sm" aria-hidden="true">' + TICK_PATH + '</div>' +
          '<h3 id="recap-t" class="recap-t">Week ' + S.lastWeek.week + ' is closed.</h3>' +
          '<p class="recap-b">Week 45 is the one in progress. It starts from what you planned.</p>' +
          '<p class="recap-cta"><button class="link" type="button" data-act="plan-open" data-view="week" data-k="plan-next">Plan next week</button></p></article>';
      }
    }
    var areas = AREA_DEFS.map(function (def) {
      var a = stateArea(def.id), p = a.progress;
      return '<li><button class="prow" type="button" data-act="area-open" data-id="' + def.id + '"' + areaStyle(def.id) + '>' +
        '<span class="dot"></span><span class="pr-name">' + esc(def.name) + '</span>' +
        (p === null ? '<span class="pr-none">No target yet</span>' :
          '<span class="bar thin"><i style="width:' + p + '%"></i></span><span class="pr-v num">' + p + '%</span>') + '</button></li>';
    }).join('');
    var ms = S.milestones.length ? S.milestones.map(function (m) {
      return '<li><span class="ms-w num">Week ' + m.week + '</span> ' + esc(m.text) + '</li>';
    }).join('') : '';
    $('#progress').innerHTML = '<h2 id="progress-h" class="sec-h">Progress</h2>' +
      '<p class="headline">' + esc(headline) + '</p>' +
      (has ? '<figure class="trend-fig"><ol class="trend" aria-label="Share of planned sessions ticked, weeks 38 to 45">' + bars + '</ol>' +
        '<figcaption class="muted">Share of planned sessions ticked, by week. Week 45 is so far.</figcaption></figure>' : '') +
      recap +
      '<h3 class="sub-h">Your 1-year targets</h3><ul class="prog-list">' + areas + '</ul>' +
      '<h3 class="sub-h">Milestones</h3>' +
      (S.milestonesOn ? (ms ? '<ul class="ms">' + ms + '</ul>' : '<p class="quiet">Nothing yet. The first things will show here.</p>') : '<p class="quiet">Milestone moments are off.</p>') +
      '<div class="switches">' +
      '<button class="switch" type="button" role="switch" aria-checked="' + S.recapOn + '" data-act="sw-recap" data-k="sw-recap"><span class="sw-txt"><b>Weekly recap</b><span>A short look back at the end of each week.</span></span><span class="track"><i></i></span></button>' +
      '<button class="switch" type="button" role="switch" aria-checked="' + S.milestonesOn + '" data-act="sw-ms" data-k="sw-ms"><span class="sw-txt"><b>Milestone moments</b><span>One quiet line when something first happens.</span></span><span class="track"><i></i></span></button>' +
      '</div>';
    syncAccount();
  }

  function renderStream() {
    keepFocus($('#main'), function () { renderDream(); renderToday(); renderWeek(); renderProgress(); });
  }

  /* Keep the focus on the same control after a re-render (data-k keys). */
  function keepFocus(scope, fn) {
    var a = document.activeElement, k = REFOCUS || (a && scope.contains(a) && a.getAttribute('data-k'));
    REFOCUS = null;
    fn();
    if (k) { var el = scope.querySelector('[data-k="' + k + '"]'); if (el) el.focus({ preventScroll: true }); }
  }

  /* 4. The plan drawer */
  function renderDrawer() {
    var dr = $('#drawer');
    keepFocus(dr, function () {
      $$('[data-act="dr-view"]', dr).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === VIEW.drawer)); });
      var body = VIEW.drawer === 'dreams' ? dreamsHtml() : VIEW.drawer === 'week' ? weekHtml() : yearHtml();
      $('#dr-body').innerHTML = body;
      renderSelBar();
    });
  }
  function editBlock(key, value, emptyText, cls) {
    if (VIEW.editing === key) {
      return '<div class="edit"><label class="sr" for="ed-field">' + esc(emptyText) + '</label>' +
        '<textarea id="ed-field" class="field" rows="3" data-field="' + key + '">' + esc(value) + '</textarea>' +
        '<p class="edit-nav"><button class="pill primary" type="button" data-act="edit-done" data-key="' + key + '" data-k="ed-' + key + '">Done</button>' +
        '<button class="link" type="button" data-act="edit-cancel">Cancel</button></p></div>';
    }
    var body = value ? '<p class="' + (cls || '') + '">' + esc(value) + '</p>' : '<p class="quiet">' + esc(emptyText) + '</p>';
    return '<div class="ed-row">' + body + '<button class="link" type="button" data-act="edit" data-key="' + key + '" data-k="ed-' + key + '">' + (value ? 'Edit' : 'Add') + '</button></div>';
  }
  function dreamsHtml() {
    if (VIEW.area) return areaHtml(VIEW.area);
    var rows = AREA_DEFS.map(function (def) {
      var p = stateArea(def.id).progress;
      return '<li><button class="area-row" type="button" data-act="area-open" data-id="' + def.id + '" data-k="area-' + def.id + '"' + areaStyle(def.id) + '>' +
        '<span class="dot"></span><span class="ar-main"><span class="ar-name">' + esc(def.name) + '</span>' +
        '<span class="ar-status' + (p === null ? ' is-quiet' : '') + '">' + (p === null ? 'No target yet' : p + '% to the 1-year target') + '</span>' +
        (p === null ? '' : '<span class="bar thin"><i style="width:' + p + '%"></i></span>') + '</span>' + icon('i-right', 'chev') + '</button></li>';
    }).join('');
    return '<section class="dr-sec"><p class="eyebrow">Your dream</p>' + editBlock('ambition', S.ambition, 'Write your dream', 'dream-lg') + '</section>' +
      '<section class="dr-sec"><h2 class="sec-h">Life areas</h2><ul class="area-list">' + rows + '</ul></section>';
  }
  function addForm(kind, id) {
    var key = kind + ':' + id;
    if (VIEW.adding === key) {
      return '<div class="add-form"><label class="sr" for="add-field">' + (kind === 'habit' ? 'New habit' : 'New activity') + '</label>' +
        '<input id="add-field" class="field" type="text" maxlength="60" placeholder="' + (kind === 'habit' ? 'A habit, for example Walk after lunch' : 'An activity, for example Yoga') + '">' +
        '<p class="edit-nav"><button class="pill primary" type="button" data-act="add-save" data-key="' + key + '" data-k="add-' + key + '">Add</button>' +
        '<button class="link" type="button" data-act="add-cancel">Cancel</button></p></div>';
    }
    return '<p><button class="link" type="button" data-act="adding" data-key="' + key + '" data-k="add-' + key + '">' + (kind === 'habit' ? '+ Add a habit' : '+ Add an activity') + '</button></p>';
  }
  function areaHtml(id) {
    var def = defOf(AREA_DEFS, id), a = stateArea(id), p = a.progress;
    var habits = a.habits.map(function (h) {
      return '<li class="item-row"><span class="ir-main"><b>' + esc(h.name) + '</b><span class="muted">' + needText(h) + (h.act ? ' · uses ' + esc(actName(h.act)) : '') + '</span></span></li>';
    }).join('') || '<li class="quiet">No habits yet.</li>';
    var acts = a.acts.map(function (x) { return '<li class="item-row"><span class="ir-main"><b>' + esc(actName(x)) + '</b></span></li>'; }).join('') || '<li class="quiet">No activities yet.</li>';
    return '<button class="back" type="button" data-act="area-back">' + icon('i-left') + 'All life areas</button>' +
      '<h2 id="dr-area-h" class="area-h" tabindex="-1" data-k="area-h"><span class="dot lg"' + areaStyle(id) + '></span>' + esc(def.name) + '</h2>' +
      '<section class="dr-sec"><p class="eyebrow">5-year goal</p>' + editBlock('goal5:' + id, a.goal5, 'Add your 5-year goal', 'lede-lg') + '</section>' +
      '<section class="dr-sec"><p class="eyebrow">1-year target</p>' +
      (p === null ? '' : '<div class="tgt"><span class="bar"><i style="width:' + p + '%"></i></span><span class="num">' + p + '%</span></div>') +
      editBlock('target1:' + id, a.target1, 'No target yet. Add one to see progress here.', '') + '</section>' +
      '<section class="dr-sec"><h3 class="sub-h">Habits</h3><ul class="items">' + habits + '</ul>' + addForm('habit', id) + '</section>' +
      '<section class="dr-sec"><h3 class="sub-h">Activities</h3><ul class="items">' + acts + '</ul>' + addForm('act', id) + '</section>';
  }

  function schedChips(current, withAdd) {
    return S.order.map(function (sid) {
      return '<button class="chip" type="button" data-act="sched" data-sid="' + sid + '" aria-pressed="' + (sid === current) + '"' + schedStyle(sid) + '><span class="dot"></span>' + esc(S.schedules[sid].name) + '</button>';
    }).join('') + (withAdd ? '<button class="chip add" type="button" data-act="sched-add">+ Another schedule</button>' : '');
  }
  function weekHtml() {
    if (!S.order.length) {
      return '<section class="dr-sec empty"><h2 class="sec-h">Plan your week</h2><p class="lede">Nothing here yet. Start from the first run, or from a blank week.</p>' +
        '<p><button class="pill primary" type="button" data-act="fr-open">Start my plan</button></p></section>';
    }
    if (!S.schedules[VIEW.weekSid]) VIEW.weekSid = S.activeSchedule || S.order[0];
    var sch = S.schedules[VIEW.weekSid], free = AWAKE - plannedHours(sch);
    var tot = areaHours(sch);
    var rows = Object.keys(tot).sort(function (p, q) { return tot[q] - tot[p]; }).map(function (ar) {
      return '<li class="where-row"' + areaStyle(ar) + '><span class="dot"></span><span class="wr-name">' + esc(areaName(ar)) + '</span>' +
        '<span class="bar thin"><i style="width:' + (tot[ar] / AWAKE * 100).toFixed(1) + '%"></i></span><span class="wr-h num">' + tot[ar] + ' h</span></li>';
    }).join('');
    return '<section class="wk">' +
      '<div class="wk-top"><div class="chips" role="group" aria-label="Schedules">' + schedChips(VIEW.weekSid, true) + '</div>' +
      '<p class="wk-sum"><b class="num">' + free + ' h free</b> of 105 awake hours a week.' +
      (VIEW.weekSid === S.activeSchedule ? ' Weeks you have not chosen in Year use this one.' : '') + '</p>' +
      '<p class="muted">Sleep is not shown here and is not counted as free time.</p></div>' +
      '<p class="hint">Tap or drag hours to select them, then choose what goes in them.</p>' +
      gridHtml(sch) +
      '<p class="legend"><span class="sw-free"></span> Free. Each colour is an activity.</p>' +
      '<h3 class="sub-h">Where the week goes</h3><ul class="where">' + rows +
      '<li class="where-row is-free"><span class="dot"></span><span class="wr-name">Free</span><span class="bar thin"><i style="width:' + (free / AWAKE * 100).toFixed(1) + '%"></i></span><span class="wr-h num">' + free + ' h</span></li></ul>' +
      '</section>';
  }
  function gridHtml(sch) {
    var cells = sch.cells, dn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var h = '<div class="wk-grid" id="wk-grid" role="group" aria-label="Hours of the week, 7 AM to 10 PM">' +
      '<span class="wk-corner"></span>' + dn.map(function (x) { return '<span class="wk-dh" aria-hidden="true">' + x + '</span>'; }).join('');
    for (var hr = AWAKE_FROM; hr < AWAKE_TO; hr++) {
      h += '<span class="wk-hr" aria-hidden="true">' + (hr % 3 === 1 ? hour(hr) : '') + '</span>';
      for (var d = 0; d < 7; d++) {
        var a = cells[d + '-' + hr], first = a && cells[d + '-' + (hr - 1)] !== a, sel = inSel(d, hr);
        var on = VIEW.cur.d === d && VIEW.cur.h === hr;
        h += '<button class="cell' + (a ? ' is-planned' : '') + (sel ? ' is-sel' : '') + '" type="button" data-d="' + d + '" data-h="' + hr + '" data-k="c' + d + '-' + hr + '" tabindex="' + (on ? 0 : -1) +
          '" aria-pressed="' + sel + '" aria-label="' + LONG[d] + ' ' + hour(hr) + ', ' + (a ? esc(actName(a)) : 'free') + '"' + (a ? areaStyle(actArea(a)) : '') + '>' +
          (first ? '<span class="cl">' + esc(actName(a)) + '</span>' : '') + '</button>';
      }
    }
    return h + '</div>';
  }
  function inSel(d, h) {
    var r = VIEW.sel;
    return !!r && d >= r.d1 && d <= r.d2 && h >= r.h1 && h <= r.h2;
  }
  function rectOf(a, b) { return { d1: Math.min(a.d, b.d), d2: Math.max(a.d, b.d), h1: Math.min(a.h, b.h), h2: Math.max(a.h, b.h) }; }
  function updateSelClasses() {
    $$('#wk-grid .cell').forEach(function (c) {
      var d = +c.getAttribute('data-d'), h = +c.getAttribute('data-h'), on = inSel(d, h);
      c.classList.toggle('is-sel', on);
      c.setAttribute('aria-pressed', String(on));
    });
    renderSelBar();
  }
  function renderSelBar() {
    var bar = $('#dr-bar'), r = VIEW.sel;
    if (VIEW.drawer !== 'week' || !r) { bar.hidden = true; bar.innerHTML = ''; return; }
    var n = (r.d2 - r.d1 + 1) * (r.h2 - r.h1 + 1);
    var when = (r.d1 === r.d2 ? LONG[r.d1] : LONG[r.d1] + ' to ' + LONG[r.d2]) + ', ' + hour(r.h1) + ' to ' + hour(r.h2 + 1);
    var inner;
    if (VIEW.chooser) {
      inner = '<p class="sel-txt">What goes in these hours?</p><div class="chips">' + S.acts.map(function (a) {
        return '<button class="chip" type="button" data-act="sel-apply" data-aid="' + a.id + '"' + areaStyle(a.area) + '><span class="dot"></span>' + esc(a.name) + '</button>';
      }).join('') + '</div><p class="sel-nav"><button class="link" type="button" data-act="sel-back">Back</button></p>';
    } else {
      inner = '<p class="sel-txt"><b>' + when + '</b> <span class="muted num">· ' + n + ' h</span></p>' +
        '<p class="sel-nav"><button class="pill primary" type="button" data-act="sel-add" data-k="sel-add">Add to these hours</button>' +
        '<button class="pill" type="button" data-act="sel-clear">Clear these hours</button><button class="link" type="button" data-act="sel-cancel">Cancel</button></p>';
    }
    bar.innerHTML = '<div class="sel-in">' + inner + '</div>';
    bar.hidden = false;
  }
  function yearHtml() {
    var paint = S.order.map(function (sid) {
      return '<button class="chip" type="button" data-act="paint" data-sid="' + sid + '" aria-pressed="' + (VIEW.paint === sid) + '"' + schedStyle(sid) + '><span class="dot"></span>' + esc(S.schedules[sid].name) + '</button>';
    }).join('') + '<button class="chip" type="button" data-act="paint" data-sid="clear" aria-pressed="' + (VIEW.paint === 'clear') + '">Clear weeks</button>';
    var counts = {}, none = 0;
    S.yearWeeks.forEach(function (sid) { if (sid) counts[sid] = (counts[sid] || 0) + 1; else none++; });
    var line = S.order.filter(function (sid) { return counts[sid]; }).map(function (sid) { return counts[sid] + ' ' + S.schedules[sid].name; });
    line.push(none + ' not chosen yet');
    var cells = S.yearWeeks.map(function (sid, j) {
      var n = j + 1, cur = n === isoWeek(TODAY), mon = addDays(WEEK1_MON, j * 7);
      var lab = 'Week ' + n + ', from ' + mon.getDate() + ' ' + MO[mon.getMonth()] + ', ' + (sid ? S.schedules[sid].name : 'not chosen, uses ' + (S.activeSchedule ? S.schedules[S.activeSchedule].name : 'no schedule'));
      return '<button class="wcell' + (sid ? ' is-set' : ' is-open') + (cur ? ' is-cur' : '') + '" type="button" data-w="' + n + '" aria-label="' + lab + '"' +
        (sid ? schedStyle(sid) : '') + '><span class="wn num">' + n + '</span></button>';
    }).join('');
    var sch = S.schedules[S.activeSchedule], tot = areaHours(sch), planned = plannedHours(sch), free = AWAKE - planned;
    var segs = Object.keys(tot).map(function (ar) {
      return '<i style="width:' + (tot[ar] / AWAKE * 100).toFixed(2) + '%;background:var(--c-' + ar + ')" title="' + esc(areaName(ar)) + ', ' + tot[ar] + ' h"></i>';
    }).join('') + '<i class="seg-free" style="width:' + (free / AWAKE * 100).toFixed(2) + '%"></i>';
    var legend = Object.keys(tot).sort(function (p, q) { return tot[q] - tot[p]; }).map(function (ar) {
      return '<li><span class="dot"' + areaStyle(ar) + '></span>' + esc(areaName(ar)) + '<span class="num">' + tot[ar] + ' h</span></li>';
    }).join('') + '<li><span class="sw-free"></span>Free<span class="num">' + free + ' h</span></li>';
    return '<section class="yr">' +
      '<h2 class="yr-h">Which weeks use which schedule</h2>' +
      '<p class="lede">Each week uses one schedule. Weeks you have not chosen use ' + esc(S.schedules[S.activeSchedule] ? S.schedules[S.activeSchedule].name : 'none yet') + '.</p>' +
      '<div class="paint"><p class="eyebrow">Paint with</p><div class="chips" role="group" aria-label="Paint with">' + paint + '</div>' +
      '<p class="muted">Drag across the weeks, or tap one.</p></div>' +
      '<div class="painter" id="painter" role="group" aria-label="Weeks of 2026">' + cells + '</div>' +
      '<p class="count-line num">' + esc(line.join(' · ')) + '</p>' +
      '<h3 class="sub-h">Your typical week</h3>' +
      '<p class="lede-sm">' + planned + ' planned hours and ' + free + ' free, out of 105 awake hours.</p>' +
      '<figure class="stack-fig"><div class="stack" role="img" aria-label="Typical week, ' + planned + ' hours planned, ' + free + ' free, out of 105 awake hours">' + segs + '</div>' +
      '<figcaption class="muted">The dashed frame is the awake time in a week. Nothing is over it.</figcaption></figure>' +
      '<ul class="legend-list">' + legend + '</ul></section>';
  }

  /* The drawer: open, close, views, focus and history. The hash (#plan/dreams and so on) is the drawer's URL. */
  function planOpen() { return $('#drawer').classList.contains('is-open'); }
  function showDrawer() {
    $('#drawer').classList.add('is-open');
    $('#app').inert = true;
    $('#drawer').scrollTop = 0;                 // a plan opens at its top, whatever the last scroll was
    renderDrawer();
    var t = $('#dr-title');
    if (t) t.focus({ preventScroll: true });
  }
  function hideDrawer() {
    $('#drawer').classList.remove('is-open');
    $('#app').inert = false;
    VIEW.sel = null; VIEW.chooser = false; VIEW.editing = null; VIEW.adding = null; VIEW.area = null;
    renderSelBar();
    var o = VIEW.opener;
    if (o && document.body.contains(o)) o.focus({ preventScroll: true });
    VIEW.opener = null;
  }
  function openPlan(view, opener) {
    if (!planOpen()) VIEW.opener = opener || document.activeElement;
    VIEW.drawer = view || VIEW.drawer || 'dreams';
    var target = '#plan/' + VIEW.drawer;
    if (location.hash !== target) history.pushState({ tb: 'plan' }, '', target);
    showDrawer();
  }
  function setPlanView(v) {
    VIEW.drawer = v; VIEW.sel = null; VIEW.chooser = false; VIEW.editing = null; VIEW.adding = null;
    if (v !== 'dreams') VIEW.area = null;
    history.replaceState({ tb: 'plan' }, '', '#plan/' + v);
    $('#drawer').scrollTop = 0;
    renderDrawer();
  }
  function closePlan() {
    if (history.state && history.state.tb === 'plan') history.back();
    else { history.replaceState(null, '', location.pathname + location.search); syncFromHash(); }
  }
  function syncFromHash() {
    var m = /^#plan\/(dreams|week|year)$/.exec(location.hash);
    if (m) {
      VIEW.drawer = m[1];
      if (!planOpen()) { VIEW.opener = VIEW.opener || document.activeElement; showDrawer(); } else renderDrawer();
    } else if (planOpen()) hideDrawer();
  }

  /* 5. The week grid and the year painter */
  function gridSel(c) { return { d: +c.getAttribute('data-d'), h: +c.getAttribute('data-h') }; }
  function applySel(aid) {
    var r = VIEW.sel, cells = S.schedules[VIEW.weekSid].cells;
    for (var d = r.d1; d <= r.d2; d++) for (var h = r.h1; h <= r.h2; h++) cells[d + '-' + h] = aid;
    VIEW.sel = null; VIEW.chooser = false;
    keepFocus($('#drawer'), renderDrawer);
  }
  function clearSel() {
    var r = VIEW.sel, cells = S.schedules[VIEW.weekSid].cells;
    for (var d = r.d1; d <= r.d2; d++) for (var h = r.h1; h <= r.h2; h++) delete cells[d + '-' + h];
    VIEW.sel = null; VIEW.chooser = false;
    keepFocus($('#drawer'), renderDrawer);
  }
  function paintWeek(n) {
    var sid = VIEW.paint === 'clear' ? null : VIEW.paint;
    S.yearWeeks[n - 1] = sid;
    var el = $('#painter [data-w="' + n + '"]');
    if (el) {
      el.className = 'wcell' + (sid ? ' is-set' : ' is-open') + (n === isoWeek(TODAY) ? ' is-cur' : '');
      el.style.setProperty('--c', sid ? 'var(--s-' + sid + ')' : '');
      el.style.setProperty('--on', sid ? 'var(--s-' + sid + '-on)' : '');
      el.setAttribute('aria-label', 'Week ' + n + ', ' + (sid ? S.schedules[sid].name : 'not chosen'));
    }
  }

  /* 6. The first run: six steps, rules only. Nothing is saved until Accept. */
  var FR_STEPS = 6;
  function frFresh() {
    return { step: 0, ambition: '', areas: [], follow: 0, unsure: false, week: { mornings: true, evenings: true, weekends: false }, hours: 5, draft: null, starter: false };
  }
  // Slots in the order they are filled: today first (in the evening), then the chosen parts of the week from
  // today onwards, then the fallback hours.
  function candidateSlots(prefs) {
    var tdow = dowOf(TODAY), seen = {};
    function order(a, b) { return ((a[0] - tdow + 7) % 7) * 100 + a[1] - (((b[0] - tdow + 7) % 7) * 100 + b[1]); }
    function uniq(list) {
      var out = [];
      list.forEach(function (p) { var k = p[0] + '-' + p[1]; if (!seen[k]) { seen[k] = 1; out.push(p); } });
      return out.sort(order);
    }
    var first = [tdow, 18];
    seen[first[0] + '-' + first[1]] = 1;
    return [first].concat(uniq(prefs), uniq(FALLBACK));
  }
  function buildDraft() {
    var ids = FR.starter ? ['phys', 'rel', 'prof'] : FR.areas.slice(0, 3);
    var items = ids.map(function (aid, i) {
      var pick, src;
      var def = defOf(AREA_DEFS, aid);
      if (i === 0 && FOLLOW[aid] && !FR.starter) {
        var opt = FOLLOW[aid].opts[FR.unsure ? 0 : FR.follow];
        pick = { habit: opt.habit, count: opt.count };
        src = FR.unsure ? 'Not sure, so the default: ' + opt.label + '.' : 'From your answer: ' + opt.label + '.';
      } else {
        pick = DEFAULT_HABIT[aid];
        src = FR.starter ? 'From the starter: ' + pick.habit + ', ' + pick.count + ' a week.' : 'Default for ' + def.name + ': ' + pick.habit + ', ' + pick.count + ' a week.';
      }
      return { area: aid, goal: def.target1 || ('Make steady progress in ' + def.name + '.'), habit: pick.habit, count: pick.count, sess: 1, src: src, slots: [], act: 'n' + i };
    });
    var left = Math.max(0, FR.hours - items.length);
    while (left > 0) {
      var moved = false;
      items.forEach(function (x) { if (left > 0 && x.sess < x.count) { x.sess++; left--; moved = true; } });
      if (!moved) break;
    }
    var prefs = [];
    if (FR.week.mornings) prefs = prefs.concat(PREF.mornings);
    if (FR.week.evenings) prefs = prefs.concat(PREF.evenings);
    if (FR.week.weekends) prefs = prefs.concat(PREF.weekends);
    var slots = candidateSlots(prefs), seq = [], cells = {};
    for (var r = 0; r < 20; r++) {
      var any = false;
      items.forEach(function (x) { if (x.sess > r) { seq.push(x); any = true; } });
      if (!any) break;
    }
    seq.forEach(function (x, j) {
      var s = slots[j];
      if (!s) return;
      cells[s[0] + '-' + s[1]] = x.act;
      x.slots.push(s);
    });
    var todayBl = blocksFromCells(cells, dowOf(TODAY));
    return {
      ambition: FR.starter ? AMBITION : FR.ambition.trim(), items: items, cells: cells, total: seq.length,
      first: todayBl[0] ? { act: todayBl[0].act, start: todayBl[0].start, dow: dowOf(TODAY) } : null
    };
  }
  function draftWeek(dr) {
    var list = [];
    dr.items.forEach(function (x) { x.slots.forEach(function (s) { list.push({ d: s[0], h: s[1], name: x.habit }); }); });
    return list.sort(function (a, b) { return a.d * 100 + a.h - (b.d * 100 + b.h); });
  }
  function frCanNext() {
    if (FR.step === 1) return FR.ambition.trim().length > 0;
    if (FR.step === 2) return FR.areas.length >= 1 && FR.areas.length <= 3;
    if (FR.step === 4) return FR.week.mornings || FR.week.evenings || FR.week.weekends;
    return true;
  }
  function frCount(n) { return 'Question ' + n + ' of 5'; }
  function renderFR() {
    var s = FR.step, title = '', body = '', nav = '';
    var primary = FR.areas[0];
    if (s === 0) {
      title = 'Let’s set up your plan.';
      body = '<p class="lede">Five short questions, about three minutes. You see a draft before anything is saved, and every answer can change later.</p>' +
        '<p class="fr-actions"><button class="pill primary" type="button" data-act="fr-next">Start</button>' +
        '<button class="link" type="button" data-act="fr-starter">Use a starter instead</button></p>' +
        '<p class="proto-note">Prototype only: <button class="link" type="button" data-act="fr-sample">load Sam’s sample plan</button>.</p>';
    } else if (s === 1) {
      title = 'What do you want to become?';
      body = '<p class="fr-count">' + frCount(1) + '</p><p class="lede">One sentence. It is the first thing you will see on the page.</p>' +
        '<label class="sr" for="fr-field">Your dream</label><textarea id="fr-field" class="field big" rows="3" data-field="ambition" placeholder="For example: Fit enough to keep up with my kids.">' + esc(FR.ambition) + '</textarea>';
      nav = frNav(true);
    } else if (s === 2) {
      title = 'What matters most this year?';
      body = '<p class="fr-count">' + frCount(2) + '</p><p class="lede">Choose one to three. The first one gets one more question.</p>' +
        '<div class="fr-chips chips" role="group" aria-label="Life areas">' + AREA_DEFS.map(function (a) {
          var on = FR.areas.indexOf(a.id) >= 0, full = FR.areas.length >= 3 && !on;
          return '<button class="chip" type="button" data-act="fr-area" data-id="' + a.id + '" aria-pressed="' + on + '"' + (full ? ' disabled' : '') + areaStyle(a.id) + '><span class="dot"></span>' + esc(a.name) + '</button>';
        }).join('') + '</div>';
      nav = frNav(true);
    } else if (s === 3) {
      title = primary && FOLLOW[primary] ? FOLLOW[primary].q : 'One habit to start with';
      body = '<p class="fr-count">' + frCount(3) + '</p>';
      if (primary && FOLLOW[primary]) {
        body += '<div class="opts" role="radiogroup" aria-label="' + esc(title) + '">' + FOLLOW[primary].opts.map(function (o, i) {
          var on = !FR.unsure && FR.follow === i;
          return '<button class="opt" type="button" role="radio" aria-checked="' + on + '" data-act="fr-follow" data-i="' + i + '"><span class="opt-dot"></span>' + esc(o.label) + '</button>';
        }).join('') + '<button class="opt" type="button" role="radio" aria-checked="' + FR.unsure + '" data-act="fr-unsure"><span class="opt-dot"></span>Not sure. Use the default.</button></div>';
      } else {
        var dh = DEFAULT_HABIT[primary] || DEFAULT_HABIT.spir;
        body += '<p class="lede">For ' + esc(areaName(primary)) + ' we start with one habit: <b>' + esc(dh.habit) + ', ' + dh.count + ' a week</b>. You can change the name and the number in the draft.</p>';
      }
      nav = frNav(true);
    } else if (s === 4) {
      title = 'What does a normal week look like?';
      body = '<p class="fr-count">' + frCount(4) + '</p><p class="lede">Choose the parts of the week that are yours to use.</p>' +
        '<div class="fr-chips chips" role="group" aria-label="Parts of the week">' +
        [['mornings', 'Working day mornings'], ['evenings', 'Evenings'], ['weekends', 'Weekends']].map(function (p) {
          return '<button class="chip" type="button" data-act="fr-week" data-w="' + p[0] + '" aria-pressed="' + FR.week[p[0]] + '">' + p[1] + '</button>';
        }).join('') + '</div>';
      nav = frNav(true);
    } else if (s === 5) {
      title = 'How many hours can you give your goals each week?';
      body = '<p class="fr-count">' + frCount(5) + '</p>' +
        '<div class="stepper"><button type="button" data-act="fr-hours" data-d="-1" aria-label="One hour less"' + (FR.hours <= 1 ? ' disabled' : '') + '>−</button>' +
        '<output id="fr-hours" aria-live="polite">' + FR.hours + ' ' + (FR.hours === 1 ? 'hour' : 'hours') + '</output>' +
        '<button type="button" data-act="fr-hours" data-d="1" aria-label="One hour more"' + (FR.hours >= 20 ? ' disabled' : '') + '>+</button></div>' +
        '<p class="lede">' + (FR.hours < 3 ? 'Three hours is enough to start. You can add more later.' : 'Sleep is not asked. These hours are for your goals only.') + '</p>';
      nav = frNav(true, 'See my draft');
    } else {
      if (!FR.draft) FR.draft = buildDraft();
      var dr = FR.draft;
      title = 'A draft from your answers.';
      body = '<p class="lede">Edit anything. Nothing is saved until you accept.</p>' +
        '<div class="draft-field"><label class="eyebrow" for="dr-amb">Your dream</label><textarea id="dr-amb" class="field" rows="2" data-draft="ambition">' + esc(dr.ambition) + '</textarea></div>' +
        dr.items.map(function (x, i) {
          return '<div class="draft-item"' + areaStyle(x.area) + '><p class="eyebrow"><span class="dot"></span>' + esc(areaName(x.area)) + '</p>' +
            '<label class="df"><span>1-year goal</span><input class="field" type="text" value="' + esc(x.goal) + '" data-draft="goal" data-i="' + i + '"></label>' +
            '<label class="df"><span>Habit</span><input class="field" type="text" value="' + esc(x.habit) + '" data-draft="habit" data-i="' + i + '"></label>' +
            '<p class="src">' + esc(x.src) + ' ' + x.sess + ' of ' + x.count + ' sessions fit in your hours this week.</p></div>';
        }).join('') +
        '<div class="draft-week"><p class="eyebrow">This week’s sessions</p><ul class="sessions">' + draftWeek(dr).map(function (x) {
          return '<li><span class="num">' + SH[x.d] + ' ' + hour(x.h) + '</span> ' + esc(x.name) + '</li>';
        }).join('') + '</ul>' +
        (dr.first ? '<p class="first">First action today: <b>' + esc(dr.items.filter(function (x) { return x.act === dr.first.act; })[0].habit) + ', ' + hour(dr.first.start) + '</b>.</p>' : '') +
        '<p class="muted">' + dr.total + ' hours a week for your goals. You said ' + FR.hours + '.</p>';
      nav = '<p class="fr-actions"><button class="pill primary" type="button" data-act="fr-accept">Accept plan</button>' +
        '<button class="link" type="button" data-act="fr-starter">Use a starter instead</button>' +
        '<button class="link" type="button" data-act="fr-answers">Change my answers</button></p>';
    }
    $('#fr-body').innerHTML = '<h2 id="fr-title" class="fr-h" tabindex="-1">' + title + '</h2>' + body + nav;
    $('#fr-step').textContent = s === 0 ? '' : 'Step ' + s + ' of ' + FR_STEPS;
    $('#fr-prog-bar').style.width = (s / FR_STEPS * 100) + '%';
    $('#fr-back').hidden = s === 0;
    var t = $('#fr-title');
    if (canFocusFields()) { var f = $('#fr-field'); if (f) f.focus({ preventScroll: true }); else t.focus({ preventScroll: true }); }
    else t.focus({ preventScroll: true });
  }
  function frNav(back, label) {
    return '<p class="fr-nav"><button class="link" type="button" data-act="fr-back">Back</button>' +
      '<button class="pill primary" type="button" data-act="fr-next"' + (frCanNext() ? '' : ' disabled') + '>' + (label || 'Next') + '</button></p>' +
      '<p class="fr-side"><button class="link" type="button" data-act="fr-starter">Use a starter instead</button></p>';
  }
  function showFR() {
    FR = frFresh();
    $('#fr').classList.add('is-open');
    $('#app').inert = true;
    renderFR();
  }
  function hideFR() {
    $('#fr').classList.remove('is-open');
    $('#app').inert = false;
  }
  function acceptDraft() {
    var dr = FR.draft, st = emptyState();
    st.ambition = dr.ambition;
    dr.items.forEach(function (x) {
      var a = stateArea(x.area);
      a.target1 = x.goal;
      a.progress = 0;
      a.habits.push({ id: x.act, name: x.habit, count: x.count, period: 'week', act: x.act });
      a.acts.push(x.act);
      st.acts.push({ id: x.act, name: x.habit, area: x.area });
    });
    st.schedules = { mine: { name: 'My week', cells: dr.cells } };
    st.order = ['mine'];
    st.activeSchedule = 'mine';
    st.milestones = [{ week: 45, text: 'Your first plan is set.' }];
    S = st;
    VIEW.date = TODAY;
    saveState();
    setSeen();
  }

  /* 7. Account, theme, storage, preview and events */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage may be blocked: the prototype still works */ } }
  var KEY = 'timely.proto.b.state', THEME = 'timely.proto.b.theme', SEEN = 'timely.proto.b.seen';
  function saveState() { lsSet(KEY, JSON.stringify(S)); }
  function setSeen() { lsSet(SEEN, '1'); }
  function loadState() {
    try {
      var raw = lsGet(KEY), o = raw ? JSON.parse(raw) : null;
      return o && Array.isArray(o.areas) && o.yearWeeks && o.done && o.schedules ? o : null;
    } catch (e) { return null; }
  }
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function setTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    lsSet(THEME, dark ? 'dark' : 'light');
    syncAccount();
  }
  function syncAccount() {
    var dark = isDark();
    $('#theme-btn').setAttribute('aria-pressed', String(dark));
    $('#theme-btn').innerHTML = icon(dark ? 'i-sun' : 'i-moon');
    $$('[data-act="theme-switch"]').forEach(function (b) { b.setAttribute('aria-checked', String(dark)); });
    $$('[data-act="ms-switch"]').forEach(function (b) { b.setAttribute('aria-checked', String(!!S.milestonesOn)); });
  }
  function acctOpen() { return !$('#acct-menu').hidden; }
  function toggleAcct(force) {
    var m = $('#acct-menu'), open = force === undefined ? m.hidden : force;
    m.hidden = !open;
    $('.avatar').setAttribute('aria-expanded', String(open));
    if (open) { var f = m.querySelector('button'); if (f) f.focus(); }
  }

  function samplePlan() {
    S = sampleState();
    VIEW.date = TODAY; VIEW.justDone = null; VIEW.toast = '';
    saveState(); setSeen();
  }
  function preview(which) {
    var k = keyOf(TODAY);
    if (which === 'sam') { samplePlan(); }
    else if (which === 'new') { S = emptyState(); saveState(); VIEW.date = TODAY; VIEW.justDone = null; showFR(); return; }
    else if (which === 'normal') {
      delete S.dayOff[k]; delete S.extra[k];
      S.done[k] = clone(DONE_SAMPLE[k]) || {};
    } else if (which === 'alldone') {
      delete S.dayOff[k]; delete S.extra[k];
      dayBlocks(TODAY).forEach(function (b) { setDone(TODAY, doneKey(b), true); });
      setDone(TODAY, 'h:water', true);
    } else if (which === 'none') {
      S.dayOff[k] = true; S.done[k] = {}; S.extra[k] = [];
    }
    VIEW.justDone = null; VIEW.date = TODAY; VIEW.toast = '';
    saveState();
    renderStream();
  }

  function act(name, el) {
    switch (name) {
      case 'theme': setTheme(!isDark()); break;
      case 'theme-switch': setTheme(!isDark()); break;
      case 'acct': toggleAcct(); break;
      case 'replay': toggleAcct(false); showFR(); break;
      case 'ms-switch': case 'sw-ms':
        S.milestonesOn = !S.milestonesOn; saveState(); keepFocus($('#progress'), renderProgress); syncAccount(); break;
      case 'sw-recap':
        S.recapOn = !S.recapOn; S.recapHidden = false; saveState(); keepFocus($('#progress'), renderProgress); break;
      case 'recap-skip': S.recapHidden = true; saveState(); REFOCUS = 'sw-recap'; renderProgress(); break;
      case 'recap-close': S.recapClosed = true; saveState(); REFOCUS = 'plan-next'; renderProgress(); break;
      case 'plan-open': openPlan(el.getAttribute('data-view') || 'dreams', el);
        if (el.getAttribute('data-edit')) { VIEW.editing = el.getAttribute('data-edit'); renderDrawer(); }
        break;
      case 'close': closePlan(); break;
      case 'dr-view': setPlanView(el.getAttribute('data-view')); break;
      case 'day-prev': VIEW.date = addDays(VIEW.date, -1); VIEW.justDone = null; VIEW.toast = ''; keepFocus($('#today'), renderToday); break;
      case 'day-next': if (VIEW.date < TODAY) { VIEW.date = addDays(VIEW.date, 1); VIEW.justDone = null; VIEW.toast = ''; keepFocus($('#today'), renderToday); } break;
      case 'tick': tickBlock(el.getAttribute('data-key'), el); break;
      case 'habits-toggle': VIEW.habitsOpen = !VIEW.habitsOpen; keepFocus($('#today'), renderToday); break;
      case 'habit-tick': {
        var hid = el.getAttribute('data-id'), on = !habitTicked(VIEW.date, hid);
        setDone(VIEW.date, 'h:' + hid, on); saveState();
        keepFocus($('#today'), renderToday);
        keepFocus($('#progress'), renderProgress);
        break;
      }
      case 'add-suggest': {
        var k = keyOf(TODAY), a = actOf(el.getAttribute('data-aid'));
        S.extra[k] = (S.extra[k] || []).concat([{ act: a.id, start: 18, end: 19 }]);
        saveState(); REFOCUS = 'focal'; renderToday();
        break;
      }
      case 'area-open': {
        openPlan('dreams', el); VIEW.area = el.getAttribute('data-id'); VIEW.editing = null; VIEW.adding = null; renderDrawer();
        var ah = $('#dr-area-h'); if (ah) ah.focus({ preventScroll: true });
        break;
      }
      case 'area-back': VIEW.area = null; VIEW.editing = null; VIEW.adding = null; renderDrawer(); break;
      case 'edit': VIEW.editing = el.getAttribute('data-key'); VIEW.adding = null; renderDrawer(); focusField(); break;
      case 'edit-cancel': VIEW.editing = null; renderDrawer(); break;
      case 'edit-done': saveEdit(el.getAttribute('data-key')); break;
      case 'adding': VIEW.adding = el.getAttribute('data-key'); VIEW.editing = null; renderDrawer(); focusField(); break;
      case 'add-cancel': VIEW.adding = null; renderDrawer(); break;
      case 'add-save': saveAdd(el.getAttribute('data-key')); break;
      case 'sched': VIEW.weekSid = el.getAttribute('data-sid'); VIEW.sel = null; VIEW.chooser = false; keepFocus($('#drawer'), renderDrawer); break;
      case 'sched-add': {
        var sid = 'copy' + newId();
        S.schedules[sid] = { name: 'Another schedule', cells: clone(S.schedules[VIEW.weekSid].cells) };
        S.order.push(sid); VIEW.weekSid = sid; saveState(); renderDrawer();
        break;
      }
      case 'sel-add': VIEW.chooser = true; renderSelBar(); { var fc = $('#dr-bar .chip'); if (fc) fc.focus(); } break;
      case 'sel-back': VIEW.chooser = false; renderSelBar(); break;
      case 'sel-apply': applySel(el.getAttribute('data-aid')); saveState(); renderStream(); break;
      case 'sel-clear': clearSel(); saveState(); renderStream(); break;
      case 'sel-cancel': VIEW.sel = null; VIEW.chooser = false; renderDrawer(); break;
      case 'paint': VIEW.paint = el.getAttribute('data-sid'); keepFocus($('#drawer'), renderDrawer); break;
      case 'pv': preview(el.getAttribute('data-pv')); break;
      case 'fr-open': showFR(); break;
      case 'fr-next': frNext(); break;
      case 'fr-back': FR.step = Math.max(0, FR.step - 1); if (FR.step !== 6) FR.draft = null; renderFR(); break;
      case 'fr-answers': FR.step = 1; FR.draft = null; FR.starter = false; renderFR(); break;
      case 'fr-starter': frStarter(); break;
      case 'fr-sample': hideFR(); samplePlan(); renderStream(); break;
      case 'fr-area': frArea(el.getAttribute('data-id')); break;
      case 'fr-follow': FR.follow = +el.getAttribute('data-i'); FR.unsure = false; renderFR(); break;
      case 'fr-unsure': FR.unsure = true; renderFR(); break;
      case 'fr-week': FR.week[el.getAttribute('data-w')] = !FR.week[el.getAttribute('data-w')]; renderFR(); break;
      case 'fr-hours': FR.hours = clamp(FR.hours + (+el.getAttribute('data-d')), 1, 20); renderFR(); break;
      case 'fr-accept': acceptDraft(); hideFR(); VIEW.justDone = null; renderStream(); scrollToFocal(); break;
      default: break;
    }
  }
  function frNext() {
    if (!frCanNext()) return;
    FR.step = Math.min(FR_STEPS, FR.step + 1);
    if (FR.step === FR_STEPS) FR.draft = buildDraft();
    renderFR();
  }
  function frStarter() {
    FR.starter = true; FR.ambition = FR.ambition || AMBITION; FR.step = FR_STEPS; FR.draft = buildDraft(); renderFR();
  }
  function frArea(id) {
    var i = FR.areas.indexOf(id);
    if (i >= 0) FR.areas.splice(i, 1);
    else if (FR.areas.length < 3) FR.areas.push(id);
    FR.follow = 0; FR.unsure = false;
    renderFR();
  }
  function focusField() {
    if (!canFocusFields()) return;
    var f = $('#ed-field') || $('#add-field');
    if (f) f.focus();
  }
  function saveEdit(key) {
    var v = ($('#ed-field') || { value: '' }).value.trim();
    if (key === 'ambition') S.ambition = v;
    else {
      var p = key.split(':'), a = stateArea(p[1]);
      if (p[0] === 'goal5') a.goal5 = v;
      if (p[0] === 'target1') a.target1 = v;
    }
    VIEW.editing = null;
    saveState();
    REFOCUS = 'ed-' + key;
    renderDrawer(); renderStream();
  }
  function saveAdd(key) {
    var f = $('#add-field'), v = f ? f.value.trim() : '';
    VIEW.adding = null;
    if (!v) { renderDrawer(); return; }
    var p = key.split(':'), a = stateArea(p[1]), id = 'x' + newId();
    if (p[0] === 'habit') {
      a.habits.push({ id: id, name: v, count: 1, period: 'week', act: id });
      a.acts.push(id);
      S.acts.push({ id: id, name: v, area: a.id });
    } else {
      a.acts.push(id);
      S.acts.push({ id: id, name: v, area: a.id });
    }
    saveState();
    REFOCUS = 'add-' + key;
    renderDrawer(); renderStream();
  }
  function tickBlock(key, el) {
    var d = VIEW.date, bl = dayBlocks(d), b = bl.filter(function (x) { return doneKey(x) === key; })[0];
    if (!b || isDone(d, key)) return;
    setDone(d, key, true); saveState();
    if (S.milestonesOn && !S.firstTickDone && keyOf(d) === keyOf(TODAY)) {
      S.firstTickDone = true; VIEW.toast = 'First tick in Timely. A good start.';
    }
    VIEW.justDone = key;
    keepFocus($('#today'), renderToday);
    renderProgress();
    clearTimeout(TICK_T);
    TICK_T = setTimeout(function () {
      VIEW.justDone = null;
      var a = document.activeElement;
      if (!a || a === document.body || $('#today').contains(a)) REFOCUS = 'focal';
      renderToday();
    }, 900);
  }
  function scrollToFocal() {
    var f = $('#today .focus');
    if (!f) return;
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
    f.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    var t = $('#focal-t'); if (t) t.focus({ preventScroll: true });
  }

  /* Focus trap for the drawer and the first run, and Escape. */
  function trap(scope, e) {
    var items = $$('button:not([disabled]), input, textarea, select, [tabindex="0"]', scope).filter(function (x) { return x.offsetParent !== null || x === document.activeElement; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !scope.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function moveCell(dx, dy, extend) {
    var c = $('#wk-grid .cell[tabindex="0"]');
    if (!c) return;
    var p = gridSel(c), n = { d: clamp(p.d + dx, 0, 6), h: clamp(p.h + dy, AWAKE_FROM, AWAKE_TO - 1) };
    VIEW.cur = n;
    if (extend && VIEW.anchor) VIEW.sel = rectOf(VIEW.anchor, n);
    else { VIEW.anchor = n; VIEW.sel = rectOf(n, n); }
    renderDrawer();
    var t = $('#wk-grid .cell[data-d="' + n.d + '"][data-h="' + n.h + '"]');
    if (t) t.focus({ preventScroll: true });
  }

  function bind() {
    document.addEventListener('click', function (e) {
      if (acctOpen() && !(e.target.closest && e.target.closest('.acct'))) toggleAcct(false);
      var t = e.target.closest && e.target.closest('[data-act]');
      if (t && !t.disabled) { act(t.getAttribute('data-act'), t); return; }
      var cell = e.target.closest && e.target.closest('#wk-grid .cell');
      if (cell && e.detail === 0) {                       // keyboard activation: select this hour and keep the focus on it
        var p = gridSel(cell);
        VIEW.cur = p; VIEW.anchor = p; VIEW.sel = rectOf(p, p); VIEW.chooser = false; renderDrawer();
        return;
      }
      var w = e.target.closest && e.target.closest('#painter .wcell');
      if (w && e.detail === 0) { paintWeek(+w.getAttribute('data-w')); saveState(); }
    });
    document.addEventListener('pointerdown', function (e) {
      var cell = e.target.closest && e.target.closest('#wk-grid .cell');
      if (cell && e.button === 0) {
        var p = gridSel(cell);
        DRAG = { anchor: p }; VIEW.cur = p; VIEW.anchor = p; VIEW.sel = rectOf(p, p); VIEW.chooser = false;
        updateSelClasses();
        return;
      }
      var w = e.target.closest && e.target.closest('#painter .wcell');
      if (w && e.button === 0) { PAINT_DRAG = true; paintWeek(+w.getAttribute('data-w')); saveState(); }
    });
    document.addEventListener('pointermove', function (e) {
      if (DRAG) {
        var el = document.elementFromPoint(e.clientX, e.clientY), c = el && el.closest && el.closest('#wk-grid .cell');
        if (c) { var p = gridSel(c); VIEW.sel = rectOf(DRAG.anchor, p); VIEW.cur = p; updateSelClasses(); }
      }
      if (PAINT_DRAG) {
        var pe = document.elementFromPoint(e.clientX, e.clientY), pw = pe && pe.closest && pe.closest('#painter .wcell');
        if (pw) { paintWeek(+pw.getAttribute('data-w')); saveState(); }
      }
    });
    document.addEventListener('pointerup', function () {
      if (DRAG) { DRAG = null; renderSelBar(); }
      if (PAINT_DRAG) { PAINT_DRAG = null; renderDrawer(); }
    });
    document.addEventListener('focusin', function (e) {
      var c = e.target.closest && e.target.closest('#wk-grid .cell');
      if (c) VIEW.cur = gridSel(c);
    });
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id === 'journal') {
        var k = t.getAttribute('data-day');
        S.journal[k] = t.value; saveState();
        var sv = $('#saved'); if (sv) sv.textContent = t.value ? 'Saved on this device' : '';
        return;
      }
      if (t.closest && t.closest('#fr') && t.getAttribute('data-field')) {
        var f = t.getAttribute('data-field');
        FR[f] = t.value;
        var nb = $('#fr [data-act="fr-next"]'); if (nb) nb.disabled = !frCanNext();
        return;
      }
      if (t.hasAttribute && t.hasAttribute('data-draft') && FR.draft) {
        var what = t.getAttribute('data-draft');
        if (what === 'ambition') FR.draft.ambition = t.value;
        if (what === 'goal') FR.draft.items[+t.getAttribute('data-i')].goal = t.value;
        if (what === 'habit') {
          var it = FR.draft.items[+t.getAttribute('data-i')];
          it.habit = t.value;
        }
      }
    });
    document.addEventListener('keydown', function (e) {
      var fr = $('#fr').classList.contains('is-open');
      if (e.key === 'Escape') {
        if (fr) { if (FR.step > 0) { FR.step--; if (FR.step !== 6) FR.draft = null; renderFR(); } e.preventDefault(); return; }
        if (acctOpen()) { toggleAcct(false); $('.avatar').focus(); e.preventDefault(); return; }
        if (planOpen()) {
          e.preventDefault();
          if (VIEW.chooser) { VIEW.chooser = false; renderSelBar(); }
          else if (VIEW.sel) { VIEW.sel = null; renderDrawer(); }
          else if (VIEW.editing) { VIEW.editing = null; renderDrawer(); }
          else if (VIEW.adding) { VIEW.adding = null; renderDrawer(); }
          else closePlan();
          return;
        }
      }
      if (e.key === 'Tab') {
        if (fr) trap($('#fr'), e);
        else if (planOpen()) trap($('#drawer'), e);
      }
      if (planOpen() && document.activeElement && document.activeElement.classList.contains('cell')) {
        var dx = 0, dy = 0;
        if (e.key === 'ArrowLeft') dx = -1; else if (e.key === 'ArrowRight') dx = 1;
        else if (e.key === 'ArrowUp') dy = -1; else if (e.key === 'ArrowDown') dy = 1;
        if (dx || dy) { e.preventDefault(); moveCell(dx, dy, e.shiftKey); return; }
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); var cc = document.activeElement; cc.click(); }
      }
    });
    window.addEventListener('popstate', syncFromHash);
    window.addEventListener('hashchange', syncFromHash);
  }

  function init() {
    var theme = lsGet(THEME);
    if (theme === 'dark' || theme === 'light') document.documentElement.setAttribute('data-theme', theme);
    var saved = loadState();
    S = saved || emptyState();                 // a first visit starts empty and opens the first run
    VIEW.date = TODAY;
    renderStream();
    syncAccount();
    bind();
    if (!saved) showFR();
    syncFromHash();
  }
  init();
})();
