export const EXILE_CIRCLE_IDS = [619284325, 676001972, 702265397, 868091297];

export async function fetchExileCircle(id, month) {
  const params = new URLSearchParams({ circle_id: id });
  if (month) {
    params.set("year", month.getUTCFullYear());
    params.set("month", month.getUTCMonth() + 1);
  }
  const response = await fetch(`/api/v4/circles?${params}`);
  if (!response.ok) throw new Error(`Could not load club ${id}`);
  const data = await response.json();
  if (!data.circle?.name || !Array.isArray(data.members)) {
    throw new Error(`Invalid club data for ${id}`);
  }
  return data;
}
