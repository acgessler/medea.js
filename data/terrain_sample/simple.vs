
#include <remote:mcore/shaders/core.vsh>
#include <remote:mcore/shaders/terrain.vsh>

void main()
{
	TerrainVertex vert;
	GetTerrainVertex(vert);
	
	vec3 worldPos = ModelToWorldSpace(vert.POSITION);
	
	PassClipPosition(WorldToClipSpace(worldPos));
	PassNormal(ModelNormalToWorldSpace(vert.NORMAL));
	PassTexCoord(FetchTexCoord()*4.0);
	
	PassFloat(EyeDist,GetWorldEyeDistance(vert.POSITION));
	
	mat3 rotmat = mat3(vert.TANGENT, vert.BITANGENT, vert.NORMAL);
	vec3 lightdir = normalize( rotmat * normalize(vec3(0.0,1.0,-1.0)) );
	
	PassVec3(TSLightDir,lightdir);
}


