"use client";

import { useEffect, useRef, useState } from "react";
import type { Pet } from "../../lib/petowner-domain";
import {
  askSlivaCare,
  realtimeSocket,
  type AssistantMessage,
  type RealtimeMessage,
} from "../../lib/petowner-api";
import { getPetOwnerSupportChat, sendPetOwnerSupportChatMessage, type PetOwnerUser, type SupportMessage } from "../../lib/platform-api";
import { Icon } from "../Icon";

type Props = {
  pet: Pet;
  owner?: PetOwnerUser;
  initialMode?: "assistant" | "care-team" | "support";
  onClose: () => void;
  notify: (message: string) => void;
};

function supportMessage(item: SupportMessage): RealtimeMessage {
  return { id: item.id, conversationId: item.ticket_id, senderId: item.sender_id,
    senderName: item.sender_name, body: item.body, createdAt: item.created_at };
}

export default function SlivaCareDrawer({
  pet,
  owner,
  initialMode = "assistant",
  onClose,
  notify,
}: Props) {
  const supportMode = initialMode === "support";
  const [mode, setMode] = useState<"assistant" | "care-team">(supportMode ? "care-team" : initialMode);
  const [message, setMessage] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<
    AssistantMessage[]
  >([
    {
      role: "assistant",
      content: `Halo${owner?.full_name ? ` ${owner.full_name.split(" ")[0]}` : ""}! Saya SlivaCare Assistant. Tanyakan kesehatan, nutrisi, perilaku, grooming, atau kebutuhan hewanmu. Untuk keadaan darurat, segera hubungi klinik hewan 24 jam.`,
    },
  ]);
  const [teamMessages, setTeamMessages] = useState<RealtimeMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const conversationId = `care-${pet.id}`;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!owner || !supportMode) return;
    let active = true;
    const load = async (silent: boolean) => {
      try {
        const chat = await getPetOwnerSupportChat();
        if (!active) return;
        setConnected(true);
        setTeamMessages(chat.messages.map(supportMessage));
      } catch (cause) {
        if (!active) return;
        setConnected(false);
        if (!silent) notify(cause instanceof Error ? cause.message : "Chat support belum dapat dimuat");
      }
    };
    void load(false);
    const timer = window.setInterval(() => void load(true), 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [owner, supportMode, notify]);

  useEffect(() => {
    if (!owner || supportMode || !pet.id) return;
    const socket = realtimeSocket();
    const onConnect = () => {
      setConnected(true);
      socket.emit("chat:join", { conversationId });
    };
    const onDisconnect = () => setConnected(false);
    const onHistory = (items: RealtimeMessage[]) => setTeamMessages(items);
    const onMessage = (item: RealtimeMessage) =>
      setTeamMessages((current) =>
        current.some((existing) => existing.id === item.id)
          ? current
          : [...current, item],
      );
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat:history", onHistory);
    socket.on("chat:message", onMessage);
    socket.connect();
    if (socket.connected) onConnect();
    // Staff replies are persisted by the platform API, not pushed to this
    // room, so re-joining every 15s refreshes the history.
    const refresh = window.setInterval(() => {
      if (socket.connected) socket.emit("chat:join", { conversationId });
    }, 15_000);
    return () => {
      window.clearInterval(refresh);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat:history", onHistory);
      socket.off("chat:message", onMessage);
    };
  }, [conversationId, owner, pet.id, supportMode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [assistantMessages, teamMessages, loading, mode]);

  const send = async () => {
    const body = message.trim();
    if (!body || loading) return;
    setMessage("");
    if (mode === "care-team") {
      if (!owner) {
        window.dispatchEvent(new Event("slivadoc:login-required"));
        notify("Login diperlukan untuk menghubungi care team");
        return;
      }
      if (supportMode) {
        setLoading(true);
        try {
          const sent = supportMessage(await sendPetOwnerSupportChatMessage(body));
          setTeamMessages((current) => current.some((item) => item.id === sent.id) ? current : [...current, sent]);
        } catch (cause) {
          setMessage(body);
          notify(cause instanceof Error ? cause.message : "Pesan support belum terkirim");
        } finally { setLoading(false); }
        return;
      }
      realtimeSocket().emit(
        "chat:send",
        { conversationId, body },
        (result: { ok: boolean; error?: string }) => {
          if (!result?.ok)
            notify(result?.error ?? "Pesan realtime belum terkirim");
        },
      );
      return;
    }
    if (!owner) {
      window.dispatchEvent(new Event("slivadoc:login-required"));
      notify("Login diperlukan untuk menggunakan SlivaCare Assistant");
      return;
    }

    const nextHistory = [
      ...assistantMessages,
      { role: "user" as const, content: body },
    ];
    setAssistantMessages(nextHistory);
    setLoading(true);
    try {
      const result = await askSlivaCare({
        message: body,
        userId: owner?.id ?? "guest",
        pet: {
          name: pet.name,
          species: pet.type,
          breed: pet.breed,
          age: pet.age,
          weight: pet.weight,
        },
        history: assistantMessages.slice(-8),
      });
      setAssistantMessages((current) => [
        ...current,
        { role: "assistant", content: result.answer },
      ]);
      if (result.mode === "offline_dataset")
        notify(result.notice || "Jawaban memakai dataset pet lokal Slivadoc");
    } catch (cause) {
      const answer =
        cause instanceof Error
          ? cause.message
          : "SlivaCare belum dapat menjawab.";
      setAssistantMessages((current) => [
        ...current,
        { role: "assistant", content: answer },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const messages = mode === "assistant" ? assistantMessages : teamMessages;

  return (
    <div className="overlay" onMouseDown={onClose}>
      <aside
        className="drawer chat-drawer connected-chat"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="chat-header">
          <div className="doctor-avatar">
            {mode === "assistant" ? "✦" : "👩🏻‍⚕️"}
            <i />
          </div>
          <div>
            <h3>
              {supportMode ? "Slivadoc Support" : mode === "assistant" ? "SlivaCare Assistant" : "SlivaCare Team"}
            </h3>
            <p>
              {supportMode ? "Chat bantuan akun Slivadoc" : mode === "assistant"
                ? "AI khusus kebutuhan hewan"
                : connected
                  ? "Realtime • terhubung"
                  : "Menghubungkan percakapan..."}
            </p>
          </div>
          {!supportMode && <button
            className="video-call"
            type="button"
            onClick={() => {
              onClose();
              window.dispatchEvent(
                new CustomEvent("slivadoc:navigate", { detail: "consult" }),
              );
            }}
            aria-label="Buka konsultasi video"
          >
            <Icon name="video" size={18} />
          </button>}
          <button type="button" aria-label="Tutup chat" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        {!supportMode && <div className="chat-mode-tabs">
          <button
            type="button"
            className={mode === "assistant" ? "active" : ""}
            onClick={() => setMode("assistant")}
          >
            ✦ AI Assistant
          </button>
          <button
            type="button"
            className={mode === "care-team" ? "active" : ""}
            onClick={() => {
              if (!owner) {
                window.dispatchEvent(new Event("slivadoc:login-required"));
                return;
              }
              setMode("care-team");
            }}
          >
            💬 Care Team <i className={connected ? "online" : ""} />
          </button>
        </div>}
        <div className="chat-context">
          <span>{pet.avatar}</span>
          <p>
            <small>{supportMode ? "BANTUAN AKUN" : "KONSULTASI UNTUK"}</small>
            <b>
              {supportMode ? owner?.full_name : `${pet.name} • ${pet.breed}`}
            </b>
          </p>
          <span className="pet-only-badge">{supportMode ? "SUPPORT" : "PET ONLY"}</span>
        </div>
        <div className="chat-messages" ref={scrollRef}>
          <span className="chat-date">Hari ini</span>
          {mode === "assistant" && (
            <div className="assistant-scope">
              <Icon name="shield" size={15} /> SlivaCare menolak pertanyaan di
              luar topik hewan dan tidak menggantikan diagnosis dokter.
            </div>
          )}
          {messages.length === 0 && mode === "care-team" && (
            <div className="chat-empty">
              <span>💬</span>
              <b>Mulai percakapan realtime</b>
              <p>
                Percakapanmu tersimpan di akun Slivadoc dan tersinkron di semua perangkat.
              </p>
            </div>
          )}
          {messages.map((item, index) => {
            const isAssistant =
              "role" in item
                ? item.role === "assistant"
                : item.senderId !== owner?.id;
            const content = "content" in item ? item.content : item.body;
            return (
              <div
                className={`message ${isAssistant ? "doctor" : "me"}`}
                key={("id" in item && item.id) || `${content}-${index}`}
              >
                {isAssistant && (
                  <span>{mode === "assistant" ? "✦" : "👩🏻‍⚕️"}</span>
                )}
                <p>
                  {content}
                  <small>
                    {new Date().toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {!isAssistant && " ✓✓"}
                  </small>
                </p>
              </div>
            );
          })}
          {loading && (
            <div className="message doctor">
              <span>✦</span>
              <p className="typing">
                <i />
                <i />
                <i />
              </p>
            </div>
          )}
          {mode === "assistant" && (
            <div className="quick-replies">
              <button
                type="button"
                onClick={() =>
                  setMessage(
                    "Anjing saya muntah, apa yang perlu saya perhatikan?",
                  )
                }
              >
                🩺 Konsultasi gejala
              </button>
              <button
                type="button"
                onClick={() =>
                  setMessage(
                    "Apa jadwal vaksin yang perlu saya tanyakan ke dokter?",
                  )
                }
              >
                💉 Tanya vaksin
              </button>
              <button
                type="button"
                onClick={() => setMessage("Hewan saya sesak napas dan lemas")}
              >
                🚑 Darurat
              </button>
            </div>
          )}
        </div>
        <div className="chat-input">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && send()}
            placeholder={
              supportMode ? "Tulis pesan ke Slivadoc Support..." : mode === "assistant"
                ? "Tanya seputar hewan..."
                : "Tulis pesan ke care team..."
            }
          />
          <button type="button" aria-label="Kirim pesan" onClick={send} disabled={loading || !message.trim()}>
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </aside>
    </div>
  );
}
