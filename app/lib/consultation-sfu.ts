// Keep in sync with the other app's consultation-sfu.ts

export type RemoteTrackRef = { sessionId: string; trackName: string; kind?: string };

export type ConsultationMedia = {
  sessionId: string;
  pull(tracks: RemoteTrackRef[]): Promise<void>;
  setMuted(muted: boolean): void;
  stop(): void;
};

type SessionDescription = { sdp: string; type: RTCSdpType };

type TracksResponse = {
  sessionDescription?: SessionDescription;
  requiresImmediateRenegotiation?: boolean;
  tracks?: { mid?: string; trackName?: string }[];
  error?: string;
};

type SessionResponse = {
  sessionId?: string;
  remoteTracks?: RemoteTrackRef[];
  error?: string;
};

async function mediaJson<T extends { error?: string }>(
  url: string,
  accessToken: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    throw new Error(
      payload.error === "cloudflare_realtime_not_configured"
        ? "Cloudflare Realtime belum dikonfigurasi."
        : "Akses media konsultasi ditolak.",
    );
  }
  return payload;
}

function waitForIceConnected(pc: RTCPeerConnection, timeoutMs: number, signal: AbortSignal): Promise<void> {
  if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") return Promise.resolve();
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const fail = () => {
    cleanup();
    reject(new Error("Koneksi media gagal."));
  };
  const onState = () => {
    if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
      cleanup();
      resolve();
    }
    if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") fail();
  };
  const timer = setTimeout(fail, timeoutMs);
  const cleanup = () => {
    clearTimeout(timer);
    pc.removeEventListener("iceconnectionstatechange", onState);
    signal.removeEventListener("abort", fail);
  };
  pc.addEventListener("iceconnectionstatechange", onState);
  signal.addEventListener("abort", fail);
  return promise;
}

function collectRemoteTracks(pc: RTCPeerConnection, mids: string[], expected: number, timeoutMs: number): Promise<MediaStreamTrack[]> {
  const { promise, resolve, reject } = Promise.withResolvers<MediaStreamTrack[]>();
  const tracks: MediaStreamTrack[] = [];
  const remaining = new Set(mids);
  const fail = () => {
    cleanup();
    reject(new Error("Koneksi media gagal."));
  };
  const maybeDone = () => {
    if (mids.length > 0 ? remaining.size === 0 : tracks.length >= expected) {
      cleanup();
      resolve(tracks);
    }
  };
  const handleTrack = (event: RTCTrackEvent) => {
    const mid = event.transceiver.mid;
    if (mids.length > 0) {
      if (!mid || !remaining.has(mid)) return;
      remaining.delete(mid);
    }
    tracks.push(event.track);
    maybeDone();
  };
  const timer = setTimeout(fail, timeoutMs);
  const cleanup = () => {
    clearTimeout(timer);
    pc.removeEventListener("track", handleTrack);
  };
  pc.addEventListener("track", handleTrack);
  return promise;
}

function attachLocalVideo(container: HTMLElement | null, stream: MediaStream) {
  if (!container) return;
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) return;
  container.replaceChildren();
  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.objectFit = "cover";
  video.srcObject = new MediaStream([videoTrack]);
  container.appendChild(video);
}

function attachRemoteTracks(container: HTMLElement | null, tracks: MediaStreamTrack[]) {
  if (!container || tracks.length === 0) return;
  const videoTracks = tracks.filter((track) => track.kind === "video");
  const audioTracks = tracks.filter((track) => track.kind === "audio");
  if (videoTracks.length > 0) {
    let video = container.querySelector("video");
    if (!video) {
      container.replaceChildren();
      video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      container.appendChild(video);
    }
    const stream = video.srcObject instanceof MediaStream ? video.srcObject : new MediaStream();
    for (const track of [...videoTracks, ...audioTracks]) {
      if (!stream.getTracks().some((existing) => existing.id === track.id)) stream.addTrack(track);
    }
    video.srcObject = stream;
    return;
  }
  for (const track of audioTracks) {
    const already = Array.from(container.querySelectorAll("audio")).some((element) => {
      const src = element.srcObject;
      return src instanceof MediaStream && src.getTracks().some((existing) => existing.id === track.id);
    });
    if (already) continue;
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.srcObject = new MediaStream([track]);
    container.appendChild(audio);
  }
}

export async function startConsultationMedia(options: {
  realtimeURL: string;
  consultationId: string;
  accessToken: string;
  video: boolean;
  localContainer: HTMLElement | null;
  remoteContainer: HTMLElement | null;
}): Promise<ConsultationMedia> {
  const { realtimeURL, consultationId, accessToken, video, localContainer, remoteContainer } = options;
  const base = `${realtimeURL}/api/v1/consultations/${encodeURIComponent(consultationId)}`;
  const session = await mediaJson<SessionResponse>(`${base}/media/session`, accessToken, { method: "POST" });
  if (!session.sessionId) throw new Error("Akses media konsultasi ditolak.");

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
    bundlePolicy: "max-bundle",
  });
  const abort = new AbortController();
  let stopped = false;
  const pulled = new Set<string>();
  let iceReady: Promise<void> = Promise.resolve();
  let iceResolved = false;

  const cleanupFailedStart = () => {
    for (const track of stream.getTracks()) track.stop();
    pc.close();
  };

  try {
    const localTracks = stream.getTracks();
    for (const track of localTracks) {
      try {
        pc.addTransceiver(track, { direction: "sendonly" });
      } catch {
        pc.addTrack(track);
      }
    }
    attachLocalVideo(localContainer, stream);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // `mid` MUST be read after setLocalDescription. RTCRtpTransceiver.mid is null
    // until the local description is applied, so collecting it at addTransceiver
    // time always yielded undefined, JSON dropped the key, and Cloudflare rejected
    // the publish with 406 invalid_params "tracks[0]: Missing mid in track" — which
    // the gateway surfaced only as a generic 502 cloudflare_sfu_unavailable. Reading
    // it from getTransceivers() here also covers the addTrack fallback above, which
    // never had a transceiver reference to read.
    const publishedTracks = pc
      .getTransceivers()
      .flatMap((transceiver) => {
        const track = transceiver.sender.track;
        if (!track || !transceiver.mid || !localTracks.includes(track)) return [];
        return [{ location: "local" as const, mid: transceiver.mid, trackName: track.id, kind: track.kind }];
      });
    if (publishedTracks.length !== localTracks.length) {
      throw new Error("Koneksi media gagal.");
    }

    iceReady = waitForIceConnected(pc, 15_000, abort.signal).then(() => {
      iceResolved = true;
    });
    const pushResponse = await mediaJson<TracksResponse>(`${base}/media/tracks`, accessToken, {
      method: "POST",
      body: JSON.stringify({
        sessionId: session.sessionId,
        sessionDescription: { sdp: offer.sdp, type: "offer" },
        tracks: publishedTracks,
      }),
    });
    if (pushResponse.sessionDescription) {
      await pc.setRemoteDescription(new RTCSessionDescription(pushResponse.sessionDescription));
    }
    await iceReady;
  } catch (error) {
    abort.abort();
    cleanupFailedStart();
    throw error;
  }

  async function pull(tracks: RemoteTrackRef[]): Promise<void> {
    if (stopped) return;
    if (!iceResolved) await iceReady;
    if (stopped) return;
    const pending = tracks.filter((track) => {
      if (!track?.sessionId || !track.trackName) return false;
      if (track.sessionId === session.sessionId) return false;
      const key = `${track.sessionId}:${track.trackName}`;
      if (pulled.has(key)) return false;
      pulled.add(key);
      return true;
    });
    if (pending.length === 0) return;

    const pullResponse = await mediaJson<TracksResponse>(`${base}/media/tracks`, accessToken, {
      method: "POST",
      body: JSON.stringify({
        sessionId: session.sessionId,
        tracks: pending.map((track) => ({
          location: "remote",
          sessionId: track.sessionId,
          trackName: track.trackName,
        })),
      }),
    });

    const mids = (pullResponse.tracks || []).map((track) => track.mid).filter((mid): mid is string => Boolean(mid));
    const resolvingTracks = collectRemoteTracks(pc, mids, pending.length, 15_000);

    if (pullResponse.requiresImmediateRenegotiation && pullResponse.sessionDescription) {
      await pc.setRemoteDescription(new RTCSessionDescription(pullResponse.sessionDescription));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await mediaJson(`${base}/media/renegotiate`, accessToken, {
        method: "PUT",
        body: JSON.stringify({
          sessionId: session.sessionId,
          sessionDescription: { sdp: answer.sdp, type: "answer" },
        }),
      });
    }

    const resolved = await resolvingTracks.catch(() => [] as MediaStreamTrack[]);
    if (!stopped) attachRemoteTracks(remoteContainer, resolved);
  }

  if (Array.isArray(session.remoteTracks) && session.remoteTracks.length > 0) {
    await pull(session.remoteTracks);
  }

  return {
    sessionId: session.sessionId,
    pull,
    setMuted(muted: boolean) {
      for (const track of stream.getAudioTracks()) track.enabled = !muted;
    },
    stop() {
      if (stopped) return;
      stopped = true;
      abort.abort();
      for (const track of stream.getTracks()) track.stop();
      pc.close();
      localContainer?.replaceChildren();
      remoteContainer?.replaceChildren();
      void fetch(`${base}/media/close`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: session.sessionId }),
      }).catch(() => {});
    },
  };
}
