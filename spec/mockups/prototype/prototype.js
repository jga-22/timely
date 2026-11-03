/* Timely prototype: dummy data and simple view state. No business logic.
   Nothing is saved, except the theme and the first-run "seen" flag in localStorage (inside try/catch).
   Sections: 1 data, 2 date and state helpers, 3 rules (done ticks, habits, weeks), 4 renderers,
   5 the week grid, 6 the first run, 7 routing, theme, menus and events. */
(function () {
  'use strict';

  /* ── 0. Small helpers ─────────────────────────────────────── */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function key(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function dow(d) { return (d.getDay() + 6) % 7; }                 // 0 = Monday
  function mondayOf(d) { return addDays(d, -dow(d)); }
  function hourLabel(h) { var x = h % 12 === 0 ? 12 : h % 12; return x + (h < 12 ? ' AM' : ' PM'); }
  function range(a, b) { return hourLabel(a) + ' to ' + hourLabel(b); }
  function icon(id) { return '<svg class="ic" aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>'; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // A stable pseudo-random number in 0..1 from a string (sample history only).
  function hash01(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 10000) / 10000;
  }
  // Progress ring: p in 0..100. Shows a check at 100.
  function ring(p, label, px) {
    var C = 97.39, pc = Math.max(0, Math.min(100, p || 0)), off = C * (1 - pc / 100), ok = pc >= 100;
    var txt = label == null ? Math.round(pc) + '%' : label;
    var inner = ok ? icon('i-check') : esc(txt);
    return '<span class="ring' + (ok ? ' ok' : '') + '" style="width:' + px + 'px;height:' + px + 'px" role="img" aria-label="' + Math.round(pc) + ' percent">' +
      '<svg viewBox="0 0 36 36" aria-hidden="true"><circle class="track" cx="18" cy="18" r="15.5" fill="none" stroke-width="3"/>' +
      '<circle class="arc" cx="18" cy="18" r="15.5" fill="none" stroke-width="3" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '"/></svg>' +
      '<span class="c">' + inner + '</span></span>';
  }

  /* ── 1. Dummy data ────────────────────────────────────────── */
  // Fixed sample date: Wednesday 4 November 2026, ISO week 45. The prototype never reads the clock.
  var TODAY = new Date(2026, 10, 4);
  var MON1 = new Date(2025, 11, 29);          // Monday of ISO week 1 of 2026
  var WEEK_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var AWAKE = 105;                             // awake hours in a week: 7 AM to 10 PM, every day
  var DEFAULT_AMB = 'Be strong, rested and able to keep up with my kids.';
  var STARTER_AMB = 'Stronger, calmer, and able to keep up with my kids.';

  // The eight life areas, in the order of the Goals grid. Ids match the --c-* colour tokens.
  var AREAS = [
    { id: 'phys', name: 'Physical', goal5: 'Feel strong, rested and energetic.', target: 'Exercise at least three times a week, all year.', progress: 62 },
    { id: 'spir', name: 'Spiritual', goal5: 'Keep a calm, clear mind and clear values.', target: 'Read something inspiring at least three times a week.', progress: 30 },
    { id: 'rel', name: 'Relational & emotional', goal5: 'Be present for the people I love.', target: 'A regular time together with family and friends, every week.', progress: 55 },
    { id: 'eco', name: 'Economic', goal5: 'Manage money with confidence and calm.', target: '', progress: null },
    { id: 'cog', name: 'Cognitive', goal5: 'Keep learning and growing in my field.', target: 'Finish one course and share what I learn.', progress: 40 },
    { id: 'soc', name: 'Social', goal5: 'Belong to a few circles where I can give and receive.', target: '', progress: null },
    { id: 'prof', name: 'Professional', goal5: 'Do work that uses my best skills and makes sense.', target: 'Ship the Q1 project and keep focused mornings.', progress: 48 },
    { id: 'env', name: 'Environment', goal5: 'Live and work in a calm, tidy space.', target: 'A tidy home and one walk outside every day.', progress: 20 }
  ];

  // Activities: the things that fill hours. Each has one primary life area.
  var ACTS = [
    { id: 'focus', name: 'Focused work', area: 'prof' },
    { id: 'planning', name: 'Weekly planning', area: 'prof' },
    { id: 'run', name: 'Run', area: 'phys' },
    { id: 'yoga', name: 'Yoga', area: 'phys' },
    { id: 'walk', name: 'Walk', area: 'phys' },
    { id: 'family', name: 'Family time', area: 'rel' },
    { id: 'dinner', name: 'Family dinner', area: 'rel' },
    { id: 'call', name: 'Call a friend', area: 'rel' },
    { id: 'quiet', name: 'Quiet time', area: 'spir' },
    { id: 'reading', name: 'Reading', area: 'cog' },
    { id: 'study', name: 'Study', area: 'cog' },
    { id: 'tidy', name: 'Tidy the flat', area: 'env' }
  ];

  // Habits: measurable, per day, week or month. base is the sample's usual share of ticks.
  var HABITS = [
    { id: 'run', area: 'phys', name: 'Run', count: 3, period: 'week', act: 'run', base: 0.8 },
    { id: 'water', area: 'phys', name: 'Drink enough water', count: 1, period: 'day', act: null, base: 0.7 },
    { id: 'quiet', area: 'spir', name: 'Quiet time to reflect', count: 1, period: 'day', act: 'quiet', base: 0.5 },
    { id: 'read', area: 'spir', name: 'Read for inspiration', count: 3, period: 'week', act: 'reading', base: 0.45 },
    { id: 'call', area: 'rel', name: 'Call a friend or relative', count: 2, period: 'week', act: 'call', base: 0.85 },
    { id: 'family', area: 'rel', name: 'Plan a family activity', count: 1, period: 'week', act: 'family', base: 0.7 },
    { id: 'budget', area: 'eco', name: 'Review the monthly budget', count: 1, period: 'month', act: null, base: 0.6 },
    { id: 'study', area: 'cog', name: 'Study a new topic', count: 3, period: 'week', act: 'study', base: 0.7 },
    { id: 'project', area: 'cog', name: 'Work on a personal project', count: 2, period: 'week', act: null, base: 0.55 },
    { id: 'meeting', area: 'soc', name: 'Attend a community meeting', count: 1, period: 'month', act: null, base: 0.6 },
    { id: 'focus', area: 'prof', name: 'Focused work', count: 5, period: 'week', act: 'focus', base: 0.8 },
    { id: 'planning', area: 'prof', name: 'Weekly planning', count: 1, period: 'week', act: 'planning', base: 0.9 },
    { id: 'errands', area: 'env', name: 'Run errands with a plan', count: 1, period: 'week', act: 'tidy', base: 0.6 }
  ];

  // Share of blocks ticked in the sample history, by life area.
  var BASE = { phys: 0.82, spir: 0.55, rel: 0.86, eco: 0.6, cog: 0.7, soc: 0.6, prof: 0.78, env: 0.6 };

  // Schedules: [weekday 0 = Monday, start hour, end hour, activity id]. Hours are 24 hour clock.
  var MY = [
    [0, 9, 12, 'focus'], [0, 18, 19, 'run'], [0, 20, 21, 'reading'],
    [1, 9, 12, 'focus'], [1, 18, 19, 'dinner'], [1, 20, 21, 'study'],
    [2, 9, 10, 'planning'], [2, 13, 15, 'focus'], [2, 18, 19, 'run'],
    [3, 9, 12, 'focus'], [3, 12, 13, 'walk'], [3, 18, 20, 'family'],
    [4, 7, 8, 'yoga'], [4, 9, 11, 'focus'], [4, 17, 18, 'call'],
    [5, 10, 12, 'walk'], [5, 15, 18, 'family'],
    [6, 8, 9, 'quiet'], [6, 15, 16, 'tidy'], [6, 17, 18, 'reading']
  ];
  var TEMPLATES = {
    my: { name: 'My week', list: MY },
    deep: { name: 'Deep work', list: MY.concat([[0, 13, 16, 'focus'], [1, 13, 15, 'focus'], [3, 15, 17, 'focus'], [4, 13, 15, 'focus']]) },
    holiday: {
      name: 'Holiday',
      list: [[0, 8, 9, 'walk'], [1, 8, 9, 'walk'], [2, 8, 9, 'walk'], [3, 8, 9, 'walk'], [4, 8, 9, 'walk'],
        [5, 10, 12, 'walk'], [5, 15, 18, 'family'], [6, 8, 9, 'quiet'], [6, 15, 18, 'family']]
    }
  };

  // The rule table for the first run (section 6a). Other areas get one default habit.
  var FOLLOW = {
    phys: { q: 'What would a good month look like for Physical?', opts: [
      { label: 'Run, three times a week', habit: 'Run', count: 3, act: 'run' },
      { label: 'Walk, every day', habit: 'Walk', count: 7, act: 'walk' }] },
    prof: { q: 'Which piece of work would make this year count?', opts: [
      { label: 'Focused work, three mornings a week', habit: 'Focused work', count: 3, act: 'focus' },
      { label: 'Weekly planning, once a week', habit: 'Weekly planning', count: 1, act: 'planning' }] },
    rel: { q: 'Who do you want more time with?', opts: [
      { label: 'Family evening, twice a week', habit: 'Family evening', count: 2, act: 'dinner' },
      { label: 'A call with a friend, twice a week', habit: 'Call a friend or relative', count: 2, act: 'call' }] },
    spir: { q: 'Which habit would you like to start?', opts: [{ label: 'Quiet time, three times a week', habit: 'Quiet time to reflect', count: 3, act: 'quiet' }] },
    cog: { q: 'Which habit would you like to start?', opts: [{ label: 'Study a new topic, three times a week', habit: 'Study a new topic', count: 3, act: 'study' }] },
    env: { q: 'Which habit would you like to start?', opts: [{ label: 'Run errands with a plan, once a week', habit: 'Run errands with a plan', count: 1, act: 'tidy' }] },
    eco: { q: 'Which habit would you like to start?', opts: [{ label: 'Review the monthly budget', habit: 'Review the monthly budget', count: 1, act: null }] },
    soc: { q: 'Which habit would you like to start?', opts: [{ label: 'Attend a community meeting', habit: 'Attend a community meeting', count: 1, act: null }] }
  };

  /* ── 2. Date and state helpers ────────────────────────────── */
  function weekIdx(d) { return Math.round((mondayOf(d) - MON1) / 864e5 / 7) + 1; }
  function longDate(d) { return WEEK_NAMES[dow(d)] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function shortDate(d) { return SHORT[dow(d)] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); }
  function isFuture(d) { return d > TODAY; }
  function viewDate() { return addDays(TODAY, S.dayOff); }
  function weekDays(d) { var m = mondayOf(d); return [0, 1, 2, 3, 4, 5, 6].map(function (i) { return addDays(m, i); }); }

  function schedOf(sid, tpl) {
    return { name: tpl.name, blocks: tpl.list.map(function (t, i) {
      return { id: sid + '-' + i, dow: t[0], a: t[1], b: t[2], act: t[3] };
    }) };
  }
  function freshState() {
    var scheds = {};
    Object.keys(TEMPLATES).forEach(function (sid) { scheds[sid] = schedOf(sid, TEMPLATES[sid]); });
    return {
      route: 'home', dayOff: 0, preview: 'normal', seq: 100,
      done: {}, habitDone: {}, journal: {},
      areas: clone(AREAS), acts: clone(ACTS), habits: clone(HABITS),
      scheds: scheds, order: ['my', 'deep', 'holiday'], active: 'my',
      paint: { 28: 'holiday', 29: 'holiday', 30: 'holiday', 31: 'holiday', 36: 'deep', 37: 'deep', 38: 'deep', 39: 'deep' },
      tool: 'my', painting: false,
      sleep: false, sel: null, selBlock: null, drag: null, anchor: null, menu: null, kbd: { d: 0, h: 7 },
      goalMode: 'list', selArea: 'phys', goalEdit: false, ambEdit: false,
      ambition: DEFAULT_AMB, fresh: false,
      milestones: true, recapOn: true, recapDone: false, shown: {},
      draft: null, draftEdit: null,
      fr: { step: 0, ambition: STARTER_AMB, areas: ['phys', 'rel'], follow: {}, evening: true, weekend: true, workdays: true, hours: 5, err: '' }
    };
  }
  var S = freshState();

  // Blocks, activities and areas by id.
  function actOf(id) {
    var found = S.acts.find(function (x) { return x.id === id; });
    return found || { id: id, name: 'Session', area: 'phys' };
  }
  function areaOf(id) { return S.areas.find(function (a) { return a.id === id; }) || S.areas[0]; }
  function blockArea(b) { return actOf(b.act).area; }
  function blockLen(b) { return b.b - b.a; }
  function weekSched(d) { var s = S.paint[weekIdx(d)]; return s && S.scheds[s] ? s : 'my'; }

  // The blocks on a day. Raw ignores the preview switch (used for statistics).
  function dayBlocks(d, raw) {
    if (!raw && S.preview === 'none' && key(d) === key(TODAY)) return [];
    var sc = S.scheds[weekSched(d)];
    return sc.blocks.filter(function (b) { return b.dow === dow(d); }).sort(function (x, y) { return x.a - y.a; });
  }

  /* ── 3. Rules: done ticks, habits, weeks ─────────────────── */
  function blockDone(d, b) {
    var k = key(d) + '|' + b.id;
    if (k in S.done) return S.done[k];
    if (isFuture(d) || S.fresh) return false;
    if (key(d) === key(TODAY)) return b.act === 'planning';
    return hash01(k) < BASE[blockArea(b)];
  }
  function habitDone(d, h) {
    var k = key(d) + '|h|' + h.id;
    if (k in S.habitDone) return S.habitDone[k];
    if (isFuture(d) || S.fresh) return false;
    if (key(d) === key(TODAY)) return h.id === 'water' || h.id === 'call';
    // Weekly and monthly habits tick on a share of days, so their counts stay near the target.
    var per = h.period === 'week' ? h.count / 7 : h.period === 'month' ? 1 / 30 : 1;
    return hash01(k) < h.base * per;
  }
  // Ticks in the week (or month) to date, against the target for that span.
  function habitSpan(d, h) {
    var end = isFuture(d) ? TODAY : d, n = 0, x;
    if (h.period === 'month') {
      for (x = new Date(d.getFullYear(), d.getMonth(), 1); x <= end; x = addDays(x, 1)) if (habitDone(x, h)) n++;
      return { done: Math.min(n, h.count), target: h.count, span: 'this month' };
    }
    for (x = mondayOf(d); x <= end; x = addDays(x, 1)) if (habitDone(x, h)) n++;
    var tg = h.period === 'day' ? 7 : h.count;
    return { done: Math.min(n, tg), target: tg, span: 'this week' };
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function needText(h) {
    if (h.period === 'day') return h.count === 1 ? 'Needs every day' : 'Needs ' + h.count + ' a day';
    return 'Needs ' + h.count + ' a ' + (h.period === 'week' ? 'week' : 'month');
  }
  function stageOf(p) {
    if (p == null) return 'No target yet';
    if (p >= 100) return 'Reached';
    if (p >= 75) return 'Strong';
    if (p >= 50) return 'Steady';
    if (p >= 25) return 'Building';
    return 'Starting';
  }
  function hoursOf(actId) {
    var n = 0;
    S.scheds[S.active].blocks.forEach(function (b) { if (b.act === actId) n += blockLen(b); });
    return n;
  }
  function dayStat(d) {
    var bl = dayBlocks(d, true), s = { planned: bl.length, done: 0, hours: 0, doneHours: 0 };
    bl.forEach(function (b) {
      s.hours += blockLen(b);
      if (blockDone(d, b)) { s.done++; s.doneHours += blockLen(b); }
    });
    return s;
  }
  // Planned and ticked hours over a span of days (clipped to today).
  function rangeStats(from, to) {
    var out = { planned: 0, ticked: 0, areas: {} };
    for (var d = from; d <= to && d <= TODAY; d = addDays(d, 1)) {
      dayBlocks(d, true).forEach(function (b) {
        var ar = blockArea(b), l = blockLen(b), ok = blockDone(d, b);
        out.planned += l;
        out.areas[ar] = out.areas[ar] || { p: 0, t: 0 };
        out.areas[ar].p += l;
        if (ok) { out.ticked += l; out.areas[ar].t += l; }
      });
    }
    return out;
  }
  function weekRange(w) { var m = addDays(MON1, (w - 1) * 7); return [m, addDays(m, 6)]; }
  function wordsFor(share) {
    if (share >= 0.875) return 'nearly all';
    if (share >= 0.625) return 'about three in four';
    if (share >= 0.375) return 'about half';
    return 'about one in four';
  }
  // Ticks over the expected count for a habit across a span of days.
  function habitRatio(from, to, h) {
    var n = 0, done = 0, x;
    for (x = from; x <= to && x <= TODAY; x = addDays(x, 1)) { n++; if (habitDone(x, h)) done++; }
    var exp = h.period === 'day' ? n : h.period === 'week' ? (n * h.count / 7) : (n * h.count / 30);
    return { done: done, expected: exp, ratio: exp >= 1 ? Math.min(1, done / exp) : null };
  }
  // The 'Show a habit to try' suggestion for an empty day: the weekly habit most behind.
  function suggestion() {
    var worst = null, wr = 2;
    S.habits.forEach(function (h) {
      if (h.period !== 'week') return;
      var s = habitSpan(TODAY, h), r = s.done / s.target;
      if (r < wr) { wr = r; worst = { h: h, s: s }; }
    });
    return worst;
  }

  /* ── 4. Renderers ─────────────────────────────────────────── */
  function renderAll() {
    renderHome();
    if (!S.goalEdit) renderGoals();
    renderWeek();
    renderYear();
    renderInsights();
    renderAmbitionEverywhere();
  }
  function renderAmbitionEverywhere() {
    $('#ambNote').textContent = '';
    var none = S.areas.filter(function (a) { return a.progress == null; }).map(function (a) { return a.name; });
    var n = S.areas.length - none.length;
    $('#ambNote').textContent = 'The ambition ring is the average of the ' + n + ' 1-year targets, unweighted.' +
      (none.length ? ' ' + none.join(' and ') + (none.length === 1 ? ' has' : ' have') + ' no target yet.' : '');
  }
  function ambitionPercent() {
    var vals = S.areas.filter(function (a) { return a.progress != null; }).map(function (a) { return a.progress; });
    if (!vals.length) return 0;
    return vals.reduce(function (x, y) { return x + y; }, 0) / vals.length;
  }

  /* Home */
  function renderHome() {
    var d = viewDate(), k = key(d), today = S.dayOff === 0;
    $('#homeEyebrow').textContent = (today ? 'Today' : 'A past day') + ' · week ' + weekIdx(d);
    $('#t-home').textContent = longDate(d);
    $('#homeAmb').textContent = S.ambition;
    var prev = addDays(d, -1), next = addDays(d, 1);
    var pb = $('#dayPrev'), nb = $('#dayNext');
    pb.innerHTML = icon('i-left') + '<span>' + shortDate(prev) + '</span>';
    pb.disabled = S.dayOff <= -60;
    pb.setAttribute('aria-label', 'Previous day, ' + longDate(prev));
    nb.innerHTML = '<span>' + shortDate(next) + '</span>' + icon('i-right');
    nb.disabled = today;
    nb.setAttribute('aria-label', 'Next day, ' + longDate(next));
    $('#dayToday').disabled = today;
    $('#ambRing').innerHTML = ring(ambitionPercent(), null, 56) + '<span class="body-sm">Ambition, average of<br>the 1-year targets</span>';

    var bl = dayBlocks(d), undone = bl.filter(function (b) { return !blockDone(d, b); });
    if (!bl.length) $('#focus').innerHTML = emptyFocus(d, today);
    else if (!undone.length) $('#focus').innerHTML = doneFocus(d, bl, today);
    else $('#focus').innerHTML = nextFocus(d, undone, today);

    var doneN = bl.filter(function (b) { return blockDone(d, b); }).length;
    $('#blocks-h').textContent = today ? "Today's blocks" : 'Blocks on ' + shortDate(d);
    $('#dayRing').innerHTML = ring(bl.length ? doneN / bl.length * 100 : 0, '', 30);
    $('#dayCount').textContent = !bl.length ? 'Nothing planned' : doneN === bl.length ? 'All done' : doneN + ' of ' + bl.length + ' done';
    $('#blockList').innerHTML = bl.length ? bl.map(function (b) {
      var dn = blockDone(d, b), ar = blockArea(b);
      return '<li class="row' + (dn ? ' is-done' : '') + '">' +
        '<span class="time">' + range(b.a, b.b) + '</span>' +
        '<span class="row-main"><span class="row-name">' + esc(actOf(b.act).name) + '</span>' +
        '<span class="row-sub"><i class="dot" style="--c:var(--c-' + ar + ')"></i>' + esc(areaOf(ar).name) + '</span></span>' +
        '<button class="tick" type="button" data-tick="blk" data-id="' + b.id + '" aria-pressed="' + dn + '" aria-label="' + esc(actOf(b.act).name) + ', ' + range(b.a, b.b) + '"><span class="dot-c">' + icon('i-check') + '</span></button></li>';
    }).join('') : '<li class="muted" style="padding:14px 0">Nothing is planned on this day. Habits below still count.</li>';

    renderHabits(d, today);
    renderStrip(d);
    renderTargets();
    var j = $('#journal');
    if (j.dataset.key !== k) { j.value = S.journal[k] || ''; j.dataset.key = k; }
    $('#journalNote').textContent = S.journal[k] ? 'Kept in this page only. Nothing is saved.' : 'Kept in this page only. One line is enough.';
  }
  function nextFocus(d, undone, today) {
    var b = undone[0], ar = blockArea(b), area = areaOf(ar), when = (today ? 'Next' : 'Open on ' + shortDate(d)) + ', ' + range(b.a, b.b);
    var behind = area.progress != null
      ? 'Behind this block: <b>' + esc(area.name) + '</b>, 1-year target &ldquo;' + esc(area.target) + '&rdquo;, ' + area.progress + '% of the way there.'
      : 'Behind this block: <b>' + esc(area.name) + '</b>. Set a 1-year target in Goals to see how far it goes.';
    var then = undone[1] ? '<p class="focus-next">Then: ' + esc(actOf(undone[1].act).name) + ', ' + range(undone[1].a, undone[1].b) + '</p>' : '';
    var name = actOf(b.act).name;
    return '<article class="focus" style="--c:var(--c-' + ar + ')" aria-labelledby="focus-h">' +
      '<div><p class="eyebrow">' + esc(when) + '</p>' +
      '<h2 class="focus-title" id="focus-h" tabindex="-1">' + esc(name) + '</h2>' +
      '<p class="focus-meta"><i class="dot" style="--c:var(--c-' + ar + ')"></i>' + esc(area.name) + ' · ' + blockLen(b) + ' h</p>' +
      '<p class="behind">' + behind + '</p></div>' +
      '<button class="tick big" type="button" data-tick="blk" data-id="' + b.id + '" aria-pressed="false" aria-label="Mark ' + esc(name) + ' as done"><span class="dot-c">' + icon('i-check') + '</span></button>' +
      then + '</article>';
  }
  function doneFocus(d, bl, today) {
    return '<article class="focus is-done" aria-labelledby="focus-h">' +
      '<div><p class="eyebrow">' + (today ? 'Done for today' : 'Done on ' + shortDate(d)) + '</p>' +
      '<h2 class="focus-title" id="focus-h" tabindex="-1">' + (today ? 'Today is complete' : 'Every block was done') + '</h2>' +
      '<p class="focus-meta">All ' + bl.length + ' blocks done. Nothing else is due ' + (today ? 'today' : 'that day') + '.</p></div>' +
      '<span class="done-mark" aria-hidden="true">' + icon('i-check') + '</span></article>';
  }
  function emptyFocus(d, today) {
    var s = today ? suggestion() : null, sug = '';
    if (s) {
      var act = s.h.act ? actOf(s.h.act) : actOf('reading');
      var nd = (dow(TODAY) + 1) % 7;
      sug = '<div class="suggest"><span>' + esc(s.h.name) + ' is behind this week: ' + s.s.done + ' of ' + s.s.target + '. ' + WEEK_NAMES[nd] + ' evening is free.</span>' +
        '<button class="btn primary" type="button" data-add-suggest="' + act.id + '" data-dow="' + nd + '">Add ' + esc(act.name) + ', ' + SHORT[nd] + ' 6 to 7 PM</button></div>';
    }
    return '<article class="focus is-empty" aria-labelledby="focus-h">' +
      '<div><p class="eyebrow">' + (today ? 'Nothing planned today' : 'Nothing planned on ' + shortDate(d)) + '</p>' +
      '<h2 class="focus-title" id="focus-h" tabindex="-1">' + (today ? 'A quiet day, on purpose' : 'Nothing was planned') + '</h2>' +
      '<p class="focus-meta">Habits do not need a block. Tick them when they happen.</p></div>' + sug + '</article>';
  }
  function renderHabits(d, today) {
    var ticked = S.habits.filter(function (h) { return habitDone(d, h); }).length;
    $('#habCount').textContent = ticked + ' of ' + S.habits.length + ' ticked ' + (today ? 'today' : 'that day');
    var html = '<div class="hab-areas">';
    S.areas.forEach(function (a) {
      var hs = S.habits.filter(function (h) { return h.area === a.id; });
      if (!hs.length) return;
      html += '<div class="area-block"><p class="area-head"><i class="dot" style="--c:var(--c-' + a.id + ')"></i>' + esc(a.name) + '</p>';
      hs.forEach(function (h) {
        var dn = habitDone(d, h), sp = habitSpan(d, h);
        html += '<div class="hab"><div class="hab-name' + (dn ? ' is-done' : '') + '">' + esc(h.name) + '<span>' + needText(h) + '</span></div>' +
          '<span class="hab-meta">' + sp.done + ' of ' + sp.target + ' ' + sp.span + '</span>' +
          '<button class="tick" type="button" data-tick="hab" data-id="' + h.id + '" aria-pressed="' + dn + '" aria-label="' + esc(h.name) + '"><span class="dot-c">' + icon('i-check') + '</span></button></div>';
      });
      html += '</div>';
    });
    $('#habitList').innerHTML = html + '</div>';
  }
  function renderStrip(d) {
    var days = weekDays(d), P = 0, D = 0;
    $('#strip').innerHTML = days.map(function (x, i) {
      var st = dayStat(x), future = isFuture(x), cls, txt;
      if (!st.planned) { cls = 'rest'; txt = '–'; }
      else if (future) { cls = 'todo'; txt = String(st.planned); }
      else {
        cls = st.done === st.planned ? 'full' : st.done > 0 ? 'part' : 'missed';
        txt = st.done + '/' + st.planned;
      }
      if (!future) { P += st.planned; D += st.done; }
      var now = key(x) === key(d) ? ' now' : '';
      return '<div class="d"><span>' + SHORT[i] + '</span><span class="cell ' + cls + now + '" aria-label="' + WEEK_NAMES[i] + ': ' + txt + '">' + txt + '</span></div>';
    }).join('');
    $('#stripText').textContent = P
      ? D + ' of ' + P + ' planned sessions so far. A missed session costs one session, nothing else: no streak resets.'
      : 'No sessions are planned yet this week. Habits still count when you tick them.';
  }
  function renderTargets() {
    $('#targets').innerHTML = S.areas.map(function (a) {
      if (a.progress == null) {
        return '<div class="target-row"><span>' + esc(a.name) + '</span><span class="none" style="grid-column:2 / 4"><a href="#goals">Set one in Goals</a></span></div>';
      }
      return '<div class="target-row"><span>' + esc(a.name) + '</span>' +
        '<div class="bar" style="--c:var(--c-' + a.id + ')"><i style="width:' + a.progress + '%"></i></div>' +
        '<span class="fig">' + a.progress + '%</span></div>';
    }).join('');
  }

  /* Goals */
  function renderGoals() {
    $('#ambText').textContent = S.ambition;
    $('#ambText').hidden = S.ambEdit;
    $('#ambEdit').hidden = S.ambEdit;
    $('#ambForm').hidden = !S.ambEdit;
    $('#modeList').setAttribute('aria-pressed', String(S.goalMode === 'list'));
    $('#modeGrid').setAttribute('aria-pressed', String(S.goalMode === 'grid'));
    $('#listCard').hidden = S.goalMode === 'grid';
    $('#view-goals .goals').classList.toggle('solo', S.goalMode === 'grid');
    $('#harada').hidden = S.goalMode !== 'grid';
    $('#harada').innerHTML = haradaHtml();
    $('#areaList').innerHTML = S.areas.map(areaRow).join('');
    renderDetail();
  }
  function areaRow(a) {
    var nh = S.habits.filter(function (h) { return h.area === a.id; }).length;
    var na = S.acts.filter(function (x) { return x.area === a.id; }).length;
    return '<li><button type="button" class="area-row" data-area="' + a.id + '" aria-current="' + (a.id === S.selArea) + '" style="--c:var(--c-' + a.id + ')">' +
      '<i class="dot lg"></i><span class="nm">' + esc(a.name) + '</span>' +
      '<span class="cnt">' + plural(nh, 'habit', 'habits') + ' · ' + plural(na, 'activity', 'activities') + '</span>' +
      '<span class="st">' + stageOf(a.progress) + (a.progress == null ? '' : ' · ' + a.progress + '%') + '</span>' +
      (a.progress == null ? '' : '<span class="bar thin"><i style="width:' + a.progress + '%"></i></span>') + '</button></li>';
  }
  function haradaHtml() {
    var order = [0, 1, 2, 3, 'c', 4, 5, 6, 7];
    return order.map(function (o) {
      if (o === 'c') return '<div class="harada-centre"><b>5-year ambition</b><p>' + esc(S.ambition) + '</p></div>';
      var a = S.areas[o];
      return '<button type="button" class="harada-cell" style="--c:var(--c-' + a.id + ')" data-area="' + a.id + '" aria-current="' + (a.id === S.selArea) + '">' +
        '<span class="nm">' + esc(a.name) + '</span><span class="pc">' + (a.progress == null ? 'No target yet' : a.progress + '% of 1-year target') + '</span></button>';
    }).join('');
  }
  function renderDetail() {
    var a = areaOf(S.selArea), el = $('#detail');
    if (S.goalEdit) {
      el.innerHTML = '<h2 id="detail-h" tabindex="-1">Edit ' + esc(a.name) + '</h2>' +
        '<form class="form" id="goalForm"><label class="field-label">Name<input class="field" name="name" value="' + esc(a.name) + '"></label>' +
        '<label class="field-label">5-year goal<textarea class="field" name="goal5" rows="2">' + esc(a.goal5) + '</textarea></label>' +
        '<label class="field-label">1-year target<textarea class="field" name="target" rows="2">' + esc(a.target) + '</textarea></label>' +
        '<div class="form-actions"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" data-goal="cancel">Cancel</button></div>' +
        '<p class="muted">Sample only: the change stays on this page until you reload.</p></form>';
      return;
    }
    var hs = S.habits.filter(function (h) { return h.area === a.id; });
    var acts = S.acts.filter(function (x) { return x.area === a.id; });
    el.innerHTML =
      '<div class="detail-head"><i class="dot lg" style="--c:var(--c-' + a.id + ');margin-top:8px"></i>' +
      '<div><p class="eyebrow">' + stageOf(a.progress) + '</p><h2 id="detail-h" tabindex="-1">' + esc(a.name) + '</h2></div>' +
      '<button class="btn" type="button" data-goal="edit">' + icon('i-edit') + 'Edit</button></div>' +
      '<section><h3>5-year goal</h3><p class="body">' + esc(a.goal5) + '</p></section>' +
      '<section><h3>1-year target</h3>' + (a.target
        ? '<p class="body">' + esc(a.target) + '</p><div class="bar" style="--c:var(--c-' + a.id + ');margin-top:4px"><i style="width:' + a.progress + '%"></i></div><p class="muted">' + a.progress + '% of the way there</p>'
        : '<p class="body" style="color:var(--ink-3)">No 1-year target yet. Add one to start this area\'s stage.</p>') + '</section>' +
      '<section><h3>Habits</h3>' + (hs.length ? hs.map(function (h) {
        return '<div class="entry"><span class="entry-name">' + esc(h.name) + '</span><span class="entry-meta">' + needText(h) + '</span>' +
          '<span class="entry-sub">' + (h.act ? 'Linked to ' + esc(actOf(h.act).name) : 'Not linked to an activity yet') + '</span></div>';
      }).join('') : '<p class="muted">No habits yet.</p>') +
      '<div><button class="btn quiet" type="button" data-goal="add-habit">' + icon('i-plus') + 'Add habit</button></div></section>' +
      '<section><h3>Activities</h3>' + (acts.length ? acts.map(function (x) {
        var hrs = hoursOf(x.id);
        return '<div class="entry"><span class="entry-name">' + esc(x.name) + '</span><span class="entry-meta">' + (hrs ? hrs + ' h a week' : 'Not in the week yet') + '</span></div>';
      }).join('') : '<p class="muted">No activities yet.</p>') +
      '<div><button class="btn quiet" type="button" data-goal="add-act">' + icon('i-plus') + 'Add activity</button></div></section>';
  }

  /* Week: the schedule chips, the grid, the action bar and the donut */
  function renderWeek() {
    var sc = S.scheds[S.active];
    $('#schedName').textContent = sc.name;
    $('#schedChips').innerHTML = S.order.map(function (id) {
      return '<button class="chip" type="button" data-sched="' + id + '" aria-pressed="' + (S.active === id) + '">' + esc(S.scheds[id].name) + '</button>';
    }).join('') + '<button class="chip" type="button" data-new-sched="1">' + icon('i-plus') + 'Another schedule</button>';
    var sw = $('#sleepSw');
    sw.setAttribute('aria-checked', String(S.sleep));
    sw.querySelector('span:last-child').textContent = S.sleep ? 'Hide sleep' : 'Show sleep';
    renderGrid(sc);
    renderSelBar(sc);
    renderDonut(sc);
    $('#cue').innerHTML = 'Thursday to Sunday are to the <b>right</b>' + '<span class="dots" aria-hidden="true"><i class="on"></i><i></i></span>';
  }
  function renderGrid(sc) {
    var hrs = [0, 0, 0, 0, 0, 0, 0], occ = {};
    sc.blocks.forEach(function (b) {
      hrs[b.dow] += blockLen(b);
      for (var h = b.a; h < b.b; h++) occ[b.dow + ':' + h] = b;
    });
    var out = '<div class="wh" style="grid-row:1;grid-column:1"></div>';
    for (var i = 0; i < 7; i++) {
      out += '<div class="wh" style="grid-row:1;grid-column:' + (i + 2) + '"><span>' + SHORT[i] + '</span><small>' + hrs[i] + ' h</small></div>';
    }
    for (var h2 = 7; h2 <= 21; h2++) {
      out += '<div class="hl" style="grid-row:' + (h2 - 5) + ';grid-column:1">' + hourLabel(h2) + '</div>';
    }
    for (var h3 = 7; h3 <= 21; h3++) {
      for (var d = 0; d < 7; d++) {
        var inSel = S.sel && S.sel.d === d && h3 >= S.sel.a && h3 <= S.sel.b;
        var busy = occ[d + ':' + h3];
        var kb = S.kbd.d === d && S.kbd.h === h3;
        out += '<button class="slot' + (inSel ? ' sel' : '') + '" type="button" data-d="' + d + '" data-h="' + h3 + '" tabindex="' + (kb ? 0 : -1) + '"' +
          ' style="grid-row:' + (h3 - 5) + ';grid-column:' + (d + 2) + '" aria-label="' + WEEK_NAMES[d] + ' ' + hourLabel(h3) + (busy ? ', ' + actOf(busy.act).name : ', free') + '"></button>';
      }
    }
    sc.blocks.forEach(function (b) {
      var ar = blockArea(b), pressed = S.selBlock === b.id;
      out += '<button class="blk" type="button" data-blk="' + b.id + '" aria-pressed="' + pressed + '" style="--c:var(--c-' + ar + ');grid-row:' + (b.a - 5) + ' / span ' + blockLen(b) + ';grid-column:' + (b.dow + 2) + '"' +
        ' aria-label="' + esc(actOf(b.act).name) + ', ' + WEEK_NAMES[b.dow] + ' ' + range(b.a, b.b) + '"><b>' + esc(actOf(b.act).name) + '</b><span>' + range(b.a, b.b) + '</span></button>';
    });
    if (S.sleep) out += '<div class="sleep-row" style="grid-row:17"><span>Sleep, 10 PM to 7 AM, every night</span></div>';
    $('#wgrid').innerHTML = out;
  }
  function selected(s) { return s ? WEEK_NAMES[s.d] + ', ' + range(s.a, s.b + 1) : ''; }
  function renderSelBar(sc) {
    var bar = $('#selBar'), menu = S.menu;
    bar.classList.remove('idle');
    if (S.sel) {
      var list = S.acts.map(function (x) {
        return '<button type="button" data-pick="' + x.id + '">' + '<i class="dot" style="--c:var(--c-' + x.area + ')"></i>' + esc(x.name) + '</button>';
      }).join('');
      bar.innerHTML = '<div class="line"><p><b>' + selected(S.sel) + '</b> is selected. Pick what goes here, or clear it.</p>' +
        '<div class="actions"><button class="btn primary" type="button" data-sel="add" aria-expanded="' + (menu === 'add') + '">Add to these hours</button>' +
        '<button class="btn" type="button" data-sel="clear">Clear</button><button class="btn quiet" type="button" data-sel="cancel">Cancel</button></div></div>' +
        (menu === 'add' ? '<div class="pop"><p>Choose what goes in these hours</p>' + list + '</div>' : '');
      return;
    }
    if (S.selBlock) {
      var b = sc.blocks.find(function (x) { return x.id === S.selBlock; });
      if (!b) { S.selBlock = null; return renderSelBar(sc); }
      var list2 = S.acts.map(function (x) {
        return '<button type="button" data-pick="' + x.id + '"><i class="dot" style="--c:var(--c-' + x.area + ')"></i>' + esc(x.name) + '</button>';
      }).join('');
      bar.innerHTML = '<div class="line"><p><b>' + esc(actOf(b.act).name) + '</b>, ' + WEEK_NAMES[b.dow] + ' ' + range(b.a, b.b) + '.</p>' +
        '<div class="actions"><button class="btn" type="button" data-sel="edit" aria-expanded="' + (menu === 'edit') + '">Change…</button>' +
        '<button class="btn danger" type="button" data-sel="delete">Delete</button><button class="btn quiet" type="button" data-sel="cancel">Cancel</button></div></div>' +
        (menu === 'edit' ? '<div class="pop"><p>Change the activity in this block</p>' + list2 + '</div>' : '');
      return;
    }
    bar.classList.add('idle');
    bar.innerHTML = '<p class="muted">Tap or drag hours to choose what goes there. Blocks are the sessions you plan.</p>';
  }
  function renderDonut(sc) {
    var per = {}, planned = 0;
    sc.blocks.forEach(function (b) { var ar = blockArea(b); per[ar] = (per[ar] || 0) + blockLen(b); planned += blockLen(b); });
    var C = 2 * Math.PI * 48, off = 0, seg = '';
    AREAS.forEach(function (a) {
      var h = per[a.id] || 0;
      if (!h) return;
      var len = h / AWAKE * C;
      seg += '<circle cx="62" cy="62" r="48" fill="none" stroke="var(--c-' + a.id + ')" stroke-width="18" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 62 62)"/>';
      off += len;
    });
    var donut = '<circle cx="62" cy="62" r="48" fill="none" stroke="var(--rule-2)" stroke-width="18"/>' + seg +
      '<text x="62" y="60" text-anchor="middle" style="fill:var(--ink);font-size:20px;font-weight:600">' + planned + ' h</text>' +
      '<text x="62" y="77" text-anchor="middle" style="fill:var(--ink-3);font-size:11px">of ' + AWAKE + ' awake</text>';
    $('#donut').innerHTML = donut;
    var rows = AREAS.filter(function (a) { return per[a.id]; }).sort(function (x, y) { return per[y.id] - per[x.id]; });
    $('#donutLegend').innerHTML = rows.map(function (a) {
      return '<li><i class="swatch" style="--c:var(--c-' + a.id + ')"></i><span>' + esc(a.name) + '</span><span class="hs">' + per[a.id] + ' h</span></li>';
    }).join('') + '<li><i class="swatch free"></i><span>Free</span><span class="hs">' + (AWAKE - planned) + ' h</span></li>';
    $('#donutNote').textContent = 'Of the ' + AWAKE + ' awake hours in a typical week. Sleep is not counted. Year shows the same split by month.';
  }

  /* Year: the painter, the monthly chart and the shares */
  function monthTotals() {
    var months = [], i, w;
    for (i = 0; i < 12; i++) months.push({ weeks: 0, hours: {}, total: 0 });
    for (w = 1; w <= 53; w++) {
      var mon = addDays(MON1, (w - 1) * 7), thu = addDays(mon, 3);
      if (thu.getFullYear() !== 2026) continue;
      var m = months[thu.getMonth()], sid = S.paint[w] && S.scheds[S.paint[w]] ? S.paint[w] : 'my';
      m.weeks++;
      S.scheds[sid].blocks.forEach(function (b) {
        var ar = blockArea(b);
        m.hours[ar] = (m.hours[ar] || 0) + blockLen(b);
        m.total += blockLen(b);
      });
    }
    return months;
  }
  function renderYear() {
    var tools = S.order.map(function (id) {
      return '<button class="chip" type="button" data-tool="' + id + '" aria-pressed="' + (S.tool === id) + '"><span class="swatch" style="--c:' + swatchFor(id) + ';width:10px;height:10px"></span>' + esc(S.scheds[id].name) + '</button>';
    }).join('') + '<button class="chip" type="button" data-tool="erase" aria-pressed="' + (S.tool === 'erase') + '">Erase</button>';
    $('#paintTools').innerHTML = tools;
    var used = {};
    Object.keys(S.paint).forEach(function (k) { used[S.paint[k]] = true; });
    var others = Object.keys(used).filter(function (id) { return id !== 'my'; });
    $('#paintLine').textContent = others.length
      ? 'Pick a schedule, then tap or drag over weeks to paint them. Unpainted weeks use My week.'
      : 'Every week of 2026 uses My week. Paint a few weeks to plan a holiday or a deep-work block.';
    var cells = '';
    for (var w = 1; w <= 53; w++) {
      var sid = S.paint[w] && S.scheds[S.paint[w]] ? S.paint[w] : 'my';
      var mon = addDays(MON1, (w - 1) * 7);
      cells += '<button type="button" class="yw' + (w === weekIdx(TODAY) ? ' now' : '') + '" data-w="' + w + '" data-s="' + sid + '"' +
        ' aria-label="Week ' + w + ', ' + esc(S.scheds[sid].name) + ', from ' + mon.getDate() + ' ' + MONTHS[mon.getMonth()] + '">' + w + '</button>';
    }
    $('#yweeks').innerHTML = cells;
    var legend = S.order.filter(function (id) { return id === 'my' || used[id]; }).map(function (id) {
      return '<span><i class="swatch" style="--c:' + swatchFor(id) + '"></i>' + esc(S.scheds[id].name) + '</span>';
    }).join('');
    $('#yLegend').innerHTML = legend + '<span class="muted">Week 45 is outlined: this week.</span>';

    var months = monthTotals(), maxV = 0;
    months.forEach(function (m) { maxV = Math.max(maxV, m.total, m.weeks * AWAKE); });
    var ymax = Math.max(100, Math.ceil(maxV / 50) * 50);
    var cols = months.map(function (m, idx) {
      var stack = '';
      if (m.total) {
        AREAS.forEach(function (a) {
          var h = m.hours[a.id] || 0;
          if (h) stack += '<i style="height:' + (h / m.total * 100) + '%;--c:var(--c-' + a.id + ')" title="' + esc(a.name) + ' ' + h + ' h"></i>';
        });
      }
      var cap = m.weeks * AWAKE / ymax * 100;
      return '<div class="ycol" aria-label="' + MONTHS[idx] + ': ' + m.total + ' planned hours, ' + m.weeks * AWAKE + ' awake hours">' +
        '<div class="ystack" style="height:' + (m.total / ymax * 100) + '%">' + stack + '</div>' +
        '<span class="ycap" style="bottom:' + cap + '%"></span>' +
        '<span class="yval" style="bottom:calc(' + (m.total / ymax * 100) + '% + 4px)">' + m.total + '</span></div>';
    }).join('');
    $('#ychart').innerHTML = '<div class="yaxis" aria-hidden="true"><span style="bottom:0">0</span><span style="bottom:50%">' + ymax / 2 + ' h</span><span style="bottom:100%">' + ymax + ' h</span></div>' +
      '<div style="position:absolute;inset:0;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px">' + cols + '</div>';
    $('#xmonths').innerHTML = MONTHS.map(function (m) { return '<span>' + m.slice(0, 3) + '</span>'; }).join('');
    var used2 = AREAS.filter(function (a) { return months.some(function (m) { return m.hours[a.id]; }); });
    $('#yAreaLegend').innerHTML = used2.map(function (a) {
      return '<span><i class="swatch" style="--c:var(--c-' + a.id + ')"></i>' + esc(a.name) + '</span>';
    }).join('') + '<span><i class="swatch" style="--c:var(--ink-3);background:transparent;border-top:2px dashed var(--ink-3);height:0;width:16px;border-radius:0"></i>Awake time in the month</span>';

    var totals = {}, all = 0;
    months.forEach(function (m) { AREAS.forEach(function (a) { var h = m.hours[a.id] || 0; totals[a.id] = (totals[a.id] || 0) + h; all += h; }); });
    $('#yShares').innerHTML = AREAS.map(function (a) {
      var h = totals[a.id] || 0, share = all ? h / all * 100 : 0;
      return '<li><i class="dot" style="--c:var(--c-' + a.id + ')"></i><span>' + esc(a.name) + '</span>' +
        (h ? '<span class="bar"><i style="width:' + share + '%;--c:var(--c-' + a.id + ')"></i></span><span class="n">' + h + ' h</span>'
           : '<span class="none" style="grid-column:3 / 5">Not planned</span>') + '</li>';
    }).join('');
  }
  function swatchFor(id) {
    if (id === 'my') return 'var(--bg-4)';
    if (id === 'deep') return 'color-mix(in srgb, var(--c-prof) 42%, var(--bg))';
    if (id === 'holiday') return 'color-mix(in srgb, var(--c-eco) 38%, var(--bg))';
    return 'var(--bg-3)';
  }

  /* Insights: headline, weekly trend, life areas, habits, the recap and the milestone switch */
  function renderInsights() {
    var from = weekRange(38)[0], to = weekRange(45)[1];
    var head = $('#insHead'), sub = $('#insSub');
    if (S.fresh) {
      head.textContent = 'Insights fills after about a week of ticks.';
      sub.textContent = 'Tick on Home to start. Nothing is counted before the first tick.';
      $('#trend').innerHTML = '';
      $('#trendX').innerHTML = '';
      $('#insAreas').innerHTML = '<li class="muted">Life areas appear here once there are ticks to count.</li>';
      $('#kept').innerHTML = '<p class="muted">Habits appear here after a week of ticks.</p>';
      $('#recapCard').innerHTML = '<p class="eyebrow">Weekly recap</p><h2>Your first recap comes after a full week</h2><p class="muted" style="margin-top:6px">It is a short look back at your planned sessions, with one closing line.</p>';
    } else {
      var all = rangeStats(from, to), share = all.planned ? all.ticked / all.planned : 0;
      head.textContent = 'You ticked ' + wordsFor(share) + ' planned hours.';
      sub.textContent = 'Weeks 38 to 45, counted to today: ' + all.ticked + ' h ticked of ' + all.planned + ' h planned.';
      var bars = '', labels = '';
      for (var w = 38; w <= 45; w++) {
        var wr = weekRange(w), st = rangeStats(wr[0], wr[1]);
        var pc = st.planned ? Math.round(st.ticked / st.planned * 100) : 0;
        var now = w === weekIdx(TODAY);
        bars += '<div class="col"><span class="v">' + (st.planned ? pc + '%' : '–') + '</span><span class="b' + (now ? ' now' : '') + '" style="height:' + (st.planned ? Math.max(pc, 3) : 0) + '%"></span></div>';
        labels += '<span>W' + w + '</span>';
      }
      $('#trend').innerHTML = bars;
      $('#trendX').innerHTML = labels;
      var areasHtml = AREAS.map(function (a) {
        var r = all.areas[a.id];
        if (!r || !r.p) return '<li><span>' + esc(a.name) + '</span><span class="bar"></span><span class="n">–</span></li>';
        var p = Math.round(r.t / r.p * 100);
        return '<li><span>' + esc(a.name) + '</span><span class="bar"><i style="width:' + p + '%;--c:var(--c-' + a.id + ')"></i></span><span class="n">' + p + '%</span></li>';
      }).join('');
      $('#insAreas').innerHTML = areasHtml;
      var kept = [], more = [];
      S.habits.forEach(function (h) {
        var r = habitRatio(from, to, h);
        if (r.ratio == null) return;
        (r.ratio >= 0.7 ? kept : more).push(h.name + ' (' + Math.round(r.ratio * 100) + '%)');
      });
      $('#kept').innerHTML = '<div><h3>Kept up</h3><p>' + (kept.length ? kept.map(esc).join(' · ') : 'None yet.') + '</p></div>' +
        '<div><h3>Could use another go</h3><p>' + (more.length ? more.map(esc).join(' · ') : 'Nothing slipping.') + '</p></div>';
    }
    renderRecap();
    var today = key(TODAY), has = !!S.journal[today];
    $('#nudgeText').textContent = has ? 'Today has a note. It is kept in this page only.' : 'Today has no note yet. One line is enough, or skip it.';
    $('#msSw').setAttribute('aria-checked', String(S.milestones));
    $('#menuMilestones').setAttribute('aria-checked', String(S.milestones));
    $('#msExample').disabled = !S.milestones;
  }
  function renderRecap() {
    var el = $('#recapCard');
    if (S.fresh) return;
    var wr = weekRange(44), rows = [], tp = 0, td = 0;
    AREAS.forEach(function (a) {
      var planned = 0, done = 0;
      for (var d = wr[0]; d <= wr[1]; d = addDays(d, 1)) {
        dayBlocks(d, true).forEach(function (b) {
          if (blockArea(b) !== a.id) return;
          planned++;
          if (blockDone(d, b)) done++;
        });
      }
      if (!planned) return;
      tp += planned; td += done;
      var sess = '';
      for (var i = 0; i < planned; i++) sess += '<i class="' + (i < done ? 'f' : 'm') + '"></i>';
      rows.push('<li><i class="dot" style="--c:var(--c-' + a.id + ')"></i><span><b style="color:var(--ink)">' + esc(a.name) + '</b>, ' + done + ' of ' + planned + '</span><span class="sess" aria-label="' + done + ' of ' + planned + '">' + sess + '</span></li>');
    });
    var head = '<div class="card-head" style="margin-bottom:0"><p class="eyebrow">Weekly recap · week 44</p>' +
      '<button class="switch" type="button" role="switch" data-recap-switch aria-checked="' + S.recapOn + '"><span class="track" aria-hidden="true"></span><span>Show recap</span></button></div>';
    if (!S.recapOn) { el.innerHTML = head + '<p class="muted" style="margin-top:12px">The weekly recap is off. Switch it on to see last week.</p>'; return; }
    el.innerHTML = head +
      '<p class="recap-big">' + td + ' of ' + tp + ' planned sessions done.</p>' +
      '<p class="muted">Sessions not done are shown as open circles. Neither takes anything away.</p>' +
      '<ul class="recap-list">' + rows.join('') + '</ul>' +
      '<div class="recap-close"><p class="body-sm" style="max-width:34ch">Good week. Want to plan one thing for next week?</p>' +
      '<div class="actions"><a class="btn" href="#week">Plan next week</a>' +
      '<button class="btn primary" type="button" data-recap="done"' + (S.recapDone ? ' disabled' : '') + '>' + (S.recapDone ? 'Done for week 44' : 'Done for the week') + '</button></div></div>';
  }

  /* ── 5. Toast, ticks and the preview switch ───────────────── */
  var toastTimer = null;
  function showToast(title, text, check, persist) {
    var t = $('#toast');
    $('#toastTitle').textContent = title;
    $('#toastText').textContent = text;
    $('#toastCk').hidden = !check;
    t.classList.remove('out');
    t.hidden = false;
    clearTimeout(toastTimer);
    if (!persist) toastTimer = setTimeout(hideToast, 8000);
  }
  function hideToast() {
    var t = $('#toast');
    t.classList.add('out');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; t.classList.remove('out'); }, 420);
  }
  function afterTick() {
    var d = viewDate(), bl = dayBlocks(d);
    if (S.dayOff !== 0 || !bl.length) return;
    var all = bl.every(function (b) { return blockDone(d, b); });
    var k = key(d);
    if (all && S.milestones && !S.shown[k]) {
      S.shown[k] = true;
      showToast('Today is complete', 'All ' + bl.length + ' blocks done. Nothing else is due today.', true);
    }
  }
  function tickBlock(id) {
    var d = viewDate(), b = dayBlocks(d, true).find(function (x) { return x.id === id; });
    if (!b || isFuture(d)) return;
    S.done[key(d) + '|' + b.id] = !blockDone(d, b);
    renderHome(); renderWeek(); renderInsights(); afterTick();
  }
  function tickHabit(id) {
    var d = viewDate(), h = S.habits.find(function (x) { return x.id === id; });
    if (!h || isFuture(d)) return;
    S.habitDone[key(d) + '|h|' + h.id] = !habitDone(d, h);
    renderHome(); renderInsights();
  }
  function setPreview(mode) {
    S.preview = mode;
    var d = TODAY;
    // Preview all done: tick today's blocks. Other modes clear today's ticks.
    dayBlocks(d, true).forEach(function (b) {
      var k = key(d) + '|' + b.id;
      if (mode === 'all') S.done[k] = true; else delete S.done[k];
    });
    $$('#previewSeg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.preview === mode)); });
    if (mode !== 'normal') S.dayOff = 0;
    renderHome(); renderWeek(); renderInsights();
  }

  /* ── 6. Week grid: selection, the action bar, placing blocks ─ */
  function placeBlock(d, a, b, act) {
    var sc = S.scheds[S.active];
    sc.blocks = sc.blocks.filter(function (x) { return !(x.dow === d && x.a < b && x.b > a); });
    S.seq++;
    sc.blocks.push({ id: S.active + '-' + S.seq, dow: d, a: a, b: b, act: act });
  }
  function clearSel() {
    var s = S.sel, sc = S.scheds[S.active];
    if (!s) return;
    sc.blocks = sc.blocks.filter(function (x) { return !(x.dow === s.d && x.a < s.b + 1 && x.b > s.a); });
  }
  function focusKbd() {
    var el = $('.slot[data-d="' + S.kbd.d + '"][data-h="' + S.kbd.h + '"]');
    if (el) el.focus({ preventScroll: true });
  }
  function selectHours(d, a, b) { S.sel = { d: d, a: a, b: b }; S.selBlock = null; S.menu = null; }
  // During a drag only the slot classes and the bar change; the grid is not rebuilt under the pointer.
  function paintSel() {
    $$('#wgrid .slot').forEach(function (s) {
      var d = +s.dataset.d, h = +s.dataset.h;
      s.classList.toggle('sel', !!(S.sel && S.sel.d === d && h >= S.sel.a && h <= S.sel.b));
    });
    renderSelBar(S.scheds[S.active]);
  }

  /* ── 7. The first run (rules-based, section 6a) ───────────── */
  var FR_LABELS = ['Welcome', 'Question 1 of 5', 'Question 2 of 5', 'Question 3 of 5', 'Question 4 of 5', 'Question 5 of 5', 'Your draft'];

  // The answers the rules read. Follow-up answers default to the first option.
  function answersOf(f) {
    return { ambition: f.ambition, areas: f.areas.slice(), follow: f.follow, evening: f.evening, hours: f.hours };
  }
  // Fixed rules: the top area's follow-up picks the habit; each area gets up to three sessions a week.
  // Sessions start today, one per area in turn, so the first action is always on today's weekday.
  function buildDraft(a) {
    var base = a.evening ? 18 : 7;
    var areas = a.areas.slice(0, 3).map(function (id, i) {
      var rule = FOLLOW[id] || FOLLOW.eco;
      var c = a.follow[id];
      var pick = c == null || c < 0 ? 0 : Math.min(c, rule.opts.length - 1);
      var o = rule.opts[pick];
      var n = Math.min(o.count, 3), days = [];
      for (var k = 0; k < n; k++) days.push((2 + i + 2 * k) % 7);
      var ar = areaOf(id);
      return { id: id, name: ar.name, goal: ar.target || 'Your own 1-year goal for ' + ar.name, habit: { name: o.habit, count: n, act: o.act }, hour: base + i, days: days, notSure: c === -1 };
    });
    var sessions = [];
    areas.forEach(function (ar, i) {
      ar.days.forEach(function (d) { sessions.push({ area: i, dow: d, start: ar.hour, order: ((d - 2 + 7) % 7) * 10 + i }); });
    });
    sessions.sort(function (x, y) { return x.order - y.order; });
    var keep = sessions.slice(0, a.hours), left = sessions.length - keep.length;
    areas.forEach(function (ar, i) { ar.days = keep.filter(function (s) { return s.area === i; }).map(function (s) { return s.dow; }); });
    var first = keep[0] ? { area: keep[0].area, dow: keep[0].dow, start: keep[0].start } : null;
    return {
      ambition: a.ambition || DEFAULT_AMB, areas: areas, sessions: keep, left: left, hours: a.hours,
      windowHours: a.evening ? [18, 19, 20] : [7, 8, 9],
      first: first ? { name: areas[first.area].habit.name, area: areas[first.area].id, dow: first.dow, start: first.start } : null
    };
  }
  function openFr(step) {
    S.fr.step = step || 0;
    S.fr.err = '';
    S.draft = null;
    S.draftEdit = null;
    $('#fr').hidden = false;
    renderFr();
  }
  function closeFr() {
    $('#fr').hidden = true;
    try { localStorage.setItem('timely.proto.seen', '1'); } catch (e) {}
  }
  function renderFr() {
    var f = S.fr, st = f.step, body = $('#frBody');
    $('#frStep').textContent = FR_LABELS[st];
    var prog = $('#frProg');
    prog.style.gridTemplateColumns = 'repeat(6, minmax(0, 1fr))';
    prog.innerHTML = [1, 2, 3, 4, 5, 6].map(function (i) { return '<i class="' + (st >= i ? 'on' : '') + '"></i>'; }).join('');
    var h = '';
    if (st === 0) h = frWelcome();
    else if (st === 1) h = frAmbition();
    else if (st === 2) h = frAreas();
    else if (st === 3) h = frFollow();
    else if (st === 4) h = frWeek();
    else if (st === 5) h = frHours();
    else h = frDraft();
    body.innerHTML = h;
    var t = body.querySelector('[data-focus]');
    if (t) t.focus({ preventScroll: true });
  }
  function frFoot(back, next, label) {
    return '<div class="fr-foot">' + (back ? '<button class="btn quiet" type="button" data-fr="back">Back</button>' : '<span></span>') +
      '<div class="actions"><button class="btn primary" type="button" data-fr="next">' + (label || 'Next') + '</button></div></div>';
  }
  function frWelcome() {
    return '<h2 id="fr-title" tabindex="-1" data-focus>Let\'s build your first plan</h2>' +
      '<p class="body-sm">Five short questions, about three minutes. Timely builds a draft from your answers with fixed rules. You check it before anything is saved.</p>' +
      '<p class="muted">Each question has a sensible default, so you can go quickly. Nothing leaves this device.</p>' +
      '<div class="fr-foot"><button class="btn quiet" type="button" data-fr="starter">Use a starter instead</button>' +
      '<div class="actions"><button class="btn primary" type="button" data-fr="next">Start, about 3 minutes</button></div></div>';
  }
  function frAmbition() {
    return '<h2 id="fr-title" tabindex="-1" data-focus>What do you want to become?</h2>' +
      '<label class="field-label">In your own words<textarea class="field" id="frAmb" rows="2">' + esc(S.fr.ambition) + '</textarea></label>' +
      '<p class="hint muted">A sentence is enough. This one is required.</p>' +
      (S.fr.err ? '<p class="fr-err" role="alert">' + esc(S.fr.err) + '</p>' : '') + frFoot(true, true);
  }
  function frAreas() {
    var chips = AREAS.map(function (a) {
      var on = S.fr.areas.indexOf(a.id) >= 0;
      return '<button class="chip" type="button" data-fr-area="' + a.id + '" aria-pressed="' + on + '"><i class="dot" style="--c:var(--c-' + a.id + ')"></i>' + esc(a.name) + '</button>';
    }).join('');
    return '<h2 id="fr-title" tabindex="-1" data-focus>What matters most this year?</h2>' +
      '<p class="hint muted">Pick one to three. The first one you picked gets the next question.</p>' +
      '<div class="chips" role="group" aria-label="Life areas">' + chips + '</div>' +
      (S.fr.err ? '<p class="fr-err" role="alert">' + esc(S.fr.err) + '</p>' : '') + frFoot(true, true);
  }
  function frFollow() {
    var top = S.fr.areas[0], rule = FOLLOW[top] || FOLLOW.eco, cur = S.fr.follow[top];
    if (cur == null) cur = 0;
    var opts = rule.opts.map(function (o, i) {
      return '<button class="chip" type="button" data-fr-follow="' + i + '" aria-pressed="' + (cur === i) + '">' + esc(o.label) + '</button>';
    }).join('') + '<button class="chip" type="button" data-fr-follow="-1" aria-pressed="' + (cur === -1) + '">Not sure</button>';
    var adapt = 'Because you picked ' + esc(areaOf(top).name) + ' first, this question is about it.' +
      (S.fr.areas.length > 1 ? ' The other areas get one default habit each, which you can change in the draft.' : '');
    return '<h2 id="fr-title" tabindex="-1" data-focus>' + esc(rule.q) + '</h2>' +
      '<p class="adapt">' + adapt + '</p>' +
      '<div class="chips" role="group" aria-label="Choose one">' + opts + '</div>' +
      '<p class="hint muted">"Not sure" uses the default, and the draft says so.</p>' + frFoot(true, true);
  }
  function frWeek() {
    var f = S.fr;
    return '<h2 id="fr-title" tabindex="-1" data-focus>What does a normal week look like?</h2>' +
      '<div class="chips" role="group" aria-label="Your week">' +
      '<button class="chip" type="button" data-fr-week="evening" aria-pressed="' + f.evening + '">Free evenings</button>' +
      '<button class="chip" type="button" data-fr-week="weekend" aria-pressed="' + f.weekend + '">Free weekends</button>' +
      '<button class="chip" type="button" data-fr-week="workdays" aria-pressed="' + f.workdays + '">Working days, nine to five</button></div>' +
      '<p class="adapt">' + (f.evening ? 'Sessions go in the evening, from 6 PM.' : 'Without free evenings, the sessions go in the morning, from 7 AM.') + '</p>' +
      '<label class="field-label">Anything fixed? (optional)<textarea class="field" id="frFixed" rows="2" placeholder="For example: a class on Tuesdays">' + esc(f.extra || '') + '</textarea></label>' +
      '<p class="hint muted">The rules use the choices above. Anything you type here is only read by you.</p>' + frFoot(true, true);
  }
  function frHours() {
    var h = S.fr.hours;
    return '<h2 id="fr-title" tabindex="-1" data-focus>How many hours can you give to your goals each week?</h2>' +
      '<div class="stepper" role="group" aria-label="Hours a week"><button type="button" data-fr-hours="-1" aria-label="Fewer hours"' + (h <= 1 ? ' disabled' : '') + '>&minus;</button>' +
      '<output aria-live="polite">' + h + (h === 1 ? ' hour' : ' hours') + '</output><button type="button" data-fr-hours="1" aria-label="More hours"' + (h >= 20 ? ' disabled' : '') + '>+</button></div>' +
      '<p class="adapt">' + (h < 3 ? 'Three hours is enough to start. You can add more later.' : 'Sleep is set already and is not counted.') + '</p>' + frFoot(true, true, 'Draft my plan');
  }
  function frDraft() {
    if (!S.draft) S.draft = buildDraft(answersOf(S.fr));
    var dr = S.draft, ed = S.draftEdit;
    var areas = dr.areas.map(function (a, i) {
      var editing = ed === 'area:' + i;
      return '<div class="draft-sec"><div class="head"><h3><i class="dot" style="--c:var(--c-' + a.id + ')"></i> ' + esc(a.name) + '</h3>' +
        (editing ? '' : '<button class="btn quiet" type="button" data-draft="area" data-i="' + i + '">Edit</button>') + '</div>' +
        (editing
          ? '<label class="field-label">1-year goal<input class="field" data-draft-in="area" data-i="' + i + '" value="' + esc(a.goal) + '"></label><div class="actions"><button class="btn" type="button" data-draft="done">Done</button></div>'
          : '<p class="val">1-year goal: ' + esc(a.goal) + '</p>') +
        '<p class="tag">Habit: ' + esc(a.habit.name) + ', ' + a.habit.count + ' a week' + (a.habit.act ? '. Activity: ' + esc(actOf(a.habit.act).name) : '') + '.' +
        (a.notSure ? ' You said not sure, so this is the default.' : '') + '</p></div>';
    }).join('');
    var week = [0, 1, 2, 3, 4, 5, 6].map(function (d) {
      var s = dr.sessions.filter(function (x) { return x.dow === d; })[0];
      var col = s ? 'var(--c-' + dr.areas[s.area].id + ')' : '';
      return '<div class="c"><span>' + SHORT[d] + '</span><span class="s' + (s ? ' on' : '') + '"' + (s ? ' style="--c:' + col + '"' : '') + '></span></div>';
    }).join('');
    var first = dr.first;
    var firstWindow = dr.windowHours;
    var firstText = first ? esc(first.name) + ', ' + range(first.start, first.start + 1) : 'Nothing yet. Add a habit to start.';
    var edAmb = ed === 'amb';
    return '<h2 id="fr-title" tabindex="-1" data-focus>Your first plan</h2>' +
      '<p class="hint muted">A draft from your answers. Edit anything. Nothing is saved until you accept.</p>' +
      '<div class="draft">' +
      '<div class="draft-sec"><div class="head"><h3>Ambition</h3>' + (edAmb ? '' : '<button class="btn quiet" type="button" data-draft="amb">Edit</button>') + '</div>' +
      (edAmb ? '<label class="field-label">Ambition<textarea class="field" rows="2" data-draft-in="amb">' + esc(dr.ambition) + '</textarea></label><div class="actions"><button class="btn" type="button" data-draft="done">Done</button></div>'
        : '<p class="val">' + esc(dr.ambition) + '</p>') + '</div>' +
      areas +
      '<div class="draft-sec"><div class="head"><h3>Your week</h3></div><div class="mini-week">' + week + '</div>' +
      '<p class="tag">Sleep, 10 PM to 7 AM, is set and not counted.' + (dr.left ? ' ' + dr.left + (dr.left === 1 ? ' session is' : ' sessions are') + ' left for later, to fit your ' + dr.hours + ' hours.' : '') + '</p></div>' +
      '</div>' +
      '<div class="first-action"><div><span>First action, today</span><strong>' + firstText + '</strong></div>' +
      '<button class="btn" type="button" data-draft="move"' + (first ? '' : ' disabled') + '>Move</button></div>' +
      '<div class="fr-foot"><button class="btn quiet" type="button" data-fr="answers">Change my answers</button>' +
      '<div class="actions"><button class="btn" type="button" data-fr="starter">Use a starter instead</button>' +
      '<button class="btn primary" type="button" data-fr="accept">Accept plan</button></div></div>' +
      '';
  }
  function starterAnswers() {
    return { ambition: STARTER_AMB, areas: ['phys', 'rel'], follow: { phys: 0, rel: 0 }, evening: true, hours: 5 };
  }
  function applyStarter() {
    S.fr.ambition = STARTER_AMB;
    S.fr.areas = ['phys', 'rel'];
    S.fr.follow = {};
    S.fr.evening = true;
    S.fr.hours = 5;
    S.draft = buildDraft(starterAnswers());
    S.draftEdit = null;
    S.fr.step = 6;
    renderFr();
  }
  // Accept: the plan replaces the sample data with a new user's first plan (in memory only).
  function applyPlan(dr) {
    S.fresh = true;
    S.ambition = dr.ambition;
    S.areas = AREAS.map(function (a) {
      var p = dr.areas.filter(function (x) { return x.id === a.id; })[0];
      return { id: a.id, name: a.name, goal5: a.goal5, target: p ? p.goal : '', progress: p ? 0 : null };
    });
    S.habits = dr.areas.map(function (a, i) {
      return { id: 'n' + i, area: a.id, name: a.habit.name, count: a.habit.count, period: 'week', act: 'n' + i, base: 0 };
    });
    S.acts = dr.areas.map(function (a, i) { return { id: 'n' + i, name: a.habit.name, area: a.id }; });
    S.scheds = { my: { name: 'My week', blocks: dr.sessions.map(function (s, j) {
      return { id: 'my-n' + j, dow: s.dow, a: s.start, b: s.start + 1, act: 'n' + s.area };
    }) } };
    S.order = ['my'];
    S.active = 'my';
    S.paint = {};
    S.tool = 'my';
    S.done = {};
    S.habitDone = {};
    S.journal = {};
    S.dayOff = 0;
    S.preview = 'normal';
    S.sel = null; S.selBlock = null; S.menu = null;
    S.recapDone = false;
    S.shown = {};
    S.selArea = S.areas[0].id;
  }

  /* ── 8. Routing, theme, the account menu and events ───────── */
  var VIEWS = ['home', 'goals', 'week', 'year', 'insights'];
  var firstRoute = true;
  function route() {
    var h = (location.hash || '#home').slice(1);
    if (VIEWS.indexOf(h) < 0) h = 'home';
    S.route = h;
    VIEWS.forEach(function (v) { $('#view-' + v).hidden = v !== h; });
    $$('.tabs a').forEach(function (a) {
      if (a.dataset.tab === h) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    renderAll();
    if (!firstRoute) {
      var t = $('#t-' + h);
      if (t) t.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
    firstRoute = false;
  }
  function setTheme(t, save) {
    document.documentElement.setAttribute('data-theme', t);
    var dark = t === 'dark';
    $('#themeBtn').setAttribute('aria-pressed', String(dark));
    $('#themeBtn use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
    $('#menuTheme').setAttribute('aria-checked', String(dark));
    if (save) { try { localStorage.setItem('timely.proto.theme', t); } catch (e) {} }
  }
  function setMenu(open) {
    var m = $('#acctMenu');
    m.hidden = !open;
    $('#acctBtn').setAttribute('aria-expanded', String(open));
    if (open) $('#menuTheme').focus();
  }
  function closeMenuToAvatar() { setMenu(false); $('#acctBtn').focus(); }

  function onClick(e) {
    var t = e.target, el;
    if (!t.closest('.acct') && !$('#acctMenu').hidden) setMenu(false);
    if ((el = t.closest('[data-tick]'))) {
      if (el.dataset.tick === 'blk') tickBlock(el.dataset.id); else tickHabit(el.dataset.id);
      return;
    }
    if ((el = t.closest('[data-area]'))) {
      S.selArea = el.dataset.area; S.goalEdit = false; renderGoals(); return;
    }
    if ((el = t.closest('[data-goal]'))) {
      var g = el.dataset.goal, a = areaOf(S.selArea);
      if (g === 'edit') S.goalEdit = true;
      if (g === 'cancel') S.goalEdit = false;
      if (g === 'add-habit') {
        S.seq++;
        S.habits.push({ id: 'x' + S.seq, area: a.id, name: 'New habit', count: 1, period: 'week', act: null, base: 0.5 });
      }
      if (g === 'add-act') {
        S.seq++;
        S.acts.push({ id: 'x' + S.seq, name: 'New activity', area: a.id });
      }
      renderGoals(); renderHome(); return;
    }
    if ((el = t.closest('[data-sched]'))) { S.active = el.dataset.sched; S.sel = null; S.selBlock = null; S.menu = null; renderWeek(); return; }
    if (t.closest('[data-new-sched]')) {
      S.seq++;
      var nid = 's' + S.seq;
      S.scheds[nid] = { name: 'New schedule ' + S.order.length, blocks: [] };
      S.order.push(nid); S.active = nid; S.tool = nid;
      renderWeek(); renderYear(); return;
    }
    if ((el = t.closest('[data-blk]'))) { S.selBlock = el.dataset.blk; S.sel = null; S.menu = null; renderWeek(); return; }
    if ((el = t.closest('[data-sel]'))) { selAction(el.dataset.sel); return; }
    if ((el = t.closest('[data-pick]'))) { pickAct(el.dataset.pick); return; }
    if ((el = t.closest('[data-add-suggest]'))) {
      var sd = +el.dataset.dow;
      S.active = 'my';
      placeBlock(sd, 18, 19, el.dataset.addSuggest);
      renderHome(); renderWeek();
      showToast('Added', actOf(el.dataset.addSuggest).name + ' on ' + WEEK_NAMES[sd] + ', 6 to 7 PM.', false);
      return;
    }
    if ((el = t.closest('[data-recap]'))) { S.recapDone = true; renderRecap(); return; }
    if (t.closest('[data-recap-switch]')) { S.recapOn = !S.recapOn; renderRecap(); return; }
    if ((el = t.closest('[data-tool]'))) { S.tool = el.dataset.tool; renderYear(); return; }
    if ((el = t.closest('[data-draft]'))) { draftAction(el); return; }
    if ((el = t.closest('[data-fr]'))) { frAction(el.dataset.fr); return; }
    if ((el = t.closest('[data-fr-area]'))) {
      var id = el.dataset.frArea, at = S.fr.areas.indexOf(id);
      if (at >= 0) S.fr.areas.splice(at, 1); else S.fr.areas.push(id);
      S.fr.err = ''; renderFr(); return;
    }
    if ((el = t.closest('[data-fr-follow]'))) {
      S.fr.follow[S.fr.areas[0]] = +el.dataset.frFollow; renderFr(); return;
    }
    if ((el = t.closest('[data-fr-week]'))) {
      var wk = el.dataset.frWeek;
      S.fr[wk] = !S.fr[wk]; renderFr(); return;
    }
    if ((el = t.closest('[data-fr-hours]'))) {
      S.fr.hours = Math.max(1, Math.min(20, S.fr.hours + (+el.dataset.frHours))); renderFr(); return;
    }
    if ((el = t.closest('[data-menu]'))) {
      if (el.dataset.menu === 'replay') { setMenu(false); openFr(0); }
      if (el.dataset.menu === 'reset') { S = freshState(); setMenu(false); renderAll(); route(); showToast('Sample data restored', 'The sample is back. Nothing was saved.', false); }
      return;
    }
  }
  function selAction(what) {
    var sc = S.scheds[S.active];
    if (what === 'add') { S.menu = S.menu === 'add' ? null : 'add'; renderSelBar(sc); return; }
    if (what === 'edit') { S.menu = S.menu === 'edit' ? null : 'edit'; renderSelBar(sc); return; }
    if (what === 'clear') { clearSel(); S.sel = null; S.menu = null; renderWeek(); return; }
    if (what === 'cancel') { S.sel = null; S.selBlock = null; S.menu = null; renderWeek(); return; }
    if (what === 'delete') {
      sc.blocks = sc.blocks.filter(function (x) { return x.id !== S.selBlock; });
      S.selBlock = null; S.menu = null; renderWeek(); renderHome(); return;
    }
  }
  function pickAct(id) {
    var sc = S.scheds[S.active];
    if (S.sel && S.menu === 'add') {
      var s = S.sel;
      placeBlock(s.d, s.a, s.b + 1, id);
      S.sel = null; S.menu = null;
      renderWeek(); renderHome();
      $('#addNote').textContent = actOf(id).name + ' is in ' + WEEK_NAMES[s.d] + ', ' + range(s.a, s.b + 1) + '.';
      return;
    }
    if (S.selBlock && S.menu === 'edit') {
      var b = sc.blocks.find(function (x) { return x.id === S.selBlock; });
      if (b) b.act = id;
      S.menu = null; renderWeek(); renderHome();
    }
  }
  function draftAction(el) {
    var act = el.dataset.draft, dr = S.draft;
    if (act === 'amb') S.draftEdit = 'amb';
    if (act === 'area') S.draftEdit = 'area:' + el.dataset.i;
    if (act === 'done') S.draftEdit = null;
    if (act === 'move' && dr.first) {
      var w = dr.windowHours, idx = w.indexOf(dr.first.start);
      var next = w[(idx + 1) % w.length];
      dr.first.start = next;
      dr.sessions[0].start = next;
      dr.areas[dr.sessions[0].area].hour = next;
    }
    renderFr();
  }
  function frAction(act) {
    var f = S.fr;
    if (act === 'starter') { applyStarter(); return; }
    if (act === 'answers') { f.step = 1; S.draft = null; renderFr(); return; }
    if (act === 'back') { f.step = Math.max(0, f.step - 1); renderFr(); return; }
    if (act === 'accept') {
      applyPlan(S.draft);
      closeFr();
      S.dayOff = 0;
      location.hash = '#home';
      renderAll();
      showToast('Your plan is in', 'Home shows your first action for today.', true);
      return;
    }
    if (act === 'next') {
      if (f.step === 1) {
        var amb = $('#frAmb');
        if (amb) f.ambition = amb.value.trim();
        if (!f.ambition) { f.err = 'Write one sentence, or use a starter.'; renderFr(); return; }
      }
      if (f.step === 2) {
        if (!f.areas.length) { f.err = 'Pick at least one area.'; renderFr(); return; }
        if (f.areas.length > 3) { f.err = 'Pick up to three areas.'; renderFr(); return; }
      }
      if (f.step === 4) { var fx = $('#frFixed'); if (fx) f.extra = fx.value; }
      f.err = '';
      if (f.step === 5) { S.draft = buildDraft(answersOf(f)); S.draftEdit = null; }
      f.step = Math.min(6, f.step + 1);
      renderFr();
      return;
    }
  }

  function onInput(e) {
    var t = e.target;
    if (t.id === 'journal') { S.journal[key(viewDate())] = t.value; renderInsightsNudge(); return; }
    if (t.id === 'frAmb') { S.fr.ambition = t.value; return; }
    if (t.dataset && t.dataset.draftIn === 'amb') { S.draft.ambition = t.value; return; }
    if (t.dataset && t.dataset.draftIn === 'area') { S.draft.areas[+t.dataset.i].goal = t.value; return; }
  }
  function renderInsightsNudge() {
    var has = !!S.journal[key(TODAY)];
    $('#nudgeText').textContent = has ? 'Today has a note. It is kept in this page only.' : 'Today has no note yet. One line is enough, or skip it.';
  }

  function init() {
    // Theme: the saved choice, else the system setting.
    var saved = null;
    try { saved = localStorage.getItem('timely.proto.theme'); } catch (e) {}
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
    if (saved !== 'light' && saved !== 'dark') {
      try {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        var follow = function (ev) {
          var s2 = null;
          try { s2 = localStorage.getItem('timely.proto.theme'); } catch (e) {}
          if (s2 !== 'light' && s2 !== 'dark') setTheme(ev.matches ? 'dark' : 'light', false);
        };
        if (mq.addEventListener) mq.addEventListener('change', follow);
      } catch (e) {}
    }
    $('#themeBtn').addEventListener('click', function () { setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true); });
    $('#menuTheme').addEventListener('click', function () { setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true); });
    $('#acctBtn').addEventListener('click', function () { setMenu($('#acctMenu').hidden); });

    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);

    // Day switch: never a future day, 60 days back at most.
    $('#dayPrev').addEventListener('click', function () { S.dayOff = Math.max(-60, S.dayOff - 1); renderHome(); });
    $('#dayNext').addEventListener('click', function () { S.dayOff = Math.min(0, S.dayOff + 1); renderHome(); });
    $('#dayToday').addEventListener('click', function () { S.dayOff = 0; renderHome(); });

    // Preview switch (Home states) and its hide button.
    $$('#previewSeg button').forEach(function (b) {
      b.addEventListener('click', function () { setPreview(b.dataset.preview); });
    });
    $('#previewHide').addEventListener('click', function () { $('#preview').hidden = true; $('#previewOpen').hidden = false; $('#previewOpen').focus(); });
    $('#previewOpen').addEventListener('click', function () { $('#preview').hidden = false; $('#previewOpen').hidden = true; $('#previewSeg button').focus(); });
    // The switcher starts collapsed so it does not cover the grid; the button opens it.
    $('#preview').hidden = true;
    $('#previewOpen').hidden = false;

    // Goals: list or grid, the ambition edit.
    $('#modeList').addEventListener('click', function () { S.goalMode = 'list'; renderGoals(); });
    $('#modeGrid').addEventListener('click', function () { S.goalMode = 'grid'; renderGoals(); });
    $('#ambEdit').addEventListener('click', function () { S.ambEdit = true; $('#ambInput').value = S.ambition; renderGoals(); $('#ambInput').focus(); });
    $('#ambForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('#ambInput').value.trim();
      if (v) S.ambition = v;
      S.ambEdit = false; renderGoals(); renderHome();
    });
    $('#detail').addEventListener('submit', function (e) {
      if (!e.target.matches('#goalForm')) return;
      e.preventDefault();
      var a = areaOf(S.selArea), f = e.target;
      a.name = f.elements.name.value.trim() || a.name;
      a.goal5 = f.elements.goal5.value.trim();
      a.target = f.elements.target.value.trim();
      if (!a.target) a.progress = null; else if (a.progress == null) a.progress = 0;
      S.goalEdit = false;
      renderGoals(); renderHome(); renderWeek(); renderTargets(); renderAmbitionEverywhere();
    });
    $('#areaList').addEventListener('keydown', function (e) {
      var rows = $$('.area-row', this), i = rows.indexOf(document.activeElement);
      if (i < 0) return;
      var n = i;
      if (e.key === 'ArrowDown') n = Math.min(rows.length - 1, i + 1);
      else if (e.key === 'ArrowUp') n = Math.max(0, i - 1);
      else return;
      e.preventDefault();
      S.selArea = rows[n].dataset.area; S.goalEdit = false; renderGoals();
      $$('.area-row')[n].focus();
    });

    // Week: the grid (pointer and keyboard), the sleep switch and the add buttons.
    var grid = $('#wgrid');
    grid.addEventListener('pointerdown', function (e) {
      var s = e.target.closest && e.target.closest('.slot');
      if (!s || e.button !== 0) return;
      var d = +s.dataset.d, h = +s.dataset.h;
      S.drag = { d: d, anchor: h };
      S.anchor = { d: d, h: h };
      S.kbd = { d: d, h: h };
      selectHours(d, h, h);
      paintSel();
    });
    document.addEventListener('pointermove', function (e) {
      if (!S.drag) return;
      var el = document.elementFromPoint(e.clientX, e.clientY);
      var s = el && el.closest && el.closest('.slot');
      if (!s || +s.dataset.d !== S.drag.d) return;
      var h = +s.dataset.h;
      if (S.sel && S.sel.a === Math.min(S.drag.anchor, h) && S.sel.b === Math.max(S.drag.anchor, h)) return;
      selectHours(S.drag.d, Math.min(S.drag.anchor, h), Math.max(S.drag.anchor, h));
      paintSel();
    });
    document.addEventListener('pointerup', function () { if (S.drag) { S.drag = null; renderWeek(); } });
    grid.addEventListener('keydown', function (e) {
      var s = e.target.closest && e.target.closest('.slot');
      if (!s) return;
      var d = +s.dataset.d, h = +s.dataset.h, nd = d, nh = h;
      if (e.key === 'ArrowLeft') nd = Math.max(0, d - 1);
      else if (e.key === 'ArrowRight') nd = Math.min(6, d + 1);
      else if (e.key === 'ArrowUp') nh = Math.max(7, h - 1);
      else if (e.key === 'ArrowDown') nh = Math.min(21, h + 1);
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (e.shiftKey && S.anchor && S.anchor.d === d) selectHours(d, Math.min(S.anchor.h, h), Math.max(S.anchor.h, h));
        else { S.anchor = { d: d, h: h }; selectHours(d, h, h); }
        S.kbd = { d: d, h: h };
        renderWeek(); focusKbd();
        return;
      } else return;
      e.preventDefault();
      S.kbd = { d: nd, h: nh };
      if (e.shiftKey && S.anchor && S.anchor.d === nd) selectHours(nd, Math.min(S.anchor.h, nh), Math.max(S.anchor.h, nh));
      renderWeek(); focusKbd();
    });
    $('#sleepSw').addEventListener('click', function () { S.sleep = !S.sleep; renderWeek(); });
    $('#addAct').addEventListener('click', function () {
      S.seq++;
      S.acts.push({ id: 'x' + S.seq, name: 'New activity ' + S.seq, area: 'phys' });
      $('#addNote').textContent = 'Added New activity ' + S.seq + '. Paint some hours and choose it.';
      renderWeek(); renderGoals();
    });
    $('#sleepHours').addEventListener('click', function () {
      $('#addNote').textContent = 'Sleep is set to 10 PM to 7 AM. Sleep hours is an app setting, not part of this sketch.';
    });

    // Year: the year switch is shown but the sample covers 2026 only; the painter and the chart.
    var yw = $('#yweeks');
    yw.addEventListener('pointerdown', function (e) {
      var c = e.target.closest && e.target.closest('.yw');
      if (!c || e.button !== 0) return;
      S.painting = true; paintWeek(+c.dataset.w);
    });
    document.addEventListener('pointermove', function (e) {
      if (!S.painting) return;
      var el = document.elementFromPoint(e.clientX, e.clientY);
      var c = el && el.closest && el.closest('.yw');
      if (c) paintWeek(+c.dataset.w);
    });
    document.addEventListener('pointerup', function () { S.painting = false; });

    // Insights: the milestone switch and the example.
    $('#msSw').addEventListener('click', function () { setMilestones(!S.milestones); });
    $('#menuMilestones').addEventListener('click', function () { setMilestones(!S.milestones); });
    $('#msExample').addEventListener('click', function () {
      if (S.milestones) showToast('First full Physical week', 'Every planned Physical session this week is done.', true);
    });
    $('#toastClose').addEventListener('click', hideToast);

    // First-run dialog: keyboard and the skip button.
    $('#frSkip').addEventListener('click', closeFr);
    $('#fr').addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeFr(); }
    });
    $('#fr').addEventListener('click', function (e) {
      if (e.target === this) closeFr();
    });

    window.addEventListener('hashchange', route);

    // First visit opens the first run. Later visits do not.
    var seen = null;
    try { seen = localStorage.getItem('timely.proto.seen'); } catch (e) {}
    route();
    if (!seen) openFr(0);
  }
  function paintWeek(w) {
    if (S.tool === 'erase') delete S.paint[w]; else S.paint[w] = S.tool;
    renderYear(); renderInsights(); renderHome();
  }
  function setMilestones(on) {
    S.milestones = on;
    renderInsights();
    if (!on) $('#toast').hidden = true;
  }
  function onKey(e) {
    if (e.key !== 'Escape') return;
    if (!$('#fr').hidden) { closeFr(); return; }
    if (!$('#acctMenu').hidden) { closeMenuToAvatar(); return; }
    if (S.menu) { S.menu = null; renderWeek(); return; }
    if (S.sel || S.selBlock) { S.sel = null; S.selBlock = null; renderWeek(); }
  }

  // Start once the markup is in place.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
