import styles from "@/components/public/PublicSite.module.css";

export function GeometricPortrait() {
  return (
    <svg
      aria-hidden="true"
      className={styles.portrait}
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="120" cy="120" r="103" fill="#fff" stroke="#090909" strokeWidth="5" />
      <path d="M17 120A103 103 0 0 1 120 17v103Z" fill="#0759e6" stroke="#090909" strokeWidth="5" />
      <path d="M120 120h103a103 103 0 0 1-45 85Z" fill="#f0201b" stroke="#090909" strokeWidth="5" />
      <path d="M120 120v103a103 103 0 0 1-72-30l72-73Z" fill="#ffd400" stroke="#090909" strokeWidth="5" />
      <path
        d="M75 107c0-34 21-58 53-58 35 0 58 24 58 58 0 20-7 36-21 48l12 44-55 21-13-56H80v-20l-15-14 10-23Z"
        fill="#fff"
        stroke="#090909"
        strokeLinejoin="round"
        strokeWidth="5"
      />
      <path d="M75 105c1-35 22-56 54-56 34 0 58 23 58 57 0 13-4 25-12 35h-21l-10-24h-25v-12H75Z" fill="#090909" />
      <circle cx="95" cy="117" r="3.5" fill="#090909" />
      <path d="M73 143h34M106 164h45" fill="none" stroke="#090909" strokeWidth="5" />
    </svg>
  );
}

