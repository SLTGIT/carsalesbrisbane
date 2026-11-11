import Link from "next/link";
import Image from "next/image";
import type { WPPost } from "@/types/wordpress";
import { stripHtml } from "@/lib/json-ld";
import styles from "./BlogCard.module.scss";

interface BlogCardProps {
  post: WPPost;
  /** Use `2` on /blog listing (after page h1); default `3` when nested under a section h2. */
  titleHeadingLevel?: 2 | 3;
  priority?: boolean;
}

export default function BlogCard({
  post,
  titleHeadingLevel = 3,
  priority = false,
}: BlogCardProps) {
  const TitleTag = titleHeadingLevel === 2 ? "h2" : "h3";

  const featuredImage =
    post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  const href = `/blog/${post.slug}`;
  const plainTitle = stripHtml(post.title.rendered);
  const imgAlt = plainTitle ? `${plainTitle} — article` : "Blog article";

  return (
    <article className={styles.card}>
      <Link
        href={href}
        className={styles.cardLink}
        aria-label={`Read: ${plainTitle}`}
      >
        {featuredImage ? (
          <div className={styles.media}>
            <Image
              src={featuredImage}
              alt={imgAlt}
              fill
              className={styles.mediaImg}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority}
            />
          </div>
        ) : (
          <div className={styles.placeholder} aria-hidden="true">
            No image
          </div>
        )}
        <div className={styles.body}>
          <TitleTag className={styles.title}>{plainTitle}</TitleTag>
          <span className={styles.readBtn}>Read Article</span>
        </div>
      </Link>
    </article>
  );
}
