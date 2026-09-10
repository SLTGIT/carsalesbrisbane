# WordPress Next.js

A scalable Next.js application with TypeScript and WordPress REST API integration.

## Features

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **WordPress REST API Integration** - Full support for:
  - Posts
  - Pages
  - Users
  - Categories
  - Tags
  - Media
  - Menus
  - Site Settings
- **Responsive Design** - Mobile-first approach
- **SEO Optimized** - Built-in metadata support

## Project Structure

```
wordpress-nextjs/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── about/
│   │   ├── blog/
│   │   ├── contact/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── layout/            # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   └── ui/                # Reusable UI components
│   ├── lib/
│   │   └── wordpress/         # WordPress API utilities
│   │       ├── api.ts
│   │       └── index.ts
│   ├── types/
│   │   └── wordpress.ts       # TypeScript types
│   └── styles/
│       └── globals.css
├── .env.local                 # Environment variables
├── .env.example              # Environment variables template
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure WordPress API

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your WordPress site URL:

```env
NEXT_PUBLIC_WORDPRESS_API_URL=https://your-wordpress-site.com/wp-json
WORDPRESS_API_URL=https://your-wordpress-site.com/wp-json

# Optional: WordPress Authentication (if needed for private content)
WORDPRESS_AUTH_USERNAME=
WORDPRESS_AUTH_PASSWORD=
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## WordPress API Functions

The project includes comprehensive WordPress REST API utilities in `src/lib/wordpress/api.ts`:

### Posts

```typescript
import { getPosts, getPostBySlug, getPostById } from '@/lib/wordpress';

// Get all posts
const posts = await getPosts({ per_page: 10, page: 1 });

// Get post by slug
const post = await getPostBySlug('my-post-slug');

// Get post by ID
const post = await getPostById(123);
```

### Pages

```typescript
import { getPages, getPageBySlug, getPageById } from '@/lib/wordpress';

// Get all pages
const pages = await getPages({ per_page: 10 });

// Get page by slug
const page = await getPageBySlug('about');

// Get page by ID
const page = await getPageById(456);
```

### Users

```typescript
import { getUsers, getUserById, getUserBySlug } from '@/lib/wordpress';

const users = await getUsers();
const user = await getUserById(1);
const user = await getUserBySlug('john-doe');
```

### Categories & Tags

```typescript
import { getCategories, getTags } from '@/lib/wordpress';

const categories = await getCategories();
const tags = await getTags();
```

### Media

```typescript
import { getMedia, getMediaById } from '@/lib/wordpress';

const media = await getMedia({ media_type: 'image' });
const image = await getMediaById(789);
```

### Menus

```typescript
import { getMenu, getMenuByLocation } from '@/lib/wordpress';

// Note: Requires WP REST API Menus plugin or custom endpoint
const menu = await getMenu('primary');
const menu = await getMenuByLocation('header-menu');
```

### Search

```typescript
import { searchContent } from '@/lib/wordpress';

const results = await searchContent('query', 'post'); // 'post', 'page', or 'any'
```

## WordPress Setup

### Required WordPress Plugins (Optional)

For full functionality, you may need:

1. **WP REST API Menus** - For menu endpoints
2. **Advanced Custom Fields (ACF)** - For custom fields (if needed)
3. **Yoast SEO** - For enhanced SEO data

### Enable CORS (if needed)

Add to your WordPress `functions.php`:

```php
function add_cors_http_header(){
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
}
add_action('init','add_cors_http_header');
```

## TypeScript Types

All WordPress entities are fully typed in `src/types/wordpress.ts`:

- `WPPost`
- `WPPage`
- `WPUser`
- `WPCategory`
- `WPTag`
- `WPMedia`
- `WPMenuItem`
- `WPSettings`

## Building for Production

```bash
npm run build
npm start
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Pages Included

- **Home** (`/`) - Landing page with features
- **About** (`/about`) - About page with technology stack
- **Blog** (`/blog`) - Blog listing page (with dummy data)
- **Contact** (`/contact`) - Contact form page

## Customization

### Adding New Pages

1. Create a new folder in `src/app/`
2. Add a `page.tsx` file
3. Update navigation in `Header.tsx` and `Footer.tsx`

### Styling

This project uses Tailwind CSS. Customize the theme in `tailwind.config.ts`.

### API Configuration

Modify API functions in `src/lib/wordpress/api.ts` to add custom endpoints or modify existing ones.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## License

MIT
