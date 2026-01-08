import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

// Popular countries first, then alphabetical
const COUNTRIES: CountryCode[] = [
  { code: "IN", dialCode: "+91", name: "India", flag: "🇮🇳" },
  { code: "US", dialCode: "+1", name: "United States", flag: "🇺🇸" },
  { code: "GB", dialCode: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", dialCode: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "AU", dialCode: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "AE", dialCode: "+971", name: "UAE", flag: "🇦🇪" },
  { code: "SG", dialCode: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "PK", dialCode: "+92", name: "Pakistan", flag: "🇵🇰" },
  { code: "BD", dialCode: "+880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "ZA", dialCode: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "NZ", dialCode: "+64", name: "New Zealand", flag: "🇳🇿" },
  { code: "DE", dialCode: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "FR", dialCode: "+33", name: "France", flag: "🇫🇷" },
  { code: "IT", dialCode: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "ES", dialCode: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "NL", dialCode: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "BE", dialCode: "+32", name: "Belgium", flag: "🇧🇪" },
  { code: "CH", dialCode: "+41", name: "Switzerland", flag: "🇨🇭" },
  { code: "AT", dialCode: "+43", name: "Austria", flag: "🇦🇹" },
  { code: "SE", dialCode: "+46", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", dialCode: "+47", name: "Norway", flag: "🇳🇴" },
  { code: "DK", dialCode: "+45", name: "Denmark", flag: "🇩🇰" },
  { code: "FI", dialCode: "+358", name: "Finland", flag: "🇫🇮" },
  { code: "PL", dialCode: "+48", name: "Poland", flag: "🇵🇱" },
  { code: "BR", dialCode: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", dialCode: "+52", name: "Mexico", flag: "🇲🇽" },
  { code: "AR", dialCode: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", dialCode: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "CO", dialCode: "+57", name: "Colombia", flag: "🇨🇴" },
  { code: "PE", dialCode: "+51", name: "Peru", flag: "🇵🇪" },
  { code: "JP", dialCode: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "KR", dialCode: "+82", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", dialCode: "+86", name: "China", flag: "🇨🇳" },
  { code: "TW", dialCode: "+886", name: "Taiwan", flag: "🇹🇼" },
  { code: "HK", dialCode: "+852", name: "Hong Kong", flag: "🇭🇰" },
  { code: "MY", dialCode: "+60", name: "Malaysia", flag: "🇲🇾" },
  { code: "TH", dialCode: "+66", name: "Thailand", flag: "🇹🇭" },
  { code: "ID", dialCode: "+62", name: "Indonesia", flag: "🇮🇩" },
  { code: "PH", dialCode: "+63", name: "Philippines", flag: "🇵🇭" },
  { code: "VN", dialCode: "+84", name: "Vietnam", flag: "🇻🇳" },
  { code: "SA", dialCode: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "KW", dialCode: "+965", name: "Kuwait", flag: "🇰🇼" },
  { code: "QA", dialCode: "+974", name: "Qatar", flag: "🇶🇦" },
  { code: "OM", dialCode: "+968", name: "Oman", flag: "🇴🇲" },
  { code: "BH", dialCode: "+973", name: "Bahrain", flag: "🇧🇭" },
  { code: "JO", dialCode: "+962", name: "Jordan", flag: "🇯🇴" },
  { code: "LB", dialCode: "+961", name: "Lebanon", flag: "🇱🇧" },
  { code: "EG", dialCode: "+20", name: "Egypt", flag: "🇪🇬" },
  { code: "KE", dialCode: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "NG", dialCode: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "GH", dialCode: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "TZ", dialCode: "+255", name: "Tanzania", flag: "🇹🇿" },
  { code: "UG", dialCode: "+256", name: "Uganda", flag: "🇺🇬" },
  { code: "ET", dialCode: "+251", name: "Ethiopia", flag: "🇪🇹" },
  { code: "IL", dialCode: "+972", name: "Israel", flag: "🇮🇱" },
  { code: "TR", dialCode: "+90", name: "Turkey", flag: "🇹🇷" },
  { code: "RU", dialCode: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "UA", dialCode: "+380", name: "Ukraine", flag: "🇺🇦" },
  { code: "GR", dialCode: "+30", name: "Greece", flag: "🇬🇷" },
  { code: "PT", dialCode: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "IE", dialCode: "+353", name: "Ireland", flag: "🇮🇪" },
];

// Get placeholder examples based on country
function getPlaceholder(dialCode: string): string {
  const examples: Record<string, string> = {
    "+91": "98765 43210",
    "+1": "(555) 123-4567",
    "+44": "7700 900123",
    "+971": "50 123 4567",
    "+65": "9123 4567",
    "+92": "300 1234567",
    "+880": "1712 345678",
  };
  return examples[dialCode] || "1234 567890";
}

interface PhoneInputProps extends Omit<
  React.ComponentProps<"input">,
  "onChange" | "value"
> {
  value?: string;
  onChange?: (value: string) => void;
  defaultCountry?: string;
  className?: string;
}

export function PhoneInput({
  value = "",
  onChange,
  defaultCountry = "IN",
  className,
  ...props
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = React.useState<CountryCode>(
    COUNTRIES.find((c) => c.code === defaultCountry) || COUNTRIES[0],
  );
  const [phoneNumber, setPhoneNumber] = React.useState<string>("");
  const [open, setOpen] = React.useState(false);

  // Initialize phone number from value if provided
  React.useEffect(() => {
    if (value) {
      // Try to extract country code and phone number from value
      const foundCountry = COUNTRIES.find((country) =>
        value.startsWith(country.dialCode),
      );
      if (foundCountry) {
        setSelectedCountry(foundCountry);
        const number = value.replace(foundCountry.dialCode, "").trim();
        setPhoneNumber(number);
      } else {
        setPhoneNumber(value);
      }
    }
  }, [value]);

  // Update parent when phone number or country changes
  React.useEffect(() => {
    const fullNumber = phoneNumber
      ? `${selectedCountry.dialCode}${phoneNumber.replace(/\D/g, "")}`
      : "";
    onChange?.(fullNumber);
  }, [phoneNumber, selectedCountry, onChange]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ""); // Only digits
    // Limit to 10 digits
    const limitedInput = input.slice(0, 10);
    setPhoneNumber(limitedInput);
  };

  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find((c) => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
      setOpen(false);
    }
  };

  const placeholder = getPlaceholder(selectedCountry.dialCode);

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-12 items-center justify-between rounded-md border border-input bg-background ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              "flex-shrink-0",
              "w-[100px] sm:w-[140px]",
              "px-2 sm:px-3",
            )}
            aria-label="Select country"
          >
            <span className="flex items-center gap-1 sm:gap-2 min-w-0 h-full">
              <span className="text-base sm:text-lg flex-shrink-0 leading-none">
                {selectedCountry.flag}
              </span>
              <span className="text-xs sm:text-sm font-medium truncate leading-none pt-0.5">
                {selectedCountry.dialCode}
              </span>
            </span>
            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-50 flex-shrink-0 ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 max-h-[300px]" align="start">
          <Command>
            <CommandInput
              placeholder="Search country, code, or number..."
              className="h-11 text-sm sm:text-base"
            />
            <CommandList className="max-h-[200px] overflow-y-auto [scrollbar-width:none] md:[scrollbar-width:auto] [-ms-overflow-style:none] md:[-ms-overflow-style:auto] [&::-webkit-scrollbar]:hidden md:[&::-webkit-scrollbar]:block md:[&::-webkit-scrollbar]:w-1.5 md:[&::-webkit-scrollbar-thumb]:bg-black/10 md:[&::-webkit-scrollbar-thumb]:rounded">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((country) => {
                  // Create comprehensive searchable text including:
                  // - Country name (e.g., "India", "United States")
                  // - Dial code with + (e.g., "+91", "+1")
                  // - Dial code without + (e.g., "91", "1")
                  // - Country code (e.g., "IN", "US")
                  const dialCodeNoPlus = country.dialCode.replace("+", "");
                  const searchableText =
                    `${country.name} ${country.dialCode} ${dialCodeNoPlus} ${country.code}`.toLowerCase();

                  return (
                    <CommandItem
                      key={country.code}
                      value={searchableText}
                      onSelect={() => handleCountryChange(country.code)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="font-medium text-sm sm:text-base">
                        {country.dialCode}
                      </span>
                      <span className="text-muted-foreground ml-1 flex-1 text-sm sm:text-base">
                        {country.name}
                      </span>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedCountry.code === country.code
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        {...props}
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        className="h-12 text-sm sm:text-base flex-1"
        maxLength={10}
      />
    </div>
  );
}
