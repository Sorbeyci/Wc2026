import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, writeBatch,
  addDoc, query, orderBy, limit, getDoc,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db, googleProvider, isAdminEmail } from './firebase.js';
import { setScoring, scoreUser, SCORING } from './scoring.js';
import { GROUP_MATCHES } from '../data/tournament.js';
import { achievements } from './achievements.js';

const StoreCtx = createContext(null);

const EMPTY_PRED = () => ({ groupMatches: {}, groupTables: {}, ko: {}, topScorer: '' });
const EMPTY_ACTUAL = () => ({ groupMatches: {}, groupTables: {}, ko: {}, topScorer: '' });
const COLORS = ['#0a8754', '#e9b949', '#d94f3d', '#3d6dd9', '#7a3dd9', '#d93d9b', '#1bbd7a', '#d97f3d'];
export const MAX_THIRDS = 8;

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [lists, setLists] = useState([]);
  const [actual, setActual] = useState(EMPTY_ACTUAL());
  const [settings, setSettings] = useState({ locked: false });
  const [theme, setTheme] = useState(() => (typeof localStorage !== 'undefined' && localStorage.getItem('wc_theme')) || 'system');
  useEffect(() => {
    try { localStorage.setItem('wc_theme', theme); } catch {}
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mql.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    if (theme === 'system') { mql.addEventListener('change', apply); return () => mql.removeEventListener('change', apply); }
  }, [theme]);
  const [lastError, setLastError] = useState(null);

  const [drafts, setDrafts] = useState({});
  const [actualDraft, setActualDraft] = useState(null);
  const [logs, setLogs] = useState([]);
  const [presence, setPresence] = useState([]);
  const [deleteRequests, setDeleteRequests] = useState([]);
  const [quizLeaders, setQuizLeaders] = useState([]);
  const [activity, setActivity] = useState([]);
  const [badges, setBadges] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [bets, setBets] = useState([]);
  const [, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick((t) => t + 1), 30000); return () => clearInterval(iv); }, []);
  const [adminMode, setAdminModeState] = useState(() => {
    try { return localStorage.getItem('wc_admin_mode') === '1'; } catch { return false; }
  });
  const setAdminMode = (v) => {
    try { localStorage.setItem('wc_admin_mode', v ? '1' : '0'); } catch {}
    setAdminModeState(!!v);
  };

  const listsRef = useRef(lists);     useEffect(() => { listsRef.current = lists; }, [lists]);
  const actualRef = useRef(actual);   useEffect(() => { actualRef.current = actual; }, [actual]);
  const settingsRef = useRef(settings); useEffect(() => { settingsRef.current = settings; }, [settings]);
  const timers = useRef({});
  const pending = useRef({ lists: {}, actual: null }); // latest unsaved payloads, for flush-on-exit

  const adminEligible = isAdminEmail(user?.email);
  const isAdmin = adminEligible && adminMode;
  const locked = !!settings.locked;

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); }), []);

  useEffect(() => {
    if (!user) { setLists([]); setActual(EMPTY_ACTUAL()); setSettings({ locked: false }); return; }
    const unsubLists = onSnapshot(collection(db, 'lists'),
      (snap) => setLists(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => setLastError('Listeler okunamadı: ' + e.code));
    const unsubActual = onSnapshot(doc(db, 'config', 'actual'),
      (d) => setActual(d.exists() ? { ...EMPTY_ACTUAL(), ...d.data() } : EMPTY_ACTUAL()),
      (e) => setLastError('Sonuçlar okunamadı: ' + e.code));
    const unsubSettings = onSnapshot(doc(db, 'config', 'settings'),
      (d) => { const s = d.exists() ? { locked: false, ...d.data() } : { locked: false }; setScoring(s.scoring || {}); setSettings(s); });
    const subs = [unsubLists, unsubActual, unsubSettings];
    if (isAdminEmail(user.email)) {
      const unsubLogs = onSnapshot(query(collection(db, 'logs'), orderBy('ts', 'desc'), limit(100)),
        (snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {});
      subs.push(unsubLogs);
      const unsubReq = onSnapshot(collection(db, 'deleteRequests'),
        (snap) => setDeleteRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
      subs.push(unsubReq);
    }
    const unsubPres = onSnapshot(collection(db, 'presence'),
      (snap) => setPresence(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    subs.push(unsubPres);
    const unsubQuiz = onSnapshot(query(collection(db, 'quizWins'), orderBy('wins', 'desc'), limit(20)),
      (snap) => setQuizLeaders(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    subs.push(unsubQuiz);
    const unsubAct = onSnapshot(collection(db, 'activity'),
      (snap) => setActivity(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    subs.push(unsubAct);
    const unsubBadges = onSnapshot(collection(db, 'badges'),
      (snap) => setBadges(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    subs.push(unsubBadges);
    const unsubHl = onSnapshot(collection(db, 'highlights'),
      (snap) => setHighlights(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    subs.push(unsubHl);
    const unsubBets = onSnapshot(collection(db, 'bets'),
      (snap) => setBets(snap.docs.map((d) => ({ id: d.id, data: d.data() }))), () => {});
    subs.push(unsubBets);
    return () => subs.forEach((fn) => fn());
  }, [user]);

  const reportSave = (p) => p.catch((e) => setLastError('Kaydedilemedi (' + (e.code || e.message) + '). Firestore kuralları / admin e-postası doğru mu?'));

  // Backfill the signed-in user's e-mail onto their own lists that lack it
  // (older lists created before e-mail was stored). Runs as each user opens the app.
  const healed = useRef(new Set());
  useEffect(() => {
    if (!user?.email) return;
    for (const l of lists) {
      if (l.ownerUid === user.uid && (!l.ownerEmail || (!l.ownerPhoto && user.photoURL)) && !healed.current.has(l.id)) {
        healed.current.add(l.id);
        const patch = {};
        if (!l.ownerEmail) patch.ownerEmail = user.email;
        if (!l.ownerPhoto && user.photoURL) patch.ownerPhoto = user.photoURL;
        if (Object.keys(patch).length) setDoc(doc(db, 'lists', l.id), patch, { merge: true }).catch(() => {});
      }
    }
  }, [lists, user]);

  const logAction = (action, detail = '') => {
    if (!adminEligible) return;
    addDoc(collection(db, 'logs'), {
      ts: serverTimestamp(), email: user?.email || '', action, detail,
    }).catch(() => {});
  };

  const writeList = (listId, prediction) => {
    pending.current.lists[listId] = prediction;
    reportSave(setDoc(doc(db, 'lists', listId), { prediction, updatedAt: serverTimestamp() }, { merge: true })
      .then(() => { delete pending.current.lists[listId]; }));
  };
  const writeActual = (next) => {
    pending.current.actual = next;
    reportSave(setDoc(doc(db, 'config', 'actual'), { ...next, updatedAt: serverTimestamp() }, { merge: true })
      .then(() => { pending.current.actual = null; }));
  };

  const saveList = (listId, prediction) => {
    pending.current.lists[listId] = prediction;
    clearTimeout(timers.current['L' + listId]);
    timers.current['L' + listId] = setTimeout(() => writeList(listId, prediction), 500);
  };
  const saveActual = (next) => {
    pending.current.actual = next;
    clearTimeout(timers.current.A);
    timers.current.A = setTimeout(() => writeActual(next), 500);
  };

  // flush any unsaved edits immediately when the tab is hidden / closed / refreshed
  useEffect(() => {
    const flush = () => {
      for (const [id, pred] of Object.entries(pending.current.lists)) writeList(id, pred);
      if (pending.current.actual) writeActual(pending.current.actual);
    };
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onHide); };
  }, []);

  const editPred = (listId, fn) => {
    if (settingsRef.current.locked && !isAdmin) { setLastError('Tahminler kilitlendi.'); return; }
    setDrafts((prev) => {
      const base = prev[listId] ?? listsRef.current.find((l) => l.id === listId)?.prediction ?? EMPTY_PRED();
      const next = fn(structuredClone(base));
      saveList(listId, next);
      return { ...prev, [listId]: next };
    });
  };
  const editActual = (fn) => {
    setActualDraft((prev) => {
      const base = prev ?? actualRef.current ?? EMPTY_ACTUAL();
      const next = fn(structuredClone(base));
      saveActual(next);
      return next;
    });
  };

  // Presence heartbeat: mark this user online while the app is open.
  useEffect(() => {
    if (!user) return;
    const beat = () => setDoc(doc(db, 'presence', user.uid), {
      uid: user.uid, email: user.email || '', name: user.displayName || '', lastSeen: serverTimestamp(),
    }, { merge: true }).catch(() => {});
    beat();
    const iv = setInterval(beat, 30000);
    const onVis = () => { if (document.visibilityState === 'visible') beat(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  }, [user]);

  // Aktiflik: kullanıcının uğradığı farklı gün sayısını tut (günde en fazla 1 artar).
  useEffect(() => {
    if (!user) return;
    let done = false;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const ref = doc(db, 'activity', user.uid);
      try {
        const snap = await getDoc(ref);
        const prev = snap.exists() ? snap.data() : null;
        if (done || prev?.lastDay === today) return;
        const days = (prev?.days || 0) + 1;
        await setDoc(ref, {
          uid: user.uid, name: user.displayName || '', days, lastDay: today, updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {}
    })();
    return () => { done = true; };
  }, [user]);

  // Kazanılan başarımları kalıcı kıl (latch): kendi rozet kümeni badges/<uid>'e biriktir.
  // Böylece bir rozet kazanıldıktan sonra koşul bozulsa (ör. 1.'likten düşmek) bile kalır.
  const lastLatchRef = useRef('');
  useEffect(() => {
    if (!user || !lists.length) return;
    const myList = lists.find((l) => l.ownerUid === user.uid);
    if (!myList) return;
    const numv = (v) => (v === '' || v == null || isNaN(+v) ? null : +v);
    const outc = (h, a) => (h > a ? 1 : h < a ? -1 : 0);
    const totals = lists.map((l) => ({ id: l.id, total: scoreUser(getPrediction(l.id), actual, { projection: false }).total }))
      .sort((a, b) => b.total - a.total);
    const rank = totals.findIndex((t) => t.id === myList.id) + 1;
    const result = scoreUser(getPrediction(myList.id), actual, { projection: false });
    const gp = getPrediction(myList.id).groupMatches || {};
    const byDate = {};
    for (const m of GROUP_MATCHES) {
      const p = gp[m.no], a = actual?.groupMatches?.[m.no];
      const ph = numv(p?.home), pp = numv(p?.away), ah = numv(a?.home), aa = numv(a?.away);
      if (ph == null || pp == null || ah == null || aa == null) continue;
      const pts = (ph === ah && pp === aa) ? SCORING.match.exact : (outc(ph, pp) === outc(ah, aa) ? SCORING.match.result : 0);
      byDate[m.date] = (byDate[m.date] || 0) + pts;
    }
    const bestDay = Object.values(byDate).length ? Math.max(...Object.values(byDate)) : 0;
    const qw = (quizLeaders.find((q) => q.uid === user.uid)?.wins) || 0;
    const ad = (activity.find((x) => x.uid === user.uid)?.days) || 0;
    const earnedNow = achievements(result, { rank, bestDay, quizWins: qw, activeDays: ad, online: false })
      .filter((a) => a.earned && a.id !== 'onlinenow').map((a) => a.id);
    const stored = badges.find((b) => b.uid === user.uid)?.ids || [];
    const union = Array.from(new Set([...stored, ...earnedNow])).sort();
    const key = union.join(',');
    if (key === lastLatchRef.current) return;
    lastLatchRef.current = key;
    if (union.length > stored.length) {
      setDoc(doc(db, 'badges', user.uid), {
        uid: user.uid, name: user.displayName || '', ids: union, updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }
  }, [user, lists, actual, quizLeaders, activity, badges]);

  const ONLINE_MS = 70000;
  const lastSeenMs = (p) => (p?.lastSeen?.toMillis ? p.lastSeen.toMillis() : (p?.lastSeen?.seconds ? p.lastSeen.seconds * 1000 : 0));
  const isOnline = (l) => {
    if (!l) return false;
    const now = Date.now();
    for (const p of presence) {
      if (!lastSeenMs(p) || now - lastSeenMs(p) >= ONLINE_MS) continue;
      const pe = (p.email || '').toLowerCase();
      const le = (l.ownerEmail || '').toLowerCase();
      if (l.imported) { if (le && pe && pe === le) return true; }
      else { if (p.uid === l.ownerUid) return true; if (le && pe && pe === le) return true; }
    }
    return false;
  };
  const onlineCount = (() => {
    const now = Date.now(); let n = 0;
    for (const p of presence) if (lastSeenMs(p) && now - lastSeenMs(p) < ONLINE_MS) n++;
    return n;
  })();
  const onlineUsers = (() => {
    const now = Date.now();
    return presence
      .filter((p) => lastSeenMs(p) && now - lastSeenMs(p) < ONLINE_MS)
      .map((p) => ({ uid: p.uid, name: p.name || 'Oyuncu', email: p.email || '', me: p.uid === user?.uid }))
      .sort((a, b) => (a.me === b.me ? a.name.localeCompare(b.name, 'tr') : a.me ? -1 : 1));
  })();

  const getPrediction = (listId) =>
    drafts[listId] ?? lists.find((l) => l.id === listId)?.prediction ?? EMPTY_PRED();
  const liveActual = actualDraft ?? actual;

  const myLists = lists.filter((l) => l.ownerUid === user?.uid);
  const canCreateList = (isAdmin || myLists.length === 0) && (!locked || isAdmin);

  const toggleIn = (arr, team, max) => {
    const set = new Set(arr || []);
    if (set.has(team)) set.delete(team);
    else { if (set.size >= max) return arr || []; set.add(team); }
    return [...set];
  };

  const api = useMemo(() => ({
    user, isAdmin, adminEligible, adminMode, setAdminMode,
    authLoading, lists, actual: liveActual,
    settings, locked, lastError, clearError: () => setLastError(null), theme, setTheme,
    myLists, canCreateList, getPrediction, logs, isOnline, onlineCount, onlineUsers, deleteRequests,

    signIn: () => signInWithPopup(auth, googleProvider).catch((e) => setLastError(e.code || e.message)),
    logout: () => signOut(auth),

    async createList(name, email) {
      if (!user) return;
      if (locked && !isAdmin) return;
      if (!isAdmin && myLists.length >= 1) return;
      const id = `${user.uid}_${Date.now().toString(36)}`;
      await reportSave(setDoc(doc(db, 'lists', id), {
        ownerUid: user.uid,
        ownerName: user.displayName || user.email || 'Oyuncu',
        ownerEmail: (email || user.email || '').trim(),
        ownerPhoto: user.photoURL || '',
        name: (name || '').trim() || (user.displayName || 'Listem'),
        color: COLORS[lists.length % COLORS.length],
        prediction: EMPTY_PRED(),
        createdAt: serverTimestamp(),
      }));
    },
    // Admin: import a prediction (e.g. from Excel) under a given name + email.
    async importList({ name, email, prediction }) {
      if (!user || !isAdmin) return null;
      const id = `${user.uid}_imp_${Date.now().toString(36)}`;
      await reportSave(setDoc(doc(db, 'lists', id), {
        ownerUid: user.uid,
        ownerName: (name || 'Oyuncu').trim(),
        ownerEmail: (email || '').trim(),
        name: (name || 'Oyuncu').trim(),
        color: COLORS[lists.length % COLORS.length],
        prediction: { ...EMPTY_PRED(), ...prediction },
        imported: true,
        createdAt: serverTimestamp(),
      }));
      logAction('Excel içe aktarıldı', `${(name || 'Oyuncu').trim()} (${Object.keys(prediction?.groupMatches || {}).length} grup maçı)`);
      return id;
    },
    // User asks the admin to delete their list (instead of deleting directly).
    requestDeleteList: (l) => {
      if (!user || !l) return;
      return addDoc(collection(db, 'deleteRequests'), {
        listId: l.id, listName: l.name || l.ownerName || '',
        by: user.uid, byName: user.displayName || '', byEmail: user.email || '',
        at: serverTimestamp(),
      }).catch(() => setLastError('İstek gönderilemedi.'));
    },
    approveDelete: async (req) => {
      if (!isAdmin) return;
      logAction('Silme isteği onaylandı', req.listName || req.listId);
      await reportSave(deleteDoc(doc(db, 'lists', req.listId)));
      await deleteDoc(doc(db, 'deleteRequests', req.id)).catch(() => {});
    },
    rejectDelete: async (req) => {
      if (!isAdmin) return;
      logAction('Silme isteği reddedildi', req.listName || req.listId);
      await deleteDoc(doc(db, 'deleteRequests', req.id)).catch(() => {});
    },
    deleteList: (id) => {
      const l = listsRef.current.find((x) => x.id === id);
      logAction('Liste silindi', l?.name || id);
      return reportSave(deleteDoc(doc(db, 'lists', id)));
    },
    canEditList: (l) => !!l && (l.ownerUid === user?.uid || isAdmin) && (!locked || isAdmin),
    // Whether a list represents the current user. For imported lists the owner
    // is whoever the e-mail was assigned to, not the admin who imported it.
    isMyList: (l) => {
      if (!l) return false;
      const em = (user?.email || '').toLowerCase();
      if (l.imported) return !!(l.ownerEmail && em && l.ownerEmail.toLowerCase() === em);
      return l.ownerUid === user?.uid;
    },
    // Who may delete a list: admins, the real owner, or — for imported lists —
    // the person whose e-mail was assigned to it.
    canDeleteList: (l) => {
      if (!l) return false;
      if (isAdmin) return true;
      if (l.ownerUid === user?.uid) return true;
      const em = (user?.email || '').toLowerCase();
      return !!(l.imported && l.ownerEmail && em && l.ownerEmail.toLowerCase() === em);
    },
    // Admin: edit a list's display name + assigned e-mail.
    updateListMeta: (id, { name, ownerEmail }) => {
      if (!isAdmin) return;
      const patch = { updatedAt: serverTimestamp() };
      if (name != null) { patch.name = name.trim(); patch.ownerName = name.trim(); }
      if (ownerEmail != null) patch.ownerEmail = ownerEmail.trim();
      logAction('Liste düzenlendi', `${name ?? ''} ${ownerEmail ? '· ' + ownerEmail : ''}`.trim());
      return reportSave(setDoc(doc(db, 'lists', id), patch, { merge: true }));
    },

    // ---- admin controls ----
    setScoringConfig: (cfg) => {
      if (!isAdmin) return;
      logAction('Puanlama güncellendi', '');
      return reportSave(setDoc(doc(db, 'config', 'settings'), { scoring: cfg, updatedAt: serverTimestamp() }, { merge: true }));
    },
    ad: settings.ad || null,
    setAd: (info) => {
      if (!isAdmin) return;
      const clean = info ? {
        enabled: !!info.enabled,
        text: (info.text || '').trim(),
        imageUrl: (info.imageUrl || '').trim(),
        linkUrl: (info.linkUrl || '').trim(),
      } : null;
      logAction('Reklam güncellendi', clean && clean.enabled ? 'açık' : 'kapalı');
      return reportSave(setDoc(doc(db, 'config', 'settings'), { ad: clean, updatedAt: serverTimestamp() }, { merge: true }));
    },
    quizLeaders,
    quizWinsByUid: Object.fromEntries((quizLeaders || []).map((q) => [q.uid, q.wins || 0])),
    activeDaysByUid: Object.fromEntries((activity || []).map((a) => [a.uid, a.days || 0])),
    earnedBadgesByUid: Object.fromEntries((badges || []).map((b) => [b.uid, b.ids || []])),
    highlightsByNo: Object.fromEntries((highlights || []).map((h) => [h.no, h])),
    writeHighlight(no, data) {
      if (!user) return Promise.resolve();
      return setDoc(doc(db, 'highlights', String(no)), { no, ...data, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
    },
    clearHighlight(no) {
      if (!user) return Promise.resolve();
      return deleteDoc(doc(db, 'highlights', String(no))).catch(() => {});
    },
    // Puana etkisiz "kim yener" bahsi: bets/{no} dokümanı { uid: takımAdı } eşlemesi.
    betsByNo: Object.fromEntries((bets || []).map((b) => [b.id, b.data || {}])),
    setBet(no, team) {
      if (!user) return Promise.resolve();
      const key = String(no);
      // İyimser güncelleme: kendi oyunu anında göster (snapshot beklemeden).
      setBets((prev) => {
        const arr = prev.slice();
        const i = arr.findIndex((b) => b.id === key);
        if (i >= 0) arr[i] = { id: key, data: { ...arr[i].data, [user.uid]: team || '' } };
        else arr.push({ id: key, data: { [user.uid]: team || '' } });
        return arr;
      });
      return setDoc(doc(db, 'bets', key), { [user.uid]: team || '' }, { merge: true }).catch(() => {});
    },
    // Bir günlük quiz kazanımını kaydeder. Günde en fazla 1 kez sayılır (lastDate guard).
    async recordQuizWin() {
      if (!user) return { counted: false };
      const today = new Date().toISOString().slice(0, 10);
      const ref = doc(db, 'quizWins', user.uid);
      try {
        const snap = await getDoc(ref);
        const prev = snap.exists() ? snap.data() : null;
        if (prev?.lastDate === today) return { counted: false, wins: prev.wins || 0 };
        const wins = (prev?.wins || 0) + 1;
        await setDoc(ref, {
          uid: user.uid,
          name: user.displayName || 'Oyuncu',
          photo: user.photoURL || '',
          wins, lastDate: today, updatedAt: serverTimestamp(),
        }, { merge: true });
        return { counted: true, wins };
      } catch (e) {
        setLastError('Quiz kaydı yapılamadı: ' + (e.code || e.message));
        return { counted: false };
      }
    },
    setLocked: (val) => {
      logAction('Kilit', val ? 'açıldı (kilitli)' : 'kaldırıldı');
      return reportSave(setDoc(doc(db, 'config', 'settings'), { locked: !!val, updatedAt: serverTimestamp() }, { merge: true }));
    },
    highlightsAuto: settings.highlightsAuto !== false,
    setHighlightsAuto: (val) => {
      logAction('Maç özeti otomatik', val ? 'açık' : 'kapalı');
      return reportSave(setDoc(doc(db, 'config', 'settings'), { highlightsAuto: !!val, updatedAt: serverTimestamp() }, { merge: true }));
    },
    async resetAllLists() {
      if (!isAdmin) return;
      logAction('Tüm listeler sıfırlandı', `${listsRef.current.length} liste`);
      const batch = writeBatch(db);
      listsRef.current.forEach((l) => batch.delete(doc(db, 'lists', l.id)));
      await reportSave(batch.commit());
      setDrafts({});
    },
    async resetActual() {
      if (!isAdmin) return;
      logAction('Sonuçlar sıfırlandı');
      setActualDraft(null);
      await reportSave(deleteDoc(doc(db, 'config', 'actual')));
    },

    // ---- prediction setters ----
    setGroupMatch: (listId, no, side, value) =>
      editPred(listId, (p) => { p.groupMatches[no] = { ...(p.groupMatches[no] || {}), [side]: value }; return p; }),
    setGroupTable: (listId, group, order) =>
      editPred(listId, (p) => { p.groupTables[group] = order; return p; }),
    clearGroupTable: (listId, group) =>
      editPred(listId, (p) => { const t = { ...p.groupTables }; delete t[group]; p.groupTables = t; return p; }),
    // Bracket: pick who advances from a knockout match (winner propagates).
    setKoWinner: (listId, no, winner) =>
      editPred(listId, (p) => {
        if (!p.ko) p.ko = {};
        if (p.ko[no]?.winner === winner) { const k = { ...p.ko }; delete k[no]; p.ko = k; }
        else p.ko = { ...p.ko, [no]: { ...(p.ko[no] || {}), winner } };
        return p;
      }),
    // Merge any fields (score + winner) for a knockout match.
    mergeKo: (listId, no, patch) =>
      editPred(listId, (p) => {
        if (!p.ko) p.ko = {};
        p.ko = { ...p.ko, [no]: { ...(p.ko[no] || {}), ...patch } };
        return p;
      }),
    setTopScorer: (listId, value) =>
      editPred(listId, (p) => { p.topScorer = value; return p; }),

    // ---- admin actual setters ----
    setActualMatch: (no, side, value) =>
      editActual((a) => { a.groupMatches[no] = { ...(a.groupMatches[no] || {}), [side]: value }; return a; }),
    setActualTable: (group, order) =>
      editActual((a) => { a.groupTables[group] = order; return a; }),
    clearActualTable: (group) =>
      editActual((a) => { const t = { ...a.groupTables }; delete t[group]; a.groupTables = t; return a; }),
    setActualKoWinner: (no, winner) =>
      editActual((a) => {
        if (!a.ko) a.ko = {};
        if (a.ko[no]?.winner === winner) { const k = { ...a.ko }; delete k[no]; a.ko = k; }
        else a.ko = { ...a.ko, [no]: { ...(a.ko[no] || {}), winner } };
        return a;
      }),
    mergeActualKo: (no, patch) =>
      editActual((a) => {
        if (!a.ko) a.ko = {};
        a.ko = { ...a.ko, [no]: { ...(a.ko[no] || {}), ...patch } };
        return a;
      }),
    setActualTopScorer: (value) =>
      editActual((a) => { a.topScorer = value; return a; }),
    // Bulk-apply auto-fetched results into actual (merge by match no).
    applyFetchedScores: ({ groupMatches = {}, ko = {} }) => {
      logAction('Otomatik skor uygulandı', `${Object.keys(groupMatches).length} grup maçı`);
      return editActual((a) => {
        a.groupMatches = { ...a.groupMatches };
        for (const [no, sc] of Object.entries(groupMatches)) {
          a.groupMatches[no] = { ...(a.groupMatches[no] || {}), home: String(sc.home), away: String(sc.away) };
        }
        if (Object.keys(ko).length) {
          a.ko = { ...a.ko };
          for (const [no, v] of Object.entries(ko)) a.ko[no] = { ...(a.ko[no] || {}), ...v };
        }
        return a;
      });
    },
  }), [user, isAdmin, adminEligible, adminMode, authLoading, lists, actual, settings, locked, lastError, drafts, actualDraft, logs, presence, deleteRequests, quizLeaders, activity, badges, highlights, theme]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export const useStore = () => {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
};
