import { Metadata } from "next";
import { constructMetadata } from "@/lib/seo";
import FAQ from "@/components/seo/FAQ";

interface CourseLandingContent {
  title: string;
  description: string;
  keywords: string[];
  fee: string;
  duration: string;
  faqs: { question: string; answer: string }[];
}

// Mock data fetcher - replace with actual DB call
async function getCourseData(slug: string) {
  const courses: Record<string, CourseLandingContent> = {
    "sap-btp-training-hyderabad": {
      title: "Best SAP BTP Training Institute in Hyderabad with Placement",
      description:
        "Learn SAP BTP, ABAP on Cloud, and RAP from industry experts. Job-oriented SAP BTP course in Hyderabad with 100% placement assistance and real-time projects.",
      keywords: [
        "SAP BTP Course in Hyderabad",
        "Best SAP Institute in Hyderabad",
        "SAP RAP Tutorials",
        "SAP Training with Placement",
      ],
      fee: "₹25,000",
      duration: "45 Days",
      faqs: [
        {
          question: "What is SAP BTP?",
          answer:
            "SAP Business Technology Platform (BTP) is an integrated offering comprised of four technology portfolios: database and data management, application development and integration, analytics, and intelligent technologies.",
        },
        {
          question: "Do you provide placement assistance?",
          answer:
            "Yes, we provide 100% placement assistance for our SAP BTP course in Hyderabad.",
        },
      ],
    },
    "data-science-course-hyderabad": {
      title: "Data Science Course in Hyderabad with Placement",
      description:
        "Top-rated Data Science training in Hyderabad. Learn Python, Machine Learning, and AI. Affordable fees and guaranteed placement support.",
      keywords: [
        "Data Science Course Hyderabad",
        "Python Institute Hyderabad",
        "Data Science course fees in Hyderabad",
      ],
      fee: "₹30,000",
      duration: "3 Months",
      faqs: [
        {
          question: "What is the fee for the Data Science course?",
          answer:
            "The fee is ₹30,000 which includes all materials and placement support.",
        },
      ],
    },
    "generative-ai-course-freshers-hyderabad": {
      title:
        "Gen AI Course for Freshers in Hyderabad | Learn Prompt Engineering",
      description:
        "Kickstart your AI career. Best Generative AI course in Hyderabad designed specifically for freshers. Learn LLMs, Prompt Engineering, and MLOps.",
      keywords: [
        "gen AI course for freshers Hyderabad",
        "generative AI course in Hyderabad",
        "AI course with placement Hyderabad",
      ],
      fee: "₹20,000",
      duration: "1 Month",
      faqs: [
        {
          question: "Is this course suitable for freshers?",
          answer:
            "Absolutely! This GenAI course is tailored for freshers with no prior AI experience.",
        },
      ],
    },
  };
  return courses[slug];
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const course = await getCourseData(params.slug);

  if (!course) {
    return constructMetadata({ title: "Course Not Found", description: "" });
  }

  return constructMetadata({
    title: course.title,
    description: course.description,
    keywords: course.keywords,
    canonicalUrl: `https://placeonix.in/courses/${params.slug}`,
  });
}

export default async function CourseLandingPage({
  params,
}: {
  params: { slug: string };
}) {
  const course = await getCourseData(params.slug);

  if (!course) {
    return <div className="text-center py-20 text-2xl">Course not found</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-blue-900 text-white py-20 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          {course.title}
        </h1>
        <p className="text-xl md:text-2xl max-w-3xl mx-auto font-light">
          {course.description}
        </p>
        <div className="mt-8 flex justify-center space-x-4">
          <span className="bg-blue-800 px-4 py-2 rounded-md font-semibold">
            Duration: {course.duration}
          </span>
          <span className="bg-blue-800 px-4 py-2 rounded-md font-semibold">
            Fee: {course.fee}
          </span>
        </div>
        <button className="mt-8 bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-bold py-3 px-8 rounded-full text-lg transition-colors">
          Enroll Now
        </button>
      </div>

      {/* Course Content / Modules */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Curriculum Overview
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-2">
              Module 1: Foundations
            </h3>
            <p className="text-gray-600">Core concepts and setup.</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-2">
              Module 2: Advanced Topics
            </h3>
            <p className="text-gray-600">
              Deep dive into real-world scenarios.
            </p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-2">
              Module 3: Hands-on Projects
            </h3>
            <p className="text-gray-600">
              Build capstone projects for your portfolio.
            </p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-2">
              Module 4: Interview Prep
            </h3>
            <p className="text-gray-600">
              Mock interviews and resume building.
            </p>
          </div>
        </div>
      </div>

      {/* SEO FAQ Block */}
      {course.faqs && (
        <div className="bg-gray-50 border-t border-gray-200">
          <FAQ items={course.faqs} />
        </div>
      )}
    </div>
  );
}
