// Charles's portfolio, shown by the Developer's Studio's pieces in a panel.
// Facts come from his CV (Nov 2026); edit here to update the site.
// Images and the CV live in public/portfolio/ (paths relative to the site root).

/** A button on a page: opens (or downloads) a link, or copies text to the clipboard. */
export type PortfolioLink =
  | {
      readonly label: string;
      readonly href: string;
      /** Offer the file as a download (saved under this name) instead of opening it. */
      readonly download?: string;
    }
  | {
      readonly label: string;
      /** Copied to the clipboard when pressed. */
      readonly copy: string;
      /** The short notice shown after copying. */
      readonly copiedNotice: string;
    };

export interface PortfolioImage {
  readonly src: string;
  readonly alt: string;
}

/** One page of a panel. */
export interface PortfolioPage {
  readonly title: string;
  /** A role, a place or a one-line description. */
  readonly subtitle?: string;
  readonly period?: string;
  readonly body?: string;
  readonly bullets?: readonly string[];
  readonly tags?: readonly string[];
  readonly image?: PortfolioImage;
  readonly links?: readonly PortfolioLink[];
}

export type PanelId =
  'about' | 'projects' | 'skills' | 'experience' | 'highlights' | 'education' | 'contact';

export interface PortfolioPanel {
  /** Shown at the top of the panel, e.g. "Projects". */
  readonly heading: string;
  readonly pages: readonly PortfolioPage[];
}

const EMAIL = 'chrlsjnthn@gmail.com';
/** WhatsApp chat link (international number, digits only). */
const WHATSAPP = 'https://wa.me/6287897883900';

export const PORTFOLIO: Readonly<Record<PanelId, PortfolioPanel>> = {
  about: {
    heading: 'About me',
    pages: [
      {
        title: 'Charles Jonathan',
        subtitle: 'Software Engineer · Flutter',
        body:
          'Software engineer with 4+ years of experience building Flutter apps for e-commerce, logistics and fintech. ' +
          'Currently responsible for the Tokoplas apps and Poly, their AI assistant. ' +
          'Background in mathematics (ITB), with a published paper on numerical modelling.',
      },
    ],
  },
  // One page per phone on the wall, in the same order (left to right).
  projects: {
    heading: 'Projects',
    pages: [
      {
        title: 'Tokoplas',
        subtitle: 'Petrochemical E-Commerce Platform',
        body: 'A comprehensive e-commerce platform designed for purchasing petrochemical products.',
        bullets: [
          'End-to-end e-commerce functionality',
          'AI-powered digital assistance through Poly',
        ],
        tags: ['Flutter', 'Dart'],
        image: {
          src: 'portfolio/tokoplas-app.webp',
          alt: 'Three screens of the Tokoplas app: the home page, the cart and the loyalty rewards',
        },
        links: [
          {
            label: 'Google Play',
            href: 'https://play.google.com/store/apps/details?id=com.tokoplas',
          },
          {
            label: 'App Store',
            href: 'https://apps.apple.com/us/app/tokoplas-1-resin-shop/id1493901663',
          },
        ],
      },
      {
        title: 'Poly',
        subtitle: 'AI Customer Assistant',
        body: 'An LLM-powered assistant inside the Tokoplas app, with development focused mainly on its brain: the logic that understands customer questions and answers them.',
        bullets: [
          'FAQs, reward enquiries and order tracking',
          'Product recommendations',
          'Market summaries and quotation requests',
        ],
        tags: ['LLM integration', 'Flutter'],
        image: {
          src: 'portfolio/poly.webp',
          alt: 'Poly answering a question about the polyethylene market with a summary of recent prices',
        },
      },
      {
        title: 'Tokoplas Seller',
        subtitle: 'Internal Seller App',
        body: 'An internal app for sellers to manage inventory and review customer purchase history.',
        bullets: ['Products, price history and stock reports', 'Orders and quotations'],
        tags: ['Flutter', 'Dart'],
        image: {
          src: 'portfolio/seller-app.webp',
          alt: 'Three screens of the Seller app: the dashboard, the orders list and the store profile',
        },
      },
      {
        title: 'Tokoplas Driver',
        subtitle: 'Internal Delivery App',
        body: 'An internal app that guides drivers through delivery assignments and keeps every order tracked.',
        bullets: ['Daily delivery schedule and history', 'Pickup and drop-off details'],
        tags: ['Flutter', 'Dart'],
        image: {
          src: 'portfolio/driver-app.webp',
          alt: 'Three screens of the Driver app: the day’s tasks, the delivery history and a delivery’s details',
        },
      },
      {
        title: 'klikUMKM',
        subtitle: 'Peer-to-Peer Lending App',
        body: 'A lending app giving small and medium enterprises mobile access to financing.',
        tags: ['Flutter', 'Fintech'],
      },
      {
        title: 'This island',
        subtitle: 'AI-Generated · Vibe Coded',
        body: 'An explorable pixel-art portfolio. Concept and design were human-directed; the code was AI-generated.',
        tags: ['React', 'TypeScript', 'Three.js', 'AI-generated'],
        image: {
          src: 'portfolio/island.webp',
          alt: 'The island from above: the village, the cottage, the lake with its dock and the workspace',
        },
      },
    ],
  },
  skills: {
    heading: 'Skills',
    pages: [
      {
        title: 'Skills and tools',
        bullets: [
          'Mobile development: Flutter, Dart, GetX, Provider, RESTful APIs',
          'Programming languages: Dart, Go, JavaScript, SQL',
          'AI and data: LLM integration, data analytics',
          'Tools: Git',
          'Languages: Indonesian (native), English (professional working proficiency)',
        ],
        tags: ['Flutter', 'Dart', 'GetX', 'Provider', 'Go', 'JavaScript', 'SQL', 'LLM', 'Git'],
      },
    ],
  },
  experience: {
    heading: 'Experience',
    pages: [
      {
        title: 'Software Engineer',
        subtitle: 'PT Tokoplas Ecommerce Indonesia',
        period: 'Dec 2022 – Present',
        bullets: [
          'Designed and built Poly, an LLM-powered customer assistant in the Tokoplas app that answers FAQs, tracks orders, handles reward enquiries, recommends products, summarises market prices and takes quotation requests.',
          'Develop and maintain the Tokoplas e-commerce app for resin products in Flutter, covering the checkout and payment flow and the customer loyalty programme (Android, iOS).',
          'Built two internal Flutter apps: a Seller app for inventory management and customer purchase history, and a Driver app for delivery assignments, step-by-step delivery procedures and order status updates.',
          'Integrate RESTful APIs with the backend team and take features from planning and design through to release on both app stores.',
        ],
      },
      {
        title: 'Mobile Developer',
        subtitle: 'PT Pinjaman Kemakmuran Rakyat',
        period: 'May 2022 – Dec 2022',
        bullets: [
          'Developed klikUMKM, a peer-to-peer (P2P) lending app that gives small and medium enterprises (SMEs) access to financing from their phones.',
          'Contributed to feature development of the SCBD mobile app as part of the engineering team.',
        ],
      },
    ],
  },
  highlights: {
    heading: 'Highlights',
    pages: [
      {
        title: 'Highlights',
        bullets: [
          '4+ years of experience building Flutter apps for e-commerce, logistics and fintech',
          'Designed and built Poly, an LLM-based assistant inside the Tokoplas app',
          'Responsible for a customer app and two internal apps at Tokoplas',
          'Honours graduate of the Hacktiv8 Full-Stack JavaScript Program',
          'Published research in numerical modelling (International Journal of GEOMATE, 2020)',
        ],
      },
    ],
  },
  education: {
    heading: 'Education',
    pages: [
      {
        title: 'Bachelor of Science in Mathematics',
        subtitle: 'Institut Teknologi Bandung',
        period: '2015 – 2019',
      },
      {
        title: 'Full-Stack JavaScript Program, Honours Graduate',
        subtitle: 'Hacktiv8 Indonesia',
        period: '2020',
      },
      {
        title: 'Publication',
        subtitle: 'International Journal of GEOMATE, 2020',
        body: 'Numerical Model for Dam Break Over a Movable Bed Using Finite Volume Method.',
        links: [
          {
            label: 'Download paper',
            href: 'https://geomatejournal.com/geomate/article/download/869/727',
          },
        ],
      },
    ],
  },
  contact: {
    heading: 'Contact',
    pages: [
      {
        title: 'Get in touch',
        body: 'Questions, ideas or a role in mind? Send a message anytime.',
        links: [
          { label: 'Email', copy: EMAIL, copiedNotice: 'Email copied' },
          { label: 'WhatsApp', href: WHATSAPP },
          {
            label: 'Download CV (PDF)',
            href: 'portfolio/charles-jonathan-cv.pdf',
            download: 'Charles Jonathan - Software Engineer.pdf',
          },
        ],
      },
    ],
  },
};
