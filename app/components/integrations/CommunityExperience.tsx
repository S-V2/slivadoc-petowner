"use client";

import NextImage from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCommunityComment,
  createCommunityGroup,
  createCommunityGroupMessage,
  createCommunityPost,
  getCommunityComments,
  getCommunityGroupMessages,
  getCommunityGroups,
  getCommunityPosts,
  isPetOwnerAuthenticated,
  joinCommunityGroup,
  reactCommunityPost,
  type CommunityComment,
  type CommunityGroup,
  type CommunityGroupMessage,
  type CommunityPost,
} from "../../lib/platform-api";
import { uploadImage } from "../../lib/petowner-api";
import { Icon } from "../Icon";

type Props = { notify: (message: string) => void; onOpenLocation: () => void };
const tabs = ["Untuk Kamu", "Mengikuti", "Grup Saya", "Adopsi", "Lost & Found"];
const categoryMap: Record<string, string> = {
  Cerita: "story",
  "Tanya Komunitas": "question",
  Tips: "tips",
  Adopsi: "adoption",
  "Lost & Found": "lost_found",
};
function requireLogin() {
  if (isPetOwnerAuthenticated()) return true;
  window.dispatchEvent(new CustomEvent("slivadoc:login-required"));
  return false;
}

export default function CommunityExperience({ notify, onOpenLocation }: Props) {
  const [tab, setTab] = useState("Untuk Kamu");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState(false);
  const [comments, setComments] = useState<CommunityPost | null>(null);
  const [groupComposer, setGroupComposer] = useState(false);
  const [groupChat, setGroupChat] = useState<CommunityGroup | null>(null);
  const [query, setQuery] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postResponse, groupResponse] = await Promise.all([
        getCommunityPosts({ tab, search: query }),
        getCommunityGroups(query),
      ]);
      setPosts(postResponse.data);
      setGroups(groupResponse.data);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Komunitas belum dapat dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, [notify, query, tab]);
  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void load();
      },
      query ? 280 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [load, query]);
  async function like(post: CommunityPost) {
    if (!requireLogin()) return;
    try {
      const result = await reactCommunityPost(post.id);
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, liked: result.liked, like_count: result.like_count }
            : item,
        ),
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Reaksi belum dapat disimpan",
      );
    }
  }
  async function join(group: CommunityGroup) {
    if (!requireLogin()) return;
    try {
      const result = await joinCommunityGroup(group.id);
      setGroups((current) =>
        current.map((item) =>
          item.id === group.id
            ? {
                ...item,
                joined: result.joined,
                membership_status: result.joined ? "active" : "pending",
                member_count: item.member_count + (result.joined ? 1 : 0),
              }
            : item,
        ),
      );
      notify(result.message);
      if (result.joined)
        setGroupChat({ ...group, joined: true, membership_status: "active" });
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Grup belum dapat diikuti",
      );
    }
  }
  return (
    <div className="community-layout">
      <section>
        <div className="community-tabs">
          {tabs.map((item) => (
            <button
              type="button"
              className={tab === item ? "active" : ""}
              key={item}
              onClick={() => setTab(item)}
            >
              {item}
              {item === "Lost & Found" && <i />}
            </button>
          ))}
        </div>
        <div className="community-tools-live">
          <label>
            <Icon name="search" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari posting atau pet parent…"
            />
          </label>
          <span>
            <i /> Percakapan pet parent terbaru
          </span>
        </div>
        <div className="create-post">
          <span className="avatar avatar-blue">YOU</span>
          <button
            type="button"
            onClick={() => requireLogin() && setComposer(true)}
          >
            Bagikan cerita atau pertanyaan tentang pet-mu…
          </button>
          <button
            type="button"
            aria-label="Tambah foto"
            onClick={() => requireLogin() && setComposer(true)}
          >
            <Icon name="camera" size={19} />
          </button>
        </div>
        {loading ? (
          <div className="empty-state">
            <span className="button-spinner" />
            <h3>Memuat komunitas…</h3>
          </div>
        ) : posts.length ? (
          posts.map((post) => (
            <article className="community-post" key={post.id}>
              <header>
                <span className="post-avatar">
                  {post.author_name.slice(0, 1)}
                </span>
                <div>
                  <b>{post.author_name}</b>
                  <small>
                    {post.group_name || post.pet_name || "Slivadoc Community"} ·{" "}
                    {relativeTime(post.created_at)}
                  </small>
                </div>
                <span className="post-tag">
                  {post.category.replaceAll("_", " ")}
                </span>
                <button
                  type="button"
                  onClick={() => notify("Pilihan moderasi posting dibuka")}
                >
                  <Icon name="more" />
                </button>
              </header>
              <p>{post.body}</p>
              {post.image_url ? (
                <div className="community-photo">
                  <NextImage
                    src={post.image_url}
                    alt={`Posting oleh ${post.author_name}`}
                    width={960}
                    height={640}
                    unoptimized
                  />
                </div>
              ) : null}
              {post.location && (
                <div className="post-location">
                  <Icon name="map" size={14} />
                  {post.location}
                </div>
              )}
              <footer>
                <button
                  type="button"
                  className={post.liked ? "liked" : ""}
                  onClick={() => void like(post)}
                >
                  <Icon name="heart" size={18} />
                  {post.like_count}
                </button>
                <button
                  type="button"
                  onClick={() => requireLogin() && setComments(post)}
                >
                  <Icon name="chat" size={18} />
                  {post.comment_count} komentar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigator.share
                      ? navigator.share({
                          title: "Slivadoc Community",
                          text: post.body,
                        })
                      : navigator.clipboard
                          .writeText(post.body)
                          .then(() => notify("Posting disalin"))
                  }
                >
                  <Icon name="arrow" size={18} />
                  Bagikan
                </button>
              </footer>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <span>🐾</span>
            <h3>Belum ada posting pada filter ini</h3>
            <p>Coba kategori atau pencarian lain.</p>
          </div>
        )}
      </section>
      <aside className="right-stack community-side">
        <section className="panel compact-panel">
          <div className="panel-heading">
            <h3>Grup komunitas</h3>
            <button
              className="round-button"
              onClick={() => requireLogin() && setGroupComposer(true)}
            >
              <Icon name="plus" size={16} />
            </button>
          </div>
          {groups.map((group) => (
            <div
              className={`group-row ${group.owner || group.joined ? "openable" : ""}`}
              key={group.id}
              onClick={() => {
                if (group.owner || group.joined) setGroupChat(group);
              }}
            >
              <span>{group.category === "nutrition" ? "🍲" : "🐕"}</span>
              <p>
                <b>
                  {group.name}
                  {group.owner && <em>Grup kamu</em>}
                </b>
                <small>
                  {group.member_count.toLocaleString("id-ID")} anggota ·{" "}
                  {group.city}
                </small>
              </p>
              {group.owner || group.joined ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setGroupChat(group);
                  }}
                >
                  <Icon name="chat" size={14} /> Buka
                </button>
              ) : group.membership_status === "pending" ? (
                <button type="button" disabled>
                  Menunggu
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void join(group);
                  }}
                >
                  Gabung
                </button>
              )}
            </div>
          ))}
        </section>
        <section className="adoption-card">
          <span>🐾</span>
          <h3>Buka rumah, ubah satu kehidupan.</h3>
          <p>Gunakan tab Adopsi untuk melihat posting relevan.</p>
          <button type="button" onClick={() => setTab("Adopsi")}>
            Lihat posting adopsi
          </button>
        </section>
        <section className="panel compact-panel">
          <h3>Komunitas di sekitar</h3>
          <p className="muted-copy">
            Aktifkan lokasi untuk menemukan aktivitas yang relevan dengan area
            kamu.
          </p>
          <button
            className="full-soft-button"
            type="button"
            onClick={onOpenLocation}
          >
            <Icon name="map" size={16} />
            Atur lokasi
          </button>
        </section>
      </aside>
      {composer && (
        <PostComposer
          close={() => setComposer(false)}
          notify={notify}
          created={() => void load()}
        />
      )}{" "}
      {comments && (
        <CommentsSheet
          post={comments}
          close={() => setComments(null)}
          notify={notify}
          updated={() => void load()}
        />
      )}{" "}
      {groupComposer && (
        <GroupComposer
          close={() => setGroupComposer(false)}
          notify={notify}
          created={() => void load()}
        />
      )}{" "}
      {groupChat && (
        <GroupChat
          group={groupChat}
          close={() => setGroupChat(null)}
          notify={notify}
        />
      )}
    </div>
  );
}

function PostComposer({
  close,
  notify,
  created,
}: {
  close: () => void;
  notify: (message: string) => void;
  created: () => void;
}) {
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("Cerita");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  function selectFile(value?: File) {
    if (!value) return;
    if (value.size > 8 * 1024 * 1024) return notify("Foto maksimal 8 MB");
    setFile(value);
    setPreview(URL.createObjectURL(value));
  }
  async function submit() {
    if (body.trim().length < 3) return;
    setBusy(true);
    try {
      let image = "";
      if (file) image = (await uploadImage(file, "community")).url;
      await createCommunityPost({
        body: body.trim(),
        category: categoryMap[tag],
        image_url: image,
        location: location.trim(),
      });
      notify("Posting berhasil diterbitkan");
      created();
      close();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Posting belum dapat diterbitkan",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal community-composer"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          <Icon name="close" />
        </button>
        <span className="section-eyebrow">SLIVADOC COMMUNITY</span>
        <h2>Buat posting baru</h2>
        <select value={tag} onChange={(event) => setTag(event.target.value)}>
          {Object.keys(categoryMap).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={3000}
          placeholder="Bagikan pengalaman, tips, atau pertanyaan…"
          autoFocus
        />
        <div className="composer-counter">{body.length}/3000</div>
        {preview && (
          <div className="composer-preview">
            <NextImage
              src={preview}
              alt="Preview"
              width={960}
              height={640}
              unoptimized
            />
            <button
              onClick={() => {
                setFile(null);
                setPreview("");
              }}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="image/*"
          onChange={(event) => selectFile(event.target.files?.[0])}
        />
        <label className="composer-location">
          <Icon name="map" />
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Lokasi (opsional)"
          />
        </label>
        <div className="composer-tools">
          <button onClick={() => inputRef.current?.click()}>
            <Icon name="camera" />
            Tambah foto
          </button>
        </div>
        <footer>
          <button className="secondary-button" onClick={close}>
            Batal
          </button>
          <button
            className="primary-button"
            disabled={busy || body.trim().length < 3}
            onClick={() => void submit()}
          >
            {busy ? "Menerbitkan…" : "Terbitkan posting"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function CommentsSheet({
  post,
  close,
  notify,
  updated,
}: {
  post: CommunityPost;
  close: () => void;
  notify: (message: string) => void;
  updated: () => void;
}) {
  const [items, setItems] = useState<CommunityComment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    void getCommunityComments(post.id)
      .then((response) => setItems(response.data))
      .catch((error) =>
        notify(
          error instanceof Error
            ? error.message
            : "Komentar belum dapat dimuat",
        ),
      )
      .finally(() => setBusy(false));
  }, [notify, post.id]);
  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const result = await createCommunityComment(post.id, text.trim());
      setItems((current) => [
        ...current,
        {
          id: result.id,
          user_id: "me",
          author_name: "Kamu",
          body: text.trim(),
          created_at: result.created_at,
        },
      ]);
      setText("");
      updated();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Komentar belum dapat dikirim",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay comment-sheet-backdrop" onMouseDown={close}>
      <section
        className="modal comments-modal comments-sheet"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          <Icon name="close" />
        </button>
        <header>
          <span className="section-eyebrow">DISKUSI KOMUNITAS</span>
          <h2>{items.length} komentar</h2>
          <p>{post.body}</p>
        </header>
        <div className="comments-list">
          {busy && !items.length ? (
            <p>Memuat komentar…</p>
          ) : items.length ? (
            items.map((item) => (
              <div key={item.id}>
                <span>{item.author_name.slice(0, 1)}</span>
                <p>
                  <b>{item.author_name}</b>
                  <small>{item.body}</small>
                  <em>{relativeTime(item.created_at)}</em>
                </p>
              </div>
            ))
          ) : (
            <div className="empty-state compact">Belum ada komentar.</div>
          )}
        </div>
        <footer className="comment-input">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Tulis komentar yang suportif…"
            onKeyDown={(event) => event.key === "Enter" && void send()}
          />
          <button disabled={busy || !text.trim()} onClick={() => void send()}>
            <Icon name="arrow" />
          </button>
        </footer>
      </section>
    </div>
  );
}

function GroupComposer({
  close,
  notify,
  created,
}: {
  close: () => void;
  notify: (message: string) => void;
  created: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await createCommunityGroup({
        name: values.name,
        description: values.description,
        category: values.category,
        city: values.city,
        visibility: values.visibility,
      });
      notify("Grup berhasil dibuat dan otomatis masuk ke Grup Saya");
      created();
      close();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Grup belum dapat dibuat",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal form-modal group-composer-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          <Icon name="close" />
        </button>
        <span className="section-eyebrow">GRUP PET OWNER</span>
        <h2>Buat komunitasmu</h2>
        <p className="muted-copy">
          Sebagai pemilik, kamu langsung menjadi anggota dan dapat membuka ruang
          diskusi.
        </p>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span>Nama grup</span>
            <input name="name" minLength={3} required />
          </label>
          <label>
            <span>Deskripsi</span>
            <textarea name="description" minLength={10} rows={5} required />
          </label>
          <label>
            <span>Kategori</span>
            <select name="category" required>
              <option value="breed">Ras & karakter</option>
              <option value="health">Kesehatan</option>
              <option value="nutrition">Nutrisi</option>
              <option value="training">Training</option>
              <option value="rescue">Rescue & adopsi</option>
              <option value="local">Komunitas area</option>
              <option value="other">Lainnya</option>
            </select>
          </label>
          <label>
            <span>Kota</span>
            <input name="city" placeholder="Contoh: Bandung" />
          </label>
          <label>
            <span>Visibilitas</span>
            <select name="visibility">
              <option value="public">Publik · langsung bergabung</option>
              <option value="private">Privat · perlu persetujuan</option>
            </select>
          </label>
          <button className="primary-button full" disabled={busy}>
            {busy ? "Membuat…" : "Buat grup"}
          </button>
        </form>
      </section>
    </div>
  );
}

function GroupChat({
  group,
  close,
  notify,
}: {
  group: CommunityGroup;
  close: () => void;
  notify: (message: string) => void;
}) {
  const [items, setItems] = useState<CommunityGroupMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    try {
      setItems((await getCommunityGroupMessages(group.id)).data);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Percakapan belum dapat dimuat",
      );
    } finally {
      setBusy(false);
    }
  }, [group.id, notify]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await createCommunityGroupMessage(group.id, text.trim());
      setText("");
      await load();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Pesan belum dapat dikirim",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay group-chat-backdrop" onMouseDown={close}>
      <section
        className="modal group-chat-sheet"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          <Icon name="close" />
        </button>
        <header>
          <span>{group.category === "nutrition" ? "🍲" : "🐕"}</span>
          <div>
            <small>
              {group.owner ? "GRUP MILIKMU" : "RUANG DISKUSI ANGGOTA"}
            </small>
            <h2>{group.name}</h2>
            <p>
              {group.member_count.toLocaleString("id-ID")} anggota · percakapan
              terlindungi
            </p>
          </div>
        </header>
        <div className="group-chat-notice">
          <Icon name="shield" size={15} /> Nomor telepon, akun media sosial,
          email, dan tautan tidak dapat dibagikan untuk menjaga privasi anggota.
        </div>
        <div className="group-chat-messages">
          {busy && !items.length ? (
            <p>Memuat percakapan…</p>
          ) : items.length ? (
            items.map((item) => (
              <article className={item.mine ? "mine" : ""} key={item.id}>
                <b>{item.mine ? "Kamu" : item.sender_name}</b>
                <p>{item.body}</p>
                <time>{relativeTime(item.created_at)}</time>
              </article>
            ))
          ) : (
            <div className="empty-state compact">
              Belum ada pesan. Mulai diskusi yang hangat dan bermanfaat.
            </div>
          )}
        </div>
        <footer>
          <input
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void send()}
            placeholder="Tulis pesan untuk anggota…"
          />
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={() => void send()}
          >
            <Icon name="arrow" />
          </button>
        </footer>
      </section>
    </div>
  );
}

function relativeTime(value: string) {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60000),
  );
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} jam`;
  return `${Math.floor(minutes / 1440)} hari`;
}
