import type { ButtonHTMLAttributes } from "react";
export function Button({className = "", variant = "primary", type = "button", ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {variant?: "primary" | "ghost"}) {
  return <button type={type} className={`btn-base ${variant === "primary" ? "btn-primary" : "btn-ghost"} disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />;
}
