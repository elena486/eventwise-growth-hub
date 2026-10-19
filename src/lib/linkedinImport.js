import * as XLSX from 'xlsx';

// ── small helpers ──
function norm(v) { return v == null ? '' : String(v).trim().toLowerCase(); }
function num(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/[£$%\s]/g, '').replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
// Keep the original casing for saving/linking (LinkedIn URLs are case-sensitive); lowercase only for matching.
function cleanUrl(u) {
  return String(u || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
}
function normUrl(u) {
  return cleanUrl(u).toLowerCase();
}
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// Dates in the export are M/D/YYYY. SheetJS with cellDates may also return Date objects.
function parseDate(val) {
  if (!val && val !== 0) return null;
  if (val instanceof Date && !isNaN(val)) return toISO(val);
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(s);
  if (!isNaN(d)) return toISO(d);
  return null;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function parsePeriod(str) {
  if (!str) return null;
  const m = String(str).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const monthIdx = Number(m[1]) - 1;
    if (monthIdx < 0 || monthIdx > 11) return null;
    return { month: MONTHS[monthIdx], year: Number(m[3]) };
  }
  return null;
}
function parsePeriodFromFilename(name) {
  const dates = [...String(name).matchAll(/(\d{4})-(\d{2})-(\d{2})/g)];
  if (!dates.length) return null;
  const s = dates[0];
  const start = `${s[1]}-${s[2]}-${s[3]}`;
  const end = dates[1] ? `${dates[1][1]}-${dates[1][2]}-${dates[1][3]}` : null;
  const monthIdx = Number(s[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return { month: MONTHS[monthIdx], year: Number(s[1]), start, end };
}

// Build a readable title from a LinkedIn post URL slug.
export function titleFromUrl(url) {
  try {
    const u = new URL(url);
    const segs = u.pathname.split('/').filter(Boolean);
    let slug = segs[segs.length - 1] || '';
    if (!slug) return 'LinkedIn post';
    // LinkedIn: author-slug_content-slug-activity-id
    if (slug.includes('_')) slug = slug.split('_').slice(1).join('_');
    slug = slug.replace(/-activity-.*$/, '').replace(/-activity$/, '');
    const words = decodeURIComponent(slug).replace(/[-_]/g, ' ').split(/\s+/)
      .filter(w => w && !/^\d+$/.test(w) && w.length > 1)
      .slice(0, 6);
    if (!words.length) return 'LinkedIn post';
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  } catch {
    return 'LinkedIn post';
  }
}

export function shortSlugPreview(url) {
  try {
    const u = new URL(url);
    const segs = u.pathname.split('/').filter(Boolean);
    let slug = segs[segs.length - 1] || url;
    if (slug.includes('_')) slug = slug.split('_').slice(1).join('_');
    slug = slug.replace(/-activity-.*$/, '').replace(/[-_]/g, ' ');
    const words = decodeURIComponent(slug).split(/\s+/).filter(Boolean).slice(0, 5).join(' ');
    return words || url;
  } catch {
    return url;
  }
}

// ── main parse ──
export function parseLinkedinFile(arrayBuffer, fileName) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const posts = [];
  const periodTotals = {};
  let period = null;

  // TOP POSTS — rows 1-2 notes, row 3 header, two side-by-side tables
  const topSheet = wb.Sheets['TOP POSTS'];
  if (topSheet) {
    const rows = XLSX.utils.sheet_to_json(topSheet, { header: 1, raw: true, defval: null });
    const engagementsBy = {};
    const impressionsBy = {};
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const urlA = normUrl(r[0]);
      const urlE = normUrl(r[4]);
      if (urlA) engagementsBy[urlA] = { raw: cleanUrl(r[0]), date: parseDate(r[1]), engagements: num(r[2]) };
      if (urlE) impressionsBy[urlE] = { raw: cleanUrl(r[4]), date: parseDate(r[5]), impressions: num(r[6]) };
    }
    const urls = new Set([...Object.keys(engagementsBy), ...Object.keys(impressionsBy)]);
    urls.forEach(url => {
      const e = engagementsBy[url] || {};
      const im = impressionsBy[url] || {};
      posts.push({
        url: e.raw || im.raw || url, date: e.date || im.date,
        impressions: im.impressions || 0,
        engagements: e.engagements || 0,
        reactions: null, comments: null, reposts: null,
        reach: null, saves: null, followersGained: null,
        postType: null, _source: 'top',
      });
    });
  }

  // MOST RECENT POSTS — full numbers, override TOP POSTS
  const recentSheet = wb.Sheets['MOST RECENT POSTS'];
  if (recentSheet) {
    const rows = XLSX.utils.sheet_to_json(recentSheet, { header: 1, raw: true, defval: null });
    let headerIdx = rows.findIndex(r => r && norm(r[0]).includes('post url'));
    if (headerIdx === -1) headerIdx = 0;
    const headers = (rows[headerIdx] || []).map(norm);
    const idx = (name) => headers.findIndex(h => h.includes(name));
    const iUrl = idx('post url');
    const iDate = idx('post publish date');
    const iType = idx('post type');
    const iImp = headers.findIndex(h => h === 'impressions' || h.startsWith('impressions'));
    const iReach = idx('members reached');
    const iFollowers = idx('followers gained');
    const iReactions = idx('reactions');
    const iComments = idx('comments');
    const iReposts = idx('reposts');
    const iSaves = idx('saves');
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const url = normUrl(r[iUrl]);
      if (!url) continue;
      const entry = {
        url: cleanUrl(r[iUrl]),
        date: parseDate(r[iDate]),
        postType: r[iType] != null ? String(r[iType]) : null,
        impressions: num(r[iImp]),
        reach: iReach !== -1 ? num(r[iReach]) : null,
        followersGained: iFollowers !== -1 ? num(r[iFollowers]) : null,
        reactions: iReactions !== -1 ? num(r[iReactions]) : null,
        comments: iComments !== -1 ? num(r[iComments]) : null,
        reposts: iReposts !== -1 ? num(r[iReposts]) : null,
        saves: iSaves !== -1 ? num(r[iSaves]) : null,
      };
      const existing = posts.find(p => normUrl(p.url) === url);
      if (existing) {
        existing.impressions = entry.impressions || existing.impressions;
        existing.reactions = entry.reactions;
        existing.comments = entry.comments;
        existing.reposts = entry.reposts;
        existing.reach = entry.reach;
        existing.saves = entry.saves;
        existing.followersGained = entry.followersGained;
        existing.postType = entry.postType;
        if (entry.date) existing.date = entry.date;
        existing._source = 'both';
      } else {
        entry.engagements = (entry.reactions || 0) + (entry.comments || 0) + (entry.reposts || 0);
        entry._source = 'recent';
        posts.push(entry);
      }
    }
  }

  // DISCOVERY — period totals
  const discSheet = wb.Sheets['DISCOVERY'];
  if (discSheet) {
    const rows = XLSX.utils.sheet_to_json(discSheet, { header: 1, raw: true, defval: null });
    const periodStr = rows[0] ? (rows[0][0] || rows[0][1] || '') : '';
    const p = parsePeriod(periodStr);
    if (p) { period = p; periodTotals.periodStart = null; }
    for (const r of rows) {
      if (!r) continue;
      const label = norm(r[0]);
      const val = num(r[1]);
      if (!val) continue;
      if (label === 'impressions') periodTotals.totalImpressions = val;
      if (label === 'members reached' || label === 'unique viewers' || label === 'unique members reached')
        periodTotals.membersReached = val;
    }
  }

  // FOLLOWERS — total + new per day
  const follSheet = wb.Sheets['FOLLOWERS'];
  if (follSheet) {
    const rows = XLSX.utils.sheet_to_json(follSheet, { header: 1, raw: true, defval: null });
    if (rows[0]) {
      for (const cell of rows[0]) {
        const n = num(cell);
        if (n > 0) { periodTotals.totalFollowers = n; break; }
      }
    }
    const headerIdx = rows.findIndex(r => r && norm(r[0]).includes('date'));
    let newFollowers = 0;
    if (headerIdx !== -1) {
      const headers = rows[headerIdx].map(norm);
      const iNew = headers.findIndex(h => h.includes('new followers') || h.includes('followers'));
      if (iNew !== -1) {
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r) continue;
          newFollowers += num(r[iNew]);
        }
      }
    }
    periodTotals.newFollowers = newFollowers;
  }

  // Period fallback from filename
  if (!period) {
    const fp = parsePeriodFromFilename(fileName);
    if (fp) {
      period = { month: fp.month, year: fp.year };
      periodTotals.periodStart = fp.start;
      periodTotals.periodEnd = fp.end;
    }
  } else if (period && !periodTotals.periodStart) {
    const fp = parsePeriodFromFilename(fileName);
    if (fp) { periodTotals.periodStart = fp.start; periodTotals.periodEnd = fp.end; }
  }

  return { posts, periodTotals, periodMonth: period?.month || null, periodYear: period?.year || null };
}

// ── matching ──
function pageMatches(pagePostedOn, page) {
  if (!pagePostedOn) return false;
  const p = pagePostedOn.toLowerCase();
  if (page === 'Personal Chris') return p.includes('chris');
  if (page === 'Eventwise Page') return p.includes('eventwise');
  return false;
}

export function matchPosts(posts, contentItems, page) {
  const byUrl = {};
  contentItems.forEach(it => {
    if (it.publishedUrl) {
      const k = normUrl(it.publishedUrl);
      if (!byUrl[k]) byUrl[k] = it;
    }
  });
  const claimed = new Set();
  const result = posts.map(post => {
    const nu = normUrl(post.url);
    const urlItem = byUrl[nu];
    if (urlItem && !claimed.has(urlItem.id)) {
      claimed.add(urlItem.id);
      return { ...post, status: 'matched', itemId: urlItem.id, item: urlItem, choice: urlItem.id };
    }
    return { ...post, status: 'pending', itemId: null, item: null, choice: '' };
  });
  // date + page match for remaining
  result.forEach(post => {
    if (post.status !== 'pending' || !post.date) {
      if (post.status === 'pending') post.status = 'create_new';
      return;
    }
    const candidates = contentItems.filter(it =>
      !claimed.has(it.id) &&
      it.publishDate === post.date &&
      pageMatches(it.pagePostedOn, page)
    );
    if (candidates.length === 1) {
      claimed.add(candidates[0].id);
      post.status = 'matched';
      post.itemId = candidates[0].id;
      post.item = candidates[0];
      post.choice = candidates[0].id;
    } else if (candidates.length > 1) {
      post.status = 'needs_choice';
      post.candidates = candidates;
    } else {
      post.status = 'create_new';
      post.choice = 'new';
    }
  });
  return result;
}

export function timeBucket(t) {
  if (!t) return null;
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  if (h < 11) return 'Before 11:00';
  if (h < 13) return '11:00–13:00';
  return 'After 13:00';
}