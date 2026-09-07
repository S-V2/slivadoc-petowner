"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import "./commerce-workspace.css";

export type CommerceRequest = <T>(
  path: string,
  init?: RequestInit,
) => Promise<T>;
type Row = Record<string, string | number | boolean | null>;
type Context = {
  role: string;
  brand_id: string;
  profiles: Row[];
  branches: Row[];
  can_pay: boolean;
  can_manage: boolean;
};
type Page = { data: Row[]; has_more: boolean; page: number };
type Summary = { channels: Row[]; low_stock: Row[] };
type Detail = { order: Row; items: Row[]; events: Row[]; payments: Row[] };
type Field = {
  name: string;
  label: string;
  type?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  optional?: boolean;
  options?: string[];
};
type Editor = {
  title: string;
  path: string;
  method: string;
  fields: Field[];
  values: Row;
  hint?: string;
};
const api = "/api/v1/commerce";
const statuses = [
  "submitted",
  "accepted",
  "packing",
  "shipped",
  "delivered",
  "completed",
  "rejected",
  "cancelled",
];
const labels: Record<string, string> = {
  submitted: "PO masuk",
  accepted: "Diterima",
  packing: "Dikemas",
  shipped: "Dikirim",
  delivered: "Tiba di tujuan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  rejected: "Ditolak",
  active: "Aktif",
  review: "Menunggu review",
  draft: "Draft",
  archived: "Diarsipkan",
  pending: "Menunggu verifikasi",
  suspended: "Ditangguhkan",
  slivadoc: "Brand → Slivadoc",
  partner: "Brand → Pet Shop / Mitra",
};
const money = (v: unknown) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));
const date = (v: unknown) =>
  v ? new Date(String(v)).toLocaleString("id-ID") : "—";
const note: Field = {
  name: "note",
  label: "Catatan / alasan / bukti verifikasi",
  type: "textarea",
  maxLength: 2000,
};
const productFields: Field[] = [
  { name: "sku", label: "SKU", maxLength: 80 },
  { name: "name", label: "Nama produk", maxLength: 200 },
  { name: "category", label: "Kategori", maxLength: 100, optional: true },
  { name: "unit", label: "Satuan", maxLength: 40 },
  {
    name: "description",
    label: "Deskripsi",
    type: "textarea",
    maxLength: 10000,
    optional: true,
  },
  {
    name: "image_url",
    label: "URL gambar HTTPS",
    type: "url",
    maxLength: 2000,
    optional: true,
  },
  {
    name: "slivadoc_price",
    label: "Harga grosir Slivadoc (Rp)",
    type: "number",
    min: 1,
    max: 1000000000,
  },
  {
    name: "partner_price",
    label: "Harga grosir mitra (Rp)",
    type: "number",
    min: 1,
    max: 1000000000,
  },
  {
    name: "minimum_order",
    label: "Minimum pembelian",
    type: "number",
    min: 1,
    max: 1000000,
  },
  {
    name: "reorder_point",
    label: "Peringatan stok minimum",
    type: "number",
    min: 0,
    max: 1000000000,
  },
  {
    name: "status",
    label: "Publikasi",
    options: ["draft", "review", "archived"],
  },
];

export function CommerceField({
  field,
  value,
}: {
  field: Field;
  value?: Row[string];
}) {
  const props = {
    name: field.name,
    required: !field.optional,
    defaultValue: String(value ?? ""),
    maxLength: field.maxLength,
  };
  return (
    <label className={field.type === "textarea" ? "cw-wide" : ""}>
      <span>{field.label}</span>
      {field.options ? (
        <select {...props}>
          {field.options.map((v) => (
            <option key={v} value={v}>
              {labels[v] || v}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea {...props} rows={3} />
      ) : (
        <input
          {...props}
          type={field.type || "text"}
          min={field.min}
          max={field.max}
          step={field.type === "number" ? 1 : undefined}
        />
      )}
    </label>
  );
}
function Badge({ value }: { value: unknown }) {
  return (
    <span className={`cw-badge cw-${String(value)}`}>
      {labels[String(value)] || String(value || "—")}
    </span>
  );
}
function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="cw-card">
      <div className="cw-card-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function Grid({
  rows,
  columns,
}: {
  rows: Row[];
  columns: { title: string; cell: (r: Row) => ReactNode }[];
}) {
  if (!rows.length)
    return <p className="cw-empty">Belum ada data untuk pilihan ini.</p>;
  return (
    <div className="cw-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.title} scope="col">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={String(r.id || r.channel || i)}>
              {columns.map((c) => (
                <td key={c.title}>{c.cell(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function exportCommerceCSV(rows: Row[], file: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return (
      '"' + (/^[\s]*[=+@-]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"'
    );
  };
  const blob = new Blob(
    [
      "\uFEFF" +
        [keys, ...rows.map((r) => keys.map((k) => r[k]))]
          .map((r) => r.map(escape).join(","))
          .join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8;" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file;
  a.click();
  URL.revokeObjectURL(url);
}

export function CommerceWorkspace({ request }: { request: CommerceRequest }) {
  const [ctx, setCtx] = useState<Context | null>(null);
  const [tab, setTab] = useState("overview");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [result, setResult] = useState<Page>({
    data: [],
    has_more: false,
    page: 1,
  });
  const [summary, setSummary] = useState<Summary>({
    channels: [],
    low_stock: [],
  });
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [detailID, setDetailID] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [newOrder, setNewOrder] = useState(false);
  const mutationLock = useRef(false);
  const isBrand = ctx?.role === "official_brand";
  const isBuyer =
    ctx?.role === "business_owner" || ctx?.role === "branch_admin";
  const isOperator = [
    "operations",
    "operations_marketing",
    "marketplace_manager",
    "super_admin",
  ].includes(ctx?.role || "");
  const canOrder = isBuyer || isOperator;
  useEffect(() => {
    let current = true;
    const search = new URLSearchParams({
      page: String(page),
      q: query,
      status,
      channel,
    });
    const load = async () => {
      setLoading(true);
      setError("");
      setDetail(null);
      try {
        const [context, data, selected] = await Promise.all([
          request<Context>(`${api}/context`),
          ["overview", "income"].includes(tab)
            ? request<Summary>(`${api}/dashboard`)
            : tab === "profile"
              ? Promise.resolve(null)
              : request<Page>(`${api}/${tab}?${search}`),
          detailID
            ? request<Detail>(`${api}/orders/${detailID}`)
            : Promise.resolve(null),
        ]);
        if (!current) return;
        setCtx(context);
        setDetail(selected);
        if (data && "channels" in data) setSummary(data);
        if (data && "data" in data) setResult(data);
      } catch (e) {
        if (current)
          setError(e instanceof Error ? e.message : "Data belum dapat dimuat");
      } finally {
        if (current) setLoading(false);
      }
    };
    void load();
    return () => {
      current = false;
    };
  }, [request, tab, page, query, status, channel, revision, detailID]);
  function navigate(next: string) {
    setTab(next);
    setPage(1);
    setQuery("");
    setStatus("");
    setChannel("");
    setEditor(null);
    setDetailID("");
    setNewOrder(false);
    setResult({ data: [], page: 1, has_more: false });
  }
  async function mutate(path: string, method: string, payload: unknown) {
    if (mutationLock.current) return false;
    mutationLock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await request<{ message?: string }>(path, {
        method,
        body: JSON.stringify(payload),
      });
      setMessage(data.message || "Perubahan berhasil disimpan.");
      setRevision((v) => v + 1);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Perubahan belum tersimpan");
      return false;
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }
  async function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const values: Row = Object.fromEntries(
      new FormData(event.currentTarget),
    ) as Row;
    for (const f of editor.fields)
      if (f.type === "number") values[f.name] = Number(values[f.name]);
    const hidden = Object.fromEntries(
      ["version", ...(editor.path.endsWith("/status") ? ["status"] : [])]
        .filter((k) => k in editor.values && !(k in values))
        .map((k) => [k, editor.values[k]]),
    );
    if (await mutate(editor.path, editor.method, { ...hidden, ...values }))
      setEditor(null);
  }
  function productEditor(p?: Row) {
    setEditor({
      title: p ? "Edit produk" : "Produk baru",
      path: `${api}/products${p ? `/${p.id}` : ""}`,
      method: p ? "PATCH" : "POST",
      fields: productFields,
      values: p
        ? { ...p, status: "draft" }
        : { unit: "pcs", minimum_order: 1, reorder_point: 10, status: "draft" },
      hint: "Harga rupiah bulat. Perubahan produk perlu review ulang. Stok dikelola terpisah; PO yang sudah dibuat menyimpan harga sebelumnya.",
    });
  }
  const tabs = [
    ["overview", "Ringkasan"],
    ["products", isBrand ? "Produk & stok" : "Katalog grosir"],
    ["orders", "Purchase order"],
    ["income", isBuyer ? "Pembayaran" : "Income & piutang"],
    ...(ctx?.can_manage
      ? [
          ["brands", "Verifikasi brand"],
          ["retail", "Katalog aplikasi"],
        ]
      : []),
    ...(isOperator || ctx?.can_pay
      ? [["retail-orders", "Pesanan aplikasi"]]
      : []),
    ...(isBrand ? [["profile", "Profil brand"]] : []),
  ];
  const total = (key: string) =>
    summary.channels.reduce((n, row) => n + Number(row[key] || 0), 0);
  return (
    <div className="cw">
      <header className="cw-header">
        <div>
          <p className="cw-eyebrow">
            SLIVADOC / {isBrand ? "OFFICIAL BRAND" : "COMMERCE"}
          </p>
          <h1>
            {isBrand
              ? String(ctx?.profiles[0]?.name || "Official Brand workspace")
              : ctx?.can_manage
                ? "Marketplace control center"
                : "Pengadaan & distribusi"}
          </h1>
          <p>
            Dua jalur distribusi, satu sumber data untuk produk, PO, pengiriman,
            dan pembayaran.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => setRevision((v) => v + 1)}
        >
          Muat ulang
        </button>
      </header>
      <nav className="cw-tabs" aria-label="Navigasi commerce">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? "page" : undefined}
            onClick={() => navigate(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {message && (
        <p className="cw-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <div className="cw-error" role="alert">
          {error}{" "}
          <button type="button" onClick={() => setRevision((v) => v + 1)}>
            Coba lagi
          </button>
        </div>
      )}
      {isBrand && ctx && ctx.profiles[0]?.status !== "active" && (
        <p className="cw-notice">
          Brand belum aktif. Lengkapi profil dan tunggu verifikasi Marketplace
          sebelum menerima PO. {String(ctx.profiles[0]?.review_note || "")}
        </p>
      )}
      {editor && (
        <Card
          title={editor.title}
          action={
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditor(null)}
            >
              Tutup formulir
            </button>
          }
        >
          <p className="cw-muted">{editor.hint}</p>
          <form key={editor.path + editor.title} className="cw-form" onSubmit={saveEditor}>
            <fieldset disabled={busy}>
              {editor.fields.map((f) => (
                <CommerceField
                  key={f.name}
                  field={f}
                  value={editor.values[f.name]}
                />
              ))}
              <button className="cw-primary" type="submit">
                {busy ? "Menyimpan…" : "Simpan"}
              </button>
            </fieldset>
          </form>
        </Card>
      )}
      {loading ? (
        <p className="cw-empty" role="status">
          Memuat data terbaru…
        </p>
      ) : !ctx ? (
        <p className="cw-empty">
          Login menggunakan akun yang mendapat akses commerce.
        </p>
      ) : (
        <>
          {["overview", "income"].includes(tab) && (
            <>
              <div className="cw-metrics">
                {[
                  [
                    isBuyer ? "Pembayaran tercatat" : "Income terverifikasi",
                    money(total("collected")),
                  ],
                  ["Nilai PO", money(total("order_value"))],
                  ["Belum dibayar", money(total("outstanding"))],
                  ["PO perlu ditindaklanjuti", String(total("open_orders"))],
                ].map(([label, value]) => (
                  <div className="cw-metric" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <small>Seluruh periode · IDR</small>
                  </div>
                ))}
              </div>
              <Card
                title="Performa per jalur"
                action={
                  <button
                    onClick={() =>
                      exportCommerceCSV(
                        summary.channels,
                        "slivadoc-income-per-jalur.csv",
                      )
                    }
                  >
                    Ekspor ringkasan
                  </button>
                }
              >
                <p className="cw-muted">
                  Income = pembayaran yang diverifikasi Finance dikurangi
                  refund. Bukan laba, saldo rekening, atau transfer otomatis.
                </p>
                <Grid
                  rows={summary.channels}
                  columns={[
                    {
                      title: "Jalur distribusi",
                      cell: (r) => <Badge value={r.channel} />,
                    },
                    { title: "Jumlah PO", cell: (r) => String(r.order_count) },
                    { title: "Nilai PO", cell: (r) => money(r.order_value) },
                    { title: "Terbayar neto", cell: (r) => money(r.collected) },
                    { title: "Piutang", cell: (r) => money(r.outstanding) },
                    {
                      title: "Lewat jatuh tempo",
                      cell: (r) => String(r.overdue),
                    },
                  ]}
                />
              </Card>
              {tab === "overview" && (
                <Card title="Perlu restock · maksimal 50 produk">
                  <Grid
                    rows={summary.low_stock}
                    columns={[
                      {
                        title: "Produk",
                        cell: (r) => (
                          <>
                            <strong>{r.name}</strong>
                            <small>
                              {r.brand_name} · {r.sku}
                            </small>
                          </>
                        ),
                      },
                      { title: "Tersedia", cell: (r) => String(r.available) },
                      {
                        title: "Batas minimum",
                        cell: (r) => String(r.reorder_point),
                      },
                    ]}
                  />
                </Card>
              )}
            </>
          )}
          {tab === "profile" && (
            <Card
              title="Identitas Official Brand"
              action={
                <button
                  className="cw-primary"
                  onClick={() =>
                    setEditor({
                      title: "Profil & kontak brand",
                      path: `${api}/profile`,
                      method: "PUT",
                      values: ctx.profiles[0] || {},
                      hint: "Perubahan profil meminta verifikasi ulang. Akun yang ditangguhkan tidak otomatis aktif kembali.",
                      fields: [
                        { name: "name", label: "Nama brand", maxLength: 160 },
                        {
                          name: "legal_name",
                          label: "Nama badan usaha",
                          maxLength: 200,
                        },
                        {
                          name: "contact_email",
                          label: "Email bisnis",
                          type: "email",
                          maxLength: 254,
                        },
                        {
                          name: "phone",
                          label: "Telepon bisnis",
                          maxLength: 30,
                        },
                        {
                          name: "address",
                          label: "Alamat gudang",
                          type: "textarea",
                          maxLength: 2000,
                        },
                        {
                          name: "description",
                          label: "Tentang brand",
                          type: "textarea",
                          maxLength: 10000,
                          optional: true,
                        },
                      ],
                    })
                  }
                >
                  Edit profil
                </button>
              }
            >
              <dl className="cw-facts">
                {[
                  "name",
                  "legal_name",
                  "contact_email",
                  "phone",
                  "address",
                  "description",
                  "review_note",
                ].map((k) => (
                  <div key={k}>
                    <dt>
                      {
                        (
                          {
                            name: "Brand",
                            legal_name: "Badan usaha",
                            contact_email: "Email",
                            phone: "Telepon",
                            address: "Alamat",
                            description: "Deskripsi",
                            review_note: "Catatan verifikasi",
                          } as Record<string, string>
                        )[k]
                      }
                    </dt>
                    <dd>{String(ctx.profiles[0]?.[k] || "Belum diisi")}</dd>
                  </div>
                ))}
              </dl>
              <Badge value={ctx.profiles[0]?.status || "pending"} />
            </Card>
          )}
          {["products", "orders", "brands", "retail", "retail-orders"].includes(
            tab,
          ) && (
            <>
              <div className="cw-toolbar">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setQuery(
                      String(new FormData(e.currentTarget).get("q") || ""),
                    );
                    setPage(1);
                  }}
                >
                  <input
                    aria-label="Cari nama, SKU, atau nomor PO"
                    name="q"
                    placeholder="Cari nama, SKU, nomor PO…"
                    maxLength={100}
                  />
                  <button type="submit">Cari</button>
                </form>
                {["products", "orders", "retail-orders"].includes(tab) && (
                  <select
                    aria-label="Filter status"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Semua status</option>
                    {(tab === "orders"
                      ? statuses
                      : tab === "retail-orders"
                        ? [
                            "pending_payment",
                            "processing",
                            "shipped",
                            "completed",
                            "cancelled",
                          ]
                        : ["draft", "review", "active", "rejected", "archived"]
                    ).map((v) => (
                      <option key={v} value={v}>
                        {labels[v] || v}
                      </option>
                    ))}
                  </select>
                )}
                {tab === "orders" && (
                  <select
                    aria-label="Jalur distribusi"
                    value={channel}
                    onChange={(e) => {
                      setChannel(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Kedua jalur</option>
                    <option value="slivadoc">Brand → Slivadoc</option>
                    <option value="partner">Brand → Mitra</option>
                  </select>
                )}
                <button
                  onClick={() =>
                    exportCommerceCSV(
                      result.data,
                      `slivadoc-${tab}-halaman-${page}.csv`,
                    )
                  }
                >
                  Ekspor halaman ini
                </button>
                {tab === "products" && isBrand && (
                  <button
                    className="cw-primary"
                    onClick={() => productEditor()}
                  >
                    + Produk
                  </button>
                )}
                {canOrder && ["products", "orders"].includes(tab) && (
                  <button
                    className="cw-primary"
                    onClick={() => setNewOrder((v) => !v)}
                  >
                    + Buat PO
                  </button>
                )}
              </div>
              {newOrder && canOrder && (
                <OrderComposer
                  request={request}
                  ctx={ctx}
                  busy={busy}
                  save={async (payload) => {
                    if (await mutate(`${api}/orders`, "POST", payload)) {
                      setNewOrder(false);
                      navigate("orders");
                    }
                  }}
                />
              )}
              {tab === "retail" && (
                <Card title="Moderasi katalog Pet Owner">
                  <p className="cw-muted">
                    Blokir marketplace menyembunyikan produk dari pencarian dan
                    checkout aplikasi, tanpa menonaktifkan POS atau mengubah
                    stok/harga milik mitra.
                  </p>
                  <Grid
                    rows={result.data}
                    columns={[
                      {
                        title: "Produk / mitra",
                        cell: (p) => (
                          <>
                            <strong>{p.name}</strong>
                            <small>
                              {p.sku} · {p.business_name}
                            </small>
                          </>
                        ),
                      },
                      {
                        title: "Harga / stok",
                        cell: (p) => (
                          <>
                            {money(p.sell_price)}
                            <small>{p.available} tersedia</small>
                          </>
                        ),
                      },
                      {
                        title: "Marketplace",
                        cell: (p) => (
                          <>
                            {p.marketplace_blocked
                              ? "Diblokir"
                              : p.status === "active"
                                ? "Tampil"
                                : "Produk nonaktif"}
                            <small>{p.marketplace_review_note}</small>
                          </>
                        ),
                      },
                      {
                        title: "Tindakan",
                        cell: (p) => (
                          <button
                            onClick={() =>
                              setEditor({
                                title: `Moderasi · ${p.name}`,
                                path: `${api}/retail/${p.id}/review`,
                                method: "PATCH",
                                values: {
                                  version: p.marketplace_review_version,
                                  status: p.marketplace_blocked
                                    ? "visible"
                                    : "blocked",
                                },
                                fields: [
                                  {
                                    name: "status",
                                    label: "Visibilitas marketplace",
                                    options: ["visible", "blocked"],
                                  },
                                  note,
                                ],
                              })
                            }
                          >
                            Moderasi
                          </button>
                        ),
                      },
                    ]}
                  />
                </Card>
              )}
              {tab === "retail-orders" && (
                <Card title="Monitoring pesanan marketplace aplikasi">
                  <p className="cw-muted">
                    Data checkout Pet Owner, hanya baca. Status pembayaran tetap
                    berasal dari payment gateway; tidak dapat ditimpa oleh tim
                    Marketplace.
                  </p>
                  <Grid
                    rows={result.data}
                    columns={[
                      {
                        title: "Pesanan / pelanggan",
                        cell: (o) => (
                          <>
                            <strong>{o.order_number}</strong>
                            <small>
                              {o.customer_name} · {date(o.created_at)}
                            </small>
                          </>
                        ),
                      },
                      {
                        title: "Status",
                        cell: (o) => (
                          <>
                            {o.status}
                            <small>Pembayaran: {o.payment_status}</small>
                          </>
                        ),
                      },
                      {
                        title: "Total",
                        cell: (o) => (
                          <>
                            {money(o.total_amount)}
                            <small>Dibayar {date(o.paid_at)}</small>
                          </>
                        ),
                      },
                      {
                        title: "Rincian item",
                        cell: (o) => (
                          <details>
                            <summary>Lihat item pesanan</summary>
                            <RetailOrderItems value={o.items} />
                          </details>
                        ),
                      },
                    ]}
                  />
                </Card>
              )}
              {tab === "products" && (
                <Card title="Katalog & ketersediaan">
                  <Grid
                    rows={result.data}
                    columns={[
                      {
                        title: "Produk / brand",
                        cell: (p) => (
                          <>
                            <strong>{p.name}</strong>
                            <small>
                              {p.sku} · {p.brand_name}
                            </small>
                            <small>
                              {p.category} · min. {p.minimum_order} {p.unit}
                            </small>
                            {p.review_note && <small>{p.review_note}</small>}
                          </>
                        ),
                      },
                      {
                        title: "Harga Slivadoc / Mitra",
                        cell: (p) => (
                          <>
                            {money(p.slivadoc_price)}
                            <small>{money(p.partner_price)}</small>
                          </>
                        ),
                      },
                      {
                        title: "Stok / reservasi",
                        cell: (p) => (
                          <>
                            <strong>{p.available} tersedia</strong>
                            <small>
                              {p.stock} fisik · {p.reserved} dipesan
                            </small>
                          </>
                        ),
                      },
                      {
                        title: "Status",
                        cell: (p) => <Badge value={p.status} />,
                      },
                      {
                        title: "Tindakan",
                        cell: (p) => (
                          <div className="cw-actions">
                            {isBrand && p.brand_id === ctx.brand_id && (
                              <>
                                <button onClick={() => productEditor(p)}>
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    setEditor({
                                      title: `Sesuaikan stok · ${p.name}`,
                                      path: `${api}/products/${p.id}/stock`,
                                      method: "POST",
                                      values: { version: p.version },
                                      fields: [
                                        {
                                          name: "delta",
                                          label:
                                            "Perubahan stok (+ masuk / − keluar)",
                                          type: "number",
                                          min: -1000000000,
                                          max: 1000000000,
                                        },
                                        {
                                          name: "reason",
                                          label: "Alasan penyesuaian",
                                          type: "textarea",
                                          maxLength: 2000,
                                        },
                                      ],
                                      hint: "Stok yang direservasi tidak dapat dikeluarkan. Seluruh penyesuaian dicatat dalam ledger.",
                                    })
                                  }
                                >
                                  Stok
                                </button>
                              </>
                            )}
                            {ctx.can_manage &&
                              ["review", "active"].includes(
                                String(p.status),
                              ) && (
                                <button
                                  onClick={() =>
                                    setEditor({
                                      title: `Review · ${p.name}`,
                                      path: `${api}/products/${p.id}/review`,
                                      method: "PATCH",
                                      values: {
                                        version: p.version,
                                        status: "active",
                                      },
                                      fields: [
                                        {
                                          name: "status",
                                          label: "Keputusan",
                                          options: ["active", "rejected"],
                                        },
                                        note,
                                      ],
                                    })
                                  }
                                >
                                  Review
                                </button>
                              )}
                          </div>
                        ),
                      },
                    ]}
                  />
                </Card>
              )}
              {tab === "brands" && (
                <Card title="Verifikasi Official Brand">
                  <Grid
                    rows={result.data}
                    columns={[
                      {
                        title: "Brand",
                        cell: (b) => (
                          <>
                            <strong>{b.name}</strong>
                            <small>
                              {b.legal_name} · {b.owner_email}
                            </small>
                            <small>{b.address}</small>
                          </>
                        ),
                      },
                      {
                        title: "Kontak",
                        cell: (b) => (
                          <>
                            {b.contact_email}
                            <small>{b.phone}</small>
                          </>
                        ),
                      },
                      {
                        title: "Status",
                        cell: (b) => (
                          <>
                            <Badge value={b.status} />
                            <small>{b.review_note}</small>
                          </>
                        ),
                      },
                      {
                        title: "Tindakan",
                        cell: (b) => (
                          <button
                            onClick={() =>
                              setEditor({
                                title: `Verifikasi · ${b.name}`,
                                path: `${api}/brands/${b.id}/review`,
                                method: "PATCH",
                                values: { status: "active" },
                                fields: [
                                  {
                                    name: "status",
                                    label: "Keputusan",
                                    options: ["active", "suspended"],
                                  },
                                  note,
                                ],
                              })
                            }
                          >
                            Verifikasi
                          </button>
                        ),
                      },
                    ]}
                  />
                </Card>
              )}
              {tab === "orders" && (
                <Card title="Purchase order">
                  <Grid
                    rows={result.data}
                    columns={[
                      {
                        title: "Nomor / tanggal",
                        cell: (o) => (
                          <button
                            className="cw-link"
                            onClick={() => setDetailID(String(o.id))}
                          >
                            {o.number}
                            <small>{date(o.created_at)}</small>
                          </button>
                        ),
                      },
                      {
                        title: "Distribusi",
                        cell: (o) => (
                          <>
                            <Badge value={o.channel} />
                            <small>
                              {o.brand_name} → {o.buyer_name}
                            </small>
                          </>
                        ),
                      },
                      {
                        title: "Status",
                        cell: (o) => (
                          <>
                            <Badge value={o.status} />
                            <small>
                              {o.courier} {o.tracking_number}
                            </small>
                          </>
                        ),
                      },
                      {
                        title: "Nilai / terbayar",
                        cell: (o) => (
                          <>
                            {money(o.subtotal)}
                            <small>{money(o.paid_amount)} dibayar</small>
                          </>
                        ),
                      },
                      {
                        title: "Jatuh tempo",
                        cell: (o) => String(o.due_date).slice(0, 10),
                      },
                    ]}
                  />
                </Card>
              )}
              <div className="cw-pagination">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Sebelumnya
                </button>
                <span>Halaman {page} · maksimal 50 baris</span>
                <button
                  disabled={!result.has_more}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Berikutnya
                </button>
              </div>
            </>
          )}
          {detail && (
            <OrderDetail
              detail={detail}
              ctx={ctx}
              close={() => setDetailID("")}
              edit={setEditor}
            />
          )}
        </>
      )}
      <p className="cw-footer">
        Akses dibatasi di server berdasarkan role, brand, bisnis, dan cabang.
        Tracking manual tercatat — belum terhubung ke API kurir.
      </p>
    </div>
  );
}

function RetailOrderItems({ value }: { value: unknown }) {
  let items: Row[] = [];
  try {
    items =
      typeof value === "string"
        ? JSON.parse(value)
        : Array.isArray(value)
          ? value
          : [];
  } catch {
    return <p>Rincian tidak dapat dimuat.</p>;
  }
  return (
    <ul>
      {items.map((i, n) => (
        <li key={n}>
          {i.product_name} · {i.quantity} × {money(i.unit_price)}
          <small>
            Total {money(i.line_total)} · Cabang {i.branch_id}
          </small>
        </li>
      ))}
    </ul>
  );
}
function OrderDetail({
  detail,
  ctx,
  close,
  edit,
}: {
  detail: Detail;
  ctx: Context;
  close: () => void;
  edit: (v: Editor) => void;
}) {
  const o = detail.order;
  const operator = [
    "operations",
    "operations_marketing",
    "marketplace_manager",
    "super_admin",
  ].includes(ctx.role);
  const seller = ctx.role === "official_brand";
  const buyer =
    ["business_owner", "branch_admin"].includes(ctx.role) ||
    (o.channel === "slivadoc" && operator);
  const next = (
    {
      submitted: "accepted",
      accepted: "packing",
      packing: "shipped",
      shipped: "delivered",
    } as Record<string, string>
  )[String(o.status)];
  const actions = [
    ...((seller || operator) && next ? [next] : []),
    ...(buyer && o.status === "delivered" ? ["completed"] : []),
    ...(o.status === "submitted" && Number(o.paid_amount) === 0
      ? [
          ...(buyer ? ["cancelled"] : []),
          ...(seller || operator ? ["rejected"] : []),
        ]
      : []),
  ];
  return (
    <Card
      title={`Detail ${o.number}`}
      action={<button onClick={close}>Tutup detail</button>}
    >
      <div className="cw-actions">
        <Badge value={o.status} />
        <Badge value={o.channel} />
        <button
          onClick={() =>
            exportCommerceCSV(detail.items, `${o.number}-item.csv`)
          }
        >
          Ekspor item PO
        </button>
      </div>
      <dl className="cw-facts">
        {[
          ["Brand", o.brand_name],
          ["Pembeli", o.buyer_name],
          ["Alamat tujuan", o.shipping_address],
          ["Kontak", o.contact_phone],
          [
            "Kurir / resi",
            `${o.courier || "Belum dikirim"} ${o.tracking_number || ""}`,
          ],
          ["Jatuh tempo", String(o.due_date).slice(0, 10)],
          ["Catatan", o.notes],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt>{label}</dt>
            <dd>{String(value || "—")}</dd>
          </div>
        ))}
      </dl>
      <Grid
        rows={detail.items}
        columns={[
          {
            title: "SKU / produk",
            cell: (r) => (
              <>
                {r.sku}
                <small>{r.name}</small>
              </>
            ),
          },
          {
            title: "Jumlah",
            cell: (r) => (
              <>
                {r.quantity} {r.unit}
              </>
            ),
          },
          { title: "Harga dikunci", cell: (r) => money(r.unit_price) },
          {
            title: "Subtotal",
            cell: (r) => money(Number(r.quantity) * Number(r.unit_price)),
          },
        ]}
      />
      <p className="cw-total">
        Total {money(o.subtotal)} · Terbayar {money(o.paid_amount)} · Sisa{" "}
        {money(Number(o.subtotal) - Number(o.paid_amount))}
      </p>
      <div className="cw-actions">
        {actions.map((status) => (
          <button
            key={status}
            onClick={() =>
              edit({
                title: `${labels[status]} · ${o.number}`,
                path: `${api}/orders/${o.id}/status`,
                method: "PATCH",
                values: { status, version: o.version },
                fields: [
                  note,
                  ...(status === "shipped"
                    ? [
                        { name: "courier", label: "Kurir", maxLength: 100 },
                        {
                          name: "tracking_number",
                          label: "Nomor resi",
                          maxLength: 150,
                        },
                      ]
                    : []),
                  {
                    name: "location",
                    label: "Lokasi",
                    optional: true,
                    maxLength: 200,
                  },
                ],
                hint:
                  status === "completed"
                    ? "Konfirmasi barang telah diterima. PO mitra menambah stok cabang satu kali; produk baru berstatus nonaktif sampai harga retail diatur."
                    : "Status diperbarui beserta catatan pelaku. Muat ulang jika ada perubahan oleh pengguna lain.",
              })
            }
          >
            {labels[status]}
          </button>
        ))}
        <button
          onClick={() =>
            edit({
              title: "Catat aktivitas / kendala",
              path: `${api}/orders/${o.id}/events`,
              method: "POST",
              values: { event_type: "note" },
              fields: [
                {
                  name: "event_type",
                  label: "Jenis aktivitas",
                  options: [
                    "note",
                    "issue",
                    ...((seller || operator) && o.status === "shipped"
                      ? ["delivery_update"]
                      : []),
                  ],
                },
                note,
                {
                  name: "location",
                  label: "Lokasi",
                  optional: true,
                  maxLength: 200,
                },
              ],
            })
          }
        >
          + Aktivitas
        </button>
        {ctx.can_pay && (
          <button
            className="cw-primary"
            onClick={() =>
              edit({
                title: "Verifikasi pembayaran / refund",
                path: `${api}/orders/${o.id}/payments`,
                method: "POST",
                values: { kind: "payment" },
                fields: [
                  {
                    name: "kind",
                    label: "Jenis transaksi",
                    options: ["payment", "refund"],
                  },
                  {
                    name: "amount",
                    label: "Nominal rupiah",
                    type: "number",
                    min: 1,
                    max: Number(o.subtotal),
                  },
                  {
                    name: "reference",
                    label: "Referensi bank unik",
                    maxLength: 120,
                  },
                  note,
                ],
                hint: "Hanya catat dana yang sudah diverifikasi di bank. Aksi ini tidak mengirim uang. Referensi yang sama tidak dicatat dua kali.",
              })
            }
          >
            + Pembayaran
          </button>
        )}
      </div>
      <h3>Riwayat pembayaran</h3>
      <Grid
        rows={detail.payments}
        columns={[
          {
            title: "Waktu / petugas",
            cell: (p) => (
              <>
                {date(p.created_at)}
                <small>{p.actor_name}</small>
              </>
            ),
          },
          {
            title: "Referensi",
            cell: (p) => (
              <>
                {p.reference}
                <small>{p.note}</small>
              </>
            ),
          },
          {
            title: "Transaksi",
            cell: (p) => (
              <>
                {p.kind} · {money(p.amount)}
              </>
            ),
          },
        ]}
      />
      <h3>Timeline pengiriman & aktivitas</h3>
      <p className="cw-muted">
        Pembaruan manual oleh pihak berwenang; bukan posisi GPS atau status
        langsung dari kurir.
      </p>
      <ol className="cw-timeline">
        {detail.events.map((e) => (
          <li key={String(e.id)}>
            <Badge value={e.status} />
            <strong>{e.note}</strong>
            <span>
              {e.location} · {e.actor_name} · {date(e.created_at)}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function OrderComposer({
  request,
  ctx,
  busy,
  save,
}: {
  request: CommerceRequest;
  ctx: Context;
  busy: boolean;
  save: (payload: unknown) => Promise<void>;
}) {
  const [catalog, setCatalog] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<{ product: Row; quantity: number }[]>([]);
  const key = useRef<string | null>(null);
  const channel = ["business_owner", "branch_admin"].includes(ctx.role)
    ? "partner"
    : "slivadoc";
  useEffect(() => {
    let current = true;
    queueMicrotask(() => {
      if (current) setLoading(true);
    });
    void request<Page>(
      `${api}/products?status=active&page=${page}&q=${encodeURIComponent(search)}`,
    )
      .then((p) => {
        if (current) {
          setCatalog(p.data);
          setMore(p.has_more);
          setError("");
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [request, search, page]);
  function add(product: Row) {
    if (items.some((i) => i.product.id === product.id) || items.length >= 100)
      return;
    if (items.length && items[0].product.brand_id !== product.brand_id) {
      setError(
        "Satu PO hanya untuk satu brand. Kosongkan item atau buat PO terpisah.",
      );
      return;
    }
    key.current = null;
    setError("");
    setItems([...items, { product, quantity: Number(product.minimum_order) }]);
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!items.length || busy) return;
    key.current ||= crypto.randomUUID();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    await save({
      ...form,
      idempotency_key: key.current,
      brand_id: items[0].product.brand_id,
      channel,
      items: items.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
      })),
    });
  }
  return (
    <Card title={`Buat PO · ${labels[channel]}`}>
      <p className="cw-muted">
        Pilih produk dari satu brand. Stok direservasi saat PO dibuat; server
        memvalidasi harga, MOQ, dan cabang.
      </p>
      {error && (
        <p role="alert" className="cw-error">
          {error}
        </p>
      )}
      <form
        className="cw-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(String(new FormData(e.currentTarget).get("search") || ""));
          setPage(1);
        }}
      >
        <input
          aria-label="Cari produk PO"
          name="search"
          placeholder="Cari produk aktif…"
        />
        <button>Cari katalog</button>
      </form>
      {loading ? (
        <p role="status">Memuat katalog…</p>
      ) : (
        <Grid
          rows={catalog}
          columns={[
            {
              title: "Produk",
              cell: (p) => (
                <>
                  {p.name}
                  <small>
                    {p.brand_name} · {p.available} tersedia
                  </small>
                </>
              ),
            },
            { title: "Harga", cell: (p) => money(p[`${channel}_price`]) },
            {
              title: "Pilih",
              cell: (p) => (
                <button
                  disabled={
                    items.some((i) => i.product.id === p.id) ||
                    Number(p.available) < Number(p.minimum_order)
                  }
                  onClick={() => add(p)}
                >
                  Tambah
                </button>
              ),
            },
          ]}
        />
      )}
      <div className="cw-pagination">
        <button
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          Sebelumnya
        </button>
        <span>Katalog {page}</span>
        <button
          disabled={!more || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Berikutnya
        </button>
      </div>
      <form
        className="cw-form"
        onSubmit={submit}
        onChange={() => {
          key.current = null;
        }}
      >
        <fieldset disabled={busy}>
          {items.map((item, i) => (
            <div className="cw-line cw-wide" key={String(item.product.id)}>
              <strong>{item.product.name}</strong>
              <label>
                Jumlah
                <input
                  aria-label={`Jumlah ${item.product.name}`}
                  required
                  type="number"
                  min={Number(item.product.minimum_order)}
                  max={Math.min(1000000, Number(item.product.available))}
                  value={item.quantity}
                  onChange={(e) =>
                    setItems(
                      items.map((v, index) =>
                        index === i
                          ? { ...v, quantity: Number(e.target.value) }
                          : v,
                      ),
                    )
                  }
                />
              </label>
              <span>
                {money(
                  item.quantity * Number(item.product[`${channel}_price`]),
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  key.current = null;
                  setItems(items.filter((_, index) => index !== i));
                }}
              >
                Hapus
              </button>
            </div>
          ))}
          {channel === "partner" && (
            <label>
              Cabang penerima
              <select name="branch_id" required>
                <option value="">Pilih cabang</option>
                {ctx.branches.map((b) => (
                  <option key={String(b.id)} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <CommerceField
            field={{
              name: "shipping_address",
              label: "Alamat pengiriman lengkap",
              type: "textarea",
              maxLength: 2000,
            }}
          />
          <CommerceField
            field={{
              name: "contact_phone",
              label: "Telepon penerima",
              maxLength: 30,
            }}
          />
          <CommerceField
            field={{
              name: "due_date",
              label: "Jatuh tempo pembayaran",
              type: "date",
            }}
          />
          <CommerceField
            field={{
              name: "notes",
              label: "Catatan PO",
              type: "textarea",
              maxLength: 5000,
              optional: true,
            }}
          />
          <p className="cw-total cw-wide">
            Estimasi{" "}
            {money(
              items.reduce(
                (sum, i) =>
                  sum + i.quantity * Number(i.product[`${channel}_price`]),
                0,
              ),
            )}
          </p>
          <button className="cw-primary" disabled={!items.length} type="submit">
            {busy ? "Membuat PO…" : "Buat PO & reservasi stok"}
          </button>
        </fieldset>
      </form>
    </Card>
  );
}
