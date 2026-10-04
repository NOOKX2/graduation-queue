"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type QueueRow = {
  id: string;
  nickname: string;
  queue_number: number;
  created_at: string;
};

export default function QueuePage({ params }: { params: Promise<{ id: string }> }) {
  const [token, setToken] = useState("");
  const [me, setMe] = useState<QueueRow | null>(null);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(p => setToken(p.id));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    const supabase = createClient();

    async function load() {
      const { data: mine, error: mineError } = await supabase
        .from("queue_entries")
        .select("id,nickname,queue_number,created_at")
        .eq("public_token", token)
        .single();

      if (mineError) {
        setError("ไม่พบลิงก์คิวนี้");
        return;
      }
      setMe(mine);

      const [{ data: state }, { count }] = await Promise.all([
        supabase.from("event_state").select("current_queue").eq("id", 1).single(),
        supabase.from("queue_entries").select("*", { count: "exact", head: true })
      ]);
      setCurrent(state?.current_queue ?? 0);
      setTotal(count ?? 0);
    }

    load();

    const channel = supabase
      .channel("queue-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_state" }, payload => {
        const row = payload.new as { current_queue?: number };
        if (typeof row.current_queue === "number") setCurrent(row.current_queue);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [token]);

  if (error) {
    return <main className="center-page"><section className="card-glass narrow"><div className="error">{error}</div></section></main>;
  }

  if (!me) {
    return <main className="center-page"><section className="card-glass narrow"><p className="muted" style={{textAlign:"center"}}>กำลังโหลดคิว...</p></section></main>;
  }

  const remaining = Math.max(me.queue_number - current, 0);
  const isTurn = me.queue_number === current;

  return (
    <main className="center-page">
      <section className="card-glass narrow" style={{ padding: "40px 30px" }}>
        <div className="stack" style={{ gap: "32px" }}>
          
          <div className="row" style={{ alignItems: "flex-start" }}>
            <div>
              <p className="muted" style={{ fontSize: "16px", marginBottom: "0" }}>Thank you for coming</p>
              <h2 style={{ fontSize: "32px" }}>{me.nickname}</h2>
            </div>
            {/* สลับเอาNowมาไว้มุมขวาบนแทน */}
            <div style={{ color: "#fca5a5", fontSize: "18px", textAlign: "right" }}>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "2px" }}>Now</div>
              <div style={{ fontWeight: "bold" }}>#{current || "—"}</div>
            </div>
          </div>

          {/* สลับเอาคิวของคุณมาเป็นตัวเลขใหญ่นีออนตรงกลาง และเปลี่ยนคำตามที่ขอ */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p className="muted" style={{ fontSize: "16px", marginBottom: "0" }}>Here's your number :)</p>
            <div className="queue-number-neon">{me.queue_number}</div>
          </div>

          {isTurn ? (
            <div className="alert-btn">
              Your turn!!!
            </div>
          ) : (
             <div className="alert-btn" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "none" }}>
              {remaining} queue left 🙇🏻‍♂️
            </div>
          )}

          <div className="muted small" style={{textAlign:"center", color: "rgba(255,255,255,0.6)" }}>
            Wish you all the best, and be happy
          </div>
          
        </div>
      </section>
    </main>
  );
}
