import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, writeBatch,
  addDoc, query, orderBy, limit,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db, googleProvider, isAdminEmail } from './firebase.js';

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
  const [lastError, setLastError] = useState(null);

  const [drafts, setDrafts] = useState({});
  const [actualDraft, setActualDraft] = useState(null);
  const [logs, setLogs] = useState([]);
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
      (d) => setSettings(d.exists() ? { locked: false, ...d.data() } : { locked: false }));
    const subs = [unsubLists, unsubActual, unsubSettings];
    if (isAdminEmail(user.email)) {
      const unsubLogs = onSnapshot(query(collection(db, 'logs'), orderBy('ts', 'desc'), limit(100)),
        (snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {});
      subs.push(unsubLogs);
    }
    return () => subs.forEach((fn) => fn());
  }, [user]);

  const reportSave = (p) => p.catch((e) => setLastError('Kaydedilemedi (' + (e.code || e.message) + '). Firestore kuralları / admin e-postası doğru mu?'));

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
    settings, locked, lastError, clearError: () => setLastError(null),
    myLists, canCreateList, getPrediction, logs,

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
    deleteList: (id) => {
      const l = listsRef.current.find((x) => x.id === id);
      logAction('Liste silindi', l?.name || id);
      return reportSave(deleteDoc(doc(db, 'lists', id)));
    },
    canEditList: (l) => !!l && (l.ownerUid === user?.uid || isAdmin) && (!locked || isAdmin),
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
    setLocked: (val) => {
      logAction('Kilit', val ? 'açıldı (kilitli)' : 'kaldırıldı');
      return reportSave(setDoc(doc(db, 'config', 'settings'), { locked: !!val, updatedAt: serverTimestamp() }, { merge: true }));
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
  }), [user, isAdmin, adminEligible, adminMode, authLoading, lists, actual, settings, locked, lastError, drafts, actualDraft, logs]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export const useStore = () => {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
};
