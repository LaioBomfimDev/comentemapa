import type { City } from './cities';
import type { BuildingType } from './building-models';
export type House = { id:number; username:string; city:City; founder:boolean; source:string; createdAt:string; points:number; actsCount:number; rank:number; role:string; roleTitle:string; building:BuildingType; buildingTitle:string; demo?:boolean };
export type Snapshot = { houses:House[]; recentActs?:unknown[]; totalCities:number; canEdit:boolean; connection:{configured:boolean;missing:string[];profile:string|null;callback:string} };
export const SALVADOR:City = { id:2927408, name:'Salvador', uf:'BA', state:'Bahia',lat:-12.9718,lng:-38.5011 };
export const DEMO_HOUSE:House = { id:-1,username:'elielexgay',city:SALVADOR,founder:true,source:'demo',createdAt:'2026-10-16T12:00:00Z',points:150,actsCount:1,rank:1,role:'mayor',roleTitle:'Prefeito(a)',building:'prefeitura',buildingTitle:'Palácio da Prefeitura',demo:true };
