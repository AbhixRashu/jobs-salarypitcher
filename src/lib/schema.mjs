import { SITE } from '../config/constants.mjs';

function iso(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

export function buildJobPostingSchema(job) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || `${job.title} recruitment by ${job.organization}. Official notification details, eligibility, important dates and application link.`,
    datePosted: iso(job.datePosted),
    validThrough: iso(job.lastDate),
    employmentType: 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.organization,
      sameAs: job.orgUrl || undefined,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
        addressRegion: job.state || undefined,
      },
    },
    identifier: {
      '@type': 'PropertyValue',
      name: job.organization,
      value: job.slug,
    },
    directApply: false,
    url: `${SITE.origin}/jobs/${job.slug}`,
  };

  if (job.salaryText) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'INR',
      value: {
        '@type': 'QuantitativeValue',
        valueText: job.salaryText,
      },
    };
  }

  if (job.qualify) {
    schema.educationRequirements = {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: job.qualify,
    };
  }

  return schema;
}

export function buildBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.href ? `${SITE.origin}${item.href}` : undefined,
    })),
  };
}

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.origin,
    description: SITE.tagline,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE.origin}/jobs?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
