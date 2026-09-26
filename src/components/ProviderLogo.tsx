"use client";

import Image from "next/image";
import { useState } from "react";

/** The provider's own site icon, on a white tile so every brand reads the same in light and dark. */
export function ProviderLogo({ name, domain, size = 40 }: { name: string; domain: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const inner = Math.round(size * 0.7);

  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-black/10"
      style={{ width: size, height: size }}
    >
      {failed ? (
        <span className="figure-wide font-semibold text-[#0f2a22]" style={{ fontSize: size * 0.42 }}>
          {name[0]}
        </span>
      ) : (
        <Image
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt=""
          width={inner}
          height={inner}
          unoptimized
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
