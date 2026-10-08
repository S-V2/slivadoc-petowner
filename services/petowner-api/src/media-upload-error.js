export function mediaUploadFailure(error) {
  if (
    error?.name === "TimeoutError" ||
    error?.http_code === 499 ||
    ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND"].includes(error?.code)
  ) {
    return {
      status: 503,
      error: "media_storage_unreachable",
      message:
        "Koneksi ke penyimpanan media bermasalah. Foto/video belum diterbitkan; coba lagi nanti.",
    };
  }
  if ([401, 403, 404].includes(error?.http_code)) {
    return {
      status: 503,
      error: "media_storage_configuration",
      message:
        "Konfigurasi penyimpanan media belum valid. Hubungi admin Slivadoc.",
    };
  }
  return {
    status: 503,
    error: "media_upload_unavailable",
    message:
      "Foto/video belum dapat diunggah. Posting tidak diterbitkan; coba lagi nanti.",
  };
}
