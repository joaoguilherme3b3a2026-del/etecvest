import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  const estilo = variant === "primary" ? "btn-primary" : "btn-ghost";

  return (
    <button
      type={type}
      className={\`btn-base \${estilo} disabled:cursor-not-allowed disabled:opacity-50 \${className}\`}
      {...props}
    />
  );
}
