import { Metadata } from "next";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  noindex?: boolean;
}

export function constructMetadata({
  title,
  description,
  keywords = [],
  canonicalUrl,
  ogImage = "/default-og.png", // Add default image path
  noindex = false,
}: SEOProps): Metadata {
  return {
    title: `${title} | Placeonix`,
    description,
    keywords: keywords.join(", "),
    openGraph: {
      title: `${title} | Placeonix`,
      description,
      type: "website",
      url: canonicalUrl,
      images: [
        {
          url: ogImage,
        },
      ],
      siteName: "Placeonix",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Placeonix`,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: !noindex,
      follow: !noindex,
    },
  };
}
