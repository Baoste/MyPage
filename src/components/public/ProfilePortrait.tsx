import Image from "next/image";
import styles from "@/components/public/PublicSite.module.css";

type ProfilePortraitProps = {
  src: string;
  alt: string;
};

export function ProfilePortrait({ src, alt }: ProfilePortraitProps) {
  return (
    <div className={styles.portrait}>
      <Image
        className={styles.portraitImage}
        src={src}
        alt={alt}
        fill
        preload
        sizes="(max-width: 430px) 10rem, (max-width: 960px) 12rem, 16rem"
      />
    </div>
  );
}
