"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function HomePage() {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function register() {
    const name = nickname.trim();
    if (!name) return setError("กรุณากรอกชื่อเล่น");
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error } = await supabase.rpc("register_queue", {
      p_nickname: name
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/queue/${data}`);
  }

  return (
    <main className="center-page">
      <section className="card-glass narrow">
        <div className="stack">
          <div className="title-header">
            <div>
              <p className="muted">VX is officially</p>
              <h1 style={{ fontSize: "28px" }}>GRADUATED!!!!!!</h1>
              <p className="muted">Good things take a little wait ;)</p>
            </div>
            <div className="muted small">Registration Info</div>
          </div>
          <div>
            <label className="label">ชื่อเล่น</label>
            <input
              className="input-glass"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && register()}
              placeholder="เช่น น้องเนเน่ นายแน่มาก"
              maxLength={50}
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn-glass" disabled={loading} onClick={register}>
            {loading ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
          </button>
        </div>
      </section>
    </main>
  );
}
