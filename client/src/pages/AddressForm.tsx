import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2 } from "lucide-react";

interface AddressFormProps {
  params: {
    trialId: string;
  };
}

// Dialog states that drive the single progress/result modal
type DialogPhase =
  | "idle"        // closed
  | "submitting"  // "Submitting your data…"
  | "uploading"   // "Uploading images…"
  | "countdown";  // "Redirecting to payment in 3…"

export default function AddressForm({ params }: AddressFormProps) {
  const { trialId } = params;
  const [, navigate] = useLocation();

  // Show an error banner when redirected back from a failed payment
  const paymentFailed = useMemo(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("error") === "payment_failed";
  }, []);

  // orderId is a stable human-readable identifier for this order
  const orderId = useMemo(
    () => trialId,
    [trialId],
  );

  const [buyerName, setBuyerName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [copiesOpen, setCopiesOpen] = useState(false);
  const [extraCopiesOption, setExtraCopiesOption] = useState<string | null>(
    null,
  );
  const [customExtraCopies, setCustomExtraCopies] = useState("");
  const [chapterTitles, setChapterTitles] = useState<string[]>([]);
  const [chapterImages, setChapterImages] = useState<(File | null)[]>([]);
  const [chapterPreviews, setChapterPreviews] = useState<(string | null)[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPromoField, setShowPromoField] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  type AppliedDiscount = {
    code: string;
    discountType: string;
    discountValue: number;
    discountAmountPaise: number;
    finalAmountPaise: number;
  };
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);

  // Dialog / progress state
  const [dialogPhase, setDialogPhase] = useState<DialogPhase>("idle");
  const [countdown, setCountdown] = useState(3);
  // PhonePe redirect URL resolved after order-details are saved
  const [phonePeUrl, setPhonePeUrl] = useState<string | null>(null);

  const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
    "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
    "Ladakh", "Lakshadweep", "Puducherry",
  ];

  const extraCopies = useMemo(() => {
    if (!extraCopiesOption || extraCopiesOption === "none") return 0;
    if (extraCopiesOption === "custom") {
      const n = Number(customExtraCopies || "0");
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    }
    const parsed = parseInt(extraCopiesOption, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [extraCopiesOption, customExtraCopies]);

  const totalCopies = 1 + extraCopies;
  const baseExtraAmountPaise = extraCopies * 400 * 100;
  const finalAmountPaise = appliedDiscount
    ? appliedDiscount.finalAmountPaise
    : baseExtraAmountPaise;
  const discountAmountPaise = appliedDiscount
    ? appliedDiscount.discountAmountPaise
    : 0;
  const extraAmount = Math.round(finalAmountPaise / 100);
  const isBulkOrder =
    extraCopiesOption === "custom" && extraCopies > 5;

  const selectedImageCount = useMemo(
    () => chapterImages.filter((f) => !!f).length,
    [chapterImages],
  );

  // Countdown effect — ticks down once we're in the "countdown" phase,
  // then navigates directly to the resolved PhonePe URL.
  useEffect(() => {
    if (dialogPhase !== "countdown") return;

    if (countdown <= 0) {
      if (phonePeUrl) {
        window.location.href = phonePeUrl;
      }
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [dialogPhase, countdown, phonePeUrl]);

  const handleChapterImageChange = (
    index: number,
    fileList: FileList | null,
  ) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const maxSizeBytes = 10 * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      setError("Images must be 10MB or smaller.");
      return;
    }

    setError(null);

    setChapterImages((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });

    setChapterPreviews((prev) => {
      const next = [...prev];
      const existing = next[index];
      if (existing) URL.revokeObjectURL(existing);
      next[index] = URL.createObjectURL(file);
      return next;
    });
  };

  const handleRemoveChapterImage = (index: number) => {
    setChapterImages((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setChapterPreviews((prev) => {
      const next = [...prev];
      const url = next[index];
      if (url) URL.revokeObjectURL(url);
      next[index] = null;
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    async function loadChapters() {
      try {
        const res = await fetch(`/api/albums/${trialId}`);
        if (!res.ok) return;
        const data = await res.json();
        const titlesSource =
          data.album?.questionSetTitles?.en ??
          data.album?.questionSetTitles?.hn ??
          [];
        const titles: string[] = Array.isArray(titlesSource)
          ? titlesSource
          : [];
        if (!cancelled) {
          setChapterTitles(titles);
          setChapterImages(Array(titles.length).fill(null));
          setChapterPreviews(Array(titles.length).fill(null));
        }
      } catch (e) {
        console.error("Failed to load chapter titles for order form", e);
      }
    }
    loadChapters();
    return () => {
      cancelled = true;
    };
  }, [trialId]);

  const handleApplyPromo = useCallback(async () => {
    const code = promoCode.trim();
    if (!code || baseExtraAmountPaise <= 0) return;
    setPromoLoading(true);
    setPromoError(null);
    setAppliedDiscount(null);
    try {
      const res = await fetch("/api/discounts/validate-book-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, baseAmountPaise: baseExtraAmountPaise }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPromoError(data.error || "Code not valid");
      } else {
        setAppliedDiscount({
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountAmountPaise: data.discountAmountPaise,
          finalAmountPaise: data.finalAmountPaise,
        });
      }
    } catch {
      setPromoError("Could not validate code. Please try again.");
    } finally {
      setPromoLoading(false);
    }
  }, [promoCode, baseExtraAmountPaise]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!confirmed) {
      setError("Please confirm that the details are correct.");
      return;
    }
    if (extraCopiesOption === "custom" && extraCopies > 0 && extraCopies < 6) {
      setError(
        "For custom (bulk) orders, please select at least 6 extra copies.",
      );
      setCopiesOpen(true);
      return;
    }

    // ── Step 1: save form data ─────────────────────────────────────────
    setDialogPhase("submitting");

    let rowId: string;
    try {
      const res = await fetch("/api/user-order-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trialId,
          orderId,
          buyerFullName: buyerName,
          authorName,
          additionalCopies: extraCopies,
          recipientName,
          recipientPhone,
          addressLine1,
          addressLine2,
          city,
          state,
          pincode,
          detailsConfirmed: confirmed,
          promoCode: appliedDiscount?.code ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Request failed: ${res.status}`);
      }

      const data = await res.json();
      rowId = data.id as string;
    } catch (err) {
      console.error(err);
      setDialogPhase("idle");
      setError("Something went wrong while saving your details. Please try again.");
      return;
    }

    // ── Step 2: upload images ──────────────────────────────────────────
    const filesToUpload = chapterImages.filter(
      (f): f is File => !!f,
    );

    if (filesToUpload.length > 0) {
      setDialogPhase("uploading");

      try {
        const formData = new FormData();
        formData.append("orderId", orderId);
        for (const file of filesToUpload) {
          formData.append("photos", file);
        }

        const res = await fetch(`/api/user-order-images/${rowId}`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          // Non-fatal: data is already saved, just log the image failure
          console.warn("Image upload failed — order still saved");
        }
      } catch (err) {
        console.warn("Image upload error (non-fatal):", err);
      }
    }

    // ── Step 3: show result ────────────────────────────────────────────
    if (extraCopies > 0 && !isBulkOrder) {
      // Create the PhonePe order server-side and get the redirect URL
      try {
        const payRes = await fetch("/api/phonepe/create-extra-copies-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    orderDetailsId: rowId,
                    promoCode: appliedDiscount?.code ?? null,
                  }),
        });

        if (!payRes.ok) {
          const d = await payRes.json().catch(() => ({}));
          throw new Error((d as { error?: string }).error || "Payment setup failed");
        }

        const payData = await payRes.json();
        setPhonePeUrl(payData.redirectUrl as string);
        setCountdown(3);
        setDialogPhase("countdown");
      } catch (err) {
        console.error("Failed to create PhonePe order:", err);
        setDialogPhase("idle");
        setError("Could not set up payment. Your order details were saved — please contact support.");
      }
    } else {
      navigate("/book-order-confirmation");
    }
  };

  // ── Dialog content helper ──────────────────────────────────────────
  const dialogOpen = dialogPhase !== "idle";

  const DialogBody = () => {
    if (dialogPhase === "submitting") {
      return (
        <DialogHeader className="items-center gap-4">
          <Loader2 className="h-12 w-12 text-[#A35139] animate-spin" />
          <DialogTitle className="text-lg font-bold text-[#1B2632]">
            Submitting your data…
          </DialogTitle>
          <DialogDescription className="text-sm text-[#6B7280]">
            Saving your book details to our system.
          </DialogDescription>
        </DialogHeader>
      );
    }

    if (dialogPhase === "uploading") {
      return (
        <DialogHeader className="items-center gap-4">
          <Loader2 className="h-12 w-12 text-[#A35139] animate-spin" />
          <DialogTitle className="text-lg font-bold text-[#1B2632]">
            Uploading images…
          </DialogTitle>
          <DialogDescription className="text-sm text-[#6B7280]">
            Securely uploading your {selectedImageCount} photo
            {selectedImageCount !== 1 ? "s" : ""} to our server.
          </DialogDescription>
        </DialogHeader>
      );
    }

    if (dialogPhase === "countdown") {
      return (
        <>
          <DialogHeader className="items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[#A35139]/10 flex items-center justify-center">
              <span className="text-3xl font-bold text-[#A35139]">
                {countdown > 0 ? countdown : "↗"}
              </span>
            </div>
            <DialogTitle className="text-lg font-bold text-[#1B2632]">
              Redirecting to payment
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              {countdown > 0
                ? `Taking you to PhonePe in ${countdown}…`
                : "Redirecting now…"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 rounded-lg bg-[#F5F3EF] px-4 py-3 text-center">
            <p className="text-xs text-[#4B5563]">Amount due for extra copies</p>
            <p className="text-2xl font-bold text-[#A35139]">₹{extraAmount}</p>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <>
      {/* ── Progress / result dialog ──────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={() => {
          // Dialog is always non-dismissable while in progress
        }}
      >
        <DialogContent
          hideCloseButton
          className="max-w-sm rounded-2xl text-center"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogBody />
        </DialogContent>
      </Dialog>

      <div className="w-full min-h-screen bg-[#EEE9DF] flex flex-col">
        <header className="w-full sticky top-0 z-30 bg-[#EEE9DF]/95 backdrop-blur-sm border-b border-[#C9C1B1]/30">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
            <Button
              id="address-form-back"
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="min-h-[36px] min-w-[36px] h-9 w-9 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white border border-[#C9C1B1]/20"
            >
              <ArrowLeft className="h-4 w-4 text-[#1B2632]" />
            </Button>
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-[#1B2632] font-['Outfit']">
              Complete your Kahani book details
            </h1>
          </div>
        </header>

        <main className="flex-1 w-full">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {paymentFailed && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Your payment was not completed. Don't worry — your details are saved. You can try again below.
              </div>
            )}

            <p className="text-xs sm:text-sm text-[#4B5563] mb-4">
              This helps us print your book correctly and ship it to the right address.
            </p>

            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm space-y-5"
            >
              {/* Order & names */}
              <div className="grid grid-cols-1 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs font-medium text-[#4B5563] mb-1">
                    Order ID
                  </label>
                  <input
                    type="text"
                    value={orderId}
                    readOnly
                    className="w-full rounded-lg border border-[#D4D4D4] bg-[#F9F9F7] px-3 py-2 text-sm text-[#6B7280] cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4B5563] mb-1">
                    Buyer full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full rounded-lg border border-[#D4D4D4] px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4B5563] mb-1">
                    Author name to print on the book <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full rounded-lg border border-[#D4D4D4] px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Photos – chapter wise */}
              <div>
                <label className="block text-xs font-medium text-[#4B5563] mb-1">
                  Upload photos chapter-wise <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-[#6B7280] mb-2">
                  Add one photo per chapter. This helps us design the cover and chapter dividers.
                </p>

                {chapterTitles.length === 0 && (
                  <p className="text-[11px] text-[#9CA3AF]">
                    Loading chapter list from your album…
                  </p>
                )}

                {chapterTitles.length > 0 && (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {chapterTitles.map((title, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-[#1B2632] truncate">
                            Chapter {idx + 1}: {title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {chapterPreviews[idx] && (
                            <div className="w-10 h-10 rounded-md overflow-hidden border border-[#E5E7EB] bg-white">
                              <img
                                src={chapterPreviews[idx] as string}
                                alt={`Chapter ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <label className="inline-flex items-center justify-center rounded-lg border border-dashed border-[#D4D4D4] bg-white px-2 py-1 text-[10px] font-medium text-[#1B2632] cursor-pointer hover:bg-[#F3F3ED]">
                            {chapterImages[idx] ? "Change" : "Upload"}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleChapterImageChange(idx, e.target.files)
                              }
                              className="hidden"
                            />
                          </label>
                          {chapterImages[idx] && (
                            <button
                              type="button"
                              onClick={() => handleRemoveChapterImage(idx)}
                              className="text-[10px] text-[#A35139] hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extra copies */}
              <div>
                <button
                  type="button"
                  onClick={() => setCopiesOpen((o) => !o)}
                  className="w-full flex items-center justify-between rounded-lg bg-[#F5F3EF] px-3 py-2 text-left"
                  aria-expanded={copiesOpen}
                >
                  <span className="text-xs font-semibold text-[#1B2632]">
                    Extra copies (besides your first copy)
                  </span>
                  <span className="text-xs text-[#A35139] font-medium">
                    {copiesOpen ? "Hide" : extraCopies > 0 ? `${extraCopies} selected` : "Add extra copies"}
                  </span>
                </button>

                {copiesOpen && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-[#4B5563]">Number of extra copies:</span>
                      <Select
                        value={extraCopiesOption ?? "none"}
                        onValueChange={(value) => {
                          setExtraCopiesOption(value === "none" ? null : value);
                          if (value !== "custom") {
                            setCustomExtraCopies("");
                          }
                          // Reset any applied discount when quantity changes
                          setAppliedDiscount(null);
                          setPromoCode("");
                          setPromoError(null);
                          setShowPromoField(false);
                        }}
                      >
                        <SelectTrigger className="h-8 w-40 text-xs rounded-lg border-[#D4D4D4] bg-white shadow-sm focus:ring-[#A35139]/30 focus:border-[#A35139]">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg border-[#D4D4D4] bg-white shadow-md">
                          <SelectItem value="none" className="text-xs text-[#6B7280]">
                            None
                          </SelectItem>
                          <SelectItem value="1" className="text-xs text-[#1B2632]">
                            1
                          </SelectItem>
                          <SelectItem value="2" className="text-xs text-[#1B2632]">
                            2
                          </SelectItem>
                          <SelectItem value="3" className="text-xs text-[#1B2632]">
                            3
                          </SelectItem>
                          <SelectItem value="4" className="text-xs text-[#1B2632]">
                            4
                          </SelectItem>
                          <SelectItem value="5" className="text-xs text-[#1B2632]">
                            5
                          </SelectItem>
                          <SelectItem value="custom" className="text-xs text-[#1B2632]">
                            Custom (bulk order)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {extraCopiesOption === "custom" && (
                      <div className="space-y-1">
                        <p className="text-[11px] text-[#4B5563]">
                          For bulk orders (&gt; 5 extra copies), we won't charge you online.
                          Our team will contact you to finalise pricing.
                        </p>
                        <input
                          type="number"
                          min={6}
                          inputMode="numeric"
                          value={customExtraCopies}
                          onChange={(e) => setCustomExtraCopies(e.target.value)}
                          className="w-full sm:w-40 rounded-lg border border-[#D4D4D4] px-3 py-2 text-sm"
                          placeholder="Enter total extra copies"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Shipping address */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#1B2632]">
                  Shipping Address <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-[#4B5563] mb-1">
                      Recipient full name <span className="text-red-500">*</span>
                    </p>
                    <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="w-full rounded-lg border border-[#D4D4D4] px-3 py-2 text-sm" required />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-[#4B5563] mb-1">
                      Phone for delivery updates <span className="text-red-500">*</span>
                    </p>
                    <div className="flex items-center rounded-lg border border-[#D4D4D4] bg-white overflow-hidden">
                      <span className="px-2 py-2 text-xs text-[#4B5563] border-r border-[#D4D4D4]">+91</span>
                      <input
                        type="tel"
                        pattern="\d{10}"
                        maxLength={10}
                        inputMode="numeric"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ""))}
                        className="flex-1 px-3 py-2 text-sm outline-none"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-[#6B7280] mt-1">10-digit Indian mobile number.</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-[#4B5563] mb-1">
                    Address line 1 <span className="text-red-500">*</span>
                  </p>
                  <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="w-full rounded-lg border border-[#D4D4D4] px-3 py-2 text-sm" required />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#4B5563] mb-1">Address line 2 (optional)</p>
                  <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className="w-full rounded-lg border border-[#D4D4D4] px-3 py-2 text-sm" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-[#4B5563] mb-1">
                      City <span className="text-red-500">*</span>
                    </p>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-lg border border-[#D4D4D4] px-3 py-2 text-sm" required />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-[#4B5563] mb-1">
                      State <span className="text-red-500">*</span>
                    </p>
                    <Select value={state} onValueChange={setState} required>
                      <SelectTrigger className="w-full h-9 rounded-lg border-[#D4D4D4] bg-white text-sm shadow-sm focus:ring-[#A35139]/30 focus:border-[#A35139] data-[placeholder]:text-[#9CA3AF]">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 rounded-lg border-[#D4D4D4] bg-white shadow-md">
                        {INDIAN_STATES.map((st) => (
                          <SelectItem key={st} value={st} className="text-sm text-[#1B2632] focus:bg-[#FDF4F1] focus:text-[#A35139] cursor-pointer">
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-[#4B5563] mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </p>
                    <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} className="w-full rounded-lg border border-[#D4D4D4] px-3 py-2 text-sm" required />
                  </div>
                </div>
              </div>

              {/* Confirmation */}
              <div className="flex items-start gap-2 border-t border-dashed border-[#E5E7EB] pt-4">
                <input
                  id="address-form-confirm"
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#D4D4D4] text-[#A35139]"
                />
                <label htmlFor="address-form-confirm" className="text-xs text-[#4B5563]">
                  I confirm these details are correct for printing and delivery.
                </label>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              {/* Promo code – only when 1–5 extra copies */}
              {extraCopies > 0 && !isBulkOrder && (
                <div className="border-t border-dashed border-[#E5E7EB] pt-3 space-y-2">
                  {!showPromoField && !appliedDiscount ? (
                    <button
                      type="button"
                      onClick={() => setShowPromoField(true)}
                      className="text-xs text-[#A35139] font-medium hover:underline"
                    >
                      Have a promo code?
                    </button>
                  ) : appliedDiscount ? (
                    <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                      <div>
                        <span className="text-xs font-semibold text-green-800">
                          {appliedDiscount.code}
                        </span>
                        <span className="text-[11px] text-green-600 ml-2">
                          — You save ₹{Math.round(discountAmountPaise / 100)}!
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedDiscount(null);
                          setPromoCode("");
                          setPromoError(null);
                          setShowPromoField(false);
                        }}
                        className="text-[11px] text-green-600 hover:text-green-800 hover:underline ml-3"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value.toUpperCase());
                            setPromoError(null);
                          }}
                          placeholder="ENTER CODE"
                          className="flex-1 rounded-lg border border-[#D4D4D4] px-3 py-2 text-xs tracking-[0.16em] uppercase"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleApplyPromo();
                            }
                          }}
                        />
                        <button
                          type="button"
                          disabled={promoLoading || !promoCode.trim()}
                          onClick={handleApplyPromo}
                          className="px-3 py-1.5 rounded-lg border border-[#A35139] text-[11px] font-medium text-[#A35139] hover:bg-[#A35139]/5 disabled:opacity-50"
                        >
                          {promoLoading ? "Checking…" : "Apply"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPromoCode("");
                            setPromoError(null);
                            setShowPromoField(false);
                          }}
                          className="text-[11px] text-[#6B7280] hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                      {promoError && (
                        <p className="text-[11px] text-red-500">{promoError}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <div className="space-y-1 text-[11px] text-[#4B5563]">
                  <p className="font-semibold text-[#1B2632]">Order summary</p>
                  <p>Each additional copy is priced at ₹400.</p>
                  {extraCopies > 0 && !isBulkOrder && (
                    <>
                      <p>
                        <span className="font-medium">{totalCopies} copies total</span>{" "}
                        — {extraCopies} extra × ₹400 ={" "}
                        <span className={appliedDiscount ? "line-through text-[#9CA3AF]" : "font-semibold text-[#A35139]"}>
                          ₹{Math.round(baseExtraAmountPaise / 100)}
                        </span>
                      </p>
                      {appliedDiscount && (
                        <p>
                          Promo <span className="font-semibold">{appliedDiscount.code}</span>{" "}
                          — You save ₹{Math.round(discountAmountPaise / 100)} ={" "}
                          <span className="font-semibold text-[#A35139]">₹{extraAmount}</span>
                        </p>
                      )}
                    </>
                  )}
                  {isBulkOrder && (
                    <p className="text-[11px] text-[#6B7280]">
                      Bulk order &gt; 5 extra copies — no online payment now. Our team will reach out to confirm pricing.
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={dialogPhase !== "idle"}
                  className="w-full sm:w-auto bg-[#A35139] hover:bg-[#8B4430] text-white text-sm font-semibold rounded-xl px-5 py-2.5 shadow-md"
                >
                  {extraCopies > 0 && !isBulkOrder
                    ? `Continue & pay ₹${extraAmount}`
                    : "Submit details"}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
