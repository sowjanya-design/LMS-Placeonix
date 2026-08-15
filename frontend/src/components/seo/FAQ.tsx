import React from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
}

export default function FAQ({ items }: FAQProps) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
        Frequently Asked Questions
      </h2>
      <div className="space-y-6">
        {items.map((item, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900">
              {item.question}
            </h3>
            <p className="mt-2 text-base text-gray-500">
              {item.answer}
            </p>
          </div>
        ))}
      </div>
      
      {/* Schema.org FAQ Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": items.map(item => ({
              "@type": "Question",
              "name": item.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer
              }
            }))
          })
        }}
      />
    </div>
  );
}
