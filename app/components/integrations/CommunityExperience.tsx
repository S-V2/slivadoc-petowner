"use client";

import { useEffect, useRef, useState } from "react";
import { communityPosts as fallbackPosts } from "../../data/mock";
import { addCommunityComment, createCommunityPost, getCommunityPosts, realtimeSocket, toggleCommunityLike, uploadImage, type CommunityPost } from "../../lib/petowner-api";
import { Icon } from "../Icon";

type Props = { notify: (message: string) => void; onOpenLocation: () => void };

const fallback: CommunityPost[] = fallbackPosts.map((post, index) => ({
  id: post.id,
  author: post.author,
  petName: post.pet,
  body: post.body,
  tag: post.tag,
  likes: post.likes,
  likedBy: [],
  comments: Array.from({ length: Math.min(post.comments, 2) }, (_, commentIndex) => ({ id: `fallback-${index}-${commentIndex}`, author: "Pet Parent", body: "Terima kasih sudah berbagi!", createdAt: new Date().toISOString() })),
  createdAt: new Date(Date.now() - index * 3_600_000).toISOString(),
}));

export default function CommunityExperience({ notify, onOpenLocation }: Props) {
  const [tab, setTab] = useState("Untuk Kamu");
  const [posts, setPosts] = useState<CommunityPost[]>(fallback);
  const [composerOpen, setComposerOpen] = useState(false);
  const [activePost, setActivePost] = useState<CommunityPost | null>(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    getCommunityPosts().then((items) => { if (items.length) setPosts(items); }).catch(() => undefined);
    const socket = realtimeSocket();
    const join = () => { setOnline(true); socket.emit("community:join"); };
    const disconnect = () => setOnline(false);
    const addPost = (post: CommunityPost) => setPosts((current) => current.some((item) => item.id === post.id) ? current : [post, ...current]);
    const updatePost = (post: CommunityPost) => setPosts((current) => current.map((item) => item.id === post.id ? post : item));
    socket.on("connect", join);
    socket.on("disconnect", disconnect);
    socket.on("community:new-post", addPost);
    socket.on("community:update", updatePost);
    socket.connect();
    if (socket.connected) join();
    return () => {
      socket.off("connect", join);
      socket.off("disconnect", disconnect);
      socket.off("community:new-post", addPost);
      socket.off("community:update", updatePost);
    };
  }, []);

  const like = async (post: CommunityPost) => {
    const isLiked = post.likedBy?.includes("petowner-evans");
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likes: Math.max(0, item.likes + (isLiked ? -1 : 1)), likedBy: isLiked ? item.likedBy?.filter((id) => id !== "petowner-evans") : [...(item.likedBy ?? []), "petowner-evans"] } : item));
    try {
      const updated = await toggleCommunityLike(post.id, "petowner-evans");
      setPosts((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch {
      notify("Like tersimpan lokal; jalankan Pet Owner API untuk sinkronisasi realtime");
    }
  };

  return (
    <div className="community-layout">
      <section>
        <div className="community-tabs">{["Untuk Kamu", "Mengikuti", "Grup Saya", "Adopsi", "Lost & Found"].map((item) => <button type="button" className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}{item === "Lost & Found" && <i />}</button>)}</div>
        <div className="community-live-status"><span className={online ? "online" : ""} />{online ? "Komunitas realtime aktif" : "Mode lokal — jalankan Pet Owner API untuk realtime"}</div>
        <div className="create-post"><span className="avatar avatar-blue">EM</span><button type="button" onClick={() => setComposerOpen(true)}>Bagikan cerita tentang Milo dan Luna...</button><button type="button" aria-label="Tambah foto" onClick={() => setComposerOpen(true)}><Icon name="camera" size={19} /></button></div>
        {posts.map((post) => <article className="community-post" key={post.id}><header><span className="post-avatar">{post.author.slice(0, 1)}</span><div><b>{post.author}</b><small>{post.petName || "Slivadoc Community"} • {relativeTime(post.createdAt)}</small></div><span className="post-tag">{post.tag}</span><button type="button" onClick={() => notify("Laporkan, simpan, atau sembunyikan posting") }><Icon name="more" /></button></header><p>{post.body}</p>{post.imageUrl ? <div className="community-photo"><img src={post.imageUrl} alt={`Posting oleh ${post.author}`} /></div> : <div className="post-visual"><span>{post.petName ? "🐾" : "🐕"}</span><i>SLIVADOC COMMUNITY</i></div>} {post.location && <div className="post-location"><Icon name="map" size={14} /> {post.location}</div>}<footer><button type="button" className={post.likedBy?.includes("petowner-evans") ? "liked" : ""} onClick={() => like(post)}><Icon name="heart" size={18} /> {post.likes}</button><button type="button" onClick={() => setActivePost(post)}><Icon name="chat" size={18} /> {post.comments?.length ?? 0} komentar</button><button type="button" onClick={() => navigator.share ? navigator.share({ title: "Slivadoc Community", text: post.body }) : navigator.clipboard.writeText(post.body).then(() => notify("Teks posting disalin"))}><Icon name="arrow" size={18} /> Bagikan</button></footer></article>)}
      </section>
      <aside className="right-stack community-side"><section className="panel compact-panel"><div className="panel-heading"><h3>Grup untukmu</h3><button className="link-button" type="button" onClick={() => setTab("Grup Saya")}>Lihat semua</button></div><CommunityGroup emoji="🐕" name="Golden Retriever Jakarta" members="12,8rb anggota" notify={notify} /><CommunityGroup emoji="🍲" name="Healthy Homemade Pet Food" members="8,4rb anggota" notify={notify} /><CommunityGroup emoji="🏥" name="Tanya Dokter Hewan" members="21,2rb anggota" notify={notify} /></section><section className="adoption-card"><span>🐾</span><h3>Buka rumah, ubah satu kehidupan.</h3><p>Temukan hewan terverifikasi yang siap menjadi bagian keluargamu.</p><button type="button" onClick={() => setTab("Adopsi")}>Jelajahi adopsi</button></section><section className="panel compact-panel"><div className="panel-heading"><h3>Pet parent terdekat</h3><span className="live-dot" /></div><div className="nearby-avatars"><span>👩🏻</span><span>👨🏻</span><span>👩🏽</span><span>👨🏼</span><span>+42</span></div><p className="muted-copy">42 pet parent aktif dalam radius 3 km.</p><button className="full-soft-button" type="button" onClick={onOpenLocation}><Icon name="map" size={16} /> Lihat di peta</button></section></aside>
      {composerOpen && <CommunityComposer onClose={() => setComposerOpen(false)} onCreated={(post) => { setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]); setComposerOpen(false); }} notify={notify} />}
      {activePost && <CommentModal post={posts.find((item) => item.id === activePost.id) ?? activePost} onClose={() => setActivePost(null)} onUpdated={(post) => setPosts((current) => current.map((item) => item.id === post.id ? post : item))} notify={notify} />}
    </div>
  );
}

function CommunityComposer({ onClose, onCreated, notify }: { onClose: () => void; onCreated: (post: CommunityPost) => void; notify: (message: string) => void }) {
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("Cerita");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFile = (selected?: File) => {
    if (!selected) return;
    if (selected.size > 8 * 1024 * 1024) return notify("Ukuran foto maksimal 8 MB");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const submit = async () => {
    if (body.trim().length < 3) return;
    setLoading(true);
    try {
      let imageUrl: string | undefined;
      if (file) imageUrl = (await uploadImage(file, "community")).url;
      const post = await createCommunityPost({ author: "Evans Moris", petName: "Milo & Luna", body: body.trim(), tag, imageUrl, location: location.trim() || undefined });
      onCreated(post);
      notify("Posting berhasil diterbitkan ke komunitas");
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Posting belum dapat disimpan");
    } finally { setLoading(false); }
  };

  return <div className="modal-overlay" onMouseDown={onClose}><div className="modal community-composer" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="section-eyebrow">SLIVADOC COMMUNITY</span><h2>Buat posting baru</h2><p>Berbagi pengalaman, bertanya, atau membantu pet parent lain.</p></div><button className="modal-close" type="button" onClick={onClose}><Icon name="close" /></button></header><div className="composer-author"><span className="avatar avatar-blue">EM</span><div><b>Evans Moris</b><small>Posting sebagai pet parent</small></div><select value={tag} onChange={(event) => setTag(event.target.value)}><option>Cerita</option><option>Tanya Komunitas</option><option>Tips</option><option>Adopsi</option><option>Lost & Found</option></select></div><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Apa yang ingin kamu bagikan tentang hewanmu?" maxLength={3000} autoFocus /><div className="composer-counter">{body.length}/3000</div>{preview && <div className="composer-preview"><img src={preview} alt="Preview posting" /><button type="button" onClick={() => { setFile(null); setPreview(""); }}><Icon name="close" size={15} /></button></div>}<input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectFile(event.target.files?.[0])} /><label className="composer-location"><Icon name="map" size={17} /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Tambahkan lokasi (opsional)" /></label><div className="composer-tools"><button type="button" onClick={() => inputRef.current?.click()}><Icon name="camera" size={17} /> Foto Cloudinary</button><button type="button" onClick={() => setTag("Tanya Komunitas")}>💬 Tanya</button><button type="button" onClick={() => setTag("Lost & Found")}>📍 Lost Pet</button></div><footer><button className="secondary-button" type="button" onClick={onClose}>Batal</button><button className="primary-button" type="button" disabled={loading || body.trim().length < 3} onClick={submit}>{loading ? "Menerbitkan..." : "Terbitkan posting"}</button></footer></div></div>;
}

function CommentModal({ post, onClose, onUpdated, notify }: { post: CommunityPost; onClose: () => void; onUpdated: (post: CommunityPost) => void; notify: (message: string) => void }) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!body.trim()) return;
    setLoading(true);
    try { const updated = await addCommunityComment(post.id, "Evans Moris", body.trim()); onUpdated(updated); setBody(""); }
    catch (cause) { notify(cause instanceof Error ? cause.message : "Komentar gagal dikirim"); }
    finally { setLoading(false); }
  };
  return <div className="modal-overlay" onMouseDown={onClose}><div className="modal comments-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="section-eyebrow">DISKUSI KOMUNITAS</span><h2>{post.comments?.length ?? 0} komentar</h2></div><button className="modal-close" type="button" onClick={onClose}><Icon name="close" /></button></header><div className="comment-source"><b>{post.author}</b><p>{post.body}</p></div><div className="comments-list">{(post.comments ?? []).map((comment) => <div key={comment.id}><span>{comment.author.slice(0, 1)}</span><p><b>{comment.author}</b><small>{comment.body}</small><em>{relativeTime(comment.createdAt)}</em></p></div>)}{!post.comments?.length && <div className="empty-state compact"><span>💬</span><h3>Belum ada komentar</h3><p>Jadilah yang pertama merespons.</p></div>}</div><div className="comment-input"><input value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submit()} placeholder="Tulis komentar yang suportif..." /><button type="button" onClick={submit} disabled={loading || !body.trim()}><Icon name="arrow" size={17} /></button></div></div></div>;
}

function CommunityGroup({ emoji, name, members, notify }: { emoji: string; name: string; members: string; notify: (message: string) => void }) {
  const [joined, setJoined] = useState(false);
  return <div className="group-row"><span>{emoji}</span><p><b>{name}</b><small>{members}</small></p><button type="button" className={joined ? "joined" : ""} onClick={() => { setJoined((value) => !value); notify(joined ? `Keluar dari ${name}` : `Berhasil bergabung ke ${name}`); }}>{joined ? "Tergabung" : "Gabung"}</button></div>;
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} jam`;
  return `${Math.floor(minutes / 1440)} hari`;
}
