import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Mail,
  AlertTriangle,
  Clock,
  Shield,
  Trash2,
  HelpCircle,
} from "lucide-react";
import kahaniLogo from "@assets/Kahani Dummy Logo (1)_1762679074954.png";
import { Footer } from "@/components/Footer";

export default function DataDeletion() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-[#EEE9DF] border-b border-[#C9C1B1]/30">
        <div className="flex items-center justify-between px-6 py-4 md:px-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="min-h-[44px] min-w-[44px]"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <img
            src={kahaniLogo}
            alt="Kahani Logo"
            className="h-12 w-auto object-contain"
          />

          <div className="w-[44px]" />
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-16">
        <div className="prose prose-lg max-w-none">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="h-8 w-8 text-[#2C5282] flex-shrink-0" />
            <h1 className="text-4xl font-bold mb-0 text-foreground">
              User Data Deletion Instructions
            </h1>
          </div>
          <p className="text-muted-foreground mb-8">
            Last updated: December 2025
          </p>

          <p className="text-lg mb-8 text-foreground">
            At <strong>Kahani</strong>, we respect your privacy and give every
            user the right to request deletion of their personal data at any
            time. This page explains how you can submit a data deletion request
            for any information associated with your Kahani orders or WhatsApp
            interactions.
          </p>

          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-6 w-6 text-[#2C5282] flex-shrink-0 mt-5" />
              <h2 className="text-2xl font-semibold text-foreground">
                What Data Can Be Deleted
              </h2>
            </div>
            <p className="mb-4 text-muted-foreground">
              You may request deletion of:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-muted-foreground">
              <li>
                Your <strong className="text-foreground">phone number</strong>{" "}
                associated with a Kahani order
              </li>
              <li>
                Your{" "}
                <strong className="text-foreground">trial ID / order ID</strong>
              </li>
              <li>
                All <strong className="text-foreground">Kahani stories</strong>{" "}
                created for you
              </li>
              <li>
                Any{" "}
                <strong className="text-foreground">messages or content</strong>{" "}
                generated as part of the Kahani storytelling experience
              </li>
              <li>
                Any <strong className="text-foreground">metadata</strong> used
                to deliver your story
              </li>
              <li>
                Any{" "}
                <strong className="text-foreground">
                  logs or workflow data
                </strong>{" "}
                linked to your order
              </li>
            </ul>
            <p className="text-muted-foreground">
              We will permanently remove these from our systems unless we are
              required to retain certain information for legal or compliance
              reasons.
            </p>
          </section>

          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-6 w-6 text-[#D4A574] flex-shrink-0 mt-5" />
              <h2 className="text-2xl font-semibold text-foreground">
                Important Notice About Story Deletion
              </h2>
            </div>
            <div className="bg-[#F5E6D3]/50 border-l-4 border-[#D4A574] p-6 rounded-lg mb-4">
              <p className="mb-2 text-foreground font-semibold">
                When you request data deletion:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground">
                    All your Kahani stories and related content will be
                    permanently deleted.
                  </strong>
                </li>
                <li>
                  You will{" "}
                  <strong className="text-foreground">
                    no longer be able to access, retrieve, or restore
                  </strong>{" "}
                  your stories after deletion.
                </li>
                <li>
                  This action is{" "}
                  <strong className="text-foreground">irreversible</strong>.
                </li>
              </ul>
            </div>
            <p className="text-muted-foreground">
              Please request deletion only if you are sure you no longer need
              access to your content.
            </p>
          </section>

          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-6 w-6 text-[#2C5282] flex-shrink-0 mt-5" />
              <h2 className="text-2xl font-semibold text-foreground">
                How to Request Deletion
              </h2>
            </div>
            <p className="mb-4 text-muted-foreground">
              To request deletion of your data, please email us at:
            </p>
            <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-6 mb-4 hover:border-[#2C5282] transition-colors">
              <a
                href="mailto:vaani@kahani.xyz"
                className="text-xl font-semibold text-[#2C5282] hover:text-[#1A4A6B] hover:underline flex items-center gap-2"
              >
                <Mail className="h-5 w-5 mt-1.5" />
                vaani@kahani.xyz
              </a>
            </div>
            <p className="mb-2 text-muted-foreground">
              Please include <strong className="text-foreground">either</strong>{" "}
              of the following in your email so we can identify your data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                Your <strong className="text-foreground">Order ID</strong>{" "}
                (preferred), <strong className="text-foreground">OR</strong>
              </li>
              <li>
                The <strong className="text-foreground">mobile number</strong>{" "}
                used to place the order (e.g., +91XXXXXXXXXX)
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              This helps us locate your record and process your request
              securely.
            </p>
          </section>

          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-6 w-6 text-[#2C5282] flex-shrink-0 mt-5" />
              <h2 className="text-2xl font-semibold text-foreground">
                Processing Time
              </h2>
            </div>
            <p className="mb-4 text-muted-foreground">
              Once we receive your request, we will:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-muted-foreground">
              <li>Verify the information you provided</li>
              <li>Remove your data from our systems</li>
              <li>Confirm the deletion via email</li>
            </ul>
            <div className="bg-[#F5E6D3]/30 rounded-lg p-4 inline-block">
              <p className="text-foreground font-semibold">
                ⏱️ Data deletion will be completed within{" "}
                <strong className="text-[#2C5282]">48–72 hours</strong>.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-6 w-6 text-[#2C5282] flex-shrink-0 mt-5" />
              <h2 className="text-2xl font-semibold text-foreground">
                Questions or Support
              </h2>
            </div>
            <p className="mb-4 text-muted-foreground">
              If you have any questions about how your data is stored or how
              deletion works, feel free to reach us at:
            </p>
            <div className="bg-white border-2 border-[#E2E8F0] rounded-lg p-6 hover:border-[#2C5282] transition-colors">
              <a
                href="mailto:vaani@kahani.xyz"
                className="text-lg font-semibold text-[#2C5282] hover:text-[#1A4A6B] hover:underline flex items-center gap-2"
              >
                <Mail className="h-5 w-5" />
                vaani@kahani.xyz
              </a>
            </div>
            <p className="mt-4 text-muted-foreground">We're here to help.</p>
          </section>

          <div className="mt-12 p-6 bg-muted/30 rounded-lg">
            <p className="text-center text-muted-foreground italic">
              Kahani is committed to respecting your privacy and ensuring your
              data deletion requests are processed promptly and securely.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
