"use client";
import { petOwnerIntlLocale } from "../../lib/petowner-locale";
import { SlivaFilePicker } from "../SlivaFilePicker";
import { LocalizedCopy, LocalizedButton, LocalizedInput, LocalizedTextarea } from "../LocalizedCopy";

import { usePetOwnerFlow } from "../PetOwnerFlow";
import { SlivaSelect } from "../SlivaSelect";
import NextImage from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCommunityComment,
  createCommunityGroup,
  createCommunityGroupMessage,
  createCommunityPost,
  getCommunityComments,
  getCommunityGroupMembers,
  getCommunityGroupMessages,
  getCommunityGroups,
  getCommunityPosts,
  joinCommunityGroup,
  reactCommunityPost,
  updateCommunityGroupMember,
  type CommunityComment,
  type CommunityGroup,
  type CommunityGroupMember,
  type CommunityGroupMessage,
  type CommunityPost,
} from "../../lib/platform-api";
import { uploadImage } from "../../lib/petowner-api";
import { Icon } from "../Icon";
import { useDialogFocus } from "../useDialogFocus";

type Props = { notify: (message: string) => void; onOpenLocation: () => void };
const tabs = ["Untuk Kamu", "Mengikuti", "Grup Saya", "Adopsi", "Lost & Found"];
const categoryMap: Record<string, string> = {
  Cerita: "story",
  "Tanya Komunitas": "question",
  Tips: "tips",
  Adopsi: "adoption",
  "Lost & Found": "lost_found",
};

export default function CommunityExperience({ notify, onOpenLocation }: Props) {
  const { requireLogin, requirePet } = usePetOwnerFlow();
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
    if (!requirePet()) return;
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
    if (!requirePet()) return;
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
          <LocalizedCopy>{tabs.map((item) => (
            <LocalizedButton
              type="button"
              className={tab === item ? "active" : ""}
              key={item}
              onClick={() => setTab(item)}
            >
              <LocalizedCopy>{item}</LocalizedCopy>
              <LocalizedCopy>{item === "Lost & Found" && <i />}</LocalizedCopy>
            </LocalizedButton>
          ))}</LocalizedCopy>
        </div>
        <div className="community-tools-live">
          <label>
            <Icon name="search" size={17} />
            <LocalizedInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari posting atau pet parent…"
            />
          </label>
          <span>
            <i /><LocalizedCopy>{" Percakapan pet parent terbaru"}</LocalizedCopy></span>
        </div>
        <div className="create-post">
          <span className="avatar avatar-blue"><LocalizedCopy>{"YOU"}</LocalizedCopy></span>
          <LocalizedButton
            type="button"
            onClick={() => requirePet() && setComposer(true)}
          ><LocalizedCopy>{"Bagikan cerita atau pertanyaan tentang pet-mu…"}</LocalizedCopy></LocalizedButton>
          <LocalizedButton
            type="button"
            aria-label="Tambah foto"
            onClick={() => requirePet() && setComposer(true)}
          >
            <Icon name="camera" size={19} />
          </LocalizedButton>
        </div>
        <LocalizedCopy>{loading ? (
          <div className="empty-state">
            <span className="button-spinner" />
            <h3><LocalizedCopy>{"Memuat komunitas…"}</LocalizedCopy></h3>
          </div>
        ) : posts.length ? (
          posts.map((post) => (
            <article className="community-post" key={post.id}>
              <header>
                <span className="post-avatar">
                  <LocalizedCopy>{post.author_name.slice(0, 1)}</LocalizedCopy>
                </span>
                <div>
                  <b><LocalizedCopy preserve>{post.author_name}</LocalizedCopy></b>
                  <small>
                    <LocalizedCopy>{post.group_name || post.pet_name || "Slivadoc Community"}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                    <LocalizedCopy>{relativeTime(post.created_at)}</LocalizedCopy>
                  </small>
                </div>
                <span className="post-tag">
                  <LocalizedCopy>{post.category.replaceAll("_", " ")}</LocalizedCopy>
                </span>
              </header>
              <p><LocalizedCopy>{post.body}</LocalizedCopy></p>
              <LocalizedCopy>{post.image_url ? (
                <div className="community-photo">
                  <NextImage
                    src={post.image_url}
                    alt={`Posting oleh ${post.author_name}`}
                    width={960}
                    height={640}
                    unoptimized
                  />
                </div>
              ) : null}</LocalizedCopy>
              <LocalizedCopy>{post.location && (
                <div className="post-location">
                  <Icon name="map" size={14} />
                  <LocalizedCopy>{post.location}</LocalizedCopy>
                </div>
              )}</LocalizedCopy>
              <footer>
                <LocalizedButton
                  type="button"
                  className={post.liked ? "liked" : ""}
                  onClick={() => void like(post)}
                >
                  <Icon name="heart" size={18} />
                  <LocalizedCopy>{post.like_count}</LocalizedCopy>
                </LocalizedButton>
                <LocalizedButton
                  type="button"
                  onClick={() => requireLogin() && setComments(post)}
                >
                  <Icon name="chat" size={18} />
                  <LocalizedCopy>{post.comment_count}</LocalizedCopy><LocalizedCopy>{" komentar"}</LocalizedCopy></LocalizedButton>
                <LocalizedButton
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
                  <Icon name="arrow" size={18} /><LocalizedCopy>{"Bagikan"}</LocalizedCopy></LocalizedButton>
              </footer>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <span><LocalizedCopy>{"🐾"}</LocalizedCopy></span>
            <h3><LocalizedCopy>{"Belum ada posting pada filter ini"}</LocalizedCopy></h3>
            <p><LocalizedCopy>{"Coba kategori atau pencarian lain."}</LocalizedCopy></p>
          </div>
        )}</LocalizedCopy>
      </section>
      <aside className="right-stack community-side">
        <section className="panel compact-panel">
          <div className="panel-heading">
            <h3><LocalizedCopy>{"Grup komunitas"}</LocalizedCopy></h3>
            <LocalizedButton
              className="round-button"
              onClick={() => requirePet() && setGroupComposer(true)}
            >
              <Icon name="plus" size={16} />
            </LocalizedButton>
          </div>
          <LocalizedCopy>{groups.map((group) => (
            <div
              className={`group-row ${group.owner || group.joined ? "openable" : ""}`}
              key={group.id}
              onClick={() => {
                if (group.owner || group.joined) setGroupChat(group);
              }}
            >
              <span><LocalizedCopy>{group.category === "nutrition" ? "🍲" : "🐕"}</LocalizedCopy></span>
              <p>
                <b>
                  <LocalizedCopy>{group.name}</LocalizedCopy>
                  <LocalizedCopy>{group.owner && <em><LocalizedCopy>{"Grup kamu"}</LocalizedCopy></em>}</LocalizedCopy>
                </b>
                <small>
                  <LocalizedCopy>{group.member_count.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" anggota ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                  <LocalizedCopy>{group.city}</LocalizedCopy>
                </small>
              </p>
              <LocalizedCopy>{group.owner || group.joined ? (
                <LocalizedButton
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setGroupChat(group);
                  }}
                >
                  <Icon name="chat" size={14} /><LocalizedCopy>{" Buka"}</LocalizedCopy></LocalizedButton>
              ) : group.membership_status === "pending" ? (
                <LocalizedButton type="button" disabled><LocalizedCopy>{"Menunggu"}</LocalizedCopy></LocalizedButton>
              ) : (
                <LocalizedButton
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void join(group);
                  }}
                ><LocalizedCopy>{"Gabung"}</LocalizedCopy></LocalizedButton>
              )}</LocalizedCopy>
            </div>
          ))}</LocalizedCopy>
        </section>
        <section className="adoption-card">
          <span><LocalizedCopy>{"🐾"}</LocalizedCopy></span>
          <h3><LocalizedCopy>{"Buka rumah, ubah satu kehidupan."}</LocalizedCopy></h3>
          <p><LocalizedCopy>{"Gunakan tab Adopsi untuk melihat posting relevan."}</LocalizedCopy></p>
          <LocalizedButton type="button" onClick={() => setTab("Adopsi")}><LocalizedCopy>{"Lihat posting adopsi"}</LocalizedCopy></LocalizedButton>
        </section>
        <section className="panel compact-panel">
          <h3><LocalizedCopy>{"Komunitas di sekitar"}</LocalizedCopy></h3>
          <p className="muted-copy"><LocalizedCopy>{"Aktifkan lokasi untuk menemukan aktivitas yang relevan dengan area kamu."}</LocalizedCopy></p>
          <LocalizedButton
            className="full-soft-button"
            type="button"
            onClick={onOpenLocation}
          >
            <Icon name="map" size={16} /><LocalizedCopy>{"Atur lokasi"}</LocalizedCopy></LocalizedButton>
        </section>
      </aside>
      <LocalizedCopy>{composer && (
        <PostComposer
          close={() => setComposer(false)}
          notify={notify}
          created={() => void load()}
        />
      )}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
      <LocalizedCopy>{comments && (
        <CommentsSheet
          post={comments}
          close={() => setComments(null)}
          notify={notify}
          updated={() => void load()}
        />
      )}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
      <LocalizedCopy>{groupComposer && (
        <GroupComposer
          close={() => setGroupComposer(false)}
          notify={notify}
          created={() => void load()}
        />
      )}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
      <LocalizedCopy>{groupChat && (
        <GroupChat
          group={groupChat}
          close={() => setGroupChat(null)}
          notify={notify}
        />
      )}</LocalizedCopy>
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
        <LocalizedButton className="modal-close" onClick={close}>
          <Icon name="close" />
        </LocalizedButton>
        <span className="section-eyebrow"><LocalizedCopy>{"SLIVADOC COMMUNITY"}</LocalizedCopy></span>
        <h2><LocalizedCopy>{"Buat posting baru"}</LocalizedCopy></h2>
        <SlivaSelect aria-label="Kategori postingan" value={tag} onChange={(event) => setTag(event.target.value)}>
          {Object.keys(categoryMap).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </SlivaSelect>
        <LocalizedTextarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={3000}
          placeholder="Bagikan pengalaman, tips, atau pertanyaan…"
          autoFocus
        />
        <div className="composer-counter"><LocalizedCopy>{body.length}</LocalizedCopy><LocalizedCopy>{"/3000"}</LocalizedCopy></div>
        <LocalizedCopy>{preview && (
          <div className="composer-preview">
            <NextImage
              src={preview}
              alt="Preview"
              width={960}
              height={640}
              unoptimized
            />
            <LocalizedButton
              onClick={() => {
                setFile(null);
                setPreview("");
              }}
            >
              <Icon name="close" />
            </LocalizedButton>
          </div>
        )}</LocalizedCopy>
        <SlivaFilePicker
          ref={inputRef}
          hidden
          type="file"
          accept="image/*"
          onChange={(event) => selectFile(event.target.files?.[0])}
        />
        <label className="composer-location">
          <Icon name="map" />
          <LocalizedInput
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Lokasi (opsional)"
          />
        </label>
        <div className="composer-tools">
          <LocalizedButton onClick={() => inputRef.current?.click()}>
            <Icon name="camera" /><LocalizedCopy>{"Tambah foto"}</LocalizedCopy></LocalizedButton>
        </div>
        <footer>
          <LocalizedButton className="secondary-button" onClick={close}><LocalizedCopy>{"Batal"}</LocalizedCopy></LocalizedButton>
          <LocalizedButton
            className="primary-button"
            disabled={busy || body.trim().length < 3}
            onClick={() => void submit()}
          >
            <LocalizedCopy>{busy ? "Menerbitkan…" : "Terbitkan posting"}</LocalizedCopy>
          </LocalizedButton>
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
  const dialog = useDialogFocus<HTMLElement>(true, close);
  const [items, setItems] = useState<CommunityComment[]>([]);
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommunityComment | null>(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    void getCommunityComments(post.id)
      .then((response) => { if (active) setItems(response.data); })
      .catch((error) =>
        active && notify(
          error instanceof Error
            ? error.message
            : "Komentar belum dapat dimuat",
        ),
      )
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [notify, post.id]);
  async function send() {
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      const result = await createCommunityComment(post.id, text.trim(), replyingTo?.id);
      setItems((current) => [
        ...current,
        {
          id: result.id,
          user_id: "me",
          author_name: "Kamu",
          body: text.trim(),
          parent_id: replyingTo?.id,
          created_at: result.created_at,
        },
      ]);
      setText("");
      setReplyingTo(null);
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
        className="modal comments-modal comments-sheet community-comments-dialog"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-comments-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <LocalizedButton className="modal-close" onClick={close} aria-label="Tutup komentar">
          <Icon name="close" />
        </LocalizedButton>
        <header className="comments-head community-comments-head">
          <span className="section-eyebrow"><LocalizedCopy>{"DISKUSI KOMUNITAS"}</LocalizedCopy></span>
          <h2 id="community-comments-title"><LocalizedCopy>{items.length}</LocalizedCopy><LocalizedCopy>{" komentar"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{post.body}</LocalizedCopy></p>
        </header>
        <div className="comments-list community-comments-list" aria-busy={busy}>
          <LocalizedCopy>{busy && !items.length ? (
            <p><LocalizedCopy>{"Memuat komentar…"}</LocalizedCopy></p>
          ) : items.length ? (
            items.map((item) => {
              const parent = item.parent_id
                ? items.find((candidate) => candidate.id === item.parent_id)
                : undefined;
              return (
              <div key={item.id} className={`community-comment ${item.parent_id ? "comment-reply" : "comment-root"}`}>
                <span><LocalizedCopy>{item.author_name.slice(0, 1)}</LocalizedCopy></span>
                <p>
                  <LocalizedCopy>{parent && <mark><Icon name="arrow" size={11} /><LocalizedCopy>{" Membalas "}</LocalizedCopy><LocalizedCopy preserve>{parent.author_name}</LocalizedCopy></mark>}</LocalizedCopy>
                  <b><LocalizedCopy preserve>{item.author_name}</LocalizedCopy></b>
                  <small><LocalizedCopy>{item.body}</LocalizedCopy></small>
                  <em><LocalizedCopy>{relativeTime(item.created_at)}</LocalizedCopy> <LocalizedButton type="button" onClick={() => setReplyingTo(item)}><LocalizedCopy>{"Balas"}</LocalizedCopy></LocalizedButton></em>
                </p>
              </div>
            );})
          ) : (
            <div className="empty-state compact"><LocalizedCopy>{"Belum ada komentar."}</LocalizedCopy></div>
          )}</LocalizedCopy>
        </div>
        <LocalizedCopy>{replyingTo && <div className="comment-replying"><span><Icon name="arrow" size={12} /><LocalizedCopy>{" Membalas "}</LocalizedCopy><b><LocalizedCopy preserve>{replyingTo.author_name}</LocalizedCopy></b></span><LocalizedButton type="button" onClick={() => setReplyingTo(null)} aria-label="Batal membalas"><Icon name="close" size={14} /></LocalizedButton></div>}</LocalizedCopy>
        <form className="comment-input community-comment-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <LocalizedTextarea
            aria-label="Tulis komentar"
            rows={2}
            maxLength={2000}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={replyingTo ? `Balas ${replyingTo.author_name}…` : "Tulis komentar yang suportif…"}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <LocalizedButton type="submit" disabled={busy || !text.trim()} aria-label="Kirim komentar">
            <Icon name="arrow" size={17} /><LocalizedCopy>{busy ? "Mengirim…" : "Kirim"}</LocalizedCopy>
          </LocalizedButton>
        </form>
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
        <LocalizedButton className="modal-close" onClick={close}>
          <Icon name="close" />
        </LocalizedButton>
        <span className="section-eyebrow"><LocalizedCopy>{"GRUP PET OWNER"}</LocalizedCopy></span>
        <h2><LocalizedCopy>{"Buat komunitasmu"}</LocalizedCopy></h2>
        <p className="muted-copy"><LocalizedCopy>{"Sebagai pemilik, kamu langsung menjadi anggota dan dapat membuka ruang diskusi."}</LocalizedCopy></p>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span><LocalizedCopy>{"Nama grup"}</LocalizedCopy></span>
            <LocalizedInput name="name" minLength={3} required />
          </label>
          <label>
            <span><LocalizedCopy>{"Deskripsi"}</LocalizedCopy></span>
            <LocalizedTextarea name="description" minLength={10} rows={5} required />
          </label>
          <label>
            <span><LocalizedCopy>{"Kategori"}</LocalizedCopy></span>
            <SlivaSelect aria-label="Kategori" name="category" required>
              <option value="breed">Ras & karakter</option>
              <option value="health">Kesehatan</option>
              <option value="nutrition">Nutrisi</option>
              <option value="training">Training</option>
              <option value="rescue">Rescue & adopsi</option>
              <option value="local">Komunitas area</option>
              <option value="other">Lainnya</option>
            </SlivaSelect>
          </label>
          <label>
            <span><LocalizedCopy>{"Kota"}</LocalizedCopy></span>
            <LocalizedInput name="city" placeholder="Contoh: Bandung" />
          </label>
          <label>
            <span><LocalizedCopy>{"Visibilitas"}</LocalizedCopy></span>
            <SlivaSelect aria-label="Visibilitas" name="visibility">
              <option value="public">Publik · langsung bergabung</option>
              <option value="private">Privat · perlu persetujuan</option>
            </SlivaSelect>
          </label>
          <LocalizedButton className="primary-button full" disabled={busy}>
            <LocalizedCopy>{busy ? "Membuat…" : "Buat grup"}</LocalizedCopy>
          </LocalizedButton>
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
        <LocalizedButton className="modal-close" onClick={close}>
          <Icon name="close" />
        </LocalizedButton>
        <header>
          <span><LocalizedCopy>{group.category === "nutrition" ? "🍲" : "🐕"}</LocalizedCopy></span>
          <div>
            <small>
              <LocalizedCopy>{group.owner ? "GRUP MILIKMU" : "RUANG DISKUSI ANGGOTA"}</LocalizedCopy>
            </small>
            <h2><LocalizedCopy>{group.name}</LocalizedCopy></h2>
            <p>
              <LocalizedCopy>{group.member_count.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" anggota · percakapan terlindungi"}</LocalizedCopy></p>
          </div>
        </header>
        <LocalizedCopy>{group.owner && <GroupJoinRequests group={group} notify={notify} />}</LocalizedCopy>
        <div className="group-chat-notice">
          <Icon name="shield" size={15} /><LocalizedCopy>{" Nomor telepon, akun media sosial, email, dan tautan tidak dapat dibagikan untuk menjaga privasi anggota."}</LocalizedCopy></div>
        <div className="group-chat-messages">
          <LocalizedCopy>{busy && !items.length ? (
            <p><LocalizedCopy>{"Memuat percakapan…"}</LocalizedCopy></p>
          ) : items.length ? (
            items.map((item) => (
              <article className={item.mine ? "mine" : ""} key={item.id}>
                <b><LocalizedCopy>{item.mine ? "Kamu" : item.sender_name}</LocalizedCopy></b>
                <p><LocalizedCopy>{item.body}</LocalizedCopy></p>
                <time><LocalizedCopy>{relativeTime(item.created_at)}</LocalizedCopy></time>
              </article>
            ))
          ) : (
            <div className="empty-state compact"><LocalizedCopy>{"Belum ada pesan. Mulai diskusi yang hangat dan bermanfaat."}</LocalizedCopy></div>
          )}</LocalizedCopy>
        </div>
        <footer>
          <LocalizedInput
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void send()}
            placeholder="Tulis pesan untuk anggota…"
          />
          <LocalizedButton
            type="button"
            disabled={busy || !text.trim()}
            onClick={() => void send()}
          >
            <Icon name="arrow" />
          </LocalizedButton>
        </footer>
      </section>
    </div>
  );
}

function GroupJoinRequests({
  group,
  notify,
}: {
  group: CommunityGroup;
  notify: (message: string) => void;
}) {
  const [pending, setPending] = useState<CommunityGroupMember[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setPending((await getCommunityGroupMembers(group.id, "pending")).data);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Permintaan bergabung belum dapat dimuat",
      );
    }
  }, [group.id, notify]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function decide(member: CommunityGroupMember, status: "active" | "blocked") {
    setBusy(true);
    try {
      await updateCommunityGroupMember(group.id, member.user_id, status);
      notify(
        status === "active"
          ? `${member.full_name} disetujui bergabung`
          : `Permintaan ${member.full_name} ditolak`,
      );
      await load();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Permintaan belum dapat diproses",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!pending.length) return null;
  return (
    <section className="group-join-requests">
      <b><LocalizedCopy>{"Permintaan bergabung ("}</LocalizedCopy><LocalizedCopy>{pending.length}</LocalizedCopy><LocalizedCopy>{")"}</LocalizedCopy></b>
      <LocalizedCopy>{pending.map((member) => (
        <div key={member.user_id}>
          <span><LocalizedCopy preserve>{member.full_name}</LocalizedCopy></span>
          <LocalizedButton type="button" disabled={busy} onClick={() => void decide(member, "active")}><LocalizedCopy>{"Setujui"}</LocalizedCopy></LocalizedButton>
          <LocalizedButton type="button" disabled={busy} onClick={() => void decide(member, "blocked")}><LocalizedCopy>{"Tolak"}</LocalizedCopy></LocalizedButton>
        </div>
      ))}</LocalizedCopy>
    </section>
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
