import Link from "next/link";
import { getPosts } from "@/lib/wordpress/api";
import BlogCard from "../blog/BlogCard";
import styles from "./LatestBlogPosts.module.scss";

export default async function LatestBlogPosts() {
  const posts = await getPosts({
    per_page: 3,
    orderby: "date",
    order: "desc",
  });

  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className="container">
        <div className="row mb-4 align-items-end">
          <div className="col-lg-7">
            {/* <p
              className="text-uppercase fw-semibold small mb-2"
              style={{ color: "var(--cs-primary)" }}
            >
              Latest News
            </p> */}
            <h2 className="display-6 fw-bold cs-title-tight">Latest Blog Posts</h2>
          </div>
        </div>

        <div className={`row ${styles.swipeRow}`}>
          {posts.map((post) => (
            <div
              key={post.id}
              className="col-12 col-md-6 col-lg-4 mb-4 mb-md-0 d-flex"
            >
              <BlogCard key={post.id} post={post} />
            </div>
          ))}
        </div>

        {posts.length >= 3 && (
          <div className={styles.viewAll}>
            <Link href="/blog" className="btn btn-outline-primary cs-pill">
              View All Posts
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
