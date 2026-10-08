"use client";
import { petOwnerIntlLocale } from "../../lib/petowner-locale";
import { LocalizedCopy, LocalizedButton, LocalizedInput } from "../LocalizedCopy";

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
            <LocalizedCopy>{mode === "assistant" ? "✦" : "👩🏻‍⚕️"}</LocalizedCopy>
            <i />
          </div>
          <div>
            <h3>
              <LocalizedCopy>{supportMode ? "Slivadoc Support" : mode === "assistant" ? "SlivaCare Assistant" : "SlivaCare Team"}</LocalizedCopy>
            </h3>
            <p>
              <LocalizedCopy>{supportMode ? "Chat bantuan akun Slivadoc" : mode === "assistant"
                ? "AI khusus kebutuhan hewan"
                : connected
                  ? "Realtime • terhubung"
                  : "Menghubungkan percakapan..."}</LocalizedCopy>
            </p>
          </div>
          <LocalizedCopy>{!supportMode && <LocalizedButton
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
          </LocalizedButton>}</LocalizedCopy>
          <LocalizedButton type="button" aria-label="Tutup chat" onClick={onClose}>
            <Icon name="close" />
          </LocalizedButton>
        </header>
        <LocalizedCopy>{!supportMode && <div className="chat-mode-tabs">
          <LocalizedButton
            type="button"
            className={mode === "assistant" ? "active" : ""}
            onClick={() => setMode("assistant")}
          ><LocalizedCopy>{"✦ AI Assistant"}</LocalizedCopy></LocalizedButton>
          <LocalizedButton
            type="button"
            className={mode === "care-team" ? "active" : ""}
            onClick={() => {
              if (!owner) {
                window.dispatchEvent(new Event("slivadoc:login-required"));
                return;
              }
              setMode("care-team");
            }}
          ><LocalizedCopy>{"💬 Care Team "}</LocalizedCopy><i className={connected ? "online" : ""} />
          </LocalizedButton>
        </div>}</LocalizedCopy>
        <div className="chat-context">
          <span><LocalizedCopy>{pet.avatar}</LocalizedCopy></span>
          <p>
            <small><LocalizedCopy>{supportMode ? "BANTUAN AKUN" : "KONSULTASI UNTUK"}</LocalizedCopy></small>
            <b>
              <LocalizedCopy>{supportMode ? owner?.full_name : `${pet.name} • ${pet.breed}`}</LocalizedCopy>
            </b>
          </p>
          <span className="pet-only-badge"><LocalizedCopy>{supportMode ? "SUPPORT" : "PET ONLY"}</LocalizedCopy></span>
        </div>
        <div className="chat-messages" ref={scrollRef}>
          <span className="chat-date"><LocalizedCopy>{"Hari ini"}</LocalizedCopy></span>
          <LocalizedCopy>{mode === "assistant" && (
            <div className="assistant-scope">
              <Icon name="shield" size={15} /><LocalizedCopy>{" SlivaCare menolak pertanyaan di luar topik hewan dan tidak menggantikan diagnosis dokter."}</LocalizedCopy></div>
          )}</LocalizedCopy>
          <LocalizedCopy>{messages.length === 0 && mode === "care-team" && (
            <div className="chat-empty">
              <span><LocalizedCopy>{"💬"}</LocalizedCopy></span>
              <b><LocalizedCopy>{"Mulai percakapan realtime"}</LocalizedCopy></b>
              <p><LocalizedCopy>{"Percakapanmu tersimpan di akun Slivadoc dan tersinkron di semua perangkat."}</LocalizedCopy></p>
            </div>
          )}</LocalizedCopy>
          <LocalizedCopy>{messages.map((item, index) => {
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
                <LocalizedCopy>{isAssistant && (
                  <span><LocalizedCopy>{mode === "assistant" ? "✦" : "👩🏻‍⚕️"}</LocalizedCopy></span>
                )}</LocalizedCopy>
                <p>
                  <LocalizedCopy>{content}</LocalizedCopy>
                  <small>
                    <LocalizedCopy>{new Date().toLocaleTimeString(petOwnerIntlLocale(), {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}</LocalizedCopy>
                    <LocalizedCopy>{!isAssistant && " ✓✓"}</LocalizedCopy>
                  </small>
                </p>
              </div>
            );
          })}</LocalizedCopy>
          <LocalizedCopy>{loading && (
            <div className="message doctor">
              <span><LocalizedCopy>{"✦"}</LocalizedCopy></span>
              <p className="typing">
                <i />
                <i />
                <i />
              </p>
            </div>
          )}</LocalizedCopy>
          <LocalizedCopy>{mode === "assistant" && (
            <div className="quick-replies">
              <LocalizedButton
                type="button"
                onClick={() =>
                  setMessage(
                    "Anjing saya muntah, apa yang perlu saya perhatikan?",
                  )
                }
              ><LocalizedCopy>{"🩺 Konsultasi gejala"}</LocalizedCopy></LocalizedButton>
              <LocalizedButton
                type="button"
                onClick={() =>
                  setMessage(
                    "Apa jadwal vaksin yang perlu saya tanyakan ke dokter?",
                  )
                }
              ><LocalizedCopy>{"💉 Tanya vaksin"}</LocalizedCopy></LocalizedButton>
              <LocalizedButton
                type="button"
                onClick={() => setMessage("Hewan saya sesak napas dan lemas")}
              ><LocalizedCopy>{"🚑 Darurat"}</LocalizedCopy></LocalizedButton>
            </div>
          )}</LocalizedCopy>
        </div>
        <div className="chat-input">
          <LocalizedInput
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && send()}
            placeholder={
              supportMode ? "Tulis pesan ke Slivadoc Support..." : mode === "assistant"
                ? "Tanya seputar hewan..."
                : "Tulis pesan ke care team..."
            }
          />
          <LocalizedButton type="button" aria-label="Kirim pesan" onClick={send} disabled={loading || !message.trim()}>
            <Icon name="arrow" size={18} />
          </LocalizedButton>
        </div>
      </aside>
    </div>
  );
}
