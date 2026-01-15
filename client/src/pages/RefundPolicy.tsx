import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import kahaniLogo from "@assets/Kahani Dummy Logo (1)_1762679074954.png";
import { Footer } from "@/components/Footer";

export default function RefundPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[#EEE9DF] border-b border-[#C9C1B1]/30">
        <div className="flex items-center justify-between px-6 py-4 md:px-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/company-legal")}
            className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90 border border-[#C9C1B1]/20"
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
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            REFUND POLICY
          </h1>
          <p className="text-lg mb-8 text-foreground">
            This Refund Policy governs the circumstances in which refunds may be
            considered in respect of products and services offered by Kahani. By
            purchasing, accessing, or using any Kahani offering, the user agrees
            to be bound by this Policy.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              1. Nature of Offerings
            </h2>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              1.1 Kahani provides digital content, creative materials, live and
              recorded experiences, subscriptions, memberships, and physical
              products, many of which are delivered immediately or prepared
              specifically for the user.
            </h3>
            <p className="mb-4 text-muted-foreground">
              Owing to the nature of such offerings, transactions are generally
              irreversible once access, availability, or delivery is initiated.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              2. General Refund Framework
            </h2>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              2.1 Refunds are not routinely available and are not guaranteed.
            </h3>
            <p className="mb-4 text-muted-foreground">
              A refund may be considered only in exceptional circumstances where
              a material issue directly attributable to Kahani substantially
              prevents the intended use of the purchased offering.
            </p>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              2.2 The provision of customer support, corrections, replacements,
              credits, or alternative arrangements shall not be construed as an
              admission of refund liability.
            </h3>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              3. Finality of Purchase
            </h2>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              3.1 A purchase shall be deemed final and non-reversible once
              access to digital content, sessions, materials, subscriptions, or
              recorded experiences is enabled, or where a physical product is
              dispatched or delivery is attempted.
            </h3>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              3.2 For the purposes of this Policy, access includes partial
              access, preview access, or technical availability, irrespective of
              actual usage.
            </h3>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              4. Non-Refundable Circumstances
            </h2>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              4.1 Refunds shall not be considered on grounds including, but not
              limited to:
            </h3>
            <p className="mb-4 text-muted-foreground">
              Change of mind, personal preference, subjective dissatisfaction,
              differences in expectations, scheduling conflicts,
              non-participation, or dissatisfaction with creative, narrative,
              instructional, or stylistic elements.
            </p>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              4.2 Refunds shall also not be issued for technical issues arising
              from:
            </h3>
            <p className="mb-4 text-muted-foreground">
              User devices, internet connectivity, software, third-party
              platforms, failure to review system requirements or instructions,
              or for purchases made under promotional, discounted, or bundled
              pricing.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              5. Grounds for Consideration
            </h2>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              5.1 A refund request may be reviewed only where all of the
              following conditions are satisfied:
            </h3>
            <ul className="list- pl-6 mb-4 text-muted-foreground space-y-2">
              <li>
                the issue arises solely from Kahani’s delivery of the offering
                and materially prevents its intended use;
              </li>
              <li>
                the issue remains unresolved despite reasonable corrective or
                support measures;
              </li>
              <li>
                a written request is submitted within forty-eight (48) hours
                from the time of purchase;
              </li>
              <li>
                the user has not meaningfully accessed, consumed, or otherwise
                derived benefit from the offering.
              </li>
            </ul>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              5.2 Failure to satisfy any one of the above conditions shall
              render the request ineligible for consideration.
            </h3>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              6. Procedure for Submission of Complaints
            </h2>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              6.1 Any complaint or request seeking a refund shall be submitted
              exclusively by email to:{" "}
              <a
                href="mailto:vaani@kahani.xyz"
                className="text-primary hover:underline"
              >
                vaani@kahani.xyz
              </a>
            </h3>
            <p className="mb-4 text-muted-foreground">
              Along with valid proof of purchase and a detailed description of
              the issue.
            </p>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              6.2 Kahani may require the submission of additional information or
              documentation reasonably necessary for assessment.
            </h3>
            <p className="mb-4 text-muted-foreground">
              Requests submitted through any other mode, or lacking required
              information, may not be processed.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              7. Assessment and Resolution
            </h2>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              7.1 All refund requests shall be assessed on an individual basis,
              and the determination to approve or deny a refund shall rest
              solely with Kahani.
            </h3>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              7.2 Kahani may, at its discretion, propose alternative remedies
              including technical assistance, content correction, access
              restoration, replacement services, credits, or extensions.
            </h3>
            <p className="mb-4 text-muted-foreground">
              The provision or acceptance of any such remedy shall constitute
              full and final resolution of the complaint.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              8. Scope and Method of Refund
            </h2>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              8.1 Where a refund is exceptionally approved, it shall be limited
              to the net amount actually paid by the user.
            </h3>
            <p className="mb-4 text-muted-foreground">
              Taxes, processing fees, promotional adjustments, and ancillary
              charges shall not be refundable.
            </p>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              8.2 Refunds shall not be issued in respect of partially used
              services or individual components of bundled offerings.
            </h3>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              9. Fair Use
            </h2>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              9.1 Kahani reserves the right to decline or limit refund requests
              where it reasonably determines that such requests are repetitive,
              inconsistent with the intent of this Policy, or otherwise
              indicative of misuse.
            </h3>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              10. Amendments
            </h2>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              10.1 Kahani reserves the right to amend or update this Policy from
              time to time. The version in force at the time of purchase shall
              apply to the relevant transaction.
            </h3>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              11. Governing Law and Jurisdiction
            </h2>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              11.1 This Policy shall be governed by and construed in accordance
              with the laws of India.
            </h3>
            <p className="mb-4 text-muted-foreground">
              The courts located in Gurugram, Haryana, India shall have
              exclusive jurisdiction over any disputes arising under or in
              connection with this Policy.
            </p>
          </section>

          <div className="mt-12 p-6 bg-muted/30 rounded-lg">
            <p className="text-center text-muted-foreground italic">
              Kahani is committed to ensuring your satisfaction while
              maintaining fair and transparent policies.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
