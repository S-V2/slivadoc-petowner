"use client";

import { useEffect, useRef, useState } from "react";
import type { Pet } from "../../data/mock";
import { askSlivaCare, realtimeSocket, type AssistantMessage, type RealtimeMessage } from "../../lib/petowner-api";
import { Icon } from "../Icon";

type Props = {
  pet: Pet;
  onClose: () => void;
  notify: (message: string) => void;
};

const welcome: AssistantMessage = {
  role: "assistant",
  content: "Halo Evans! Saya SlivaCare Assistant. Tanyakan kesehatan, nutrisi, perilaku, grooming, atau kebutuhan hewanmu. Untuk keadaan darurat, segera hubungi klinik hewan 24 jam.",
};

export default function SlivaCareDrawer({ pet, onClose, notify }: Props) {
  const [mode, setMode] = useState<"assistant" | "care-team">("assistant");
  const [message, setMessage] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([welcome]);
  const [teamMessages, setTeamMessages] = useState<RealtimeMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const conversationId = `care-${pet.id}`;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = realtimeSocket();
    const onConnect = () => { setConnected(true); socket.emit("chat:join", { conversationId }); };
    const onDisconnect = () => setConnected(false);
    const onHistory = (items: RealtimeMessage[]) => setTeamMessages(items);
    const onMessage = (item: RealtimeMessage) => setTeamMessages((current) => current.some((existing) => existing.id === item.id) ? current : [...current, item]);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat:history", onHistory);
    socket.on("chat:message", onMessage);
    socket.connect();
    if (socket.connected) onConnect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat:history", onHistory);
      socket.off("chat:message", onMessage);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [assistantMessages, teamMessages, loading, mode]);

  const send = async () => {
    const body = message.trim();
    if (!body || loading) return;
    setMessage("");
    if (mode === "care-team") {
      realtimeSocket().emit("chat:send", { conversationId, senderId: "petowner-evans", senderName: "Evans Moris", body }, (result: { ok: boolean; error?: string }) => {
        if (!result?.ok) notify(result?.error ?? "Pesan realtime belum terkirim");
      });
      return;
    }

    const nextHistory = [...assistantMessages, { role: "user" as const, content: body }];
    setAssistantMessages(nextHistory);
    setLoading(true);
    try {
      const result = await askSlivaCare({
        message: body,
        userId: "petowner-evans",
        pet: { name: pet.name, species: pet.type, breed: pet.breed, age: pet.age, weight: pet.weight },
        history: assistantMessages.slice(-8),
      });
      setAssistantMessages((current) => [...current, { role: "assistant", content: result.answer }]);
      if (result.mode === "offline_dataset") notify(result.notice || "Jawaban memakai dataset pet lokal Slivadoc");
    } catch (cause) {
      const answer = cause instanceof Error ? cause.message : "SlivaCare belum dapat menjawab.";
      setAssistantMessages((current) => [...current, { role: "assistant", content: answer }]);
    } finally {
      setLoading(false);
    }
  };

  const messages = mode === "assistant" ? assistantMessages : teamMessages;

  return (
    <div className="overlay" onMouseDown={onClose}>
      <aside className="drawer chat-drawer connected-chat" onMouseDown={(event) => event.stopPropagation()}>
        <header className="chat-header">
          <div className="doctor-avatar">{mode === "assistant" ? "✦" : "👩🏻‍⚕️"}<i /></div>
          <div><h3>{mode === "assistant" ? "SlivaCare Assistant" : "SlivaCare Team"}</h3><p>{mode === "assistant" ? "AI khusus kebutuhan hewan" : connected ? "Realtime • terhubung" : "Menghubungkan Socket.IO..."}</p></div>
          <button className="video-call" type="button" onClick={() => notify("Permintaan video call dikirim ke care team")}><Icon name="video" size={18} /></button>
          <button type="button" onClick={onClose}><Icon name="close" /></button>
        </header>
        <div className="chat-mode-tabs">
          <button type="button" className={mode === "assistant" ? "active" : ""} onClick={() => setMode("assistant")}>✦ AI Assistant</button>
          <button type="button" className={mode === "care-team" ? "active" : ""} onClick={() => setMode("care-team")}>💬 Care Team <i className={connected ? "online" : ""} /></button>
        </div>
        <div className="chat-context"><span>{pet.avatar}</span><p><small>KONSULTASI UNTUK</small><b>{pet.name} • {pet.breed}</b></p><span className="pet-only-badge">PET ONLY</span></div>
        <div className="chat-messages" ref={scrollRef}>
          <span className="chat-date">Hari ini</span>
          {mode === "assistant" && <div className="assistant-scope"><Icon name="shield" size={15} /> SlivaCare menolak pertanyaan di luar topik hewan dan tidak menggantikan diagnosis dokter.</div>}
          {messages.length === 0 && mode === "care-team" && <div className="chat-empty"><span>💬</span><b>Mulai percakapan realtime</b><p>Pesan akan tersimpan di gateway lokal dan langsung muncul pada perangkat lain.</p></div>}
          {messages.map((item, index) => {
            const isAssistant = "role" in item ? item.role === "assistant" : item.senderId !== "petowner-evans";
            const content = "content" in item ? item.content : item.body;
            return <div className={`message ${isAssistant ? "doctor" : "me"}`} key={("id" in item && item.id) || `${content}-${index}`}>
              {isAssistant && <span>{mode === "assistant" ? "✦" : "👩🏻‍⚕️"}</span>}
              <p>{content}<small>{new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}{!isAssistant && " ✓✓"}</small></p>
            </div>;
          })}
          {loading && <div className="message doctor"><span>✦</span><p className="typing"><i /><i /><i /></p></div>}
          {mode === "assistant" && <div className="quick-replies"><button type="button" onClick={() => setMessage("Anjing saya muntah, apa yang perlu saya perhatikan?")}>🩺 Konsultasi gejala</button><button type="button" onClick={() => setMessage("Apa jadwal vaksin yang perlu saya tanyakan ke dokter?")}>💉 Tanya vaksin</button><button type="button" onClick={() => setMessage("Hewan saya sesak napas dan lemas")}>🚑 Darurat</button></div>}
        </div>
        <div className="chat-input"><button type="button" onClick={() => notify("Upload lampiran akan menggunakan Cloudinary")}>＋</button><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send()} placeholder={mode === "assistant" ? "Tanya seputar hewan..." : "Tulis pesan ke care team..."} /><button type="button" onClick={send} disabled={loading}><Icon name="arrow" size={18} /></button></div>
      </aside>
    </div>
  );
}
