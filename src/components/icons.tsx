export function Icon({
  name,
  size = 20,
}: {
  name: "list" | "settings" | "backup" | "about" | "home" | "arrow" | "photo" | "check";
  size?: number;
}) {
  const paths = {
    list: "M7 4h10v3H7z M5 6H3v15h18V6h-2 M7 12h2m3 0h5M7 17h2m3 0h5",
    settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
    backup: "M4 15v5h16v-5M12 16V3m-5 5 5-5 5 5",
    about: "M12 11v6m0-10v.2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    home: "m3 10 9-7 9 7v11H3zM9 21v-8h6v8",
    arrow: "M5 12h14m-5-5 5 5-5 5",
    photo: "M3 7h4l2-3h6l2 3h4v14H3zM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    check: "m5 12 4 4L19 6",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
