"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type QueueRow = {
  id: string;
  nickname: string;
  queue_number: number;
  created_at: string;
};

export default function AdminPage() {
  const supabase = createClient();
  const [session, setSession] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [current, setCurrent] = useState(0);
  const [entries, setEntries] = useState<QueueRow[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSession(true);
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    setIsAdmin(profile?.role === "admin");
  }

  async function loadData() {
    const [{ data: state }, { data: rows }] = await Promise.all([
      supabase.from("event_state").select("current_queue").eq("id", 1).single(),
      supabase.from("queue_entries").select("id,nickname,queue_number,created_at").order("queue_number", { ascending: true })
    ]);
    setCurrent(state?.current_queue ?? 0);
    setEntries(rows ?? []);
  }

  useEffect(() => {
    checkUser();
    const { data } = supabase.auth.onAuthStateChange(() => checkUser());
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();

    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_state" }, payload => {
        const row = payload.new as { current_queue?: number };
        if (typeof row.current_queue === "number") setCurrent(row.current_queue);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries" }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  async function login() {
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else { setSession(true); await checkUser(); }
  }

  async function setQueue(number: number) {
    setError(""); setMessage(""); setLoading(true);
    const { error } = await supabase.rpc("admin_set_current_queue", { p_queue_number: number });
    if (error) setError(error.message);
    else { setCurrent(number); setMessage(`ตั้งคิวปัจจุบันเป็น #${number} แล้ว`); }
    setLoading(false);
  }

  async function handleResetQueue() {
    const isConfirmed = window.confirm(
      "⚠️ คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลคิวทั้งหมด?\nข้อมูลประวัติคิวที่ผ่านมาจะหายไปและไม่สามารถกู้คืนได้"
    );
    
    if (!isConfirmed) return;

    setLoading(true);
    setError("");
    setMessage("");

    const { error } = await supabase.rpc("admin_reset_queue");

    if (error) {
      setError("เกิดข้อผิดพลาดในการรีเซ็ต: " + error.message);
    } else {
      setMessage("✅ รีเซ็ตคิวสำเร็จ! ระบบพร้อมเริ่มต้นคิวใหม่ที่ 1 แล้ว");
      await loadData(); 
    }
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(false); setIsAdmin(false);
  }

  if (!session) {
    return (
      <main className="center-page">
        <section className="card narrow">
          <div className="stack">
            <div><p className="muted">ADMIN</p><h1>เข้าสู่ระบบผู้ดูแล</h1></div>
            <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
            <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
            {error && <div className="error">{error}</div>}
            <button className="btn" onClick={login}>เข้าสู่ระบบ</button>
          </div>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return <main className="center-page"><section className="card narrow"><div className="stack"><div className="error">บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล</div><button className="btn secondary" onClick={logout}>ออกจากระบบ</button></div></section></main>;
  }

  const next = current + 1;
  const previous = Math.max(current - 1, 0);

  return (
    <main className="container" style={{padding:"32px 0"}}>
      <div className="row" style={{marginBottom:20}}>
        <div><p className="muted">ADMIN DASHBOARD</p><h1>จัดการคิวถ่ายรูป</h1></div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn" style={{ backgroundColor: "#dc2626", color: "white" }} disabled={loading} onClick={handleResetQueue}>
            รีเซ็ตข้อมูลคิวทั้งหมด
          </button>
          <button className="btn secondary" onClick={logout}>ออกจากระบบ</button>
        </div>
      </div>

      <div className="grid">
        <div className="stat"><div className="title">กำลังเรียกคิว</div><div className="value">#{current || "—"}</div></div>
        <div className="stat"><div className="title">ผู้ลงทะเบียนทั้งหมด</div><div className="value">{entries.length}</div></div>
        <div className="stat"><div className="title">คิวถัดไป</div><div className="value">#{next}</div></div>
      </div>

      <section className="card" style={{marginTop:16}}>
        <h2>ควบคุมคิว</h2>
        <div className="toolbar">
          <button className="btn secondary" disabled={loading || current <= 0} onClick={()=>setQueue(previous)}>ย้อนคิว</button>
          <button className="btn" disabled={loading} onClick={()=>setQueue(next)}>เรียกคิวถัดไป #{next}</button>
          <select className="input" style={{width:"auto"}} value={selected} onChange={e=>setSelected(e.target.value)}>
            <option value="">เลือกคิว...</option>
            {entries.map(e=><option key={e.id} value={e.queue_number}>#{e.queue_number} — {e.nickname}</option>)}
          </select>
          <button className="btn secondary" disabled={loading || !selected} onClick={()=>setQueue(Number(selected))}>ไปคิวที่เลือก</button>
        </div>
        {message && <div className="success" style={{marginTop:12}}>{message}</div>}
        {error && <div className="error" style={{marginTop:12}}>{error}</div>}
      </section>

      <section className="card" style={{marginTop:16}}>
        <div className="row"><h2>รายชื่อคิว</h2><span className="muted small">อัปเดตอัตโนมัติ</span></div>
        <ul className="queue-list">
          {entries.map(e=>(
            <li key={e.id} className={`queue-item ${e.queue_number === current ? "current":""}`}>
              <span><strong>#{e.queue_number}</strong> &nbsp; {e.nickname}</span>
              <span className="muted small">{e.queue_number === current ? "กำลังเรียก" : e.queue_number < current ? "ผ่านแล้ว" : "รอ"}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
