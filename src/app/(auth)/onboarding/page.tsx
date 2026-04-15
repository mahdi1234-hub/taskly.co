"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Taskly",
      description: "Your AI-powered document analytics platform. Let us show you around.",
    },
    {
      title: "Upload Documents",
      description: "Upload PDFs, text files, and more. Our AI will automatically analyze and extract insights.",
    },
    {
      title: "Chat with your Docs",
      description: "Ask questions about your documents and get instant, accurate answers powered by AI.",
    },
  ];

  const handleComplete = async () => {
    await fetch("/api/onboarding", { method: "POST" });
    router.push("/documents");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="w-full max-w-lg mx-auto px-6">
        <div className="text-center mb-8">
          <FileText className="h-10 w-10 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">{steps[step].title}</h1>
          <p className="text-[#666]">{steps[step].description}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-12 rounded-full transition-colors ${
                i <= step ? "bg-[#0a0a0a]" : "bg-[#e5e5e5]"
              }`}
            />
          ))}
        </div>

        <div className="flex justify-center">
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 bg-[#0a0a0a] text-white px-6 py-3 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 bg-[#0a0a0a] text-white px-6 py-3 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
