const proj4 = require('proj4');

// 좌표계 정의 (CoordinateEngine과 동일)
const COORDINATE_SYSTEMS = {
  WGS84: {
    epsg: 'EPSG:4326',
    proj4: '+proj=longlat +datum=WGS84 +no_defs'
  },
  GRS80_CENTRAL: {
    epsg: 'EPSG:5186',
    proj4: '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs'
  },
  UTM_K: {
    epsg: 'EPSG:5179',
    proj4: '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs'
  }
};

// proj4 정의 등록
Object.entries(COORDINATE_SYSTEMS).forEach(([key, sys]) => {
  proj4.defs(sys.epsg, sys.proj4);
});

// 서울시청
const seoulWgs84 = [126.9780, 37.5665];
const seoulGrs80 = proj4('EPSG:4326', 'EPSG:5186', seoulWgs84);
const seoulUtmK = proj4('EPSG:4326', 'EPSG:5179', seoulWgs84);

console.log('Seoul City Hall:');
console.log('  WGS84:', seoulWgs84);
console.log('  GRS80_CENTRAL:', seoulGrs80);
console.log('  Expected GRS80_CENTRAL: [200000.000, 600000.000]');
console.log('  Difference:', [seoulGrs80[0] - 200000, seoulGrs80[1] - 600000]);
console.log('  UTM_K:', seoulUtmK);
console.log('  Expected UTM_K: [1000000.000, 2000000.000]');
console.log('  Difference:', [seoulUtmK[0] - 1000000, seoulUtmK[1] - 2000000]);
console.log('');

// 부산시청  
const busanWgs84 = [129.0756, 35.1796];
const busanGrs80 = proj4('EPSG:4326', 'EPSG:5186', busanWgs84);
const busanUtmK = proj4('EPSG:4326', 'EPSG:5179', busanWgs84);

console.log('Busan City Hall:');
console.log('  WGS84:', busanWgs84);
console.log('  GRS80_CENTRAL:', busanGrs80);
console.log('  Expected GRS80_CENTRAL: [351177.425, 335205.842]');
console.log('  Difference:', [busanGrs80[0] - 351177.425, busanGrs80[1] - 335205.842]);
console.log('  UTM_K:', busanUtmK);
console.log('  Expected UTM_K: [1026639.447, 1759882.395]');
console.log('  Difference:', [busanUtmK[0] - 1026639.447, busanUtmK[1] - 1759882.395]);
console.log('');

// 제주도청
const jejuWgs84 = [126.5219, 33.4996];
const jejuGrs80 = [149376.891, 407855.342];
const jejuBackToWgs84 = proj4('EPSG:5186', 'EPSG:4326', jejuGrs80);

console.log('Jeju Office:');
console.log('  Original WGS84:', jejuWgs84);
console.log('  GRS80_CENTRAL:', jejuGrs80);
console.log('  Back to WGS84:', jejuBackToWgs84);
console.log('  Difference:', [jejuBackToWgs84[0] - jejuWgs84[0], jejuBackToWgs84[1] - jejuWgs84[1]]);
