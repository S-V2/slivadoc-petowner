export function matchesWorldEvent(event: { title?: string; name?: string; city?: string; category?: string }, query: string, category: string) {
  return (category === "all" || event.category === category) && `${event.title ?? event.name ?? ""} ${event.city ?? ""} ${event.category?.replace(/_/g, " ") ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}
