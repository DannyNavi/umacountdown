const ICON_FILE_OVERRIDES = {
  "Belno Light": "Berno_Light_(Icon).png",
};

export function getUmaIconUrl(characterName, width = 140) {
  if (!characterName) return "";
  const file =
    ICON_FILE_OVERRIDES[characterName.trim()] ||
    `${characterName.trim().replace(/ /g, "_")}_(Icon).png`;
  return `https://umamusu.wiki/w/thumb.php?f=${encodeURIComponent(file)}&width=${width}`;
}
