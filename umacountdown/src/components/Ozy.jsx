import "./Ozy.css"

const images = import.meta.glob("../beans/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
});

export default function Ozy() {
  return (
    <div className="gallery">
      {Object.entries(images).map(([path, src]) => (
        <img key={path} src={src} alt="" />
      ))}
    </div>
  );
}