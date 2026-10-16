'use client';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Home, MapPin, Search, Plus, Minus, Maximize, ArrowUpRight, ArrowRight, X, Crown,
  Camera as Instagram, Users, Compass, Download, Settings2, Check, Copy, ChevronRight,
  LoaderCircle, Trash2, LocateFixed, Leaf, MessageCircle, Sparkles, Heart, Award, Hammer, ThumbsUp, Building2, Star
} from 'lucide-react';
import type { City } from '../lib/cities';
import type { BuildingType, CityRole } from '../lib/server';

type House = {
  id: number;
  username: string;
  city: City;
  founder: boolean;
  source: string;
  createdAt: string;
  points: number;
  actsCount: number;
  rank: number;
  role: CityRole;
  roleTitle: string;
  building: BuildingType;
  buildingTitle: string;
};

type CityAct = {
  id: number;
  username: string;
  cityId: number;
  actType: string;
  label: string;
  points: number;
  createdAt: string;
};

type Snapshot = {
  houses: House[];
  recentActs?: CityAct[];
  totalCities: number;
  canEdit: boolean;
  connection: { configured: boolean; missing: string[]; profile: string | null; callback: string };
};

type Pending = { id: string; username: string; comment: string };
type Path = { id: string; path: string };

const project = (city: City): [number, number] => [(city.lng + 74) * 18, (6 - city.lat) * 18];
const initialView = { x: -70, y: -12, w: 880, h: 770 };
const states = [
  ['AC', -70, -9], ['AM', -64, -4], ['RR', -61, 2], ['AP', -52, 1], ['PA', -53, -4], ['RO', -63, -11],
  ['MT', -56, -13], ['TO', -48.5, -10], ['MA', -45, -5], ['PI', -42.5, -7], ['CE', -39.5, -5],
  ['RN', -36.4, -5.6], ['PB', -36.5, -7], ['PE', -38, -8.6], ['AL', -36.3, -9.7], ['SE', -37.4, -10.8],
  ['BA', -42, -12], ['GO', -49.7, -16], ['DF', -47.8, -15.5], ['MS', -55, -20], ['MG', -44.5, -18.5],
  ['ES', -40.4, -20], ['RJ', -42.6, -22.4], ['SP', -49, -22], ['PR', -51, -24.6], ['SC', -50, -27], ['RS', -53, -30],
] as const;

const clientCityCache = new Map<string, City[]>();

export function getCityStage(totalPoints: number, housesCount: number): {
  level: number;
  building: BuildingType;
  title: string;
  nextThreshold: number | null;
  minThreshold: number;
} {
  if (totalPoints >= 1500 || housesCount >= 12) {
    return { level: 5, building: 'metropole', title: 'Metrópole Real', nextThreshold: null, minThreshold: 1500 };
  }
  if (totalPoints >= 850 || housesCount >= 7) {
    return { level: 4, building: 'edificio', title: 'Grande Centro Solar', nextThreshold: 1500, minThreshold: 850 };
  }
  if (totalPoints >= 450 || housesCount >= 4) {
    return { level: 3, building: 'prefeitura', title: 'Sede da Prefeitura', nextThreshold: 850, minThreshold: 450 };
  }
  if (totalPoints >= 220 || housesCount >= 2) {
    return { level: 2, building: 'vila', title: 'Vila Florida', nextThreshold: 450, minThreshold: 220 };
  }
  return { level: 1, building: 'chale', title: 'Povoado Aconchegante', nextThreshold: 220, minThreshold: 0 };
}

function BuildingDrawing({
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

const BrazilBaseMap = memo(function BrazilBaseMap({ paths }: { paths: Path[] }) {
  return (
    <>
      <defs>
        <pattern id="terrain" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="5" r="1.1" fill="#8ebc8b" opacity=".55" />
          <circle cx="13" cy="14" r=".9" fill="#8ebc8b" opacity=".4" />
        </pattern>
      </defs>
      <g transform="translate(0 7)" pointerEvents="none">
        {paths.map(p => (
          <path key={'s-' + p.id} d={p.path} fill="#8db69c" stroke="#8db69c" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
        ))}
      </g>
      <g>
        {paths.map(p => (
          <path key={p.id} d={p.path} fill="#cce6bc" stroke="#7fa97b" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round">
            <title>Brasil · estado {p.id}</title>
          </path>
        ))}
      </g>
      <g pointerEvents="none">
        {paths.map(p => (
          <path key={'t-' + p.id} d={p.path} fill="url(#terrain)" />
        ))}
      </g>
      <g pointerEvents="none">
        {states.map(([uf, lng, lat]) => (
          <text key={uf} x={(lng + 74) * 18} y={(6 - lat) * 18} className="state-label" textAnchor="middle">
            {uf}
          </text>
        ))}
        <text x="580" y="515" className="ocean-label" transform="rotate(-30 580 515)">
          OCEANO ATLÂNTICO 🌊
        </text>
      </g>
    </>
  );
});

function CityPicker({
  onPick,
  label = 'Buscar cidade',
  placeholder = 'Digite sua cidade (ex: Curitiba)...',
  value = '',
  compact = false,
  onEdit,
}: {
  onPick: (c: City) => void;
  label?: string;
  placeholder?: string;
  value?: string;
  compact?: boolean;
  onEdit?: () => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value) setQuery(value);
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const cacheKey = trimmed.toLowerCase();
    const cached = clientCityCache.get(cacheKey);
    if (cached) {
      setResults(cached);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch('/api/cities?q=' + encodeURIComponent(trimmed), { signal: controller.signal })
        .then(r => {
          if (!r.ok) throw Error();
          return r.json() as Promise<City[]>;
        })
        .then(list => {
          clientCityCache.set(cacheKey, list);
          setResults(list);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  return (
    <div className={'city-picker ' + (compact ? 'compact' : '')}>
      <label className={compact ? 'sr-only' : ''}>
        {label}
        <div className="input-wrap">
          <Search size={17} />
          <input
            autoComplete="off"
            value={query}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={e => {
              setQuery(e.target.value);
              setOpen(true);
              onEdit?.();
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') setOpen(false);
            }}
            aria-expanded={open && results.length > 0}
            aria-label={label}
          />
          {loading && <LoaderCircle className="spin" size={16} />}
        </div>
      </label>
      {open && query.trim().length >= 2 && (
        <div className="search-results">
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setQuery(c.name + ' · ' + c.uf);
                setOpen(false);
                onPick(c);
              }}
            >
              <MapPin size={16} />
              <span>
                {c.name}
                <small>{c.state}</small>
              </span>
              <b>{c.uf}</b>
            </button>
          ))}
          {!results.length && !loading && <p>Nenhuma cidade encontrada. Tente outro nome 🏡</p>}
        </div>
      )}
    </div>
  );
}

const BUILDING_SHOWCASE: { type: BuildingType; level: string; name: string; req: string; desc: string }[] = [
  { type: 'chale', level: 'Nível 1', name: 'Chalé Aconchegante', req: '100 pts (Início)', desc: 'Casinha fofinha de chegada na cidade.' },
  { type: 'vila', level: 'Nível 2', name: 'Vila Florida', req: '220+ pts ou 2 casas', desc: 'Casinhas geminadas com bandeirolas.' },
  { type: 'prefeitura', level: 'Nível 3', name: 'Palácio da Prefeitura', req: 'Prefeito(a) ou 450+ pts', desc: 'Sede oficial com relógio dourado!' },
  { type: 'edificio', level: 'Nível 4', name: 'Edifício Solar', req: 'Vice ou 850+ pts', desc: 'Prédio alto iluminado com jardim no topo.' },
  { type: 'metropole', level: 'Nível 5', name: 'Castelo Metrópole', req: '1.500+ pts', desc: 'Monumento lendário com cúpula dourada!' },
];

export default function MapApp() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [paths, setPaths] = useState<Path[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'map' | 'people'>('map');
  const [dialog, setDialog] = useState<'add' | 'instagram' | 'how' | null>(null);
  const [view, setView] = useState(initialView);
  const [selected, setSelected] = useState<City | null>(null);
  const [username, setUsername] = useState('');
  const [newCity, setNewCity] = useState<City | null>(null);
  const [busy, setBusy] = useState(false);
  const [actBusyId, setActBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [comment, setComment] = useState('');
  const [parsed, setParsed] = useState<string | null>(null);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [copiedComment, setCopiedComment] = useState(false);

  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; view: typeof initialView } | null>(null);
  const rafId = useRef<number | null>(null);
  const etagRef = useRef<string | null>(null);
  const modal = useRef<HTMLDialogElement>(null);

  const refresh = useCallback(async (force = false) => {
    try {
      const headers: Record<string, string> = {};
      if (!force && etagRef.current) headers['If-None-Match'] = etagRef.current;
      const r = await fetch('/api/map', { headers });
      if (r.status === 304) {
        setError('');
        return;
      }
      const d = (await r.json()) as Snapshot & { error?: string };
      if (!r.ok) throw Error(d.error);
      const newEtag = r.headers.get('etag');
      if (newEtag) etagRef.current = newEtag;
      setData(d);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar o mapa.');
    }
  }, []);

  useEffect(() => {
    refresh(true);
    fetch('/brazil.json')
      .then(r => r.json() as Promise<Path[]>)
      .then(setPaths)
      .catch(() => setError('Não foi possível carregar o desenho do mapa.'));
    const timer = setInterval(() => {
      if (!document.hidden) refresh(false);
    }, 10000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  useEffect(() => {
    setFormError('');
    if (dialog) {
      modal.current?.showModal();
      if (dialog === 'instagram' && data?.canEdit)
        fetch('/api/admin')
          .then(r => r.json() as Promise<{ pending?: Pending[] }>)
          .then(d => setPending(d.pending || []))
          .catch(() => setPending([]));
    } else modal.current?.close();
  }, [dialog, data?.canEdit]);

  const groups = useMemo(() => {
    const map = new Map<
      number,
      {
        city: City;
        houses: House[];
        sortedHall: House[];
        mayor: House;
        founder: House;
        totalPoints: number;
        stage: ReturnType<typeof getCityStage>;
      }
    >();
    data?.houses.forEach(h => {
      if (!map.has(h.city.id)) {
        map.set(h.city.id, {
          city: h.city,
          houses: [],
          sortedHall: [],
          mayor: h,
          founder: h,
          totalPoints: 0,
          stage: getCityStage(0, 0),
        });
      }
      const g = map.get(h.city.id)!;
      g.houses.push(h);
      g.totalPoints += h.points || 100;
      if (h.founder) g.founder = h;
    });
    for (const g of map.values()) {
      g.sortedHall = [...g.houses].sort((a, b) => (b.points || 0) - (a.points || 0) || a.id - b.id);
      g.mayor = g.sortedHall[0] || g.houses[0];
      g.stage = getCityStage(g.totalPoints, g.houses.length);
    }
    return [...map.values()];
  }, [data]);

  const selectedGroup = useMemo(() => groups.find(g => g.city.id === selected?.id) || null, [groups, selected]);
  const selectedHouses = useMemo(() => selectedGroup?.sortedHall || [], [selectedGroup]);
  const selectedActs = useMemo(
    () => (data?.recentActs || []).filter(a => !selected || a.cityId === selected.id).slice(0, 8),
    [data, selected]
  );

  const regionCount = useMemo(() => new Set(data?.houses.map(h => h.city.uf)).size, [data]);
  const totalPointsAll = useMemo(() => groups.reduce((acc, g) => acc + g.totalPoints, 0), [groups]);

  const filtered = useMemo(() => {
    const q = peopleQuery.toLowerCase();
    const base = selected ? selectedHouses : [...(data?.houses || [])].sort((a, b) => (b.points || 0) - (a.points || 0) || a.id - b.id);
    return base.filter(h => `${h.username} ${h.city.name} ${h.city.uf} ${h.roleTitle || ''}`.toLowerCase().includes(q));
  }, [data, selected, selectedHouses, peopleQuery]);

  const freeCitiesCount = (data?.totalCities ?? 5571) - groups.length;

  const focusCity = useCallback((city: City) => {
    const [x, y] = project(city);
    setSelected(city);
    setCopiedComment(false);
    setView({ x: x - 160, y: y - 140, w: 320, h: 280 });
  }, []);

  const zoom = useCallback((factor: number) => {
    setView(v => {
      const w = Math.max(65, Math.min(1300, v.w * factor));
      const h = (w * initialView.h) / initialView.w;
      return { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h };
    });
  }, []);

  const reset = useCallback(() => {
    setView(initialView);
    setSelected(null);
  }, []);

  const openAdd = () => {
    setUsername('');
    setNewCity(selected);
    setDialog('add');
  };

  const performAct = async (houseId: number | undefined, cityId: number | undefined, actType: 'cheer' | 'build' | 'invite') => {
    if (actBusyId !== null) return;
    setActBusyId(houseId ?? -1);
    try {
      const r = await fetch('/api/houses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: houseId, cityId, actType }),
      });
      const d = (await r.json()) as { error?: string; pointsAdded?: number; username?: string };
      if (!r.ok) throw Error(d.error);
      await refresh(true);
      const msgs: Record<string, string> = {
        cheer: `👏 +${d.pointsAdded} pts para @${d.username} na disputa de Prefeito(a)!`,
        build: `🧱 Mutirão concluído! +${d.pointsAdded} pts para @${d.username} e para evoluir a cidade!`,
        invite: `📣 Convite compartilhado! +${d.pointsAdded} pts para @${d.username}!`,
      };
      setNotice(msgs[actType] || `+${d.pointsAdded} pontos somados!`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Não foi possível registrar o ato.');
    } finally {
      setActBusyId(null);
    }
  };

  const copyCommentSample = async (textToCopy: string, cityId?: number) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedComment(true);
      if (cityId && selectedGroup) {
        await performAct(selectedGroup.mayor.id, cityId, 'invite');
      } else {
        setNotice(`Comentário "${textToCopy}" copiado! Agora é só colar no post do Instagram 💬✨`);
      }
      setTimeout(() => setCopiedComment(false), 3500);
    } catch {
      setNotice(`Comente no Instagram: ${textToCopy}`);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity) {
      setFormError('Selecione uma cidade da lista.');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      const r = await fetch('/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, cityId: newCity.id }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error);
      await refresh(true);
      focusCity(newCity);
      setDialog(null);
      setNotice('Casinha construída! +150 pts de Fundação se for a 1ª da cidade 🏡👑');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    try {
      const r = await fetch('/api/houses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw Error('Não foi possível remover.');
      await refresh(true);
      setRemoveId(null);
      setNotice('Casa removida do mapa.');
    } catch (e) {
      setNotice(String(e));
    } finally {
      setBusy(false);
    }
  };

  const exportData = () => {
    if (!data) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), houses: data.houses }, null, 2)], { type: 'application/json' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brasil-em-casas.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parse = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse', text: comment }),
      });
      const d = (await r.json()) as { error?: string; city?: City };
      if (!r.ok) throw Error(d.error);
      setParsed(
        d.city
          ? `Cidade reconhecida: ${d.city.name} · ${d.city.uf} 🏡`
          : 'Cidade indefinida. Esse comentário iria para revisão, sem colocar uma casa no lugar errado.'
      );
    } catch {
      setParsed('Entre como administrador para testar.');
    } finally {
      setBusy(false);
    }
  };

  const resolve = async (id: string, city: City) => {
    try {
      const r = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, cityId: city.id }),
      });
      if (!r.ok) throw Error();
      setPending(p => p.filter(v => v.id !== id));
      await refresh(true);
      setNotice('Comentário revisado e casinha erguida! 🏡');
    } catch {
      setNotice('Falha ao revisar o comentário.');
    }
  };

  const roleBadge = (h: House) => {
    if (h.role === 'mayor') {
      return (
        <span className="role-pill mayor" title="Prefeito(a) eleito(a) por pontuação no Hall da Cidade">
          🎩 Prefeito(a)
        </span>
      );
    }
    if (h.role === 'vice_mayor') {
      return <span className="role-pill vice">🏛️ Vice-Prefeito(a)</span>;
    }
    if (h.role === 'councillor') {
      return <span className="role-pill council">📜 Vereador(a)</span>;
    }
    if (h.role === 'architect') {
      return <span className="role-pill arch">🏗️ Mestre de Obras</span>;
    }
    return <span className="role-pill citizen">🏡 Cidadão(ã)</span>;
  };

  const row = (h: House) => (
    <div className={'person ' + (h.role === 'mayor' ? 'is-mayor' : '')} key={h.id}>
      <span className="avatar" title={h.buildingTitle || 'Chalé'}>
        <BuildingDrawing type={h.building || 'chale'} small crowned={h.founder} />
      </span>
      <div className="person-main">
        <div className="person-top">
          <strong>@{h.username}</strong>
          <span className="pts-badge">⭐ {h.points ?? 100} pts</span>
        </div>
        <div className="person-badges">
          {roleBadge(h)}
          {h.founder && (
            <span className="crown" title="Fundador histórico da cidade">
              <Crown size={12} />
              <em>Fundador</em>
            </span>
          )}
        </div>
        <small>
          {h.city.name} · {h.city.uf} · 🏢 {h.buildingTitle || 'Chalé Aconchegante'}
        </small>
      </div>
      <div className="person-actions">
        <button
          type="button"
          className="act-mini-btn cheer"
          title="Aplaudir morador (+15 pts para Prefeito)"
          disabled={actBusyId !== null}
          onClick={() => performAct(h.id, h.city.id, 'cheer')}
        >
          <ThumbsUp size={12} /> +15
        </button>
        <button
          type="button"
          className="act-mini-btn build"
          title="Mutirão de Obra (+25 pts para evoluir prédio)"
          disabled={actBusyId !== null}
          onClick={() => performAct(h.id, h.city.id, 'build')}
        >
          <Hammer size={12} /> +25
        </button>
        {data?.canEdit &&
          (removeId === h.id ? (
            <button className="danger small-btn" onClick={() => remove(h.id)} disabled={busy}>
              Confirmar remoção
            </button>
          ) : (
            <button className="icon-button remove" aria-label={'Remover casa de ' + h.username} onClick={() => setRemoveId(h.id)}>
              <Trash2 size={14} />
            </button>
          ))}
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Brasil em Casas, início">
          <span className="brand-icon">
            <Home size={22} />
          </span>
          <span>
            brasil<span className="brand-light">em</span>casas<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="Navegação principal">
          <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>
            <Compass size={16} />
            Explorar mapa
          </button>
          <button className={tab === 'people' ? 'active' : ''} onClick={() => setTab('people')}>
            <Users size={16} />
            Comunidade & Hall
          </button>
        </nav>
        <button className="connection-button" onClick={() => setDialog('instagram')}>
          <Instagram size={18} />
          <span>Comentar no Instagram</span>
          <i className={data?.connection.configured ? 'configured' : ''} />
        </button>
      </header>

      <main className="workspace">
        <aside className="sidebar">
          <div className="eyebrow">
            <Sparkles size={13} /> CIDADES EVOLUTIVAS · PREFEITOS & HALL
          </div>
          <h1>
            O Brasil começa <br />
            com <em>uma casinha.</em>
          </h1>
          <p className="intro">
            Cada ato soma pontos! Comente no Instagram, marque amigos e interaja no mapa para virar <strong>Prefeito(a) 🎩</strong> e erguer <strong>Prédios Gigantes 🏰</strong>!
          </p>

          <div className="stats">
            <div className="stat-pill">
              <strong>{data?.houses.length.toLocaleString('pt-BR') ?? '—'}</strong>
              <span>prédios & casas</span>
            </div>
            <div className="stat-pill">
              <strong>{totalPointsAll.toLocaleString('pt-BR')}</strong>
              <span>pontos no Hall</span>
            </div>
          </div>

          <div className="progress-card">
            <div className="progress-caption">
              <span>
                🇧🇷 {groups.length} cidades ({regionCount}/27 estados)
              </span>
              <b>{Math.round((regionCount / 27) * 100)}%</b>
            </div>
            <div className="progress-track">
              <span style={{ width: Math.max(4, (regionCount / 27) * 100) + '%' }} />
            </div>
            <div className="founder-hunt-badge">
              <Crown size={14} />
              <span>
                <strong>{freeCitiesCount.toLocaleString('pt-BR')}</strong> prefeituras e coroas de fundador livres!
              </span>
            </div>
          </div>

          <button className="primary build-button" onClick={openAdd}>
            <Plus size={19} />
            Adicionar uma casa
            <ArrowUpRight size={18} />
          </button>
          <p className="button-note">✨ Casa = +100 pts · Fundador = +150 pts · Comentários e Apoios somam +pts!</p>

          <div className="side-divider" />

          {selected ? (
            <section className="city-panel">
              <div className="section-title">
                <span>
                  <MapPin size={16} />
                  {selected.name} · {selected.uf}
                </span>
                <button className="icon-button" aria-label="Limpar cidade selecionada" onClick={reset}>
                  <X size={16} />
                </button>
              </div>
              <small className="muted">
                {selected.state} · {selectedHouses.length} {selectedHouses.length === 1 ? 'morador' : 'moradores'} ·{' '}
                <strong>{selectedGroup?.totalPoints ?? 0} pts na cidade</strong>
              </small>

              {selectedGroup ? (
                <>
                  {/* Card de Evolução do Prédio da Cidade e Prefeito Atual */}
                  <div className="city-hall-card">
                    <div className="city-stage-header">
                      <div className="city-stage-icon">
                        <BuildingDrawing type={selectedGroup.stage.building} crowned />
                      </div>
                      <div className="city-stage-info">
                        <span className="stage-pill">
                          NÍVEL {selectedGroup.stage.level} · {selectedGroup.stage.title.toUpperCase()}
                        </span>
                        <strong>🎩 Prefeito(a): @{selectedGroup.mayor.username}</strong>
                        <small>
                          Liderando com <b>{selectedGroup.mayor.points} pts</b> ({selectedGroup.mayor.buildingTitle})
                        </small>
                      </div>
                    </div>

                    {selectedGroup.stage.nextThreshold && (
                      <div className="city-upgrade-bar">
                        <div className="upgrade-caption">
                          <span>Próximo prédio da cidade:</span>
                          <b>
                            {selectedGroup.totalPoints} / {selectedGroup.stage.nextThreshold} pts
                          </b>
                        </div>
                        <div className="progress-track">
                          <span
                            style={{
                              width:
                                Math.min(
                                  100,
                                  Math.max(
                                    8,
                                    ((selectedGroup.totalPoints - selectedGroup.stage.minThreshold) /
                                      (selectedGroup.stage.nextThreshold - selectedGroup.stage.minThreshold)) *
                                      100
                                  )
                                ) + '%',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="city-quick-acts">
                      <button
                        type="button"
                        className="act-pill-btn"
                        disabled={actBusyId !== null}
                        onClick={() => performAct(selectedGroup.mayor.id, selected.id, 'cheer')}
                      >
                        <ThumbsUp size={13} /> Apoiar Prefeito (+15 pts)
                      </button>
                      <button
                        type="button"
                        className="act-pill-btn build"
                        disabled={actBusyId !== null}
                        onClick={() => performAct(selectedGroup.mayor.id, selected.id, 'build')}
                      >
                        <Hammer size={13} /> Mutirão Prédio (+25 pts)
                      </button>
                    </div>
                  </div>

                  {/* Hall de Pontuação da Cidade */}
                  <div className="hall-header">
                    <span>🏆 Hall de Cargos & Pontuação</span>
                    <small>Apoie quem deve ser Prefeito(a)!</small>
                  </div>
                  <div className="people-list">{selectedHouses.slice(0, 8).map(row)}</div>

                  {selectedActs.length > 0 && (
                    <div className="acts-feed">
                      <span className="acts-title">⚡ Últimos atos que somaram pontos</span>
                      {selectedActs.slice(0, 3).map(a => (
                        <div className="act-item" key={a.id}>
                          <strong>@{a.username}</strong>: {a.label}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="city-empty">
                  <BuildingDrawing type="prefeitura" crowned />
                  <strong>Prefeitura & Coroa de Fundador livres! 🎩👑</strong>
                  <p>
                    Ninguém inaugurou {selected.name} ainda. O 1º morador já começa com <strong>150 pontos</strong>, vira{' '}
                    <strong>Fundador</strong> e assume a <strong>Prefeitura</strong>!
                  </p>
                  <button className="text-button" onClick={openAdd}>
                    Construir aqui <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* Card super convidativo para comentar no Instagram */}
              <div className="comment-cta-box">
                <div className="comment-cta-head">
                  <MessageCircle size={15} />
                  <span>Ganhe pontos em {selected.name} pelo Instagram!</span>
                </div>
                <p>Comente sua cidade + marque @amigos (+15 pts cada):</p>
                <button
                  type="button"
                  className="comment-copy-pill"
                  onClick={() => copyCommentSample(`${selected.name} ${selected.uf}`, selected.id)}
                >
                  <code>
                    {selected.name} {selected.uf}
                  </code>
                  <span>
                    {copiedComment ? <Check size={14} /> : <Copy size={14} />} {copiedComment ? 'Copiado!' : 'Copiar (+20 pts)'}
                  </span>
                </button>
              </div>
            </section>
          ) : (
            <section>
              <div className="section-title">
                <span>
                  <Award size={16} /> Hall & Evolução das Cidades
                </span>
                <span className="soft-label">5 NÍVEIS</span>
              </div>
              {data?.houses.length ? (
                <div className="people-list">
                  {[...data.houses]
                    .sort((a, b) => (b.points || 0) - (a.points || 0) || b.id - a.id)
                    .slice(0, 5)
                    .map(row)}
                </div>
              ) : (
                <div className="empty-card">
                  <div className="empty-house">
                    <BuildingDrawing type="prefeitura" crowned />
                    <span className="spark s1">✦</span>
                    <span className="spark s2">♥</span>
                  </div>
                  <strong>Quem será o 1º Prefeito do Brasil?</strong>
                  <p>Cada comentário, amigo marcado e interação no mapa soma pontos para evoluir sua casinha até um Castelo Metrópole!</p>
                </div>
              )}
            </section>
          )}

          <button className="how-link" onClick={() => setDialog('how')}>
            Ver Prédios, Cargos e Pontos <ChevronRight size={15} />
          </button>
          <footer className="sidebar-footer">
            <Heart size={12} className="heart-icon" /> Feito para juntar o Brasil inteiro num mapa fofinho.
          </footer>
        </aside>

        <section className="map-area" aria-label="Mapa interativo do Brasil">
          <div className="map-toolbar">
            <CityPicker
              compact
              label="Buscar cidade no mapa"
              placeholder="🔎 Digite sua cidade para ver o Prefeito..."
              onPick={c => {
                focusCity(c);
                setTab('map');
              }}
            />
            <button type="button" className="map-tag" onClick={() => setDialog('how')}>
              <span /> 🏛️ 5 NÍVEIS DE PRÉDIOS & PREFEITOS
            </button>
          </div>

          {tab === 'map' ? (
            <>
              <svg
                ref={svg}
                className="brazil-map"
                viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
                role="group"
                aria-label="Brasil com limites estaduais e casas cadastradas. Arraste para mover e use os botões para ampliar."
                onWheel={e => zoom(e.deltaY > 0 ? 1.12 : 0.88)}
                onPointerDown={e => {
                  if ((e.target as Element).closest('[data-house]')) return;
                  drag.current = { x: e.clientX, y: e.clientY, view };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={e => {
                  const d = drag.current;
                  if (!d || !svg.current) return;
                  const clientX = e.clientX;
                  const clientY = e.clientY;
                  if (rafId.current) cancelAnimationFrame(rafId.current);
                  rafId.current = requestAnimationFrame(() => {
                    if (!svg.current || !drag.current) return;
                    const rect = svg.current.getBoundingClientRect();
                    const ratio = Math.max(d.view.w / rect.width, d.view.h / rect.height);
                    setView({
                      ...d.view,
                      x: d.view.x - (clientX - d.x) * ratio,
                      y: d.view.y - (clientY - d.y) * ratio,
                    });
                  });
                }}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
              >
                <BrazilBaseMap paths={paths} />

                {selected && !selectedHouses.length && (
                  <g transform={`translate(${project(selected).join(' ')})`}>
                    <circle r={Math.max(5, view.w / 55)} fill="#ff7f5c" opacity=".24" />
                    <circle r={Math.max(2.4, view.w / 140)} fill="#ff6b42" stroke="#fff" strokeWidth="1.4" />
                  </g>
                )}

                {groups.map(group => {
                  const [x, y] = project(group.city);
                  const baseScale = Math.max(0.15, view.w / 1800);
                  const levelBonus = 1 + (group.stage.level - 1) * 0.08;
                  const scale = baseScale * levelBonus;
                  return (
                    <g
                      key={group.city.id}
                      data-house="true"
                      transform={`translate(${x} ${y}) scale(${scale})`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${group.city.name}, ${group.houses.length} casas`}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          focusCity(group.city);
                          e.preventDefault();
                        }
                      }}
                      onClick={() => focusCity(group.city)}
                      className="map-house"
                    >
                      <g transform="translate(-36 -60)">
                        <BuildingDrawing type={group.stage.building} crowned />
                      </g>
                      {/* Badge de quantidade de moradores ou nível */}
                      {group.houses.length > 1 && (
                        <>
                          <rect x="12" y="-58" width="32" height="24" rx="12" fill="#2b6348" stroke="#fff" strokeWidth="2.5" />
                          <text x="28" y="-42" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">
                            {group.houses.length}
                          </text>
                        </>
                      )}
                      {/* Plaquinha do Prefeito embaixo do prédio no mapa */}
                      <g transform="translate(0 12)">
                        <rect x="-46" y="-10" width="92" height="19" rx="9.5" fill="#fff9eb" stroke="#d48b00" strokeWidth="1.8" />
                        <text x="0" y="3" textAnchor="middle" fontSize="10" fontWeight="700" fill="#6e470b">
                          🎩 @{group.mayor.username.slice(0, 10)}
                        </text>
                      </g>
                      <title>
                        {group.city.name} · {group.city.uf} ({group.stage.title} · {group.totalPoints} pts) — Prefeito(a): @
                        {group.mayor.username} — {group.houses.length} {group.houses.length === 1 ? 'morador' : 'moradores'}
                      </title>
                    </g>
                  );
                })}
              </svg>

              <div className="compass" aria-hidden="true">
                <span>N</span>
                <Compass size={32} strokeWidth={1.5} />
              </div>

              <div className="zoom-controls">
                <button aria-label="Ampliar mapa" onClick={() => zoom(0.7)}>
                  <Plus size={20} />
                </button>
                <button aria-label="Reduzir mapa" onClick={() => zoom(1.4)}>
                  <Minus size={20} />
                </button>
                <hr />
                <button aria-label="Ver Brasil inteiro" onClick={reset}>
                  <Maximize size={18} />
                </button>
              </div>

              <div className="map-bottom">
                <div className="legend">
                  <i />
                  <span>Cidades livres</span>
                  <b />
                  <span>Chalé → Vila → Prefeitura → Edifício → Metrópole</span>
                </div>
                <span className="map-credit">Malha: IBGE · 5.571 municípios</span>
              </div>

              {!data?.houses.length && !selected && (
                <div className="map-empty-hint" onClick={() => setDialog('how')}>
                  <span className="mini-dot" /> 🏛️ Clique numa cidade ou veja como virar Prefeito(a) e evoluir os prédios!
                </div>
              )}
            </>
          ) : (
            <div className="community-view">
              <div className="community-heading">
                <div className="eyebrow">
                  <Sparkles size={13} /> HALL NACIONAL DE PREFEITOS, CARGOS E PRÉDIOS
                </div>
                <h2>{selected ? `Hall de ${selected.name} · ${selected.uf}` : 'Ranking de Moradores & Prefeitos 🎩🏛️'}</h2>
                <p>
                  Todos os atos no mapa e comentários no Instagram somam pontos! O 1º lugar de cada cidade governa como{' '}
                  <strong>Prefeito(a)</strong> e desbloqueia prédios maiores.
                </p>
              </div>

              {/* Vitrine dos 5 Designs de Prédios */}
              <div className="buildings-strip">
                {BUILDING_SHOWCASE.map(b => (
                  <div className="building-card" key={b.type}>
                    <div className="b-icon">
                      <BuildingDrawing type={b.type} crowned={b.type === 'metropole'} />
                    </div>
                    <span className="b-lvl">{b.level}</span>
                    <strong>{b.name}</strong>
                    <small>{b.req}</small>
                  </div>
                ))}
              </div>

              <div className="input-wrap">
                <Search size={17} />
                <input
                  aria-label="Buscar morador"
                  placeholder="Buscar por @, cargo (Prefeito) ou nome da cidade..."
                  value={peopleQuery}
                  onChange={e => setPeopleQuery(e.target.value)}
                />
              </div>
              {selected && (
                <button className="text-button" onClick={() => setSelected(null)}>
                  Ver todas as cidades <X size={14} />
                </button>
              )}
              <div className="community-list">
                {filtered.length ? (
                  filtered.map(row)
                ) : (
                  <div className="community-empty">
                    <BuildingDrawing type="prefeitura" crowned />
                    <h3>{data?.houses.length ? 'Nenhum morador encontrado.' : 'O Hall de Prefeitos está pronto para começar!'}</h3>
                    <p>
                      {data?.houses.length
                        ? 'Tente buscar outro @ ou cidade.'
                        : 'Assim que as primeiras casas forem erguidas, você poderá apoiar moradores e disputar prefeituras aqui.'}
                    </p>
                  </div>
                )}
              </div>
              <button className="secondary" onClick={exportData}>
                <Download size={16} />
                Exportar moradores
              </button>
            </div>
          )}

          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={() => refresh(true)}>Tentar novamente</button>
            </div>
          )}
          {!data && !error && (
            <div className="loading-badge">
              <LoaderCircle className="spin" size={18} />
              Preparando seu mapa fofinho…
            </div>
          )}
        </section>
      </main>

      <div className="bottom-bar">
        <span>
          <Crown size={15} />
          Cada ato vale pontos: 1º em pontos na cidade vira <strong>Prefeito(a) 🎩</strong> e evolui o prédio!
        </span>
        <button onClick={() => setDialog('instagram')}>
          {data?.connection.configured ? 'Instagram: configuração recebida' : 'Como comentar e somar pontos no Instagram'}
          <ArrowUpRight size={13} />
        </button>
      </div>

      <dialog
        ref={modal}
        className={'modal ' + (dialog === 'instagram' || dialog === 'how' ? 'wide' : '')}
        onCancel={() => setDialog(null)}
        onClick={e => {
          if (e.target === e.currentTarget) setDialog(null);
        }}
      >
        <button className="modal-close icon-button" aria-label="Fechar janela" onClick={() => setDialog(null)}>
          <X size={20} />
        </button>

        {dialog === 'add' && (
          <>
            <div className="modal-symbol">
              <BuildingDrawing type="prefeitura" small crowned />
            </div>
            <div className="eyebrow">SEU CANTINHO NO BRASIL</div>
            <h2>Plante uma casinha no mapa 🏡</h2>
            <p>Escolha a cidade e o @ do Instagram para entrar no Hall da Cidade e disputar a Prefeitura!</p>
            {data?.canEdit ? (
              <form onSubmit={add}>
                <label>
                  Perfil do Instagram
                  <div className="input-wrap">
                    <span>@</span>
                    <input
                      aria-label="Perfil do Instagram"
                      required
                      maxLength={31}
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="seu.perfil"
                      autoComplete="off"
                    />
                  </div>
                </label>
                <CityPicker
                  label="Cidade"
                  value={newCity ? newCity.name + ' · ' + newCity.uf : ''}
                  onPick={setNewCity}
                  onEdit={() => setNewCity(null)}
                />
                <div className="privacy-note">
                  <LocateFixed size={18} />
                  <span>
                    A casa representa apenas o município escolhido. Você já começa com <strong>+100 pts</strong> (ou{' '}
                    <strong>+150 pts</strong> se for o 1º Fundador da cidade!).
                  </span>
                </div>
                {formError && (
                  <p role="alert" className="form-error">
                    {formError}
                  </p>
                )}
                <button className="primary full" disabled={busy || !newCity}>
                  {busy ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}
                  Construir casa
                </button>
                <small className="muted">🎩 Depois de construir, some pontos com aplausos, mutirões e comentários para virar Prefeito(a)!</small>
              </form>
            ) : (
              <div className="auth-note">
                <p>
                  Para construir sua casa e somar pontos, comente <strong>Sua Cidade + UF</strong> (ex: <code>Curitiba PR</code>) no post oficial do Instagram! 💬✨
                </p>
                <p className="muted" style={{ marginTop: 8 }}>
                  O cadastro manual direto nesta tela é exclusivo para o administrador do mapa.
                </p>
                <a className="primary" href="/signin-with-chatgpt?return_to=/" target="_top">
                  Entrar para administrar <ArrowRight size={16} />
                </a>
              </div>
            )}
          </>
        )}

        {dialog === 'how' && (
          <>
            <div className="modal-symbol">
              <BuildingDrawing type="metropole" small crowned />
            </div>
            <div className="eyebrow">SISTEMA DE PREFEITOS, ATOS E PRÉDIOS</div>
            <h2>Evolua sua Cidade até Metrópole! 🏛️🏰</h2>
            <p>Todo ato no Instagram ou interação no mapa gera pontos para você e para o Hall da sua cidade:</p>

            <div className="buildings-strip modal-strip">
              {BUILDING_SHOWCASE.map(b => (
                <div className="building-card" key={b.type}>
                  <div className="b-icon">
                    <BuildingDrawing type={b.type} small crowned={b.type === 'metropole'} />
                  </div>
                  <span className="b-lvl">{b.level}</span>
                  <strong>{b.name}</strong>
                  <small>{b.req}</small>
                </div>
              ))}
            </div>

            <div className="steps">
              <div>
                <b>01</b>
                <section>
                  <h3>Plante sua Casa e Ganhe Pontos Iniciais 🏡</h3>
                  <p>
                    Construir sua casa dá <strong>+100 pts</strong>. Se você for a 1ª pessoa da cidade, ganha o título vitalício de{' '}
                    <strong>👑 Fundador(a) (+150 pts)</strong>!
                  </p>
                </section>
              </div>
              <div>
                <b>02</b>
                <section>
                  <h3>Some Pontos com Atos no Instagram e no Mapa ⚡</h3>
                  <p>
                    Comentar novamente no post dá <strong>+30 pts</strong>, cada <strong>@amigo</strong> marcado no comentário dá{' '}
                    <strong>+15 pts</strong>, e interagir no mapa com <strong>👏 Apoiar (+15 pts)</strong> ou{' '}
                    <strong>🧱 Mutirão (+25 pts)</strong> faz sua pontuação disparar!
                  </p>
                </section>
              </div>
              <div>
                <b>03</b>
                <section>
                  <h3>Hall da Cidade: Prefeitos e Prédios Maiores 🎩</h3>
                  <p>
                    O morador nº 1 em pontos no Hall vira <strong>🎩 Prefeito(a)</strong>, seguido de{' '}
                    <strong>🏛️ Vice-Prefeito(a)</strong>, <strong>📜 Vereador(a)</strong> e <strong>🏗️ Mestre de Obras</strong>. Quanto mais pontos a cidade soma, maior fica o prédio dela no mapa!
                  </p>
                </section>
              </div>
            </div>
            <button className="primary full" onClick={openAdd}>
              Construir a primeira casa <ArrowRight size={17} />
            </button>
            <p className="source-note">
              Geografia: <a href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3" target="_blank" rel="noreferrer">IBGE</a>. Catálogo de{' '}
              {data?.totalCities.toLocaleString('pt-BR') || '5.571'} localidades:{' '}
              <a href="https://github.com/kelvins/municipios-brasileiros" target="_blank" rel="noreferrer">Municípios Brasileiros</a>.
            </p>
          </>
        )}

        {dialog === 'instagram' && (
          <>
            <div className="modal-symbol">
              <Instagram size={26} />
            </div>
            <div className="eyebrow">DO COMENTÁRIO DIRETO PRO HALL DA CIDADE</div>
            <h2>Comente, marque amigos e vire Prefeito! 💬🎩</h2>
            <p>
              Quando a campanha estiver ativa, o primeiro comentário com <strong>Cidade + UF</strong> ergue sua casa (+100 a +150 pts), e novos comentários ou menções a <strong>@amigos</strong> continuam somando pontos no Hall da sua cidade!
            </p>
            <div className="status-card">
              <span className="status-icon">
                <Settings2 size={20} />
              </span>
              <div>
                <strong>{data?.connection.configured ? 'Configuração recebida' : 'Aguardando uma conta'}</strong>
                <p>
                  {data?.connection.configured
                    ? 'É necessário confirmar a entrega de um comentário real pela Meta.'
                    : 'Nenhum perfil conectado ainda. O mapa e o Hall de Prefeitos já estão prontos aguardando o post oficial!'}
                </p>
              </div>
            </div>
            <div className="flow">
              <span>
                <MessageCircle size={18} />
                Comenta Cidade + @amigos
              </span>
              <ChevronRight size={15} />
              <span>
                <Star size={18} />
                Soma Pontos no Hall
              </span>
              <ChevronRight size={15} />
              <span>
                <Building2 size={18} />
                Vira Prefeito & Evolui Prédio!
              </span>
            </div>
            <details>
              <summary>
                O que falta para conectar <ChevronRight size={16} />
              </summary>
              <ol>
                <li>Escolher uma conta profissional do Instagram e um post da campanha.</li>
                <li>Autorizar o aplicativo da Meta a receber comentários dessa conta.</li>
                <li>Configurar as credenciais no servidor e cadastrar o endereço de recebimento abaixo.</li>
                <li>Habilitar acesso público ao receptor e testar um comentário real.</li>
              </ol>
              <div className="callback">
                <code>{typeof window !== 'undefined' ? window.location.origin : ''}/api/instagram/webhook</code>
                <button
                  className="icon-button"
                  aria-label="Copiar endereço de webhook"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(location.origin + '/api/instagram/webhook');
                      setNotice('Endereço copiado.');
                    } catch {
                      setNotice('Selecione o endereço e copie manualmente.');
                    }
                  }}
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="muted">As credenciais ficam seguras no servidor. Nunca coloque senhas ou tokens em comentários.</p>
            </details>
            {data?.canEdit && (
              <>
                <div className="test-box">
                  <h3>Experimente um comentário</h3>
                  <p>Simule como um seguidor comentaria para testar o reconhecimento instantâneo de cidade:</p>
                  <textarea
                    aria-label="Comentário para testar"
                    placeholder="Ex: Quero ser prefeito de Curitiba PR @amigo1 @amigo2! 🏛️"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    maxLength={2200}
                  />
                  <button className="secondary" disabled={busy || !comment.trim()} onClick={parse}>
                    {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}
                    Reconhecer cidade
                  </button>
                  {parsed && <output className="parse-result">{parsed}</output>}
                </div>
                <div className="pending-section">
                  <h3>
                    Comentários para revisar <span>{pending.length}</span>
                  </h3>
                  {!pending.length ? (
                    <p>Nenhum comentário aguardando revisão.</p>
                  ) : (
                    pending.map(p => (
                      <div className="pending" key={p.id}>
                        <strong>@{p.username}</strong>
                        <p>{p.comment}</p>
                        <CityPicker label="Resolver cidade" onPick={c => resolve(p.id, c)} />
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}
      </dialog>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
    </div>
  );
}
