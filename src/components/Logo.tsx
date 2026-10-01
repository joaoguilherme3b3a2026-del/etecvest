import { GraduationCap } from "lucide-react";

export function Logo({ subtitulo }: { subtitulo?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <GraduationCap className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-lg font-bold">EtecVest</span>
        {subtitulo && (
          <span className="block truncate text-xs text-muted-foreground">{subtitulo}</span>
        )}
      </span>
    </span>
  );
}
