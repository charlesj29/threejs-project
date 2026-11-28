import { useEffect, useState, type JSX, type MouseEvent } from 'react';
import type { PortfolioLink, PortfolioPage } from '../core/content/portfolio';

/** How long the "copied" notice stays up. */
const NOTICE_MS = 2000;

/** Site-relative files (images, the CV) resolve against the app's base URL. */
function resolveHref(href: string): string {
  return /^[a-z]+:/i.test(href) ? href : `${import.meta.env.BASE_URL}${href}`;
}

/** Copies text, with a fallback for browsers that block the async clipboard. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  }
}

function LinkButton({
  link,
  onCopied,
}: {
  readonly link: PortfolioLink;
  readonly onCopied: (notice: string) => void;
}): JSX.Element {
  if ('copy' in link) {
    const copy = (event: MouseEvent<HTMLButtonElement>): void => {
      event.currentTarget.blur(); // or Space would press it again
      void copyText(link.copy).then((copied) => {
        if (copied) onCopied(link.copiedNotice);
      });
    };
    return (
      <button type="button" className="portfolio-link" onClick={copy}>
        {link.label}
      </button>
    );
  }
  const href = resolveHref(link.href);
  const external = /^https?:/i.test(href);
  return (
    <a
      className="portfolio-link"
      href={href}
      {...(link.download ? { download: link.download } : {})}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {link.label}
    </a>
  );
}

/** One page of a portfolio panel: title, details, screenshot and links. */
export function PortfolioPageView({ page }: { readonly page: PortfolioPage }): JSX.Element {
  const [notice, setNotice] = useState<string | null>(null);
  const [shotsOpen, setShotsOpen] = useState(false);
  useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <article className="portfolio-page">
      <h2 className="portfolio-title">{page.title}</h2>
      {(page.subtitle ?? page.period) && (
        <p className="portfolio-meta">
          {page.subtitle && <span>{page.subtitle}</span>}
          {page.period && <span className="portfolio-period">{page.period}</span>}
        </p>
      )}
      {page.body && <p className="portfolio-body">{page.body}</p>}
      {page.bullets && (
        <ul className="portfolio-bullets">
          {page.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
      {page.image && (
        // Collapsed at first: the text comes first, the screenshot on request
        // (and it only downloads once opened).
        <details
          className="portfolio-shot-toggle"
          onToggle={(event) => {
            setShotsOpen(event.currentTarget.open);
          }}
        >
          <summary
            onClick={(event) => {
              event.currentTarget.blur(); // or Space would press it again
            }}
          >
            {shotsOpen ? 'Hide screenshots' : 'Show screenshots'}
          </summary>
          <a
            className="portfolio-shot"
            href={resolveHref(page.image.src)}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the full-size image"
          >
            <img src={resolveHref(page.image.src)} alt={page.image.alt} loading="lazy" />
          </a>
        </details>
      )}
      {page.tags && (
        <ul className="portfolio-tags" aria-label="Technologies">
          {page.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}
      {page.links && (
        <div className="portfolio-links">
          {page.links.map((link) => (
            <LinkButton key={link.label} link={link} onCopied={setNotice} />
          ))}
        </div>
      )}
      {page.links?.some((link) => 'copy' in link) && (
        // Room for the "copied" notice, only on pages with a copy button.
        <p className={notice ? 'portfolio-notice is-shown' : 'portfolio-notice'} role="status">
          {notice}
        </p>
      )}
    </article>
  );
}
