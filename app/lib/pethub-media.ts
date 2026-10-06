export function petHubPhotos(item: {
  media_url?: string;
  media_urls?: string[];
}) {
  return [
    ...new Set(
      [
        ...(Array.isArray(item.media_urls) ? item.media_urls : []),
        item.media_url,
      ].filter(
        (url): url is string =>
          typeof url === "string" && /^https?:\/\//.test(url),
      ),
    ),
  ];
}
export function petHubVideoPoster(url: string) {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/"))
    return "";
  return url
    .replace("/upload/", "/upload/so_0,w_720,h_960,c_fill/")
    .replace(/\.(mp4|mov|webm)(\?.*)?$/i, ".jpg$2");
}
