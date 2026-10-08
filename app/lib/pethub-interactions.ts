export const PET_HUB_STORY_DURATION_MS = 30_000;
export const PET_HUB_DOUBLE_TAP_MS = 300;

export function petHubContentLink(postID: string) {
  const url = new URL("https://slivadoc.com/");
  url.searchParams.set("view", "pethub");
  url.searchParams.set("post", postID);
  return url.toString();
}

export function storyProgress(elapsed: number) {
  return Math.min(1, Math.max(0, elapsed / PET_HUB_STORY_DURATION_MS));
}
