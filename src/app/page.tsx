import Link from "next/link";
import { FileText, Brain, BarChart3, Search, Zap, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#fafafa]/80 backdrop-blur-xl border-b border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <span className="text-lg font-semibold tracking-tight">Taskly</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#features" className="text-sm text-[#666] hover:text-[#0a0a0a] transition-colors">
              Features
            </Link>
            <Link href="/login" className="text-sm bg-[#0a0a0a] text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-[#e5e5e5] rounded-full px-4 py-1.5 text-xs text-[#666] mb-8">
            <Zap className="h-3 w-3" />
            AI-Powered Document Intelligence
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.1] mb-6">
            Understand your
            <br />
            documents with AI
          </h1>
          <p className="text-lg md:text-xl text-[#666] max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload, analyze, and chat with your documents. Taskly extracts insights,
            generates summaries, and answers questions about your files instantly.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="bg-[#0a0a0a] text-white px-8 py-3 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Start for free
            </Link>
            <Link
              href="#features"
              className="border border-[#e5e5e5] bg-white px-8 py-3 rounded-md text-sm font-medium hover:bg-[#f5f5f5] transition-colors"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm overflow-hidden">
            <div className="h-10 bg-[#fafafa] border-b border-[#e5e5e5] flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-[#e5e5e5]" />
              <div className="w-3 h-3 rounded-full bg-[#e5e5e5]" />
              <div className="w-3 h-3 rounded-full bg-[#e5e5e5]" />
            </div>
            <div className="p-8 grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-4">
                <div className="h-4 bg-[#f5f5f5] rounded w-3/4" />
                <div className="h-4 bg-[#f5f5f5] rounded w-full" />
                <div className="h-4 bg-[#f5f5f5] rounded w-5/6" />
                <div className="h-32 bg-[#f5f5f5] rounded mt-6" />
                <div className="h-4 bg-[#f5f5f5] rounded w-2/3" />
              </div>
              <div className="space-y-3">
                <div className="h-24 bg-[#f5f5f5] rounded" />
                <div className="h-24 bg-[#f5f5f5] rounded" />
                <div className="h-24 bg-[#f5f5f5] rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 bg-white border-t border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Everything you need
            </h2>
            <p className="text-[#666] text-lg max-w-2xl mx-auto">
              A complete document intelligence platform powered by AI
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "AI Document Analysis",
                description: "Automatically extract summaries, key entities, and insights from any document",
              },
              {
                icon: Search,
                title: "Semantic Search",
                description: "Find information across all your documents using natural language queries",
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description: "Track document processing, categories, and trends with visual analytics",
              },
              {
                icon: FileText,
                title: "Document Vault",
                description: "Securely store and organize all your documents in one place",
              },
              {
                icon: Zap,
                title: "AI Chat Assistant",
                description: "Ask questions about your documents and get instant, accurate answers",
              },
              {
                icon: Shield,
                title: "Secure Processing",
                description: "Your documents are processed securely with enterprise-grade encryption",
              },
            ].map((feature) => (
              <div key={feature.title} className="p-6 rounded-xl border border-[#e5e5e5] bg-[#fafafa]">
                <feature.icon className="h-8 w-8 mb-4 text-[#0a0a0a]" />
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-[#666] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Ready to get started?
          </h2>
          <p className="text-[#666] text-lg mb-8">
            Start analyzing your documents with AI today.
          </p>
          <Link
            href="/login"
            className="inline-flex bg-[#0a0a0a] text-white px-8 py-3 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <FileText className="h-4 w-4" />
            Taskly
          </div>
          <p className="text-xs text-[#999]">AI-Powered Document Analytics</p>
        </div>
      </footer>
    </div>
  );
}
