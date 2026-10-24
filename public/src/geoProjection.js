/** WGS84 coordinates to a local metric x/z origin; north is negative z. */
export function projectGeo(lat,lon,center){
  const rad=center.lat*Math.PI/180;
  return {x:(lon-center.lon)*111320*Math.cos(rad),z:-(lat-center.lat)*111320};
}
export function geoPolyline(points,center){return points.map(p=>projectGeo(p[0],p[1],center));}
export function polygonContains(pt,poly){
  let yes=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if((a.z>pt.z)!==(b.z>pt.z) && pt.x<(b.x-a.x)*(pt.z-a.z)/(b.z-a.z)+a.x)yes=!yes;
  }
  return yes;
}
export function nearPolyline(x,z,poly,radius){
  const r2=radius*radius;
  if(polygonContains({x,z},poly))return true;
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length];const dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.min(1,Math.max(0,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    if((x-a.x-t*dx)**2+(z-a.z-t*dz)**2<r2)return true;
  }
  return false;
}
export function nearestRoadPoint(pos,roads){
  let closest={x:pos.x,z:pos.z},score=Infinity;
  for(const road of roads)for(let i=1;i<road.length;i++){
    const a=road[i-1],b=road[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((pos.x-a.x)*dx+(pos.z-a.z)*dz)/(dx*dx+dz*dz||1)));
    const x=a.x+t*dx,z=a.z+t*dz,d=(x-pos.x)**2+(z-pos.z)**2;
    if(d<score){score=d;closest={x,z};}
  }
  return closest;
}

/** Reconstruct approximate WGS84 position as player moves through local game coordinates. */
export function unprojectGeo(x,z,center){return {lat:center.lat-z/111320,lon:center.lon+x/(111320*Math.cos(center.lat*Math.PI/180))};}
