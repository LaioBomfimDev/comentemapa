'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createBuilding, BUILDING_MODELS, type BuildingType } from '../lib/building-models';
import type { House } from '../lib/map-types';
import type { City } from '../lib/cities';

type Coordinates = number[][];
type StateGeo = {id:string;polygons:Coordinates[][]};
type Command = {action:'zoom-in'|'zoom-out'|'reset'|'focus';serial:number;city?:City};
type Runtime = {renderer:THREE.WebGLRenderer;scene:THREE.Scene;camera:THREE.OrthographicCamera;controls:OrbitControls;buildings:THREE.Group;labels:THREE.Group;focus:(city?:City)=>void;reset:()=>void;draw:()=>void};
export type WorldCapture = {capture:()=>string};
const position = (lng:number,lat:number) => new THREE.Vector3((lng+54)*1.5,.72,-(lat+14)*1.5);
function dispose(object:THREE.Object3D) {object.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)mesh.geometry.dispose();if(mesh.material){const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const mat of mats){const map=(mat as THREE.MeshStandardMaterial).map;if(map)map.dispose();mat.dispose();}}});}
function label(text:string, color='#ffffff', width=2.8, size=42, background=false) {
  const canvas=document.createElement('canvas');const context=canvas.getContext('2d')!;context.font=`800 ${size}px Arial, sans-serif`;canvas.width=Math.ceil(Math.max(100,context.measureText(text).width+44));canvas.height=100;context.font=`800 ${size}px Arial, sans-serif`;context.textAlign='center';context.textBaseline='middle';const center=canvas.width/2;
  if(background){context.fillStyle='#fffdf3';context.beginPath();context.roundRect(2,10,canvas.width-4,80,22);context.fill();context.strokeStyle='#244337';context.lineWidth=5;context.stroke();}
  if(!background){context.strokeStyle='#244337';context.lineWidth=7;context.strokeText(text,center,50);}
  context.fillStyle=color;context.fillText(text,center,50,canvas.width-24);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.scale.set(width,width*100/canvas.width,1);sprite.renderOrder=5;return sprite;
}
function inRing(x:number,z:number,ring:Coordinates){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(((a[1]>z)!==(b[1]>z)) && x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const stateLabels=[['AC',-70,-9],['AM',-64,-4],['RR',-61,2],['AP',-52,1],['PA',-53,-4],['RO',-63,-11],['MT',-56,-13],['TO',-48.5,-10],['MA',-45,-5],['PI',-42.5,-7],['CE',-39.5,-5],['RN',-36.4,-5.6],['PB',-36.5,-7],['PE',-38,-8.6],['AL',-36.3,-9.7],['SE',-37.4,-10.8],['BA',-42,-12],['GO',-49.7,-16],['DF',-47.8,-15.5],['MS',-55,-20],['MG',-44.5,-18.5],['ES',-40.4,-20],['RJ',-42.6,-22.4],['SP',-49,-22],['PR',-51,-24.6],['SC',-50,-27],['RS',-53,-30]] as const;

export default function World3D({houses=[],command,onPick,onReady,onCapture,gallery=false,model='all'}:{houses?:House[];command?:Command;onPick?:(house:House)=>void;onReady?:()=>void;onCapture?:(capture:WorldCapture)=>void;gallery?:boolean;model?:BuildingType|'all'}) {
  const host=useRef<HTMLDivElement>(null);const runtime=useRef<Runtime|null>(null);const onPickRef=useRef(onPick);const onReadyRef=useRef(onReady);const onCaptureRef=useRef(onCapture);const [failure,setFailure]=useState('');const [ready,setReady]=useState(false);const currentHouses=useRef(houses);
  onPickRef.current=onPick;onReadyRef.current=onReady;onCaptureRef.current=onCapture;currentHouses.current=houses;
  useEffect(()=>{
    if(!host.current)return;let cancelled=false;let raf=0;let observer:ResizeObserver|undefined;let owned:Runtime|undefined;let clock=0;let cleanupListeners=()=>{};
    const boot=async()=>{
      try {
        const container=host.current!;const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
        renderer.domElement.setAttribute('aria-label',gallery?'Modelos de imóveis em 3D. Arraste para girar.':'Mapa 3D do Brasil. Arraste para mover, use a roda para ampliar e o botão direito para girar.');renderer.domElement.setAttribute('role','img');renderer.domElement.dataset.renderer='three-webgl';container.appendChild(renderer.domElement);
        const scene=new THREE.Scene();scene.background=new THREE.Color(gallery?'#eaf1e4':'#a9d8eb');scene.fog=new THREE.Fog(gallery?'#eaf1e4':'#a9d8eb',160,240);
        const camera=new THREE.OrthographicCamera(-45,45,40,-40,.1,400);camera.position.set(gallery?0:0,gallery?22:68,gallery?32:46);
        const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.enableRotate=true;controls.minPolarAngle=.16;controls.maxPolarAngle=1.2;controls.minZoom=.5;controls.maxZoom=gallery?5:24;controls.mouseButtons={LEFT:gallery?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};controls.touches={ONE:gallery?THREE.TOUCH.ROTATE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};controls.target.set(0,gallery?1.5:0,0);controls.update();
        scene.add(new THREE.HemisphereLight('#fffde8','#78956c',1.9));const sun=new THREE.DirectionalLight('#fff2d2',2.4);sun.position.set(-30,65,35);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);sun.shadow.camera.left=-46;sun.shadow.camera.right=46;sun.shadow.camera.top=46;sun.shadow.camera.bottom=-46;sun.shadow.normalBias=.06;scene.add(sun);
        const ocean=new THREE.Mesh(new THREE.PlaneGeometry(350,350),new THREE.MeshBasicMaterial({color:gallery?'#eaf1e4':'#a9d8eb',toneMapped:false}));ocean.rotation.x=-Math.PI/2;ocean.position.y=-.14;ocean.receiveShadow=true;scene.add(ocean);
        if(!gallery){const grid=new THREE.GridHelper(220,44,'#e8f6fa','#e8f6fa');grid.position.y=-.1;(grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=.16;scene.add(grid);}
        const buildings=new THREE.Group(),labels=new THREE.Group();scene.add(buildings,labels);
        const resize=()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);const aspect=w/h;const half=gallery?Math.max(10,17/aspect):Math.max(39,34/aspect);camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.render(scene,camera);};observer=new ResizeObserver(resize);observer.observe(container);resize();
        const reset=()=>{camera.zoom=1;camera.position.set(0,gallery?22:68,gallery?32:46);controls.target.set(0,gallery?1.5:0,0);camera.updateProjectionMatrix();controls.update();};
        const focus=(city?:City)=>{if(!city){reset();return;}const p=position(city.lng,city.lat);if(container.clientWidth<680)p.z+=2.0;controls.target.copy(p);camera.position.copy(p).add(new THREE.Vector3(1,68,46));camera.zoom=6.6;camera.updateProjectionMatrix();controls.update();};
        owned={renderer,scene,camera,controls,buildings,labels,focus,reset,draw:()=>{renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);}};runtime.current=owned;
        if(!gallery){
          const response=await fetch('/brazil-geometry.json');if(!response.ok)throw Error('Não foi possível carregar a geografia.');const geography=await response.json() as StateGeo[];if(cancelled){dispose(scene);renderer.dispose();return;}
          const land=new THREE.Group();scene.add(land);const projected:{ring:Coordinates;minX:number;maxX:number;minZ:number;maxZ:number}[]=[];
          const colors=['#b9d889','#c4df99','#cfe5a1','#b5d58b','#c6dea0'];
          for(let i=0;i<geography.length;i++){
            const state=geography[i];const shapes:THREE.Shape[]=[];
            for(const polygon of state.polygons){const shape=new THREE.Shape();polygon.forEach((ring,index)=>{const path=index===0?shape:new THREE.Path();const projectedRing=ring.map(c=>{const p=position(c[0],c[1]);return[p.x,p.z];});ring.forEach((c,k)=>{const p=position(c[0],c[1]);if(k===0)path.moveTo(p.x,-p.z);else path.lineTo(p.x,-p.z);});path.closePath();if(index>0)shape.holes.push(path);else{projected.push({ring:projectedRing,minX:Math.min(...projectedRing.map(c=>c[0])),maxX:Math.max(...projectedRing.map(c=>c[0])),minZ:Math.min(...projectedRing.map(c=>c[1])),maxZ:Math.max(...projectedRing.map(c=>c[1]))});const points=projectedRing.map(c=>new THREE.Vector3(c[0],.71,c[1]));const line=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#749b64',transparent:true,opacity:.62}));land.add(line);}});shapes.push(shape);}
            const geometry=new THREE.ExtrudeGeometry(shapes,{depth:.68,bevelEnabled:false,steps:1});geometry.rotateX(-Math.PI/2);const surface=new THREE.MeshStandardMaterial({color:colors[i%colors.length],roughness:1,flatShading:true});const side=new THREE.MeshStandardMaterial({color:'#c5bd81',roughness:1});const mesh=new THREE.Mesh(geometry,[surface,side]);mesh.receiveShadow=true;land.add(mesh);
          }
          const treePoints:THREE.Vector3[]=[];let seed=12211;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
          for(let x=-29;x<30;x+=1.28)for(let z=-30;z<31;z+=1.28){const px=x+(rand()-.5)*.75,pz=z+(rand()-.5)*.75;const inside=projected.some(p=>px>p.minX&&px<p.maxX&&pz>p.minZ&&pz<p.maxZ&&inRing(px,pz,p.ring));if(inside && rand()>.28)treePoints.push(new THREE.Vector3(px,.7,pz));}
          const crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.19,0),new THREE.MeshStandardMaterial({color:'#5f995d',roughness:1,flatShading:true}),treePoints.length);const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.05,.22,5),new THREE.MeshStandardMaterial({color:'#927250'}),treePoints.length);const matrix=new THREE.Matrix4();treePoints.forEach((p,i)=>{const scale=.75+rand()*.65;matrix.compose(new THREE.Vector3(p.x,p.y+.33*scale,p.z),new THREE.Quaternion(),new THREE.Vector3(scale,scale*1.3,scale));crowns.setMatrixAt(i,matrix);crowns.setColorAt(i,new THREE.Color().setHSL(.26+rand()*.06,.31,.33+rand()*.15));matrix.makeTranslation(p.x,p.y+.1,p.z);trunks.setMatrixAt(i,matrix);});crowns.castShadow=true;scene.add(crowns,trunks);
          for(const [uf,lng,lat] of stateLabels){const sprite=label(uf,'#fffef7',2.9,54);sprite.position.copy(position(lng,lat)).add(new THREE.Vector3(0,.5,0));labels.add(sprite);}
        }
        const raycaster=new THREE.Raycaster();let startX=0,startY=0;const down=(e:PointerEvent)=>{startX=e.clientX;startY=e.clientY;};const up=(e:PointerEvent)=>{if(Math.abs(e.clientX-startX)+Math.abs(e.clientY-startY)>7)return;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);for(const hit of raycaster.intersectObject(buildings,true)){let node:THREE.Object3D|null=hit.object;while(node){if(node.userData.house){onPickRef.current?.(node.userData.house);return;}node=node.parent;}}};renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',up);cleanupListeners=()=>{renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointerup',up);};
        const animate=(time:number)=>{if(cancelled)return;raf=requestAnimationFrame(animate);if(document.hidden || time-clock<33)return;clock=time;const changed=controls.update();const showLabels=camera.zoom<4;const labelsChanged=labels.visible!==showLabels;labels.visible=showLabels;if(changed||labelsChanged)renderer.render(scene,camera);};raf=requestAnimationFrame(animate);
        setReady(true);onReadyRef.current?.();onCaptureRef.current?.({capture:()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');}});
      }catch(error){if(!cancelled)setFailure(error instanceof Error?error.message:'Este navegador não conseguiu iniciar o 3D.');}
    };boot();
    return()=>{cancelled=true;cancelAnimationFrame(raf);observer?.disconnect();cleanupListeners();if(owned){owned.controls.dispose();dispose(owned.scene);owned.renderer.dispose();owned.renderer.domElement.remove();}runtime.current=null;};
  },[gallery]);
  useEffect(()=>{
    const r=runtime.current;if(!r || !ready)return;for(const child of [...r.buildings.children]){r.buildings.remove(child);dispose(child);}
    if(gallery){const list=model==='all'?BUILDING_MODELS:BUILDING_MODELS.filter(m=>m.type===model);list.forEach((m,i)=>{const building=createBuilding(m.type);building.position.x=(i-(list.length-1)/2)*5.8;building.rotation.y=-.28;r.buildings.add(building);const name=label(m.name,'#294737',Math.max(1.9,m.name.length*.22+.8),37,true);name.position.set(building.position.x,.3,3.2);r.buildings.add(name);});r.reset();r.camera.zoom=model==='all'?1:1.8;r.camera.updateProjectionMatrix();}
    else {const counts=new Map<number,number>();for(const house of houses.slice(0,1600)){const index=counts.get(house.city.id)||0;counts.set(house.city.id,index+1);const p=position(house.city.lng,house.city.lat);if(index){const angle=index*2.39996;p.x+=Math.cos(angle)*Math.sqrt(index)*.65;p.z+=Math.sin(angle)*Math.sqrt(index)*.65;}const group=new THREE.Group();group.position.copy(p);group.userData.house=house;const building=createBuilding(house.building);building.scale.setScalar(house.demo ? .7 : .43);building.rotation.y=-.22;group.add(building);if(house.role==='mayor'){const plaque=label('@'+house.username,'#244337',house.demo?4.2:2.7,40,true);plaque.position.set(0,house.demo?3.8:2.8,0);group.add(plaque);const ring=new THREE.Mesh(new THREE.RingGeometry(.92,1.03,64),new THREE.MeshBasicMaterial({color:'#ffdb55',side:THREE.DoubleSide,transparent:true,opacity:.85}));ring.rotation.x=-Math.PI/2;ring.position.y=.04;group.add(ring);}r.buildings.add(group);}}
    r.draw();
  },[houses,ready,gallery,model]);
  useEffect(()=>{const r=runtime.current;if(!r||!command)return;if(command.action==='reset')r.reset();else if(command.action==='focus')r.focus(command.city);else{r.camera.zoom=THREE.MathUtils.clamp(r.camera.zoom*(command.action==='zoom-in'?1.45:1/1.45),.5,24);r.camera.updateProjectionMatrix();r.controls.update();}r.draw();},[command,ready]);
  return <div className="world-host" ref={host}>{!ready&&!failure&&<div className="world-loading"><span className="loader"/>Montando o Brasil em 3D…</div>}{failure&&<div className="world-failure"><strong>Não foi possível abrir o cenário 3D.</strong><p>{failure}</p><p>Use um navegador com WebGL 2 ativado.</p></div>}</div>;
}
