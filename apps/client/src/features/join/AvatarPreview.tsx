"use client";

import { Appearance, HAIR_COLORS, SKIN_TONES } from "@montevideo-world/shared";
import { moduleClasses } from "@/lib/cx";
import styles from "./join.module.css";

const cx = moduleClasses(styles);

/**
 * Vista previa del avatar en la pantalla de ingreso, en SVG (Phaser todavía no está cargado).
 * Usa la misma geometría que `Avatar.ts` (px desde los pies) para que se parezca a lo que se ve en
 * el juego. La ropa es la de muestra: el kit inicial real lo reparte el server al entrar.
 */

const HEAD_Y = -69;
const R = 10.5;
const SHOULDER_Y = -55;
const HIP_Y = -30;

const TEE = "#f1f1f1";
const JEANS = "#2b3a55";
const SHOES = "#f0f0f0";
const OUTLINE = "rgba(0, 0, 0, 0.28)";

interface AvatarPreviewProps {
  appearance: Appearance;
  size?: number;
}

export function AvatarPreview({ appearance, size = 168 }: AvatarPreviewProps) {
  const skin = SKIN_TONES[appearance.skin];
  const hair = HAIR_COLORS[appearance.hairColor];
  const style = appearance.hairStyle;
  const female = appearance.gender === "f";
  const cap = (radius: number) => `M ${-radius} ${HEAD_Y} A ${radius} ${radius} 0 0 1 ${radius} ${HEAD_Y}`;

  return (
    <svg className={cx("avatar-preview")} viewBox="-40 -104 80 112" width={size} height={(size * 112) / 80} aria-hidden="true">
      <ellipse cx={0} cy={0} rx={17} ry={7} fill="rgba(0,0,0,0.3)" />

      {/* Pelo de atrás (largo, afro, colita). */}
      {style === "long" && <rect x={-R - 2} y={HEAD_Y - 4} width={R * 2 + 3} height={25} rx={5} fill={hair} />}
      {style === "afro" && <circle cx={-1} cy={HEAD_Y - 3} r={R + 6} fill={hair} />}
      {style === "ponytail" && <ellipse cx={-R - 3} cy={HEAD_Y + 4} rx={3.5} ry={8} fill={hair} />}

      {/* Piernas y zapatillas. */}
      {[-4.5, 4.5].map((x) => (
        <g key={x}>
          <rect x={x - 3.2} y={HIP_Y} width={6.4} height={28} rx={3} fill={JEANS} stroke={OUTLINE} strokeWidth={1.2} />
          <ellipse cx={x + 1} cy={-2} rx={5} ry={3.2} fill={SHOES} stroke={OUTLINE} strokeWidth={1.2} />
        </g>
      ))}

      {/* Brazos con manga corta. */}
      {[-12, 12].map((x) => (
        <g key={x}>
          <rect x={x - 2.5} y={SHOULDER_Y - 1} width={5} height={21} rx={2.5} fill={skin} />
          <circle cx={x} cy={SHOULDER_Y + 21} r={3.3} fill={skin} stroke={OUTLINE} strokeWidth={1.2} />
          <rect x={x - 3.2} y={SHOULDER_Y - 1} width={6.4} height={11} rx={3} fill="#d9d9d9" stroke={OUTLINE} strokeWidth={1.2} />
        </g>
      ))}

      {/* Torso: cuello, remera, escote en V y cinturón. */}
      <rect x={-3} y={HEAD_Y + 8} width={6} height={7} fill={skin} />
      <rect x={-9.5} y={HIP_Y - 4} width={19} height={8} rx={3} fill={JEANS} />
      <rect x={-11} y={SHOULDER_Y - 3} width={22} height={27} rx={6} fill={TEE} stroke={OUTLINE} strokeWidth={1.5} />
      <polygon points={`-3.5,${SHOULDER_Y - 3} 3.5,${SHOULDER_Y - 3} 0,${SHOULDER_Y + 2}`} fill={skin} />
      <rect x={-10} y={HIP_Y - 5} width={20} height={3} fill="#2a1d14" />

      {/* Cabeza. */}
      <ellipse cx={-R + 0.5} cy={HEAD_Y + 1} rx={2.5} ry={3.5} fill={skin} />
      <ellipse cx={R - 0.5} cy={HEAD_Y + 1} rx={2.5} ry={3.5} fill={skin} />
      <ellipse cx={0} cy={HEAD_Y} rx={R} ry={R + 1} fill={skin} stroke={OUTLINE} strokeWidth={1.5} />

      {/* Ojos (con pestañas en el de mujer), cejas y boca. */}
      {[-2.5, 3.5].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={HEAD_Y - 0.5} rx={2.1} ry={2.3} fill="#fff" />
          <circle cx={x + 0.4} cy={HEAD_Y - 0.2} r={1.5} fill="#2b1d14" />
          {female && (
            <path
              d={`M ${x + (x < 0 ? -2 : 2)} ${HEAD_Y - 2} l ${x < 0 ? -1.6 : 1.6} -1.4`}
              stroke="#2b1d14"
              strokeWidth={1.2}
              strokeLinecap="round"
            />
          )}
          <line
            x1={x - 2}
            y1={HEAD_Y - 4.3}
            x2={x + 2}
            y2={HEAD_Y - 4.6}
            stroke={hair}
            strokeWidth={female ? 1.2 : 1.8}
            strokeLinecap="round"
            style={{ filter: "brightness(0.85)" }}
          />
        </g>
      ))}
      <path
        d={`M ${-2.2} ${HEAD_Y + 4.6} Q 0.5 ${HEAD_Y + 7.6} ${3.2} ${HEAD_Y + 4.6}`}
        fill="none"
        stroke={female ? "#c0475a" : "#7a3b2e"}
        strokeWidth={female ? 2 : 1.5}
        strokeLinecap="round"
      />

      {/* Pelo de adelante. */}
      {style === "buzz" && <path d={`${cap(R + 0.5)} L ${R + 0.5} ${HEAD_Y - 2} L ${-R - 0.5} ${HEAD_Y - 2} Z`} fill={hair} />}
      {style === "afro" && (
        <>
          {Array.from({ length: 7 }, (_, i) => {
            const angle = Math.PI * (1 + i / 6);
            return <circle key={i} cx={Math.cos(angle) * (R + 1)} cy={HEAD_Y - 2 + Math.sin(angle) * (R + 1)} r={5.5} fill={hair} />;
          })}
          <path d={`${cap(R + 1)} L ${R + 1} ${HEAD_Y - 3} L ${-R - 1} ${HEAD_Y - 3} Z`} fill={hair} />
        </>
      )}
      {(style === "short" || style === "long" || style === "ponytail") && (
        <path
          d={`${cap(R + 1.5)} L ${R + 1.5} ${HEAD_Y + (style === "long" ? 12 : 1)} L 6 ${HEAD_Y - 5} L 1 ${HEAD_Y - 6} L -4 ${HEAD_Y - 4.5} L ${-R + 2} ${HEAD_Y - 2} L ${-R - 1.5} ${HEAD_Y + (style === "long" ? 12 : 4)} Z`}
          fill={hair}
        />
      )}
    </svg>
  );
}
