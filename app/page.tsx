"use client";

import { useState } from "react";
import { getSocket } from "@/lib/useSocket";

function LinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // クリップボードが使えない環境では手動選択してもらう
    }
  }

  return (
    <div className="linkrow">
      <span className="label">{label}</span>
      <div className="urlrow">
        <code>{url}</code>
        <button type="button" className="secondary" onClick={handleCopy}>
          {copied ? "コピーしました" : "コピー"}
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [created, setCreated] = useState<{ roomId: string; hostToken: string } | null>(null);
  const [creating, setCreating] = useState(false);

  function handleCreate() {
    setCreating(true);
    const socket = getSocket();
    socket.emit("create_room", (res) => {
      setCreated(res);
      setCreating(false);
    });
  }

  if (created) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const displayUrl = `${origin}/display/${created.roomId}`;
    const joinUrl = `${origin}/play/${created.roomId}`;
    const hostUrl = `${origin}/play/${created.roomId}?host=${created.hostToken}`;

    return (
      <main className="container">
        <h1>ルームを作成しました</h1>
        <p>
          ルームコード: <strong>{created.roomId}</strong>
        </p>
        <LinkRow label="① 表示用URL(画面共有するPCで開く。操作ボタンは表示されません)" url={displayUrl} />
        <LinkRow label="② 参加者に共有するURL(みんなに送ってください)" url={joinUrl} />
        <LinkRow label="③ ホスト(あなた)用の参加URL(自分の端末で開いてください)" url={hostUrl} />
        <p className="hint">
          ①は画面共有用のPCで開いてください。②は参加者全員に共有してください。③はホストであるあなた自身がプレイヤーとして参加するためのURLです(強制一致などの操作もここから行えます)。
        </p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>一致するまで終われまテン</h1>
      <p>お題に対してみんなで同じ答えを書けばクリア。10回連続一致を目指そう。</p>
      <button onClick={handleCreate} disabled={creating}>
        {creating ? "作成中..." : "ルームを作る"}
      </button>
    </main>
  );
}
