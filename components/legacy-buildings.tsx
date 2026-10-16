'use client';
import type { BuildingType } from '../lib/server';
export function LegacyBuildingDrawing({
  type = 'chale',
  small = false,
  crowned = false,
}: {
  type?: BuildingType;
  small?: boolean;
  crowned?: boolean;
}) {
  const size = small ? 32 : 70;
  return (
    <svg viewBox="0 0 72 72" width={size} height={size} fill="none" aria-hidden="true">
      {/* Sombrinha arredondada no chão */}
      <ellipse cx="36" cy="63" rx="28" ry="6" fill="#2c5e44" opacity=".18" />

      {type === 'chale' && (
        <g>
          {!small && (
            <g opacity=".88">
              <circle cx="52" cy="11" r="3.2" fill="#fff" />
              <circle cx="55.5" cy="7.5" r="2.2" fill="#ffd6dc" />
            </g>
          )}
          <rect x="46" y="15" width="9" height="15" rx="4" fill="#d96543" stroke="#7d3825" strokeWidth="2" />
          <rect x="15" y="30" width="42" height="29" rx="9" fill="#fff8e7" stroke="#6f4e37" strokeWidth="2.3" />
          <path d="M37 30h11a9 9 0 0 1 9 9v11a9 9 0 0 1-9 9H37V30Z" fill="#f5ead0" />
          <circle cx="15" cy="55" r="6" fill="#7fc98b" stroke="#396846" strokeWidth="2" />
          <circle cx="57" cy="55" r="6" fill="#7fc98b" stroke="#396846" strokeWidth="2" />
          <circle cx="13.5" cy="54" r="1.6" fill="#ff9ebb" />
          <circle cx="58.5" cy="54" r="1.6" fill="#ffd166" />
          <path d="M30 59V45a6 6 0 0 1 12 0v14H30Z" fill="#529471" stroke="#335c46" strokeWidth="2.2" />
          <circle cx="39" cy="51" r="1.6" fill="#ffd166" />
          <rect x="19.5" y="39" width="7.5" height="7.5" rx="3.75" fill="#ffe596" stroke="#6f4e37" strokeWidth="2" />
          <rect x="45" y="39" width="7.5" height="7.5" rx="3.75" fill="#ffe596" stroke="#6f4e37" strokeWidth="2" />
          <path d="M10 33.5 33.2 13.8a4.5 4.5 0 0 1 5.6 0L62 33.5a3.8 3.8 0 0 1-2.5 6.7H12.5A3.8 3.8 0 0 1 10 33.5Z" fill="#ff7f5c" stroke="#7d3825" strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M17 31.5 35.5 16.2" stroke="#ffb39b" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}

      {type === 'vila' && (
        <g>
          {/* Casinha esquerda (amarelinha c/ telhado lilás/azul) */}
          <rect x="8" y="33" width="28" height="27" rx="7" fill="#fff3c4" stroke="#6f4e37" strokeWidth="2.2" />
          <path d="M5 35 19.5 21.5a3.5 3.5 0 0 1 4.8 0L38 35a3 3 0 0 1-2 5.2H7A3 3 0 0 1 5 35Z" fill="#6ca6ff" stroke="#305799" strokeWidth="2.2" />
          <rect x="13" y="42" width="6.5" height="6.5" rx="3.2" fill="#ffe596" stroke="#6f4e37" strokeWidth="1.8" />
          <path d="M23 60V48a4.5 4.5 0 0 1 9 0v12h-9Z" fill="#ff8563" stroke="#7d3825" strokeWidth="2" />
          {/* Casinha direita mais alta (creme c/ telhado coral) */}
          <rect x="33" y="27" width="30" height="33" rx="8" fill="#fff9eb" stroke="#6f4e37" strokeWidth="2.2" />
          <path d="M30 30 45.8 15.2a3.8 3.8 0 0 1 5.2 0L66 30a3.2 3.2 0 0 1-2.2 5.5H32.2A3.2 3.2 0 0 1 30 30Z" fill="#ff7852" stroke="#7d3825" strokeWidth="2.2" />
          <rect x="38" y="37" width="7" height="7" rx="3.5" fill="#ffe596" stroke="#6f4e37" strokeWidth="1.8" />
          <rect x="50" y="37" width="7" height="7" rx="3.5" fill="#ffe596" stroke="#6f4e37" strokeWidth="1.8" />
          <path d="M43 60V47a5 5 0 0 1 10 0v13H43Z" fill="#438a65" stroke="#28593f" strokeWidth="2" />
          {/* Varalzinho de bandeirolas de festa e arbustos */}
          <path d="M22 23 Q35 29 48 18" stroke="#7d3825" strokeWidth="1.5" fill="none" />
          <circle cx="29" cy="25" r="2" fill="#ffd166" />
          <circle cx="35" cy="26" r="2" fill="#ff6b8b" />
          <circle cx="41" cy="23" r="2" fill="#52b788" />
          <circle cx="9" cy="57" r="5" fill="#7fc98b" stroke="#396846" strokeWidth="1.8" />
          <circle cx="63" cy="57" r="5.5" fill="#7fc98b" stroke="#396846" strokeWidth="1.8" />
        </g>
      )}

      {type === 'prefeitura' && (
        <g>
          {/* Bandeirinha do Prefeito no topo */}
          <path d="M36 4v11" stroke="#6f4e37" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M36 4h11l-2.5 3.5L47 11H36V4Z" fill="#ffc43d" stroke="#8c5a08" strokeWidth="1.6" strokeLinejoin="round" />
          {/* Corpo nobre de 2 andares */}
          <rect x="11" y="27" width="50" height="33" rx="8" fill="#fff7e2" stroke="#5c4228" strokeWidth="2.3" />
          {/* Colunas clássicas fofinhas */}
          <rect x="17" y="35" width="5" height="22" rx="2.5" fill="#fff" stroke="#bca88e" strokeWidth="1.6" />
          <rect x="49" y="35" width="5" height="22" rx="2.5" fill="#fff" stroke="#bca88e" strokeWidth="1.6" />
          {/* Frontão triangular e cúpula */}
          <path d="M8 28 33.5 12.5a5 5 0 0 1 5 0L64 28a3 3 0 0 1-1.6 5.5H9.6A3 3 0 0 1 8 28Z" fill="#3a7d63" stroke="#214f3d" strokeWidth="2.3" />
          {/* Relógio Dourado Central da Prefeitura */}
          <circle cx="36" cy="24" r="6.5" fill="#fffbeb" stroke="#d48b00" strokeWidth="2.3" />
          <path d="M36 20.5V24l2.5 1.5" stroke="#8c5a08" strokeWidth="1.8" strokeLinecap="round" />
          {/* Porta Dupla Nobre + Tapete Vermelho/Coral */}
          <path d="M29 60V44a7 7 0 0 1 14 0v16H29Z" fill="#c95b3c" stroke="#6e2c19" strokeWidth="2.2" />
          <path d="M36 44v16" stroke="#6e2c19" strokeWidth="1.8" />
          <rect x="24" y="58" width="24" height="4" rx="2" fill="#e6dcc8" stroke="#5c4228" strokeWidth="1.6" />
          <circle cx="11" cy="56" r="5.5" fill="#7fc98b" stroke="#396846" strokeWidth="2" />
          <circle cx="61" cy="56" r="5.5" fill="#7fc98b" stroke="#396846" strokeWidth="2" />
        </g>
      )}

      {type === 'edificio' && (
        <g>
          {/* Prédio lateral secundário */}
          <rect x="10" y="26" width="18" height="34" rx="6" fill="#ffe3b8" stroke="#6f4e37" strokeWidth="2.2" />
          <rect x="14" y="32" width="4.5" height="5.5" rx="2" fill="#fff4bd" stroke="#6f4e37" strokeWidth="1.6" />
          <rect x="14" y="41" width="4.5" height="5.5" rx="2" fill="#fff4bd" stroke="#6f4e37" strokeWidth="1.6" />
          {/* Torre principal alta */}
          <rect x="24" y="13" width="36" height="47" rx="9" fill="#fff9eb" stroke="#5c4228" strokeWidth="2.4" />
          {/* Telhado arredondado coral + jardim no topo */}
          <rect x="22" y="10" width="40" height="7" rx="3.5" fill="#ff7852" stroke="#7d3825" strokeWidth="2.2" />
          <circle cx="33" cy="8" r="4" fill="#7fc98b" stroke="#396846" strokeWidth="1.8" />
          <circle cx="51" cy="8" r="4.5" fill="#7fc98b" stroke="#396846" strokeWidth="1.8" />
          {/* 3 andares de janelinhas iluminadas */}
          {[21, 31, 41].map(y => (
            <g key={y}>
              <rect x="29" y={y} width="6.5" height="6.5" rx="2.5" fill="#ffe596" stroke="#6f4e37" strokeWidth="1.7" />
              <rect x="39" y={y} width="6.5" height="6.5" rx="2.5" fill="#ffe596" stroke="#6f4e37" strokeWidth="1.7" />
              <rect x="49" y={y} width="6.5" height="6.5" rx="2.5" fill="#ffe596" stroke="#6f4e37" strokeWidth="1.7" />
            </g>
          ))}
          <path d="M36 60V51a6 6 0 0 1 12 0v9H36Z" fill="#3a7d63" stroke="#214f3d" strokeWidth="2" />
          <circle cx="11" cy="57" r="5" fill="#7fc98b" stroke="#396846" strokeWidth="1.8" />
          <circle cx="61" cy="57" r="5" fill="#7fc98b" stroke="#396846" strokeWidth="1.8" />
        </g>
      )}

      {type === 'metropole' && (
        <g>
          {/* Estrelinhas brilhantes de Metrópole Lendária */}
          {!small && (
            <g fill="#ffc43d">
              <circle cx="12" cy="14" r="2.2" />
              <circle cx="60" cy="14" r="2.2" />
            </g>
          )}
          {/* Torres laterais */}
          <rect x="9" y="25" width="16" height="35" rx="6" fill="#fff0d4" stroke="#5c4228" strokeWidth="2.2" />
          <path d="M7 26 17 15l10 11H7Z" fill="#52b788" stroke="#265940" strokeWidth="2" strokeLinejoin="round" />
          <rect x="47" y="25" width="16" height="35" rx="6" fill="#fff0d4" stroke="#5c4228" strokeWidth="2.2" />
          <path d="M45 26 55 15l10 11H45Z" fill="#52b788" stroke="#265940" strokeWidth="2" strokeLinejoin="round" />
          {/* Torre Imperial Central */}
          <rect x="21" y="18" width="30" height="42" rx="8" fill="#fff9eb" stroke="#5c4228" strokeWidth="2.4" />
          {/* Cúpula Dourada Real */}
          <path d="M22 20 C22 7, 50 7, 50 20 Z" fill="#ffc43d" stroke="#8c5a08" strokeWidth="2.3" />
          <path d="M32 9 34 3l2 3 2-3 2 6h-8Z" fill="#ffdf78" stroke="#8c5a08" strokeWidth="1.5" />
          {/* Janelas vitrais arredondadas */}
          <rect x="26" y="25" width="7" height="9" rx="3.5" fill="#ffe596" stroke="#6f4e37" strokeWidth="1.8" />
          <rect x="39" y="25" width="7" height="9" rx="3.5" fill="#ffe596" stroke="#6f4e37" strokeWidth="1.8" />
          <rect x="26" y="37" width="7" height="7" rx="3" fill="#ffe596" stroke="#6f4e37" strokeWidth="1.8" />
          <rect x="39" y="37" width="7" height="7" rx="3" fill="#ffe596" stroke="#6f4e37" strokeWidth="1.8" />
          {/* Grande Portão Real */}
          <path d="M29 60V47a7 7 0 0 1 14 0v13H29Z" fill="#ff7852" stroke="#7d3825" strokeWidth="2.2" />
          <circle cx="9" cy="57" r="5.5" fill="#7fc98b" stroke="#396846" strokeWidth="2" />
          <circle cx="63" cy="57" r="5.5" fill="#7fc98b" stroke="#396846" strokeWidth="2" />
        </g>
      )}

      {/* Coroinha flutuante para fundador/destaque */}
      {crowned && type !== 'metropole' && (
        <path d="M27 10 30 3l6 4 6-4 3 7H27Z" fill="#ffc83d" stroke="#8c5a08" strokeWidth="1.8" strokeLinejoin="round" />
      )}
    </svg>
  );
}

