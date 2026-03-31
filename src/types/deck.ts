export interface DeckRequest {
  prompt: string;
  deckType: "one-pager" | "pitch-15" | "modular";
  documents: string[];
  brandConfig?: Partial<BrandConfig>;
}

export interface BrandConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  titleFont: string;
  bodyFont: string;
  companyName: string;
  logoUrl?: string;
}

export interface DeckResponse {
  success: boolean;
  fileBuffer?: string;
  fileName?: string;
  error?: string;
}

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  primaryColor: "#2752FE",
  secondaryColor: "#4DE8AC",
  backgroundColor: "#F2F2F2",
  textColor: "#222222",
  titleFont: "Inter",
  bodyFont: "Inter",
  companyName: "EBANX",
};
