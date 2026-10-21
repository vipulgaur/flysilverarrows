import logo from "@/assets/silver-arrows-logo.png";

export function BrandLogo({ className = "" }: { className?: string }) {
  return <img src={logo} width={1206} height={566} alt="Silver Arrows" className={`block shrink-0 object-contain ${className}`} />;
}