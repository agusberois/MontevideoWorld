"use client";

import { ReactNode, useEffect, useState } from "react";
import { appUrl } from "@/lib/appUrl";

interface PlayButtonProps {
  className?: string;
  children: ReactNode;
}

/** Link al juego (`app.<dominio>`). Hasta montar apunta a `/jugar`, que también anda. */
export function PlayButton({ className, children }: PlayButtonProps) {
  const [href, setHref] = useState("/jugar");
  useEffect(() => setHref(appUrl()), []);
  return (
    <a className={className} href={href}>
      {children}
    </a>
  );
}
